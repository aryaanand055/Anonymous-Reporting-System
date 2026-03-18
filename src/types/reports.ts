import { Timestamp } from "firebase/firestore";

export type Department = "human_rights" | "fire";
export type Priority = "low" | "medium" | "high";
export type ReportStatus = "pending" | "in_progress" | "resolved";

export interface Report {
  id: string;
  title: string;
  description: string;
  location: string;
  department: Department;
  priority: Priority;
  status: ReportStatus;
  createdAt: Timestamp;
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