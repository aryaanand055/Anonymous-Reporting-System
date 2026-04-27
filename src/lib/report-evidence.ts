import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import crypto from "crypto";

export const REPORT_EVIDENCE_FIELD_NAME = "evidence";
export const MAX_REPORT_EVIDENCE_FILES = 3;
export const MAX_REPORT_EVIDENCE_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const REPORT_EVIDENCE_BUCKET_NAME = "reportEvidence";

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export interface ReportEvidenceMetadata {
    fileId: string;
    filename: string;
    contentType: string;
    size: number;
    uploadedAt: Date;
    hash?: string;
    flags?: string[];
    isSuspicious?: boolean;
}

function getFileHash(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function basicFakeCheck(file: File, buffer: Buffer) {
  const issues: string[] = [];
  if (file.size < 1000) issues.push("too_small");
  if (file.name.endsWith(".jpg") && file.type !== "image/jpeg") {
    issues.push("mime_mismatch");
  }
  return issues;
}

async function detectFakeEvidence(file: File): Promise<string[]> {
  const flags: string[] = [];
  // Mock AI detection for demonstration (hooks via external APIs ideally)
  if (file.name.toLowerCase().includes("deepfake")) flags.push("deepfake");
  if (file.name.toLowerCase().includes("manipulated")) flags.push("manipulated");
  if (file.name.toLowerCase().includes("ai_generated")) flags.push("ai_generated");
  return flags;
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
    incidentId: string,
    files: File[]
): Promise<ReportEvidenceMetadata[]> {
    await dbConnect();

    if (files.length > MAX_REPORT_EVIDENCE_FILES) {
        throw new Error("Too many evidence files");
    }

    const bucket = getReportEvidenceBucket();
    const uploadedFileIds: string[] = [];
    const evidence: ReportEvidenceMetadata[] = [];

    try {
        for (const file of files) {
            if (file.size > MAX_REPORT_EVIDENCE_FILE_SIZE_BYTES) {
                throw new Error(`File too large: ${file.name}`);
            }

            if (!ALLOWED_MIME_TYPES.includes(file.type)) {
                throw new Error(`Unsupported file type: ${file.type}`);
            }

            const contentType = file.type?.trim();
            const filename = file.name?.trim() || "evidence";
            const buffer = Buffer.from(await file.arrayBuffer());

            const hash = getFileHash(buffer);

            if (!mongoose.connection.db) {
                throw new Error("MongoDB connection is not ready");
            }
            
            const existing = await mongoose.connection.db
                .collection(`${REPORT_EVIDENCE_BUCKET_NAME}.files`)
                .findOne({ "metadata.hash": hash });

            const flags = basicFakeCheck(file, buffer);
            if (existing) {
                flags.push("duplicate_file");
            }

            const aiFlags = await detectFakeEvidence(file);
            flags.push(...aiFlags);

            const isSuspicious = flags.length > 0;

            if (flags.includes("deepfake") && flags.includes("manipulated")) {
                throw new Error("Evidence rejected due to authenticity concerns");
            }

            const fileId = await new Promise<string>((resolve, reject) => {
                const uploadStream = bucket.openUploadStream(filename, {
                    metadata: {
                        trackingId,
                        incidentId,
                        originalFilename: filename,
                        contentType,
                        hash,
                        flags,
                        isSuspicious,
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
                hash,
                flags,
                isSuspicious,
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

export async function createSecureDownloadStream(fileId: string, trackingId: string) {
    await dbConnect();
    const bucket = getReportEvidenceBucket();

    if (!mongoose.connection.db) {
        throw new Error("MongoDB connection is not ready");
    }

    const files = await mongoose.connection.db
        .collection(`${REPORT_EVIDENCE_BUCKET_NAME}.files`)
        .findOne({ _id: new mongoose.Types.ObjectId(fileId) });

    if (!files || files.metadata?.trackingId !== trackingId) {
        throw new Error("Unauthorized access");
    }

    return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
}