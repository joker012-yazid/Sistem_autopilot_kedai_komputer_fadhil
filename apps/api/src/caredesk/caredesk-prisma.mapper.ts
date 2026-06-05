import type { CaredeskChecklistStatus, CaredeskJobStatus as PrismaJobStatus } from "@prisma/client";
import type {
  CaredeskChecklistImage,
  CaredeskChecklistReport,
  CaredeskCustomer,
  CaredeskDevice,
  CaredeskEvidenceFile,
  CaredeskJob,
  CaredeskJobStatus,
  CaredeskNotificationRecord,
  CaredeskNotificationTemplate,
  CaredeskSettings,
  CaredeskTimelineEvent,
  ChecklistReportStatus
} from "../../../../packages/domain/src";

export const domainToPrismaStatus: Record<CaredeskJobStatus, PrismaJobStatus> = {
  "NEW JOB": "NEW_JOB",
  "WAITING FADHIL REVIEW": "WAITING_FADHIL_REVIEW",
  "WAITING CUSTOMER CONFIRMATION": "WAITING_CUSTOMER_CONFIRMATION",
  "IN PROGRESS": "IN_PROGRESS",
  "NOT PROCEED": "NOT_PROCEED",
  "READY PICKUP": "READY_PICKUP",
  UNCLAIMED: "UNCLAIMED",
  COMPLETE: "COMPLETE"
};

export const prismaToDomainStatus: Record<PrismaJobStatus, CaredeskJobStatus> = {
  NEW_JOB: "NEW JOB",
  WAITING_FADHIL_REVIEW: "WAITING FADHIL REVIEW",
  WAITING_CUSTOMER_CONFIRMATION: "WAITING CUSTOMER CONFIRMATION",
  IN_PROGRESS: "IN PROGRESS",
  NOT_PROCEED: "NOT PROCEED",
  READY_PICKUP: "READY PICKUP",
  UNCLAIMED: "UNCLAIMED",
  COMPLETE: "COMPLETE"
};

export function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export function toDateOnly(value: Date | string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return toIso(value).slice(0, 10);
}

export function mapCustomer(customer: {
  id: string;
  name: string;
  phone: string;
  preferredChannel: string;
}): CaredeskCustomer {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    preferredChannel: customer.preferredChannel
  };
}

export function mapDevice(device: {
  id: string;
  customerId: string;
  type: string;
  brand: string;
  model: string | null;
  serialNumber: string | null;
}): CaredeskDevice {
  return {
    id: device.id,
    customerId: device.customerId,
    type: device.type,
    brand: device.brand,
    model: device.model ?? undefined,
    serialNumber: device.serialNumber ?? undefined
  };
}

export function mapJob(job: {
  id: string;
  jobIdDisplay: string;
  rawReportNumber: string;
  status: PrismaJobStatus;
  customerId: string;
  deviceId: string;
  assignedTechnicianId: string | null;
  reportedIssue: string;
  diagnosisNotes: string | null;
  ownerInstruction: string | null;
  posReference: string | null;
  customerDecision: unknown;
  readyPickupDate: Date | null;
  lastUpdate: string;
  createdAt: Date;
}): CaredeskJob {
  return {
    id: job.id,
    jobIdDisplay: job.jobIdDisplay,
    rawReportNumber: job.rawReportNumber,
    status: prismaToDomainStatus[job.status],
    customerId: job.customerId,
    deviceId: job.deviceId,
    assignedTechnicianId: job.assignedTechnicianId ?? undefined,
    reportedIssue: job.reportedIssue,
    diagnosisNotes: job.diagnosisNotes ?? undefined,
    ownerInstruction: job.ownerInstruction ?? undefined,
    posReference: job.posReference ?? undefined,
    customerDecision: (job.customerDecision as CaredeskJob["customerDecision"]) ?? undefined,
    readyPickupDate: toDateOnly(job.readyPickupDate),
    lastUpdate: job.lastUpdate,
    createdAt: toIso(job.createdAt)
  };
}

export function mapTimelineEvent(event: {
  id: string;
  jobId: string;
  type: string;
  title: string;
  detail: string;
  actorUserId: string;
  createdAt: Date;
}): CaredeskTimelineEvent {
  return {
    id: event.id,
    jobId: event.jobId,
    type: event.type as CaredeskTimelineEvent["type"],
    title: event.title,
    detail: event.detail,
    actorUserId: event.actorUserId,
    createdAt: toIso(event.createdAt)
  };
}

export function mapEvidence(file: {
  id: string;
  jobId: string;
  category: string;
  section: string | null;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  uploadedByUserId: string;
  createdAt: Date;
}): CaredeskEvidenceFile {
  return {
    id: file.id,
    jobId: file.jobId,
    category: file.category as CaredeskEvidenceFile["category"],
    section: (file.section as CaredeskEvidenceFile["section"]) ?? undefined,
    fileName: file.fileName,
    storagePath: file.storagePath,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    caption: file.caption ?? undefined,
    uploadedByUserId: file.uploadedByUserId,
    createdAt: toIso(file.createdAt)
  };
}

