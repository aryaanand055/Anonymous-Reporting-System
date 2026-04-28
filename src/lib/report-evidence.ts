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

function basicFakeCheck(file: File, buffer: Buffer) {
  const issues: string[] = [];
  if (file.size < 1000) issues.push("too_small");
  if (file.name.endsWith(".jpg") && file.type !== "image/jpeg") {
    issues.push("mime_mismatch");
  }
  return issues;
}

async function analyzeEvidence(file: File, buffer: Buffer): Promise<{ flags: string[], description: string }> {
  const result = { flags: [], description: "" };
  
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const isDoc = file.type === "application/pdf";

  // Gemini 1.5 inline data supports images, short videos, and PDFs natively
  if (!isImage && !isVideo && !isDoc) {
    if (file.name.toLowerCase().includes("deepfake")) result.flags.push("deepfake" as never);
    return result;
  }

  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return result;

  let mediaTypeStr = isImage ? "image" : isVideo ? "video" : "document";

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `Analyze this ${mediaTypeStr} natively. Act as a forensic AI. Output a valid JSON object with exactly two keys: 'flags' (array of strings, like 'manipulated' or 'deepfake', or [] if clean), and 'description' (a concise 1-2 sentence description of exactly what visual evidence is shown in the ${mediaTypeStr}).` },
            { inlineData: { mimeType: file.type, data: buffer.toString("base64") } }
          ]
        }]
      })
    });

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const cleanText = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanText);

    if (Array.isArray(parsed.flags)) result.flags.push(...parsed.flags as never[]);
    if (parsed.description) result.description = parsed.description;
  } catch (error) {
    console.error("Gemini Vision AI Analysis failed:", error);
  }

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

            if (!ALLOWED_MIME_TYPES.includes(file.type)) {
                throw new Error(`Unsupported file type: ${file.type}`);
            }

            const contentType = file.type?.trim();
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

            const analysis = await analyzeEvidence(file, buffer);
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