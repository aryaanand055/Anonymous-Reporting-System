import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import ReportModel from "@/models/Report";
import { createReportEvidenceDownloadStream } from "@/lib/report-evidence";

export const runtime = "nodejs";

function normalizeRouteReference(input: string | undefined): string {
    const decoded = decodeURIComponent(input ?? "").trim();
    const wrappedMatch = decoded.match(/ObjectId\(["']?([a-fA-F0-9]{24})["']?\)/);

    if (wrappedMatch?.[1]) {
        return wrappedMatch[1];
    }

    return decoded;
}

function buildContentDisposition(filename: string) {
    const safeFilename = filename || "evidence";
    return `inline; filename*=UTF-8''${encodeURIComponent(safeFilename)}`;
}

export async function GET(
    req: NextRequest,
    { params }: { params: { reportRef: string; fileId: string } }
) {
    try {
        const reportRef = normalizeRouteReference(params?.reportRef);
        const fileId = decodeURIComponent(params?.fileId ?? "").trim();

        if (!reportRef || !fileId) {
            return NextResponse.json(
                { error: "reportRef and fileId are required" },
                { status: 400 }
            );
        }

        if (!mongoose.isValidObjectId(fileId)) {
            return NextResponse.json({ error: "fileId is invalid" }, { status: 400 });
        }

        await dbConnect();

        const report = mongoose.isValidObjectId(reportRef)
            ? await ReportModel.findOne({ _id: reportRef, "evidence.fileId": fileId }).lean()
            : await ReportModel.findOne({ trackingId: reportRef.toUpperCase(), "evidence.fileId": fileId }).lean();

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
        console.error("Admin evidence preview error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}