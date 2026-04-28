export type Department = "human_rights" | "fire";
export type Priority = "low" | "medium" | "high";
export type ReportStatus = "pending" | "in_progress" | "resolved";
export type SeverityLevel = "low" | "medium" | "high";

export interface ReportEvidence {
  fileId: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: string | Date;
  hash?: string;
  flags?: string[];
  isSuspicious?: boolean;
  aiDescription?: string;
}

export interface Report {
  id: string;
  trackingId: string;
  title: string;
  description: string;
  location: string;
  district: string;
  reportDateLabel: string;
  institutionType: string;
  issueType: string;
  severityLevel: SeverityLevel;
  emotionalIndicator: string;
  rawText?: string;
  department: Department;
  priority: Priority;
  status: ReportStatus;
  aiSummary?: string;
  evidence?: ReportEvidence[];
  createdAt: Date | string;
}

export const DEPARTMENT_LABELS: Record<Department, string> = {
  human_rights: "Human Rights",
  fire: "Fire Department",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
};