export function mapNotification(record: {
  id: string;
  jobId: string;
  technicianId: string | null;
  stageDay: number | null;
  channel: string;
  status: string;
  result: string | null;
  method: string | null;
  note: string | null;
  messagePreview: string;
  createdAt: Date;
  contactedAt: Date | null;
}): CaredeskNotificationRecord {
  return {
    id: record.id,
    jobId: record.jobId,
    technicianId: record.technicianId ?? undefined,
    stageDay: (record.stageDay as CaredeskNotificationRecord["stageDay"]) ?? undefined,
    channel: record.channel as CaredeskNotificationRecord["channel"],
    status: record.status as CaredeskNotificationRecord["status"],
    result: (record.result as CaredeskNotificationRecord["result"]) ?? undefined,
    method: record.method ?? undefined,
    note: record.note ?? undefined,
    messagePreview: record.messagePreview,
    createdAt: toIso(record.createdAt),
    contactedAt: record.contactedAt ? toIso(record.contactedAt) : undefined
  };
}

export function mapChecklistImage(image: {
  id: string;
  jobId: string;
  section: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  uploadedByUserId: string;
  createdAt: Date;
}): CaredeskChecklistImage {
  return {
    id: image.id,
    jobId: image.jobId,
    section: image.section as CaredeskChecklistImage["section"],
    fileName: image.fileName,
    storagePath: image.storagePath,
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes,
    caption: image.caption ?? undefined,
    uploadedByUserId: image.uploadedByUserId,
    createdAt: toIso(image.createdAt)
  };
}

export function mapChecklistReport(report: {
  jobId: string;
  status: CaredeskChecklistStatus;
  technicianId: string | null;
  deviceInfo: unknown;
  initialCheck: unknown;
  drive: unknown;
  battery: unknown;
  ram: unknown;
  diagnosisSummary: string;
  lastUpdated: Date;
  job: { jobIdDisplay: string };
  images: Array<Parameters<typeof mapChecklistImage>[0]>;
}): CaredeskChecklistReport {
  return {
    jobId: report.jobId,
    jobIdDisplay: report.job.jobIdDisplay,
    status: report.status as ChecklistReportStatus,
    technicianId: report.technicianId ?? undefined,
    deviceInfo: asRecord(report.deviceInfo),
    initialCheck: asRecord(report.initialCheck),
    drive: asRecord(report.drive),
    battery: asRecord(report.battery),
    ram: asRecord(report.ram),
    diagnosisSummary: report.diagnosisSummary,
    images: report.images.map(mapChecklistImage),
    lastUpdated: toIso(report.lastUpdated)
  };
}

export function mapSettings(settings: {
  shopInfo: unknown;
  defaultLanguage: string;
  posReferenceLabel: string;
  flowRules: unknown;
  notificationTemplates?: unknown;
  scannerSettings?: unknown;
}): CaredeskSettings {
  return {
    shopInfo: {
      name: "Fadhil CareDesk",
      subtitle: "Operasi Servis & Repair",
      ...asRecord(settings.shopInfo)
    },
    defaultLanguage: settings.defaultLanguage === "en" ? "en" : "bm",
    posReferenceLabel: settings.posReferenceLabel,
    flowRules: {
      reminderDays: [0, 7, 14, 30, 60],
      unclaimedDay: 90,
      stuckThresholds: {},
      requiredEvidence: { diagnosis: "note_and_photo", readyPickup: "testing_note_required", completePickup: "pickup_note_required" },
      notProceedReasons: [],
      releaseReasons: [],
      lockedRules: [],
      retentionDays: 365,
      ...asRecord(settings.flowRules)
    } as CaredeskSettings["flowRules"],
    notificationTemplates: mapNotificationTemplates(settings.notificationTemplates),
    scannerSettings: mapScannerSettings(settings.scannerSettings)
  };
}

export function mapScannerSettings(value: unknown): CaredeskSettings["scannerSettings"] {
  const record = asRecord(value);
  const encryptedApiKey = typeof record.encryptedApiKey === "string" ? record.encryptedApiKey : undefined;
  const apiKeyMasked = typeof record.apiKeyMasked === "string" ? record.apiKeyMasked : undefined;
  return {
    provider: "openai",
    enabled: record.enabled === true,
    model: typeof record.model === "string" && record.model.trim() ? record.model : "gpt-5.4-mini",
    apiKeyConfigured: Boolean(encryptedApiKey),
    apiKeyMasked: encryptedApiKey ? apiKeyMasked : undefined,
    maxUploadBytes: typeof record.maxUploadBytes === "number" && record.maxUploadBytes > 0 ? record.maxUploadBytes : 10 * 1024 * 1024
  };
}

export function mapNotificationTemplates(value: unknown): CaredeskNotificationTemplate[] {
  if (!Array.isArray(value)) return defaultNotificationTemplates();
  return value.filter((t): t is CaredeskNotificationTemplate =>
    typeof t === "object" && t !== null &&
    typeof (t as CaredeskNotificationTemplate).stageDay === "number" &&
    typeof (t as CaredeskNotificationTemplate).messageTemplate === "string" &&
    ["bm", "en"].includes((t as CaredeskNotificationTemplate).language)
  );
}

export function defaultNotificationTemplates(): CaredeskNotificationTemplate[] {
  const days = [0, 7, 14, 30, 60];
  const templates: CaredeskNotificationTemplate[] = [];
  for (const day of days) {
    templates.push({
      stageDay: day as CaredeskNotificationTemplate["stageDay"],
      channel: "WhatsApp",
      messageTemplate: `Hi {{customerName}}, {{jobIdDisplay}} sudah siap untuk pickup. Reminder Day ${day}.`,
      language: "bm"
    });
    templates.push({
      stageDay: day as CaredeskNotificationTemplate["stageDay"],
      channel: "WhatsApp",
      messageTemplate: `Hi {{customerName}}, {{jobIdDisplay}} is ready for pickup. Reminder Day ${day}.`,
      language: "en"
    });
  }
  return templates;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
