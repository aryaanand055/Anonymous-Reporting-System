import mongoose, { Schema, Document } from "mongoose";
import { DEPARTMENT_VALUES, Department, Priority, ReportEvidence, ReportStatus } from "@/types/reports";

export interface IReport extends Document {
  trackingId: string;
  title: string;
  description: string;
  location: string;
  district: string;
  reportDateLabel: string;
  institutionType: string;
  issueType: string;
  severityLevel: "low" | "medium" | "high";
  emotionalIndicator: string;
  rawText?: string;
  department: Department;
  departments?: Department[];
  priority: Priority;
  status: ReportStatus;
  aiSummary?: string;
  isSpam?: boolean;
  spamReason?: string;
  incidentId?: string;
  embedding?: number[];
  evidence?: ReportEvidence[];
  createdAt: Date;
}

const ReportEvidenceSchema = new Schema(
  {
    fileId: { type: String, required: true },
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, required: true },
    hash: { type: String },
    flags: { type: [String], default: [] },
    isSuspicious: { type: Boolean, default: false },
    aiDescription: { type: String },
  },
  { _id: false }
);

const ReportSchema: Schema = new Schema(
  {
    trackingId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    district: { type: String, required: true },
    reportDateLabel: { type: String, required: true },
    institutionType: { type: String, required: true },
    issueType: { type: String, required: true },
    severityLevel: { type: String, enum: ["low", "medium", "high"], required: true },
    emotionalIndicator: { type: String, required: true },
    rawText: { type: String },
    department: { type: String, enum: DEPARTMENT_VALUES, required: true },
    departments: { type: [String], enum: DEPARTMENT_VALUES, default: [] },
    priority: { type: String, enum: ["low", "medium", "high"], required: true },
    status: { type: String, enum: ["pending", "in_progress", "resolved"], default: "pending" },
    aiSummary: { type: String },
    isSpam: { type: Boolean, default: false },
    spamReason: { type: String },
    incidentId: { type: String, index: true },
    embedding: { type: [Number] },
    evidence: { type: [ReportEvidenceSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);
