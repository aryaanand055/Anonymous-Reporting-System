import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import ReportModel from "@/models/Report";
import { generateReportSummary, generateSeverityFromText, getEmbedding, analyzeReportDetails } from "@/ai/summarize";
import { revalidatePath } from "next/cache";
import { decryptPayload, type EncryptedPayload } from "@/lib/encryption";
import { analyzeReportDepartments } from "@/lib/report-routing";
import {
  MAX_REPORT_EVIDENCE_FILE_SIZE_BYTES,
  MAX_REPORT_EVIDENCE_FILES,
  REPORT_EVIDENCE_FIELD_NAME,
  deleteReportEvidence,
  uploadReportEvidence,
} from "@/lib/report-evidence";

export const runtime = "nodejs";

const ENCRYPTED_FIELD_NAME = "encrypted";

type HardwarePayload = {
  trackingId?: string;
  tracking_id?: string;
  location?: string;
  district?: string;
  reportDateLabel?: string;
  date?: string; // legacy
  institutionType?: string;
  institution_type?: string; // legacy
  issueType?: string;
  issue_type?: string; // legacy
  severityLevel?: string;
  severity_level?: string; // legacy
  emotionalIndicator?: string;
  emotional_indicator?: string; // legacy
  rawText?: string;
  raw_text?: string; // legacy
};

type SeverityValue = "low" | "medium" | "high";

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function normalizeSeverity(value: unknown): SeverityValue | undefined {
  const normalized = normalizeText(value)?.toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }

  return undefined;
}

function generateTrackingId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `AR-${suffix}`;
}

function revalidateDepartmentPaths(departments: string[]) {
  for (const department of departments) {
    revalidatePath(`/dashboard/${department.replace("_", "-")}`);
  }
}

function cosineSimilarity(a: number[], b: number[]) {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  return dot / (magA * magB);
}

function severityToScore(sev: "low" | "medium" | "high"): number {
  if (sev === "high") return 3;
  if (sev === "medium") return 2;
  return 1;
}

function scoreToSeverity(score: number): "low" | "medium" | "high" {
  if (score >= 2.5) return "high";
  if (score >= 2.0) return "medium";
  return "low";
}

function calculateClusterSeverity(base: number, count: number) {
  let score = base;
  // Only boost if there's a significant cluster (3+ reports)
  if (count >= 3) {
    score += Math.log10(count); // Much slower growth than log2
  }
  return Math.min(score, 3);
}

function adjustSeverityForEvidence(score: number, flags: string[]) {
  // If evidence is suspicious, always penalize the score
  if (flags.includes("deepfake") || flags.includes("ai_generated") || flags.includes("manipulated")) {
    return Math.max(score - 1, 1);
  }

  // Only boost if the evidence is perfectly clean AND the current score is low
  // This prevents Medium reports from becoming High just because they have a photo
  if (flags.length === 0 && score < 2) {
    return Math.min(score + 0.5, 3); // Subtle boost instead of +1
  }

  return score;
}

function isFileEntry(value: FormDataEntryValue): value is File {
  return typeof value !== "string";
}

function getFormValue(formData: FormData, ...keys: string[]) {
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === "string") {
      return value;
    }
  }

  return undefined;
}

