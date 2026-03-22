import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import ReportModel from "@/models/Report";
import { generateReportSummary } from "@/ai/summarize";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    // 1. Validate API Key
    const apiKey = req.headers.get("X-API-KEY");
    if (apiKey !== process.env.HARDWARE_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Body
    const data = await req.json();
    const { title, description, location, priority, department } = data;

    // 3. Simple Validation
    if (!title || !description || !location || !priority || !department) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    // 4. Generate AI Summary (reusing logic from server action)
    const aiSummary = await generateReportSummary(description);



    // 5. Create Report
    const report = await ReportModel.create({
      title,
      description,
      location,
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
