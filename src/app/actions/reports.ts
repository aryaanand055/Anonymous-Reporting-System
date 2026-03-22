"use server";

import dbConnect from "@/lib/mongodb";
import ReportModel from "@/models/Report";
import { Report, Department, ReportStatus } from "@/types/reports";
import { revalidatePath } from "next/cache";
import { generateReportSummary } from "@/ai/summarize";

export async function createReport(data: any) {
  await dbConnect();
  try {
    const aiSummary = await generateReportSummary(data.description);
    const report = await ReportModel.create({
      ...data,
      aiSummary,
      status: "pending",
    });
    revalidatePath("/");
    revalidatePath("/dashboard/admin");
    if (data.department) {
      revalidatePath(`/dashboard/${data.department.replace("_", "-")}`);
    }
    return { success: true, id: report._id.toString() };
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
      title: report.title,
      description: report.description,
      location: report.location,
      department: report.department,
      priority: report.priority,
      status: report.status,
      aiSummary: report.aiSummary,
      createdAt: report.createdAt.toISOString(),
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
