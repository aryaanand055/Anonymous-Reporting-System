import mongoose, { Schema, Document } from "mongoose";
import { Department, Priority, ReportEvidence, ReportStatus } from "@/types/reports";

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
  priority: Priority;
  status: ReportStatus;
  aiSummary?: string;
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
    department: { type: String, enum: ["human_rights", "fire"], required: true },
    priority: { type: String, enum: ["low", "medium", "high"], required: true },
    status: { type: String, enum: ["pending", "in_progress", "resolved"], default: "pending" },
    aiSummary: { type: String },
    evidence: { type: [ReportEvidenceSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);
