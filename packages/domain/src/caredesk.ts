export const caredeskRoles = ["owner", "technician"] as const;
export type CaredeskRole = (typeof caredeskRoles)[number];

export const caredeskJobStatuses = [
  "NEW JOB",
  "WAITING FADHIL REVIEW",
  "WAITING CUSTOMER CONFIRMATION",
  "IN PROGRESS",
  "NOT PROCEED",
  "READY PICKUP",
  "UNCLAIMED",
  "COMPLETE"
] as const;
export type CaredeskJobStatus = (typeof caredeskJobStatuses)[number];

export const checklistImageSections = ["initialCheck", "drive", "battery", "ram", "diagnosis"] as const;
export type ChecklistImageSection = (typeof checklistImageSections)[number];

export type ChecklistReportStatus = "not_started" | "draft" | "submitted";
export type PickupStageDay = 0 | 7 | 14 | 30 | 60;
export type NotificationResult = "sent successfully" | "failed" | "no response";

export interface CaredeskUser {
  id: string;
  name: string;
  email?: string;
  role: CaredeskRole;
  status?: string;
}

export interface CaredeskCustomer {
  id: string;
  name: string;
  phone: string;
  preferredChannel: string;
}

export interface CaredeskDevice {
  id: string;
  customerId: string;
  type: string;
  brand: string;
  model?: string;
  serialNumber?: string;
}

export interface CaredeskEvidenceFile {
  id: string;
  jobId: string;
  category: "service_note" | "diagnosis" | "repair_progress" | "ready_pickup" | "complete_pickup" | "customer_decision" | "checklist";
  section?: ChecklistImageSection;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  caption?: string;
  uploadedByUserId: string;
  createdAt: string;
}

export interface CaredeskTimelineEvent {
  id: string;
  jobId: string;
  type: "status" | "assignment" | "diagnosis" | "owner_review" | "customer_decision" | "pickup" | "notification" | "checklist" | "report" | "settings" | "audit";
  title: string;
  detail: string;
  actorUserId: string;
  createdAt: string;
}

export interface CaredeskNotificationRecord {
  id: string;
  jobId: string;
  technicianId?: string;
  stageDay?: PickupStageDay;
  channel: "WhatsApp" | "Phone Call" | "In Shop" | "Other";
  status: "Pending" | "Sent" | "Failed" | "Need follow-up";
  result?: NotificationResult;
  method?: string;
  note?: string;
  messagePreview: string;
  createdAt: string;
  contactedAt?: string;
}

export interface CaredeskChecklistImage {
  id: string;
  jobId: string;
  section: ChecklistImageSection;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  caption?: string;
  createdAt: string;
  uploadedByUserId: string;
}

export interface CaredeskChecklistReport {
  jobId: string;
  jobIdDisplay: string;
  status: ChecklistReportStatus;
  technicianId?: string;
  deviceInfo: Record<string, unknown>;
  initialCheck: Record<string, unknown>;
  drive: Record<string, unknown>;
  battery: Record<string, unknown>;
  ram: Record<string, unknown>;
  diagnosisSummary: string;
  images: CaredeskChecklistImage[];
  lastUpdated: string;
}

export interface CaredeskJob {
  id: string;
  jobIdDisplay: string;
  rawReportNumber: string;
  status: CaredeskJobStatus;
  customerId: string;
  deviceId: string;
  assignedTechnicianId?: string;
  reportedIssue: string;
  diagnosisNotes?: string;
  ownerInstruction?: string;
  posReference?: string;
  customerDecision?: { result: "proceed" | "not_proceed"; method: string; note?: string; reason?: string };
  readyPickupDate?: string;
  lastUpdate: string;
  createdAt: string;
}

export interface CaredeskFlowRules {
  reminderDays: PickupStageDay[];
  unclaimedDay: number;
  stuckThresholds: Record<string, string>;
  requiredEvidence: {
    diagnosis: string;
    readyPickup: string;
    completePickup: string;
  };
  notProceedReasons: string[];
  releaseReasons: string[];
  lockedRules: string[];
  retentionDays: number;
}

export interface CaredeskNotificationTemplate {
  stageDay: PickupStageDay;
  channel: "WhatsApp";
  messageTemplate: string;
  language: "bm" | "en";
}

export interface CaredeskScannerSettings {
  provider: "openai";
  enabled: boolean;
  model: string;
  apiKeyConfigured: boolean;
  apiKeyMasked?: string;
  maxUploadBytes: number;
}

export interface CaredeskSettings {
  shopInfo: { name: string; subtitle: string; phone?: string; address?: string };
  defaultLanguage: "bm" | "en";
  posReferenceLabel: string;
  flowRules: CaredeskFlowRules;
  notificationTemplates: CaredeskNotificationTemplate[];
  scannerSettings: CaredeskScannerSettings;
}

export interface CaredeskDisplayJob {
  jobIdDisplay: string;
  status: CaredeskJobStatus;
  updatedAt: string;
  readyPickupDate?: string;
}

export type CaredeskDisplaySectionTone = "neutral" | "warning" | "progress" | "success" | "danger" | "muted";
export type CaredeskDisplayLaneKey = "action_required" | "in_flight" | "ready_backlog";
export type CaredeskDisplayFooterKey = "not_proceed" | "complete_today";

export interface CaredeskDisplaySection {
  key: string;
  label: string;
  tone: CaredeskDisplaySectionTone;
  statuses: CaredeskJobStatus[];
  count: number;
  items: CaredeskDisplayJob[];
}

export interface CaredeskDisplayLane {
  key: CaredeskDisplayLaneKey;
  label: string;
  count: number;
  sections: CaredeskDisplaySection[];
}

export interface CaredeskDisplayFooterItem {
  key: CaredeskDisplayFooterKey;
  label: string;
  count: number;
}

export type CaredeskDisplayCounts = Record<CaredeskJobStatus, number>;

export interface CaredeskDisplaySnapshot {
  generatedAt: string;
  revision: number;
  counts: CaredeskDisplayCounts;
  lanes: CaredeskDisplayLane[];
  footerSummary: CaredeskDisplayFooterItem[];
}
