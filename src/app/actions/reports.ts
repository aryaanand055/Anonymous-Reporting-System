"use server";

import dbConnect from "@/lib/mongodb";
import ReportModel from "@/models/Report";
import { Report, Department, Priority, ReportStatus } from "@/types/reports";
import { revalidatePath } from "next/cache";
import { generateReportSummary } from "@/ai/summarize";

function generateTrackingId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `AR-${suffix}`;
}

export async function createReport(data: any) {
  await dbConnect();
  try {
    const trackingId = generateTrackingId();
    const aiSummary = await generateReportSummary(data.description);
    const report = await ReportModel.create({
      ...data,
      trackingId,
      aiSummary,
      status: "pending",
    });
    revalidatePath("/");
    revalidatePath("/dashboard/admin");
    if (data.department) {
      revalidatePath(`/dashboard/${data.department.replace("_", "-")}`);
    }
    return { success: true, id: report._id.toString(), trackingId: report.trackingId };
  } catch (error) {
    console.error("Failed to create report:", error);
    return { success: false, error: "Failed to create report" };
  }
}

export async function getReports(department?: Department): Promise<Report[]> {
  await dbConnect();
  try {
    const query = department ? { department } : {};
    const reports = await ReportModel.find(query).sort({ createdAt: -1 }).lean();

    return reports.map((report: any) => ({
      id: report._id.toString(),
      trackingId: report.trackingId ?? "N/A",
      title: report.title ?? "Incident Report",
      description: report.description ?? "No description provided",
      location: report.location ?? "Unknown location",
      district: report.district ?? "Unknown district",
      reportDateLabel: report.reportDateLabel ?? "Date not provided",
      institutionType: report.institutionType ?? "Institution not specified",
      issueType: report.issueType ?? report.title ?? "Unspecified issue",
      severityLevel: report.severityLevel ?? report.priority ?? "medium",
      emotionalIndicator: report.emotionalIndicator ?? "unspecified",
      rawText: report.rawText,
      department: report.department ?? "human_rights",
      priority: report.priority ?? report.severityLevel ?? "medium",
      status: report.status ?? "pending",
      aiSummary: report.aiSummary,
      createdAt: report.createdAt instanceof Date ? report.createdAt.toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return [];
  }
}

export async function updateReportStatus(reportId: string, status: ReportStatus) {
  await dbConnect();
  try {
    await ReportModel.findByIdAndUpdate(reportId, { status });
    revalidatePath("/");
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update report status:", error);
    return { success: false, error: "Failed to update status" };
  }
}

export async function updateReportRouting(
  reportId: string,
  updates: { priority?: Priority; department?: Department }
) {
  await dbConnect();
  try {
    const existingReport = await ReportModel.findById(reportId).select("department").lean();
    if (!existingReport) {
      return { success: false, error: "Report not found" };
    }

    await ReportModel.findByIdAndUpdate(reportId, {
      ...(updates.priority ? { priority: updates.priority, severityLevel: updates.priority } : {}),
      ...(updates.department ? { department: updates.department } : {}),
    });

    revalidatePath("/");
    revalidatePath("/dashboard/admin");
    revalidatePath(`/dashboard/${existingReport.department.replace("_", "-")}`);
    if (updates.department && updates.department !== existingReport.department) {
      revalidatePath(`/dashboard/${updates.department.replace("_", "-")}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update report routing:", error);
    return { success: false, error: "Failed to update report routing" };
  }
}

export async function getReportStatusByTrackingId(trackingId: string) {
  await dbConnect();
  try {
    const normalizedTrackingId = trackingId.trim().toUpperCase();
    if (!normalizedTrackingId) {
      return { success: false, error: "Tracking ID is required" };
    }

    const report = await ReportModel.findOne({ trackingId: normalizedTrackingId }).lean();
    if (!report) {
      return { success: false, error: "Report not found" };
    }

    return {
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
    };
  } catch (error) {
    console.error("Failed to lookup report by tracking ID:", error);
    return { success: false, error: "Failed to fetch report status" };
  }
}
