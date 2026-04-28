/**
 * backfill-evidence-descriptions.mjs
 *
 * Finds all report evidence items in MongoDB that have an empty aiDescription,
 * downloads each file from GridFS, runs Gemini AI analysis on it, and updates
 * the MongoDB document with the generated description and any flags.
 *
 * Usage:
 *   node scripts/backfill-evidence-descriptions.mjs
 *
 * Requirements:
 *   - MONGODB_URI in .env.local
 *   - GOOGLE_GENAI_API_KEY in .env.local
 */

import mongoose from "mongoose";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Load .env.local manually (no dotenv dependency needed in newer Node)
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

try {
  const envContent = readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
  console.log("✓ Loaded .env.local");
} catch {
  console.error("✗ Could not load .env.local — make sure it exists at the project root.");
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
const GOOGLE_GENAI_API_KEY = process.env.GOOGLE_GENAI_API_KEY;
const BUCKET_NAME = "reportEvidence";

if (!MONGODB_URI) { console.error("Missing MONGODB_URI"); process.exit(1); }
if (!GOOGLE_GENAI_API_KEY) { console.error("Missing GOOGLE_GENAI_API_KEY"); process.exit(1); }

// ---------------------------------------------------------------------------
// MIME helpers
// ---------------------------------------------------------------------------
function resolveMimeFromFilename(filename) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
    mp4: "video/mp4", webm: "video/webm", pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return map[ext] ?? "";
}

// ---------------------------------------------------------------------------
// Gemini helpers
// ---------------------------------------------------------------------------
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

async function fetchGemini(model, body, retries = 4) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_GENAI_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    if (res.ok) return res;
    const errorText = await res.text();
    if (res.status === 429 || res.status === 503) {
      const retryAfterMatch = errorText.match(/retryDelay":"(\d+)s"/);
      const waitSec = retryAfterMatch ? parseInt(retryAfterMatch[1]) + 2 : 30;
      const reason = res.status === 429 ? "Rate limited" : "Overloaded";
      console.log(`     ⏳ ${reason} on ${model}, waiting ${waitSec}s (attempt ${attempt + 1}/${retries + 1})...`);
      await new Promise(r => setTimeout(r, waitSec * 1000));
      continue;
    }
    throw new Error(`Gemini API error ${res.status}: ${errorText}`);
  }
  throw new Error(`Gemini API: max retries exceeded for ${model}`);
}

async function fetchGeminiWithFallback(body) {
  for (const model of MODELS) {
    try {
      return await fetchGemini(model, body);
    } catch (err) {
      if (MODELS.indexOf(model) < MODELS.length - 1) {
        console.log(`     ↩ Falling back from ${model}: ${err.message.slice(0, 80)}`);
      } else {
        throw err;
      }
    }
  }
}

async function callGeminiVision(mimeType, base64Data, mediaTypeStr) {
  const prompt = `You are a forensic AI analyst. Analyze this ${mediaTypeStr} and respond with ONLY a raw JSON object (no markdown, no backticks, no explanation). The JSON must have exactly two keys:\n- "flags": an array of strings describing any concerns (e.g. "manipulated", "deepfake", "ai_generated"), or an empty array [] if the ${mediaTypeStr} appears authentic.\n- "description": a concise 1-2 sentence description of what is visually shown in the ${mediaTypeStr}.\n\nExample: {"flags": [], "description": "A photo of a flooded street with debris visible."}`;

  const res = await fetchGeminiWithFallback({
    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
  });
  const data = await res.json();
  // Gemini 2.5 returns thinking tokens in earlier parts — find the last non-thought part
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const textPart = [...parts].reverse().find(p => !p.thought && typeof p.text === "string");
  const rawText = textPart?.text ?? "";
  console.log(`     📝 Raw vision response (${rawText.length} chars):`, rawText.slice(0, 200));
  return rawText;
}

async function callGeminiText(filename, mimeType, sizeBytes) {
  const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
  const ext = filename.split(".").pop()?.toUpperCase() ?? "file";
  const prompt = `An evidence file has been submitted to an anonymous incident reporting system. Generate a concise 1-2 sentence description for it based on the metadata below. Respond with ONLY the description text, no extra commentary.\n\nFilename: ${filename}\nFile type: ${mimeType} (${ext})\nFile size: ${sizeMb} MB`;

  const res = await fetchGeminiWithFallback({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
  });
  const data = await res.json();
  // Gemini 2.5 returns thinking tokens in earlier parts — find the last non-thought part
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const textPart = [...parts].reverse().find(p => !p.thought && typeof p.text === "string");
  return (textPart?.text ?? "").trim();
}

