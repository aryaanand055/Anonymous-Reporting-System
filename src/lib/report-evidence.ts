import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";

export const REPORT_EVIDENCE_FIELD_NAME = "evidence";
export const MAX_REPORT_EVIDENCE_FILES = 3;
export const MAX_REPORT_EVIDENCE_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const REPORT_EVIDENCE_BUCKET_NAME = "reportEvidence";

export interface ReportEvidenceMetadata {
    fileId: string;
    filename: string;
    contentType: string;
    size: number;
    uploadedAt: Date;
}

export function getReportEvidenceBucket() {
    if (!mongoose.connection.db) {
        throw new Error("MongoDB connection is not ready");
    }

    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: REPORT_EVIDENCE_BUCKET_NAME,
    });
}

function isValidObjectId(fileId: string) {
    return mongoose.isValidObjectId(fileId);
}

export async function uploadReportEvidence(
    trackingId: string,
    files: File[]
): Promise<ReportEvidenceMetadata[]> {
    await dbConnect();

    const bucket = getReportEvidenceBucket();
    const uploadedFileIds: string[] = [];
    const evidence: ReportEvidenceMetadata[] = [];

    try {
        for (const file of files) {
            const contentType = file.type?.trim() || "application/octet-stream";
            const filename = file.name?.trim() || "evidence";
            const buffer = Buffer.from(await file.arrayBuffer());

            const fileId = await new Promise<string>((resolve, reject) => {
                const uploadStream = bucket.openUploadStream(filename, {
                    metadata: {
                        trackingId,
                        originalFilename: filename,
                        contentType,
                    },
                });

                uploadStream.once("error", reject);
                uploadStream.once("finish", () => resolve(uploadStream.id.toString()));
                uploadStream.end(buffer);
            });

            uploadedFileIds.push(fileId);
            evidence.push({
                fileId,
                filename,
                contentType,
                size: file.size,
                uploadedAt: new Date(),
            });
        }

        return evidence;
    } catch (error) {
        await deleteReportEvidence(uploadedFileIds);
        throw error;
    }
}

export async function deleteReportEvidence(fileIds: string[]) {
    if (!fileIds.length) {
        return;
    }

    await dbConnect();
    const bucket = getReportEvidenceBucket();

    await Promise.all(
        fileIds.map(
            (fileId) =>
                new Promise<void>((resolve, reject) => {
                    if (!isValidObjectId(fileId)) {
                        resolve();
                        return;
                    }

                    bucket
                        .delete(new mongoose.Types.ObjectId(fileId))
                        .then(() => resolve())
                        .catch((error) => reject(error));
                })
        )
    );
}

export function createReportEvidenceDownloadStream(fileId: string) {
    const bucket = getReportEvidenceBucket();
    return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
}