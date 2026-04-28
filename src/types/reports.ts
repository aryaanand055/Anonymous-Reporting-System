export const DEPARTMENT_VALUES = [
  "human_rights",
  "fire",
  "police_security",
  "health_safety",
  "education",
  "sanitation",
  "transport_infrastructure",
] as const;

export type Department = (typeof DEPARTMENT_VALUES)[number];
export type Priority = "low" | "medium" | "high";
export type ReportStatus = "pending" | "in_progress" | "resolved";
export type SeverityLevel = "low" | "medium" | "high";

export interface ReportEvidence {
  fileId: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: Date | string;
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
  departments?: Department[];
  priority: Priority;
  status: ReportStatus;
  aiSummary?: string;
  evidence?: ReportEvidence[];
  createdAt: Date | string;
}

export const DEPARTMENT_LABELS: Record<Department, string> = {
  human_rights: "Human Rights",
  fire: "Fire Department",
  police_security: "Police & Security",
  health_safety: "Health & Safety",
  education: "Education",
  sanitation: "Sanitation",
  transport_infrastructure: "Transport & Infrastructure",
};

export interface DepartmentDirectoryEntry {
  department: Department;
  slug: string;
  title: string;
  description: string;
}

export const DEPARTMENT_DIRECTORY: DepartmentDirectoryEntry[] = [
  {
    department: "human_rights",
    slug: "human-rights",
    title: DEPARTMENT_LABELS.human_rights,
    description: "Rights violations, harassment, discrimination, abuse, exploitation, or threats to dignity.",
  },
  {
    department: "fire",
    slug: "fire",
    title: DEPARTMENT_LABELS.fire,
    description: "Fire hazards, smoke, gas leaks, electrical risks, explosions, or urgent evacuation concerns.",
  },
  {
    department: "police_security",
    slug: "police-security",
    title: DEPARTMENT_LABELS.police_security,
    description: "Theft, assault, threats, violence, missing persons, or safety/security incidents.",
  },
  {
    department: "health_safety",
    slug: "health-safety",
    title: DEPARTMENT_LABELS.health_safety,
    description: "Illness, contamination, medical concerns, unsafe conditions, or public health risks.",
  },
  {
    department: "education",
    slug: "education",
    title: DEPARTMENT_LABELS.education,
    description: "School or campus issues, bullying, staff misconduct, facility problems, or student welfare.",
  },
  {
    department: "sanitation",
    slug: "sanitation",
    title: DEPARTMENT_LABELS.sanitation,
    description: "Waste removal, cleanliness, sewage, drainage, garbage, or environmental hygiene issues.",
  },
  {
    department: "transport_infrastructure",
    slug: "transport-infrastructure",
    title: DEPARTMENT_LABELS.transport_infrastructure,
    description: "Road damage, traffic hazards, public transport failures, bridges, walkways, or infrastructure issues.",
  },
];

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