function parseGeminiJson(rawText) {
  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

async function analyzeFile(filename, mimeType, buffer) {
  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");
  const isPdf = mimeType === "application/pdf";
  const isGeminiVision = isImage || isVideo || isPdf;

  if (isGeminiVision) {
    const mediaTypeStr = isImage ? "image" : isVideo ? "video" : "document";
    const rawText = await callGeminiVision(mimeType, buffer.toString("base64"), mediaTypeStr);
    const parsed = parseGeminiJson(rawText);
    return {
      description: parsed?.description?.trim() ?? "",
      flags: Array.isArray(parsed?.flags) ? parsed.flags.filter(f => typeof f === "string") : [],
    };
  } else {
    // Non-visual: text-only description from metadata
    const description = await callGeminiText(filename, mimeType, buffer.length);
    return { description, flags: [] };
  }
}

// ---------------------------------------------------------------------------
// GridFS download helper
// ---------------------------------------------------------------------------
async function downloadFromGridFS(db, fileId) {
  const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
  const chunks = [];
  await new Promise((resolve, reject) => {
    const stream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  return Buffer.concat(chunks);
}

// ---------------------------------------------------------------------------
// Main backfill
// ---------------------------------------------------------------------------
async function main() {
  console.log("\n🔗 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  console.log("✓ Connected\n");

  // Find all reports that have at least one evidence item with empty aiDescription
  const reports = await db.collection("reports").find({
    "evidence.0": { $exists: true },
  }).toArray();

  console.log(`📋 Found ${reports.length} report(s) with evidence\n`);

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const report of reports) {
    const evidence = report.evidence ?? [];
    let reportModified = false;

    for (let i = 0; i < evidence.length; i++) {
      const item = evidence[i];
      totalProcessed++;

      // Skip if already has a description
      if (item.aiDescription && item.aiDescription.trim().length > 0) {
        console.log(`  ⏭  [${report.trackingId}] ${item.filename} — already has description, skipping`);
        totalSkipped++;
        continue;
      }

      const mimeType = item.contentType || resolveMimeFromFilename(item.filename);
      console.log(`  🔍 [${report.trackingId}] ${item.filename} (${mimeType})`);

      try {
        // Download file from GridFS
        const buffer = await downloadFromGridFS(db, item.fileId);
        console.log(`     ↓ Downloaded ${(buffer.length / 1024).toFixed(1)} KB from GridFS`);

        // Run AI analysis
        const analysis = await analyzeFile(item.filename, mimeType, buffer);
        console.log(`     ✨ Description: "${analysis.description}"`);
        if (analysis.flags.length) console.log(`     🚩 Flags: ${analysis.flags.join(", ")}`);

        if (!analysis.description) {
          console.warn(`     ⚠ Description is empty — skipping save for this item`);
          totalErrors++;
          continue;
        }

        // Use positional $set to update this specific evidence index directly
        const updateKey = `evidence.${i}.aiDescription`;
        const flagsKey = `evidence.${i}.flags`;
        const suspKey = `evidence.${i}.isSuspicious`;
        const newFlags = [...new Set([...(item.flags ?? []), ...analysis.flags])];
        const newSusp = (item.isSuspicious ?? false) || analysis.flags.length > 0;

        await db.collection("reports").updateOne(
          { _id: report._id },
          { $set: { [updateKey]: analysis.description, [flagsKey]: newFlags, [suspKey]: newSusp } }
        );
        console.log(`     💾 Saved aiDescription for evidence[${i}]`);

        // Verify the save
        const verify = await db.collection("reports").findOne(
          { _id: report._id },
          { projection: { [`evidence.${i}.aiDescription`]: 1 } }
        );
        const saved = verify?.evidence?.[i]?.aiDescription;
        console.log(`     ✅ Verified in DB: "${saved?.slice(0, 80)}"`);

        totalUpdated++;
      } catch (err) {
        console.error(`     ✗ Failed: ${err.message}`);
        totalErrors++;
      }
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Done!`);
  console.log(`   Total evidence items : ${totalProcessed}`);
  console.log(`   Updated              : ${totalUpdated}`);
  console.log(`   Skipped (had desc)   : ${totalSkipped}`);
  console.log(`   Errors               : ${totalErrors}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal:", err);
  mongoose.disconnect();
  process.exit(1);
});
