import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import ReportModel from "@/models/Report";
import { generateReportSummary, generateSeverityFromText, getEmbedding } from "@/ai/summarize";
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
  location?: string;
  district?: string;
  date?: string;
  institution_type?: string;
  issue_type?: string;
  severity_level?: string;
  emotional_indicator?: string;
  raw_text?: string;
  rawText?: string;
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
  if (score >= 3) return "high";
  if (score === 2) return "medium";
  return "low";
}

function calculateClusterSeverity(base: number, count: number) {
  let score = base;
  score += Math.log2(count + 1); // exponential growth feel
  return Math.min(Math.round(score), 3);
}

function adjustSeverityForEvidence(score: number, flags: string[]) {
  if (flags.includes("deepfake") || flags.includes("ai_generated")) {
    return Math.max(score - 1, 1); // reduce severity
  }

  if (flags.length === 0) {
    return Math.min(score + 1, 3); // trusted evidence boost
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
        location: getFormValue(formData, "location"),
        district: getFormValue(formData, "district"),
        date: getFormValue(formData, "date"),
        institution_type: getFormValue(formData, "institution_type"),
        issue_type: getFormValue(formData, "issue_type"),
        severity_level: getFormValue(formData, "severity_level"),
        emotional_indicator: getFormValue(formData, "emotional_indicator"),
        raw_text: getFormValue(formData, "raw_text"),
        rawText: getFormValue(formData, "rawText"),
      } satisfies HardwarePayload;
    }

    const evidenceFiles = [
      ...formData.getAll(REPORT_EVIDENCE_FIELD_NAME),
      ...formData.getAll(`${REPORT_EVIDENCE_FIELD_NAME}[]`),
    ].filter(isFileEntry);

    return {
      data,
      evidenceFiles,
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

  return {
    data,
    evidenceFiles: [] as File[],
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

    try {
      const result = await parseHardwareSubmission(req);
      data = result.data;
      evidenceFiles = result.evidenceFiles;
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

    const location = normalizeText(data.location) ?? "Unknown location";
    const district = normalizeText(data.district) ?? "Unknown district";
    const reportDateLabel =
      normalizeText(data.date) ??
      new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    const institutionType = normalizeText(data.institution_type) ?? "Unspecified institution";
    const issueType = normalizeText(data.issue_type) ?? "Unspecified issue";
    const emotionalIndicator = normalizeText(data.emotional_indicator) ?? "unspecified";
    const rawText = normalizeText(data.raw_text ?? data.rawText);
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

    // Base Severity
    const baseSeverity = normalizeSeverity(data.severity_level) ?? (await generateSeverityFromText(narrativeText));
    const baseScore = severityToScore(baseSeverity);

    const incidentReports = await ReportModel.find({ incidentId });
    const count = incidentReports.length;

    let trackingId = generateTrackingId();
    for (let attempts = 0; attempts < 5; attempts += 1) {
      const existing = await ReportModel.findOne({ trackingId }).select("_id").lean();
      if (!existing) {
        break;
      }
      trackingId = generateTrackingId();
    }

    const evidence = evidenceFiles.length ? await uploadReportEvidence(trackingId, incidentId, evidenceFiles) : [];
    uploadedEvidenceIds = evidence.map((item) => item.fileId);

    // AI Evidence Adjustments
    let evidenceFlags: string[] = [];
    evidence.forEach(e => {
      if (e.flags) evidenceFlags.push(...e.flags);
    });

    const finalScore = calculateClusterSeverity(baseScore, count);
    const adjustedScore = adjustSeverityForEvidence(finalScore, evidenceFlags);
    const severityLevel = scoreToSeverity(adjustedScore);

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
      rawText: rawText ?? description,
      institutionType,
      severityLevel,
    });
    const department = routing.primaryDepartment;
    const departments = routing.departments;
    const priority = severityLevel;

    // 4. Generate AI Summary (reusing logic from server action)
    const aiSummary = await generateReportSummary(description);





    // 5. Create Report
    const report = await ReportModel.create({
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
      rawText: rawText ?? description,
      priority,
      department,
      departments,
      aiSummary,
      incidentId,
      embedding: newEmbedding,
      evidence,
      status: "pending",
    });

    // 6. Revalidate caches for the dashboard
    revalidatePath("/");
    revalidatePath("/dashboard/admin");
    revalidateDepartmentPaths(departments);

    return NextResponse.json({
      success: true,
      message: "Report received successfully",
      id: report._id.toString(),
      trackingId: report.trackingId,
    });

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
