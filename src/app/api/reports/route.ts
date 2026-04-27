import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import ReportModel from "@/models/Report";
import { generateReportSummary } from "@/ai/summarize";
import { revalidatePath } from "next/cache";
import {
  MAX_REPORT_EVIDENCE_FILE_SIZE_BYTES,
  MAX_REPORT_EVIDENCE_FILES,
  REPORT_EVIDENCE_FIELD_NAME,
  deleteReportEvidence,
  uploadReportEvidence,
} from "@/lib/report-evidence";

export const runtime = "nodejs";

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

const VALID_SEVERITY = new Set(["low", "medium", "high"]);

function generateTrackingId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `AR-${suffix}`;
}

function inferDepartment(issueType: string) {
  const normalized = issueType.toLowerCase();
  if (/(fire|smoke|burn|explosion|electrical)/.test(normalized)) {
    return "fire";
  }
  return "human_rights";
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
    const evidenceFiles = [
      ...formData.getAll(REPORT_EVIDENCE_FIELD_NAME),
      ...formData.getAll(`${REPORT_EVIDENCE_FIELD_NAME}[]`),
    ].filter(isFileEntry);

    return {
      data: {
        location: getFormValue(formData, "location"),
        district: getFormValue(formData, "district"),
        date: getFormValue(formData, "date"),
        institution_type: getFormValue(formData, "institution_type"),
        issue_type: getFormValue(formData, "issue_type"),
        severity_level: getFormValue(formData, "severity_level"),
        emotional_indicator: getFormValue(formData, "emotional_indicator"),
        raw_text: getFormValue(formData, "raw_text"),
        rawText: getFormValue(formData, "rawText"),
      } satisfies HardwarePayload,
      evidenceFiles,
    };
  }

  return {
    data: (await req.json()) as HardwarePayload,
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

    // 2. Parse Body
    const { data, evidenceFiles } = await parseHardwareSubmission(req);

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

    const location = data.location?.trim();
    const district = data.district?.trim();
    const reportDateLabel = data.date?.trim();
    const institutionType = data.institution_type?.trim();
    const issueType = data.issue_type?.trim();
    const severityLevel = data.severity_level?.trim().toLowerCase();
    const emotionalIndicator = data.emotional_indicator?.trim();
    const rawText = (data.raw_text ?? data.rawText)?.trim();

    // 3. Simple Validation
    if (
      !location ||
      !district ||
      !reportDateLabel ||
      !institutionType ||
      !issueType ||
      !severityLevel ||
      !emotionalIndicator
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!VALID_SEVERITY.has(severityLevel)) {
      return NextResponse.json(
        { error: "severity_level must be one of: low, medium, high" },
        { status: 400 }
      );
    }

    await dbConnect();

    const department = inferDepartment(issueType);
    const priority = severityLevel;
    const title = `${issueType} at ${institutionType}`;
    const description = rawText || `${issueType} reported at ${institutionType} in ${location}.`;

    // 4. Generate AI Summary (reusing logic from server action)
    const aiSummary = await generateReportSummary(description);



    let trackingId = generateTrackingId();
    for (let attempts = 0; attempts < 5; attempts += 1) {
      const existing = await ReportModel.findOne({ trackingId }).select("_id").lean();
      if (!existing) {
        break;
      }
      trackingId = generateTrackingId();
    }

    const evidence = evidenceFiles.length ? await uploadReportEvidence(trackingId, evidenceFiles) : [];
    uploadedEvidenceIds = evidence.map((item) => item.fileId);

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
      rawText,
      priority,
      department,
      aiSummary,
      evidence,
      status: "pending",
    });

    // 6. Revalidate caches for the dashboard
    revalidatePath("/");
    revalidatePath("/dashboard/admin");
    if (department) {
      revalidatePath(`/dashboard/${department.replace("_", "-")}`);
    }

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