async function parseHardwareSubmission(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const encryptedField = formData.get(ENCRYPTED_FIELD_NAME);
    let data: HardwarePayload;

    if (typeof encryptedField === "string") {
      try {
        const apiKey = req.headers.get("X-API-KEY");
        if (!apiKey) {
          throw new Error("API key required for decryption");
        }

        const encrypted = JSON.parse(encryptedField) as EncryptedPayload;
        const decrypted = decryptPayload(apiKey, encrypted);
        data = JSON.parse(decrypted) as HardwarePayload;
      } catch (error) {
        throw new Error(`Failed to decrypt payload: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    } else {
      data = {
        trackingId: getFormValue(formData, "trackingId", "tracking_id", "reporting_id", "reportingId"),
        location: getFormValue(formData, "location"),
        district: getFormValue(formData, "district"),
        reportDateLabel: getFormValue(formData, "reportDateLabel", "date"),
        institutionType: getFormValue(formData, "institutionType", "institution_type"),
        issueType: getFormValue(formData, "issueType", "issue_type"),
        severityLevel: getFormValue(formData, "severityLevel", "severity_level"),
        emotionalIndicator: getFormValue(formData, "emotionalIndicator", "emotional_indicator"),
        rawText: getFormValue(formData, "rawText", "raw_text"),
      };
    }

    const allFormKeys = [...formData.keys()];
    console.log("[parseHardwareSubmission] All form keys:", allFormKeys);

    const evidenceFiles = [
      ...formData.getAll(REPORT_EVIDENCE_FIELD_NAME),
      ...formData.getAll(`${REPORT_EVIDENCE_FIELD_NAME}[]`),
    ].filter(isFileEntry);

    console.log(`[parseHardwareSubmission] Evidence files found: ${evidenceFiles.length}`, evidenceFiles.map(f => `${f.name} (${f.type || "no-type"}, ${f.size}B)`));

    const providedReportingId = getFormValue(formData, "reporting_id", "reportingId", "trackingId");

    return {
      data,
      evidenceFiles,
      providedReportingId,
    };
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const safeBody = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const encryptedField = safeBody.encrypted;

  let data: HardwarePayload;

  if (encryptedField && typeof encryptedField === "object") {
    try {
      const apiKey = req.headers.get("X-API-KEY");
      if (!apiKey) {
        throw new Error("API key required for decryption");
      }

      data = JSON.parse(decryptPayload(apiKey, encryptedField as EncryptedPayload)) as HardwarePayload;
    } catch (error) {
      throw new Error(`Failed to decrypt payload: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  } else {
    data = safeBody as HardwarePayload;
  }

  const providedReportingId =
    typeof safeBody.reporting_id === "string"
      ? safeBody.reporting_id
      : typeof safeBody.reportingId === "string"
        ? safeBody.reportingId
        : typeof safeBody.trackingId === "string"
          ? safeBody.trackingId
          : undefined;

  return {
    data,
    evidenceFiles: [] as File[],
    providedReportingId,
  };
}

export async function POST(req: NextRequest) {
  let uploadedEvidenceIds: string[] = [];

  try {
    const configuredHardwareApiKey = process.env.HARDWARE_API_KEY;
    if (!configuredHardwareApiKey) {
      console.error("Missing HARDWARE_API_KEY environment variable.");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    // 1. Validate API Key
    const apiKey = req.headers.get("X-API-KEY");
    if (apiKey !== configuredHardwareApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Body (with optional decryption)
    let data: HardwarePayload;
    let evidenceFiles: File[];
    let providedReportingId: string | undefined;

    try {
      const result: any = await parseHardwareSubmission(req);
      data = result.data;
      evidenceFiles = result.evidenceFiles;
      providedReportingId = result.providedReportingId;
      console.log(`[POST /api/reports] PARSED → providedReportingId="${providedReportingId}", data.trackingId="${data.trackingId}", data.tracking_id="${data.tracking_id}", raw_text length=${data.raw_text?.length ?? data.rawText?.length ?? 0}`);
    } catch (error) {
      return NextResponse.json(
        { error: `Invalid request: ${error instanceof Error ? error.message : "unknown error"}` },
        { status: 400 }
      );
    }

    if (evidenceFiles.length > MAX_REPORT_EVIDENCE_FILES) {
      return NextResponse.json(
        { error: `A maximum of ${MAX_REPORT_EVIDENCE_FILES} evidence files is allowed` },
        { status: 400 }
      );
    }

    for (const file of evidenceFiles) {
      if (file.size > MAX_REPORT_EVIDENCE_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `Each evidence file must be 20 MB or smaller: ${file.name || "unnamed file"}` },
          { status: 400 }
        );
      }
    }

    const rawText = normalizeText(data.rawText ?? data.raw_text);

    // AI Extraction and Spam Detection (Hardware only sends rawText now)
    let aiExtracted: {
      location: string;
      district: string;
      institutionType: string;
      issueType: string;
      isSpam: boolean;
      spamReason?: string;
    } = {
      location: "Unknown location",
      district: "Unknown district",
      institutionType: "Unspecified institution",
      issueType: "Unspecified issue",
      isSpam: false,
    };

    if (rawText) {
      console.log("[POST /api/reports] Analyzing rawText for metadata and spam via AI...");
      aiExtracted = await analyzeReportDetails(rawText);
    }

    const location = normalizeText(data.location) ?? aiExtracted.location ?? "Unknown location";
    const district = normalizeText(data.district) ?? aiExtracted.district ?? "Unknown district";
    const reportDateLabel =
      normalizeText(data.reportDateLabel ?? data.date) ??
      new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    const institutionType = normalizeText(data.institutionType ?? data.institution_type) ?? aiExtracted.institutionType;
    let issueType = normalizeText(data.issueType ?? data.issue_type) ?? aiExtracted.issueType;

    // Handle Spam Label
    if (aiExtracted.isSpam) {
      issueType = `SPAM: ${issueType}`;
      console.log(`[POST /api/reports] Content identified as SPAM. Reason: ${aiExtracted.spamReason}`);
    }

    const emotionalIndicator = normalizeText(data.emotionalIndicator ?? data.emotional_indicator) ?? "unspecified";

    const narrativeText = rawText ?? `${issueType} reported at ${institutionType} in ${location}.`;
    const title = `${issueType} at ${institutionType}`;
    const description = narrativeText;

    await dbConnect();

    // 🚀 Architecture Upgrade: Incident Clustering & Vector Search
    const newEmbedding = await getEmbedding(narrativeText);

    // Compare against all existing reports (no time constraint)
    const existingReports = await ReportModel.find({}).lean();

    let matchedIncidentId = null;
    let maxSim = 0;

    for (const r of existingReports) {
      if (!r.embedding || r.embedding.length === 0) continue;
      const sim = cosineSimilarity(newEmbedding, r.embedding);
      if (sim > 0.85 && sim > maxSim) {
        maxSim = sim;
        matchedIncidentId = r.incidentId;
      }
    }

    const incidentId = matchedIncidentId || `INC-${Date.now()}`;

    // Use device-provided tracking ID; fall back to auto-generation only if missing
    let trackingId = providedReportingId
      ?? normalizeText(data.trackingId ?? data.tracking_id);

    if (!trackingId) {
      trackingId = generateTrackingId();
      for (let attempts = 0; attempts < 5; attempts += 1) {
        const existing = await ReportModel.findOne({ trackingId }).select("_id").lean();
        if (!existing) {
          break;
        }
        trackingId = generateTrackingId();
      }
    }

    console.log(`[POST /api/reports] Using trackingId: ${trackingId} (device-provided: ${!!providedReportingId})`);

    console.log(`[POST /api/reports] evidenceFiles.length=${evidenceFiles.length}, calling uploadReportEvidence=${evidenceFiles.length > 0}`);
    const evidence = evidenceFiles.length ? await uploadReportEvidence(trackingId, incidentId, evidenceFiles) : [];
    uploadedEvidenceIds = evidence.map((item) => item.fileId);

    // AI Evidence Adjustments
    let evidenceFlags: string[] = [];
    let combinedDescriptions = "";

    evidence.forEach(e => {
      if (e.flags) evidenceFlags.push(...e.flags);
      if (e.aiDescription) combinedDescriptions += e.aiDescription + ". ";
    });

    const fullTextForSeverity = combinedDescriptions
      ? `${rawText ?? ""}\n\nVisual Evidence Descriptions: ${combinedDescriptions.trim()}`
      : (rawText ?? description);

    // Base Severity (now incorporates Visual Evidence Descriptions)
    const baseSeverity = await generateSeverityFromText(fullTextForSeverity);
    const baseScore = severityToScore(baseSeverity);

    const incidentReports = await ReportModel.find({ incidentId });
    const count = incidentReports.length;

    const finalScore = calculateClusterSeverity(baseScore, count);
    const adjustedScore = adjustSeverityForEvidence(finalScore, evidenceFlags);
    let severityLevel = scoreToSeverity(adjustedScore);

    // Force LOW severity for Spam
    if (aiExtracted.isSpam) {
      severityLevel = "low";
    }

    // Spike Detection
    const last10Min = new Date(Date.now() - 1000 * 60 * 10);
    const recentCount = await ReportModel.countDocuments({
      incidentId,
      createdAt: { $gte: last10Min },
    });

    if (recentCount >= 5) {
      console.log(`🚨 INCIDENT SPIKE DETECTED for Incident ID: ${incidentId}`);
      // send alert to dashboard / authorities
    }

    const routing = await analyzeReportDepartments({
      title,
      description,
      location,
      issueType,
      rawText,
      institutionType,
      severityLevel,
    });
    const department = routing.primaryDepartment;
    const departments = routing.departments;
    const priority = severityLevel;

    // 4. Generate AI Summary (reusing logic from server action)
    const aiSummary = await generateReportSummary(description);





    // 5. Create Report
    let report;
    try {
      report = await ReportModel.create({
        trackingId,
        title,
        description,
        location,
        district,
        reportDateLabel,
        institutionType,
        issueType,
        severityLevel,
        emotionalIndicator,
        rawText,
        priority,
        department,
        departments,
        aiSummary,
        incidentId,
        embedding: newEmbedding,
        evidence,
        isSpam: aiExtracted.isSpam,
      spamReason: aiExtracted.spamReason,
      status: "pending",
      });
    } catch (createErr: any) {
      // Handle duplicate trackingId collisions gracefully: if the report already exists,
      // respond success since the device-provided reporting id is already stored.
      if (createErr && createErr.code === 11000 && /trackingId/.test(createErr.message || "")) {
        console.warn("Duplicate trackingId detected; treating as success for id:", trackingId);

        // Revalidate caches for the dashboard (do not attempt to create again)
        revalidatePath("/");
        revalidatePath("/dashboard/admin");
        revalidateDepartmentPaths(departments);

        return NextResponse.json({ success: true, message: "Report received successfully" });
      }

      throw createErr;
    }

    // 6. Revalidate caches for the dashboard
    revalidatePath("/");
    revalidatePath("/dashboard/admin");
    revalidateDepartmentPaths(departments);

    // Return only a simple success message to the device (do not return internal IDs)
    return NextResponse.json({ success: true, message: "Report received successfully" });

  } catch (error) {
    console.error("API Error:", error);
    if (uploadedEvidenceIds.length) {
      await deleteReportEvidence(uploadedEvidenceIds).catch((cleanupError) => {
        console.error("Failed to clean up uploaded evidence after report failure:", cleanupError);
      });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const trackingId = req.nextUrl.searchParams.get("trackingId")?.trim().toUpperCase();
    if (!trackingId) {
      return NextResponse.json({ error: "trackingId query param is required" }, { status: 400 });
    }

    const report = await ReportModel.findOne({ trackingId }).lean();
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      report: {
        trackingId: report.trackingId,
        status: report.status,
        issueType: report.issueType ?? report.title ?? "Unspecified issue",
        location: report.location ?? "Unknown location",
        department: report.department,
        departments: Array.isArray(report.departments) ? report.departments : [report.department],
        createdAt:
          report.createdAt instanceof Date
            ? report.createdAt.toISOString()
            : new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
