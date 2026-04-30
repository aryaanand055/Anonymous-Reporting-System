/**
 * recalculate-report-severity.mjs
 *
 * This script iterates through all reports in the database and recalculates their 
 * severityLevel and priority based on the updated AI prompt and scoring logic.
 *
 * Logic:
 * 1. Re-classifies text using the new detailed Gemini prompt (Base Severity).
 * 2. Applies cluster boosting based on the number of reports in the same incident.
 * 3. Adjusts for evidence quality (penalizes suspicious flags, subtle boost for clean low-sev).
 *
 * Usage:
 *   node scripts/recalculate-report-severity.mjs
 */

import mongoose from "mongoose";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Load .env.local
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
  console.error("✗ Could not load .env.local");
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
const GOOGLE_GENAI_API_KEY = process.env.GOOGLE_GENAI_API_KEY;

if (!MONGODB_URI) { console.error("Missing MONGODB_URI"); process.exit(1); }
if (!GOOGLE_GENAI_API_KEY) { console.error("Missing GOOGLE_GENAI_API_KEY"); process.exit(1); }

// ---------------------------------------------------------------------------
// Scoring Logic (Mirrors route.ts)
// ---------------------------------------------------------------------------
function severityToScore(sev) {
  if (sev === "high") return 3;
  if (sev === "medium") return 2;
  return 1;
}

function scoreToSeverity(score) {
  if (score >= 2.5) return "high";
  if (score >= 2.0) return "medium";
  return "low";
}

function calculateClusterSeverity(base, count) {
  let score = base;
  if (count >= 3) {
    score += Math.log10(count);
  }
  return Math.min(score, 3);
}

function adjustSeverityForEvidence(score, flags) {
  if (flags.includes("deepfake") || flags.includes("ai_generated") || flags.includes("manipulated")) {
    return Math.max(score - 1, 1);
  }
  if (flags.length === 0 && score < 2) {
    return Math.min(score + 0.5, 3);
  }
  return score;
}

// ---------------------------------------------------------------------------
// Gemini AI Call
// ---------------------------------------------------------------------------
async function generateSeverityFromText(text) {
  const prompt = `
Classify the severity of the following incident report into ONLY one of: low, medium, or high.

Classification Criteria:
- HIGH: Immediate threat to life, active violence, major fire, severe physical abuse, ongoing crime in progress, or large-scale public safety emergency. (e.g., "Armed robbery in progress", "Building on fire", "Severe assault").
- MEDIUM: Serious incidents that require investigation but are not immediately life-threatening. Property damage, non-violent harassment, significant theft, health hazards that are not immediate emergencies. (e.g., "Burglary that happened overnight", "Vandalism", "Persistent workplace harassment", "Illegal dumping of hazardous waste").
- LOW: Minor issues, administrative complaints, general feedback, non-urgent quality of life issues, or reports that are VAGUE, INCOMPLETE, or have "UNSPECIFIED" details. (e.g., "Littering in a park", "Noise complaint", "Unspecified issue at government building", "No description provided").

Text to analyze: "${text}"

Respond with ONLY one word: low, medium, or high.
`;

  const groqApiKey = process.env.GROQ_API_KEY;
  if (groqApiKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 10,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const output = data.choices[0]?.message?.content?.trim().toLowerCase();
        if (["low", "medium", "high"].includes(output)) return output;
      }
    } catch (err) {
      console.log(`     ↩ Groq failed, falling back to Gemini...`);
    }
  }

  const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
  
  for (const model of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_GENAI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 10 }
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        if (res.status === 429) {
            console.log(`     ⏳ Rate limited on ${model}, waiting 30s...`);
            await new Promise(r => setTimeout(r, 30000));
            continue;
        }
        throw new Error(err);
      }

      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      const textPart = [...parts].reverse().find(p => !p.thought && typeof p.text === "string");
      const output = (textPart?.text ?? "").trim().toLowerCase();

      if (["low", "medium", "high"].includes(output)) return output;
    } catch (err) {
      if (MODELS.indexOf(model) === MODELS.length - 1) throw err;
      console.log(`     ↩ Falling back from ${model}...`);
    }
  }
  return "medium";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("\n🔗 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  console.log("✓ Connected\n");

  const reports = await db.collection("reports").find({}).toArray();
  console.log(`📋 Processing ${reports.length} reports...\n`);

  let updatedCount = 0;

  for (const report of reports) {
    console.log(`🔍 [${report.trackingId}] ${report.title.slice(0, 40)}...`);

    // 1. Get flags and descriptions
    let evidenceFlags = [];
    let combinedDescriptions = "";
    if (Array.isArray(report.evidence)) {
      report.evidence.forEach(e => {
        if (e.flags) evidenceFlags.push(...e.flags);
        if (e.aiDescription) combinedDescriptions += e.aiDescription + ". ";
      });
    }

    const fullText = combinedDescriptions 
        ? `${report.rawText ?? report.description}\n\nVisual Evidence: ${combinedDescriptions.trim()}` 
        : (report.rawText ?? report.description);

    // 2. AI Re-classification
    const baseSeverity = await generateSeverityFromText(fullText);
    const baseScore = severityToScore(baseSeverity);

    // 3. Cluster Count
    const incidentCount = await db.collection("reports").countDocuments({ 
        incidentId: report.incidentId,
        _id: { $ne: report._id } // existing ones other than this
    });

    // 4. Calculate Final
    const finalScoreBeforeAdj = calculateClusterSeverity(baseScore, incidentCount);
    const finalScore = adjustSeverityForEvidence(finalScoreBeforeAdj, evidenceFlags);
    const newSeverity = scoreToSeverity(finalScore);

    console.log(`   🤖 AI Base: ${baseSeverity} | Score: ${finalScore.toFixed(2)} | Cluster: ${incidentCount}`);

    const changed = report.severityLevel !== newSeverity;
    
    if (changed) {
      console.log(`   ✨ OLD: ${report.severityLevel.padEnd(6)} -> NEW: ${newSeverity}`);
      await db.collection("reports").updateOne(
        { _id: report._id },
        { $set: { severityLevel: newSeverity, priority: newSeverity } }
      );
      updatedCount++;
    } else {
      console.log(`   ✅ Kept as ${newSeverity}`);
    }
  }

  console.log(`\n✅ Done! Updated ${updatedCount} reports.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
