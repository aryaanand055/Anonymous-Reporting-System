import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import ReportModel from "@/models/Report";
import { generateReportSummary } from "@/ai/summarize";
import { revalidatePath } from "next/cache";

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

function inferDepartment(issueType: string) {
  const normalized = issueType.toLowerCase();
  if (/(fire|smoke|burn|explosion|electrical)/.test(normalized)) {
    return "fire";
  }
  return "human_rights";
}

export async function POST(req: NextRequest) {
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
    const data: HardwarePayload = await req.json();

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



    // 5. Create Report
    const report = await ReportModel.create({
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
      id: report._id.toString()
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
