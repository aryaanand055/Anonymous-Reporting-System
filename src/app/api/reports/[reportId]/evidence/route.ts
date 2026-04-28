import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import ReportModel from "@/models/Report";
import mongoose from "mongoose";
import {
    MAX_REPORT_EVIDENCE_FILE_SIZE_BYTES,
    MAX_REPORT_EVIDENCE_FILES,
    REPORT_EVIDENCE_FIELD_NAME,
    uploadReportEvidence,
} from "@/lib/report-evidence";

export const runtime = "nodejs";

function isFileEntry(value: FormDataEntryValue): value is File {
    return typeof value !== "string";
}

function getFormValue(formData: FormData, key: string): string | undefined {
    const value = formData.get(key);
    return typeof value === "string" ? value : undefined;
}

function normalizeRouteReference(input: string | undefined): string {
    const decoded = decodeURIComponent(input ?? "").trim();
    const wrappedMatch = decoded.match(/ObjectId\(["']?([a-fA-F0-9]{24})["']?\)/);

    if (wrappedMatch?.[1]) {
        return wrappedMatch[1];
    }

    return decoded;
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ reportId: string }> }
) {
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

        const { reportId } = await params;
        const normalizedRouteReference = normalizeRouteReference(reportId);
        if (!normalizedRouteReference) {
            return NextResponse.json({ error: "Invalid reportId" }, { status: 400 });
        }

        const referenceIsObjectId = mongoose.isValidObjectId(normalizedRouteReference);
        const routeTrackingId = referenceIsObjectId
            ? undefined
            : normalizedRouteReference.toUpperCase();

        const contentType = req.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("multipart/form-data")) {
            return NextResponse.json(
                { error: "Content-Type must be multipart/form-data" },
                { status: 400 }
            );
        }

        // 2. Parse multipart form data
        let formData: FormData;
        try {
            formData = await req.formData();
        } catch {
            return NextResponse.json(
                { error: "Invalid multipart/form-data body" },
                { status: 400 }
            );
        }
        const submittedTrackingId = (
            getFormValue(formData, "trackingId") ?? routeTrackingId
        )
            ?.trim()
            .toUpperCase();

        if (!submittedTrackingId) {
            return NextResponse.json({ error: "trackingId is required" }, { status: 400 });
        }

        const evidenceFiles = [
            ...formData.getAll(REPORT_EVIDENCE_FIELD_NAME),
            ...formData.getAll(`${REPORT_EVIDENCE_FIELD_NAME}[]`),
        ].filter(isFileEntry);

        if (!evidenceFiles.length) {
            return NextResponse.json({ error: "At least one evidence file is required" }, { status: 400 });
        }

        // 3. Connect to database
        await dbConnect();

        // 4. Find the report by ID
        const report = referenceIsObjectId
            ? await ReportModel.findById(normalizedRouteReference)
            : await ReportModel.findOne({ trackingId: routeTrackingId });
        if (!report) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        // 5. Validate ownership: check tracking ID match
        if (report.trackingId !== submittedTrackingId) {
            return NextResponse.json(
                { error: "Tracking ID does not match report" },
                { status: 403 }
            );
        }

        // 6. Validate evidence count: existing + new <= MAX
        const currentEvidenceCount = Array.isArray(report.evidence) ? report.evidence.length : 0;
        if (currentEvidenceCount + evidenceFiles.length > MAX_REPORT_EVIDENCE_FILES) {
            return NextResponse.json(
                {
                    error: `Total evidence files cannot exceed ${MAX_REPORT_EVIDENCE_FILES}. Current: ${currentEvidenceCount}, attempting to add: ${evidenceFiles.length}`,
                },
                { status: 400 }
            );
        }

        // 7. Validate file sizes
        for (const file of evidenceFiles) {
            if (file.size > MAX_REPORT_EVIDENCE_FILE_SIZE_BYTES) {
                return NextResponse.json(
                    { error: `Each evidence file must be 20 MB or smaller: ${file.name || "unnamed file"}` },
                    { status: 400 }
                );
            }
        }

        // 8. Upload evidence files
        const newEvidence = await uploadReportEvidence(
            report.trackingId,
            report.incidentId ?? report.trackingId,
            evidenceFiles
        );

        // 9. Append to report's evidence array
        if (!Array.isArray(report.evidence)) {
            report.evidence = [];
        }

        report.evidence.push(...newEvidence);
        await report.save();

        return NextResponse.json({
            success: true,
            message: "Evidence attached successfully",
            filesAdded: newEvidence.length,
        });
    } catch (error) {
        console.error("Evidence upload error:", error);

        if (error instanceof Error) {
            if (
                error.message.startsWith("Unsupported file type") ||
                error.message.startsWith("File too large") ||
                error.message.includes("authenticity concerns") ||
                error.message.includes("Too many evidence files")
            ) {
                return NextResponse.json({ error: error.message }, { status: 400 });
            }
        }

        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
