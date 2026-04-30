import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import crypto from "crypto";

export const REPORT_EVIDENCE_FIELD_NAME = "evidence";
export const MAX_REPORT_EVIDENCE_FILES = 3;
export const MAX_REPORT_EVIDENCE_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const REPORT_EVIDENCE_BUCKET_NAME = "reportEvidence";

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export interface ReportEvidenceMetadata {
    fileId: string;
    filename: string;
    contentType: string;
    size: number;
    uploadedAt: Date;
    hash?: string;
    flags?: string[];
    isSuspicious?: boolean;
    aiDescription?: string;
}

function getFileHash(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function resolveMimeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    mp4: "video/mp4",
    webm: "video/webm",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return map[ext] ?? "";
}

function basicFakeCheck(file: File, buffer: Buffer) {
  const issues: string[] = [];
  if (file.size < 1000) issues.push("too_small");
  if (file.name.endsWith(".jpg") && file.type !== "image/jpeg") {
    issues.push("mime_mismatch");
  }
  return issues;
}

async function generateMetadataDescription(filename: string, mimeType: string, sizeBytes: number, apiKey: string): Promise<string> {
  const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
  const ext = filename.split(".").pop()?.toUpperCase() ?? "file";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `An evidence file has been submitted to an anonymous incident reporting system. Generate a concise 1-2 sentence description for it based on the metadata below. Respond with ONLY the description text, no extra commentary.\n\nFilename: ${filename}\nFile type: ${mimeType} (${ext})\nFile size: ${sizeMb} MB`
            }]
          }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 512 }
        })
      }
    );
    if (!response.ok) return "";
    const data = await response.json();
    return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
  } catch {
    return "";
  }
}

