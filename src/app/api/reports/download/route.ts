import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import ReportModel from "@/models/Report";
import { createReportEvidenceDownloadStream } from "@/lib/report-evidence";

export const runtime = "nodejs";

function buildContentDisposition(filename: string) {
    const safeFilename = filename || "evidence";
    return `attachment; filename*=UTF-8''${encodeURIComponent(safeFilename)}`;
}

export async function GET(req: NextRequest) {
    try {
        const configuredHardwareApiKey = process.env.HARDWARE_API_KEY;
        if (!configuredHardwareApiKey) {
            console.error("Missing HARDWARE_API_KEY environment variable.");
            return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
        }

        const apiKey = req.headers.get("X-API-KEY");
        if (apiKey !== configuredHardwareApiKey) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const trackingId = req.nextUrl.searchParams.get("trackingId")?.trim().toUpperCase();
        const fileId = req.nextUrl.searchParams.get("fileId")?.trim();

        if (!trackingId || !fileId) {
            return NextResponse.json(
                { error: "trackingId and fileId query params are required" },
                { status: 400 }
            );
        }

        if (!mongoose.isValidObjectId(fileId)) {
            return NextResponse.json({ error: "fileId is invalid" }, { status: 400 });
        }

        await dbConnect();

        const report = await ReportModel.findOne({ trackingId, "evidence.fileId": fileId }).lean();
        if (!report) {
            return NextResponse.json({ error: "Report evidence not found" }, { status: 404 });
        }

        const evidenceEntry = Array.isArray(report.evidence)
            ? report.evidence.find((entry: any) => entry.fileId === fileId)
            : null;

        if (!evidenceEntry) {
            return NextResponse.json({ error: "Report evidence not found" }, { status: 404 });
        }

        const downloadStream = createReportEvidenceDownloadStream(fileId);
        const headers = new Headers({
            "Content-Type": evidenceEntry.contentType || "application/octet-stream",
            "Content-Disposition": buildContentDisposition(evidenceEntry.filename || "evidence"),
            "Content-Length": String(evidenceEntry.size ?? 0),
            "Cache-Control": "no-store",
        });

        return new Response(Readable.toWeb(downloadStream as unknown as Readable) as unknown as BodyInit, {
            headers,
        });
    } catch (error) {
        console.error("Evidence download error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}