async function analyzeEvidence(file: File, mimeType: string, buffer: Buffer): Promise<{ flags: string[], description: string }> {
  const result: { flags: string[], description: string } = { flags: [], description: "" };

  // Use the explicit mimeType — file.type can be empty when parsed server-side
  const effectiveMimeType = mimeType || file.type || "";
  console.log(`[analyzeEvidence] filename=${file.name} mimeType=${effectiveMimeType} size=${buffer.length}`);

  const isImage = effectiveMimeType.startsWith("image/");
  const isVideo = effectiveMimeType.startsWith("video/");
  // Gemini vision supports PDF inline; Word/other docs are not supported for vision
  const isGeminiVisionSupported = isImage || isVideo || effectiveMimeType === "application/pdf";

  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    console.warn("[analyzeEvidence] GOOGLE_GENAI_API_KEY is not set, skipping AI analysis.");
    return result;
  }

  // For file types Gemini vision can't process, fall back to metadata-based description
  if (!isGeminiVisionSupported) {
    console.log(`[analyzeEvidence] Non-visual file type "${effectiveMimeType}", generating metadata description.`);
    if (file.name.toLowerCase().includes("deepfake")) result.flags.push("deepfake");
    result.description = await generateMetadataDescription(file.name, effectiveMimeType, buffer.length, apiKey);
    console.log(`[analyzeEvidence] Metadata description: "${result.description}"`);
    return result;
  }

  const mediaTypeStr = isImage ? "image" : isVideo ? "video" : "document";
  const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
  let lastError = "";

  for (const model of MODELS) {
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: `You are a forensic AI analyst. Analyze this ${mediaTypeStr} and respond with ONLY a raw JSON object (no markdown, no backticks, no explanation). The JSON must have exactly two keys:\n- "flags": an array of strings describing any concerns (e.g. "manipulated", "deepfake", "ai_generated"), or an empty array [] if the ${mediaTypeStr} appears authentic.\n- "description": a concise 1-2 sentence description of what is visually shown in the ${mediaTypeStr}.\n\nExample: {"flags": [], "description": "A photo of a flooded street with debris visible."}`
                  },
                  { inlineData: { mimeType: effectiveMimeType, data: buffer.toString("base64") } }
                ]
              }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1024,
              }
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const parts: Array<{ text?: string; thought?: boolean }> = data?.candidates?.[0]?.content?.parts ?? [];
          const textPart = [...parts].reverse().find((p) => !p.thought && typeof p.text === "string");
          const rawText: string = textPart?.text ?? "";
          console.log(`[analyzeEvidence] [${model}] Raw response:`, rawText.slice(0, 100));

          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed.flags)) {
              result.flags = [...new Set([...result.flags, ...parsed.flags.filter((f: unknown) => typeof f === "string")])];
            }
            if (parsed.description && typeof parsed.description === "string" && parsed.description.trim()) {
              result.description = parsed.description.trim();
              console.log(`[analyzeEvidence] [${model}] Success: ${result.description}`);
              return result;
            }
          }
        }

        if (response.status === 429 || response.status === 503 || response.status === 500) {
          const waitTime = Math.pow(2, retries) * 1000;
          console.warn(`[analyzeEvidence] [${model}] Status ${response.status}, retrying in ${waitTime}ms...`);
          await new Promise(r => setTimeout(r, waitTime));
          retries++;
          continue;
        }

        const errText = await response.text();
        lastError = `[${model}] ${response.status}: ${errText}`;
        break; // Try next model
      } catch (error) {
        lastError = `[${model}] ${error instanceof Error ? error.message : "unknown error"}`;
        break; // Try next model
      }
    }
  }

  // Final Fallback: Groq (Images only)
  const groqApiKey = process.env.GROQ_API_KEY;
  if (isImage && groqApiKey) {
    try {
      console.log("[analyzeEvidence] Attempting Groq vision fallback...");
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.2-11b-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this image and respond with ONLY a raw JSON object (no backticks). JSON keys: "flags" (array of concern strings like "manipulated" or []) and "description" (1-2 sentence description).`
                },
                {
                  type: "image_url",
                  image_url: { url: `data:${effectiveMimeType};base64,${buffer.toString("base64")}` }
                }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 512,
        }),
      });

      if (groqResponse.ok) {
        const groqData = await groqResponse.json();
        const rawText = groqData.choices[0]?.message?.content ?? "";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.flags)) result.flags = [...new Set([...result.flags, ...parsed.flags])];
          if (parsed.description) {
            result.description = parsed.description.trim();
            console.log(`[analyzeEvidence] [Groq] Success: ${result.description}`);
            return result;
          }
        }
      } else {
        const errText = await groqResponse.text();
        console.warn(`[analyzeEvidence] Groq API error: ${errText}`);
      }
    } catch (err) {
      console.error("[analyzeEvidence] Groq fallback failed:", err);
    }
  }

  console.error("[analyzeEvidence] All models failed:", lastError);
  return result;
}

export function getReportEvidenceBucket() {
    if (!mongoose.connection.db) {
        throw new Error("MongoDB connection is not ready");
    }

    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: REPORT_EVIDENCE_BUCKET_NAME,
    });
}

function isValidObjectId(fileId: string) {
    return mongoose.isValidObjectId(fileId);
}

export async function uploadReportEvidence(
    trackingId: string,
    incidentId: string,
    files: File[]
): Promise<ReportEvidenceMetadata[]> {
    await dbConnect();

    if (files.length > MAX_REPORT_EVIDENCE_FILES) {
        throw new Error("Too many evidence files");
    }

    const bucket = getReportEvidenceBucket();
    const uploadedFileIds: string[] = [];
    const evidence: ReportEvidenceMetadata[] = [];

    try {
        for (const file of files) {
            if (file.size > MAX_REPORT_EVIDENCE_FILE_SIZE_BYTES) {
                throw new Error(`File too large: ${file.name}`);
            }

            // Resolve contentType early — file.type can be empty in server-side form parsing
            const contentType = (file.type?.trim()) || resolveMimeFromFilename(file.name);
            console.log(`[uploadReportEvidence] Processing: ${file.name} | resolved contentType: ${contentType}`);

            if (!ALLOWED_MIME_TYPES.includes(contentType)) {
                throw new Error(`Unsupported file type: ${contentType || "unknown"} (${file.name})`);
            }

            const filename = file.name?.trim() || "evidence";
            const buffer = Buffer.from(await file.arrayBuffer());

            const hash = getFileHash(buffer);

            if (!mongoose.connection.db) {
                throw new Error("MongoDB connection is not ready");
            }
            
            const existing = await mongoose.connection.db
                .collection(`${REPORT_EVIDENCE_BUCKET_NAME}.files`)
                .findOne({ "metadata.hash": hash });

            const flags = basicFakeCheck(file, buffer);
            if (existing) {
                flags.push("duplicate_file");
            }

            const analysis = await analyzeEvidence(file, contentType, buffer);
            flags.push(...analysis.flags);
            const aiDescription = analysis.description;

            const isSuspicious = flags.length > 0;

            if (flags.includes("deepfake") && flags.includes("manipulated")) {
                throw new Error("Evidence rejected due to authenticity concerns");
            }

            const fileId = await new Promise<string>((resolve, reject) => {
                const uploadStream = bucket.openUploadStream(filename, {
                    metadata: {
                        trackingId,
                        incidentId,
                        originalFilename: filename,
                        contentType,
                        hash,
                        flags,
                        isSuspicious,
                        aiDescription,
                    },
                });

                uploadStream.once("error", reject);
                uploadStream.once("finish", () => resolve(uploadStream.id.toString()));
                uploadStream.end(buffer);
            });

            uploadedFileIds.push(fileId);
            evidence.push({
                fileId,
                filename,
                contentType,
                size: file.size,
                uploadedAt: new Date(),
                hash,
                flags,
                isSuspicious,
                aiDescription,
            });
        }

        return evidence;
    } catch (error) {
        await deleteReportEvidence(uploadedFileIds);
        throw error;
    }
}

export async function deleteReportEvidence(fileIds: string[]) {
    if (!fileIds.length) {
        return;
    }

    await dbConnect();
    const bucket = getReportEvidenceBucket();

    await Promise.all(
        fileIds.map(
            (fileId) =>
                new Promise<void>((resolve, reject) => {
                    if (!isValidObjectId(fileId)) {
                        resolve();
                        return;
                    }

                    bucket
                        .delete(new mongoose.Types.ObjectId(fileId))
                        .then(() => resolve())
                        .catch((error) => reject(error));
                })
        )
    );
}

export async function createSecureDownloadStream(fileId: string, trackingId: string) {
    await dbConnect();
    const bucket = getReportEvidenceBucket();

    if (!mongoose.connection.db) {
        throw new Error("MongoDB connection is not ready");
    }

    const files = await mongoose.connection.db
        .collection(`${REPORT_EVIDENCE_BUCKET_NAME}.files`)
        .findOne({ _id: new mongoose.Types.ObjectId(fileId) });

    if (!files || files.metadata?.trackingId !== trackingId) {
        throw new Error("Unauthorized access");
    }

    return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
}