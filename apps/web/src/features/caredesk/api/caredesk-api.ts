import {
  buildChecklistReport,
  buildSettingsDraft,
  careDeskStatuses,
  createEmptyCareDeskState,
  getReportRangeLabel,
  notificationTypeForPickupStage,
  type ChecklistImage,
  type ChecklistReport,
  type Customer,
  type Device,
  type Evidence,
  type FlowRules,
  type Job,
  type NotificationRecord,
  type PickupReminderDay,
  type PrototypeState,
  type ReportRange,
  type ReportsDashboard,
  type ScannerSettings,
  type SettingsDraft,
  type TimelineEvent
} from "../domain/domain";

export const CAREDESK_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000";
export function caredeskFileUrl(storagePath: string): string {
  return `${CAREDESK_API_BASE_URL}/caredesk/files?path=${encodeURIComponent(storagePath)}`;
}

type CaredeskJobStatus =
  | "NEW JOB"
  | "WAITING FADHIL REVIEW"
  | "WAITING CUSTOMER CONFIRMATION"
  | "IN PROGRESS"
  | "NOT PROCEED"
  | "READY PICKUP"
  | "UNCLAIMED"
  | "COMPLETE";

interface CaredeskJob {
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
  customerDecision?: Job["customerDecision"];
  readyPickupDate?: string;
  lastUpdate: string;
  createdAt: string;
}

interface CaredeskJobDetail extends CaredeskJob {
  customer: { id: string; name: string; phone: string; preferredChannel: string };
  device: { id: string; customerId: string; type: string; brand: string; model?: string; serialNumber?: string };
  evidence: CaredeskEvidence[];
  notifications: CaredeskNotification[];
  checklistReport?: CaredeskChecklistReport;
  timeline: CaredeskTimeline[];
}

interface CaredeskCustomerResponse {
  id: string;
  name: string;
  phone: string;
  secondaryContact?: string;
  preferredChannel: string;
  notes?: string;
}

interface CaredeskEvidence {
  id: string;
  jobId: string;
  category: "service_note" | "diagnosis" | "repair_progress" | "ready_pickup" | "complete_pickup" | "customer_decision" | "checklist";
  section?: ChecklistImage["section"];
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  caption?: string;
  uploadedByUserId: string;
  createdAt: string;
}

interface CaredeskTimeline {
  id: string;
  jobId: string;
  type: string;
  title: string;
  detail: string;
  actorUserId: string;
  createdAt: string;
}

interface CaredeskNotification {
  id: string;
  jobId: string;
  technicianId?: string;
  stageDay?: PickupReminderDay;
  channel: string;
  status: NotificationRecord["status"];
  result?: "sent successfully" | "failed" | "no response";
  method?: string;
  note?: string;
  messagePreview: string;
  createdAt: string;
  contactedAt?: string;
}

interface CaredeskChecklistImage {
  id: string;
  jobId: string;
  section: ChecklistImage["section"];
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  caption?: string;
  createdAt: string;
  uploadedByUserId: string;
}

interface CaredeskChecklistReport {
  jobId: string;
  jobIdDisplay: string;
  status: ChecklistReport["status"];
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

interface CaredeskSettings {
  shopInfo: PrototypeState["shopInfo"];
  defaultLanguage: PrototypeState["defaultLanguage"];
  posReferenceLabel: string;
  scannerSettings: ScannerSettings;
  flowRules: {
    reminderDays: number[];
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
  };
  notificationTemplates: Array<{
    stageDay: number;
    channel: string;
    messageTemplate: string;
    language: string;
  }>;
}

interface CaredeskUserResponse {
  id: string;
  name: string;
  email?: string;
  role: "owner" | "technician";
  status?: string;
}

export interface ScanCaredeskServiceNoteResult {
  serviceReportNumber: string;
  customer: { name: string; phone: string; preferredChannel?: string };
  device: { type: string; brand: string; model?: string; serialNumber?: string };
  reportedIssue: string;
  sourceFileName?: string;
  confidence: number;
  confidenceByField?: Record<string, number>;
  warnings?: string[];
  rawTextNotes?: string;
}

export class CaredeskApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "CaredeskApiError";
  }
}

export function validateCaredeskPassword(password: string): { valid: true } | { valid: false; message: string } {
  if (password.length < 8 || !/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, message: "Password must be at least 8 characters and include at least one letter and number." };
  }
  return { valid: true };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const body = init?.body;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${CAREDESK_API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(isFormData ? {} : { "content-type": "application/json" }),
        ...(init?.headers ?? {})
      },
      credentials: "include",
      cache: "no-store"
    });
  } catch {
    throw new CaredeskApiError(`CareDesk API tidak dapat dihubungi. Semak API di ${CAREDESK_API_BASE_URL} dan cuba lagi.`, 0);
  }
  if (!response.ok) {
    const detail = await response.text();
    throw new CaredeskApiError(parseApiError(detail, response.status), response.status);
  }
  return (await response.json()) as T;
}

async function requestBlob(path: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`${CAREDESK_API_BASE_URL}${path}`, {
      credentials: "include",
      cache: "no-store"
    });
  } catch {
    throw new CaredeskApiError(`CareDesk API tidak dapat dihubungi. Semak API di ${CAREDESK_API_BASE_URL} dan cuba lagi.`, 0);
  }
  if (!response.ok) {
    const detail = await response.text();
    throw new CaredeskApiError(parseApiError(detail, response.status), response.status);
  }
  return response.blob();
}

export async function getCaredeskSession() {
  return request("/caredesk/session");
}

export function getCaredeskSetupStatus() {
  return request<{ needsSetup: boolean }>("/caredesk/auth/setup-status");
}

export function setupCaredeskOwner(input: { setupToken: string; name: string; email: string; password: string }) {
  return request<CaredeskUserResponse>("/caredesk/auth/setup", { method: "POST", body: JSON.stringify(input) });
}

export function loginCaredesk(input: { email: string; password: string }) {
  return request<CaredeskUserResponse>("/caredesk/auth/login", { method: "POST", body: JSON.stringify(input) });
}

export function logoutCaredesk() {
  return request<{ ok: boolean }>("/caredesk/auth/logout", { method: "POST" });
}

export function getCaredeskMe() {
  return request<CaredeskUserResponse>("/caredesk/auth/me");
}

export function listCaredeskUsers() {
  return request<CaredeskUserResponse[]>("/caredesk/users");
}

export function createCaredeskUser(input: { name: string; email: string; role: "owner" | "technician"; password: string }) {
  return request<CaredeskUserResponse>("/caredesk/users", { method: "POST", body: JSON.stringify(input) });
}

export function updateCaredeskUser(userId: string, input: { name?: string; email?: string; role?: "owner" | "technician"; status?: string }) {
  return request<CaredeskUserResponse>(`/caredesk/users/${encodeURIComponent(userId)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function resetCaredeskUserPassword(userId: string, password: string) {
  return request<CaredeskUserResponse>(`/caredesk/users/${encodeURIComponent(userId)}/reset-password`, { method: "POST", body: JSON.stringify({ password }) });
}

export async function listCaredeskJobs() {
  return request<CaredeskJob[]>("/caredesk/jobs");
}

export async function getCaredeskJob(jobId: string) {
  return request<CaredeskJobDetail>(`/caredesk/jobs/${encodeURIComponent(jobId)}`);
}

export async function createCaredeskJob(input: { serviceNumber: string; customerName: string; phone: string; device: string; issue: string }) {
  const [brand, ...modelParts] = input.device.split(" ");
  return request<CaredeskJob>("/caredesk/jobs", {
    method: "POST",
    body: JSON.stringify({
      serviceReportNumber: input.serviceNumber,
      customer: { name: input.customerName, phone: input.phone, preferredChannel: "WhatsApp" },
      device: { type: "Laptop", brand: brand || "Device", model: modelParts.join(" ") || undefined },
      reportedIssue: input.issue
    })
  });
}

export function takeCaredeskJob(jobId: string) {
  return request<CaredeskJob>(`/caredesk/jobs/${encodeURIComponent(jobId)}/take`, { method: "POST" });
}

export function releaseCaredeskJob(jobId: string) {
  return request<CaredeskJob>(`/caredesk/jobs/${encodeURIComponent(jobId)}/release`, { method: "POST" });
}

export function submitCaredeskDiagnosis(jobId: string, summary: string, submitToOwner = true) {
  return request(`/caredesk/jobs/${encodeURIComponent(jobId)}/diagnosis`, { method: "POST", body: JSON.stringify({ summary, submitToOwner }) });
}

export function approveCaredeskOwnerReview(jobId: string, instruction: string, posReference?: string) {
  return request<CaredeskJob>(`/caredesk/jobs/${encodeURIComponent(jobId)}/owner-review`, { method: "POST", body: JSON.stringify({ instruction, posReference }) });
}

export function recordCaredeskCustomerDecision(jobId: string, result: "proceed" | "not_proceed", method: string, note?: string, reason?: string) {
  return request<CaredeskJob>(`/caredesk/jobs/${encodeURIComponent(jobId)}/customer-decision`, {
    method: "POST",
    body: JSON.stringify({ result, method, note, reason })
  });
}

export function updateCaredeskRepairProgress(jobId: string, note: string) {
  return request<CaredeskJob>(`/caredesk/jobs/${encodeURIComponent(jobId)}/repair-progress`, { method: "POST", body: JSON.stringify({ note }) });
}

export function markCaredeskReadyPickup(jobId: string, readyPickupDate?: string) {
  return request<CaredeskJob>(`/caredesk/jobs/${encodeURIComponent(jobId)}/ready-pickup`, { method: "POST", body: JSON.stringify({ readyPickupDate }) });
}

export function completeCaredeskPickup(jobId: string) {
  return request<CaredeskJob>(`/caredesk/jobs/${encodeURIComponent(jobId)}/complete-pickup`, { method: "POST" });
}

export function markCaredeskUnclaimed(jobId: string) {
  return request<CaredeskJob>(`/caredesk/jobs/${encodeURIComponent(jobId)}/mark-unclaimed`, { method: "POST" });
}

export function listCaredeskPickup() {
  return request("/caredesk/pickup");
}

export function listCaredeskNotifications() {
  return request<CaredeskNotification[]>("/caredesk/notifications");
}

export function recordCaredeskNotificationResult(notificationId: string, result: "sent successfully" | "failed" | "no response", method?: string, note?: string) {
  return request<CaredeskNotification>(`/caredesk/notifications/${encodeURIComponent(notificationId)}/result`, {
    method: "POST",
    body: JSON.stringify({ result, method, note })
  });
}

export function listCaredeskChecklistReports() {
  return request<CaredeskChecklistReport[]>("/caredesk/checklist-reports");
}

export function getCaredeskChecklistReport(jobId: string) {
  return request<CaredeskChecklistReport>(`/caredesk/checklist-reports/${encodeURIComponent(jobId)}`);
}

export function saveCaredeskChecklistReport(report: ChecklistReport, status: ChecklistReport["status"]) {
  return request<CaredeskChecklistReport>(`/caredesk/checklist-reports/${encodeURIComponent(report.jobId)}`, {
    method: "PUT",
    body: JSON.stringify({
      status,
      deviceInfo: {
        type: report.deviceType,
        model: report.deviceModel,
        serialNumber: report.serialNumber,
        customerName: report.customerName,
        customerPhone: report.customerPhone,
        checkedBy: report.checkedBy,
        catatan: report.catatan
      },
      initialCheck: omitImages(report.initialCheck),
      drive: omitImages(report.drive),
      battery: omitImages(report.battery),
      ram: omitImages(report.ram),
      diagnosisSummary: report.diagnosisSummary
    })
  });
}

export function uploadCaredeskChecklistImage(jobId: string, section: ChecklistImage["section"], file: File, caption?: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("section", section);
  if (caption) {
    form.append("caption", caption);
  }
  return request<CaredeskChecklistImage>(`/caredesk/checklist-reports/${encodeURIComponent(jobId)}/images`, { method: "POST", body: form });
}

export function updateCaredeskChecklistImageCaption(jobId: string, imageId: string, caption: string) {
  return request<CaredeskChecklistImage>(
    `/caredesk/checklist-reports/${encodeURIComponent(jobId)}/images/${encodeURIComponent(imageId)}`,
    { method: "PATCH", body: JSON.stringify({ caption }) }
  );
}

export function deleteCaredeskChecklistImage(jobId: string, imageId: string) {
  return request(`/caredesk/checklist-reports/${encodeURIComponent(jobId)}/images/${encodeURIComponent(imageId)}`, { method: "DELETE" });
}

export function listCaredeskCustomers() {
  return request("/caredesk/customers");
}

export function getCaredeskCustomer(customerId: string) {
  return request(`/caredesk/customers/${encodeURIComponent(customerId)}`);
}

export function getCaredeskReports() {
  return request<CaredeskReportsResponse>("/caredesk/reports");
}

export function recordCaredeskReportExport(action: string) {
  return request("/caredesk/reports/export-audit", { method: "POST", body: JSON.stringify({ action }) });
}

export async function exportCaredeskCsv(range: ReportRange) {
  const response = await fetch(`${CAREDESK_API_BASE_URL}/caredesk/reports/export-csv`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ range })
  });
  if (!response.ok) {
    throw new CaredeskApiError(`CSV export failed: ${response.statusText}`, response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `caredesk-report-${range}-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportCaredeskPdf(range: ReportRange) {
  const response = await fetch(`${CAREDESK_API_BASE_URL}/caredesk/reports/export-pdf`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ range })
  });
  if (!response.ok) {
    throw new CaredeskApiError(`PDF export failed: ${response.statusText}`, response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `caredesk-report-${range}-${Date.now()}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function getCaredeskSettings() {
  return request<CaredeskSettings>("/caredesk/settings");
}

export function updateCaredeskSettings(settings: Partial<CaredeskSettings>) {
  return request<CaredeskSettings>("/caredesk/settings", { method: "PUT", body: JSON.stringify(settings) });
}

export function updateCaredeskSettingsDraft(draft: SettingsDraft) {
  return updateCaredeskSettings({
    shopInfo: draft.shopInfo,
    defaultLanguage: draft.defaultLanguage,
    posReferenceLabel: draft.posReferenceLabel,
    scannerSettings: scannerSettingsPayload(draft.scannerSettings),
    flowRules: {
      reminderDays: draft.flowRules.reminderDays as CaredeskSettings["flowRules"]["reminderDays"],
      unclaimedDay: draft.flowRules.unclaimedDay,
      stuckThresholds: draft.flowRules.stuckThresholds,
      requiredEvidence: draft.flowRules.requiredEvidence,
      notProceedReasons: draft.flowRules.notProceedReasons,
      releaseReasons: draft.flowRules.releaseReasons,
      lockedRules: draft.flowRules.lockedRules,
      retentionDays: draft.flowRules.retentionDays
    },
    notificationTemplates: draft.notificationTemplates.map((t) => ({
      stageDay: t.stageDay,
      channel: t.channel,
      messageTemplate: t.messageTemplate,
      language: t.language
    }))
  });
}

export function testCaredeskScannerSettings(input: { model: string; apiKey?: string }) {
  return request<{ ok: true; model: string }>("/caredesk/settings/scanner/test", { method: "POST", body: JSON.stringify(input) });
}

export function scanCaredeskServiceNote(file?: File) {
  const form = new FormData();
  if (file) {
    form.append("file", file);
  }
  return request<ScanCaredeskServiceNoteResult>("/caredesk/service-notes/scan", { method: "POST", body: form });
}

export function getCustomerReport(jobId: string) {
  return request(`/caredesk/jobs/${encodeURIComponent(jobId)}/customer-report`);
}

export function downloadCustomerReportPdf(jobId: string) {
  return requestBlob(`/caredesk/jobs/${encodeURIComponent(jobId)}/customer-report.pdf`);
}

export function downloadChecklistReportPdf(jobId: string) {
  return requestBlob(`/caredesk/checklist-reports/${encodeURIComponent(jobId)}.pdf`);
}

export async function loadCaredeskAppState(): Promise<PrototypeState> {
  const empty = createEmptyCareDeskState();
  const [jobs, settings, users, apiCustomers] = await Promise.all([
    listCaredeskJobs(),
    getCaredeskSettings().catch(() => undefined),
    listCaredeskUsers().catch(() => undefined),
    listCaredeskCustomers().catch(() => undefined)
  ]);
  const details = await Promise.all(jobs.map((job) => getCaredeskJob(job.id)));
  const jobCustomers = details.map((detail) => mapCustomer(detail.customer));
  const apiCustomerList = (apiCustomers ?? []) as CaredeskCustomerResponse[];
  const mergedCustomers = uniqueBy(
    [...apiCustomerList.map(mapCustomer), ...jobCustomers],
    (customer) => customer.id
  );
  const state: PrototypeState = {
    ...empty,
    users: users?.map(mapUser) ?? empty.users,
    customers: mergedCustomers,
    devices: uniqueBy(details.map((detail) => mapDevice(detail.device)), (device) => device.id),
    jobs: details.map(mapJob),
    evidence: details.flatMap((detail) => detail.evidence.map(mapEvidence)),
    checklistReports: details
      .map((detail) => detail.checklistReport)
      .filter((report): report is CaredeskChecklistReport => Boolean(report))
      .map((report) => mapChecklistReport(report, empty)),
    timeline: details.flatMap((detail) => detail.timeline.map(mapTimeline)),
    notifications: details.flatMap((detail) => detail.notifications.map(mapNotification)),
    shopInfo: settings?.shopInfo ?? empty.shopInfo,
    defaultLanguage: settings?.defaultLanguage ?? empty.defaultLanguage,
    posReferenceLabel: settings?.posReferenceLabel ?? empty.posReferenceLabel,
    scannerSettings: settings?.scannerSettings ?? empty.scannerSettings,
    flowRules: settings
      ? {
          ...empty.flowRules,
          reminderDays: settings.flowRules.reminderDays,
          unclaimedDay: settings.flowRules.unclaimedDay,
          lockedRules: settings.flowRules.lockedRules
        }
      : empty.flowRules
  };
  return state.checklistReports.length
    ? state
    : { ...state, checklistReports: state.jobs.map((job) => buildChecklistReport(state, job)) };
}

export function mapCaredeskUser(user: CaredeskUserResponse) {
  return mapUser(user);
}

export async function loadReportsDashboard(range: ReportRange = "all"): Promise<ReportsDashboard> {
  const report = await getCaredeskReports();
  const statusBreakdown = careDeskStatuses.map((status) => ({
    status,
    count: Number(report.statusBreakdown?.[status] ?? 0)
  }));
  return {
    range,
    rangeLabel: getReportRangeLabel(range),
    generatedAt: new Date().toISOString(),
    counts: {
      totalJobs: Number(report.totalJobs ?? 0),
      activeJobs: Number(report.activeJobs ?? 0),
      completed: statusBreakdown.find((item) => item.status === "COMPLETE")?.count ?? 0,
      notProceed: statusBreakdown.find((item) => item.status === "NOT PROCEED")?.count ?? 0,
      readyPickup: Number(report.readyPickup ?? 0),
      unclaimed: Number(report.unclaimed ?? 0)
    },
    statusBreakdown,
    technicianWorkload: report.technicianWorkload ?? [],
    pickup: {
      readyPickup: Number(report.readyPickup ?? 0),
      remindersSent: Number(report.remindersSent ?? 0),
      needFollowUp: Number(report.needFollowUp ?? 0),
      unclaimed: Number(report.unclaimed ?? 0)
    },
    notProceedRows: report.notProceedRows ?? [],
    completedRows: report.completedRows ?? []
  };
}

export async function loadSettingsDraft(): Promise<SettingsDraft> {
  const empty = createEmptyCareDeskState();
  const settings = await getCaredeskSettings();
  return buildSettingsDraft({
    ...empty,
    shopInfo: settings.shopInfo,
    defaultLanguage: settings.defaultLanguage,
    posReferenceLabel: settings.posReferenceLabel,
    scannerSettings: settings.scannerSettings ?? empty.scannerSettings,
    notificationTemplates: settings.notificationTemplates.map((t) => ({
      stageDay: t.stageDay as import("../domain/domain").PickupReminderDay,
      channel: t.channel as "WhatsApp",
      messageTemplate: t.messageTemplate,
      language: t.language as import("../domain/domain").Language
    })),
    flowRules: {
      ...empty.flowRules,
      reminderDays: settings.flowRules.reminderDays,
      unclaimedDay: settings.flowRules.unclaimedDay,
      stuckThresholds: (settings.flowRules.stuckThresholds ?? empty.flowRules.stuckThresholds) as Record<"NEW JOB" | "WAITING FADHIL REVIEW" | "WAITING CUSTOMER CONFIRMATION" | "IN PROGRESS", string>,
      requiredEvidence: (settings.flowRules.requiredEvidence ?? empty.flowRules.requiredEvidence) as FlowRules["requiredEvidence"],
      notProceedReasons: (settings.flowRules.notProceedReasons ?? empty.flowRules.notProceedReasons) as string[],
      releaseReasons: (settings.flowRules.releaseReasons ?? empty.flowRules.releaseReasons) as string[],
      lockedRules: settings.flowRules.lockedRules,
      retentionDays: Number(settings.flowRules.retentionDays ?? empty.flowRules.retentionDays)
    }
  });
}

function mapJob(job: CaredeskJobDetail): Job {
  return {
    id: job.id,
    jobIdDisplay: job.jobIdDisplay,
    rawReportNumber: job.rawReportNumber,
    status: job.status,
    customerId: job.customerId,
    deviceId: job.deviceId,
    assignedTechnicianId: job.assignedTechnicianId,
    statusAge: "API",
    reportedIssue: job.reportedIssue,
    nextAction: nextActionForStatus(job.status),
    diagnosisNotes: job.diagnosisNotes,
    ownerInstruction: job.ownerInstruction,
    posReference: job.posReference,
    customerDecision: job.customerDecision,
    readyPickupDate: job.readyPickupDate,
    pickupReminderStage: job.readyPickupDate ? "Auto" : undefined,
    badges: badgesForStatus(job.status),
    lastUpdate: job.lastUpdate
  };
}

function mapUser(user: CaredeskUserResponse) {
  return { id: user.id, name: user.name, role: user.role, language: "bm" as const, email: user.email, status: user.status };
}

function mapCustomer(customer: CaredeskJobDetail["customer"] | CaredeskCustomerResponse): Customer {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    secondaryContact: "secondaryContact" in customer ? customer.secondaryContact : undefined,
    preferredChannel: customer.preferredChannel === "Phone Call" || customer.preferredChannel === "In Shop" ? customer.preferredChannel : "WhatsApp",
    notes: "notes" in customer ? customer.notes : undefined
  };
}

function mapDevice(device: CaredeskJobDetail["device"]): Device {
  return {
    id: device.id,
    customerId: device.customerId,
    type: device.type,
    brand: device.brand,
    model: device.model ?? device.type,
    serialNumber: device.serialNumber
  };
}

function mapEvidence(evidence: CaredeskEvidence): Evidence {
  return {
    id: evidence.id,
    jobId: evidence.jobId,
    type:
      evidence.category === "ready_pickup" || evidence.category === "complete_pickup"
        ? "pickup"
        : evidence.category === "repair_progress"
          ? "diagnosis"
          : evidence.category === "checklist"
            ? "other"
            : evidence.category,
    label: evidence.fileName,
    createdAt: evidence.createdAt,
    caption: evidence.caption,
    imageUrl: caredeskFileUrl(evidence.storagePath)
  };
}

function mapTimeline(event: CaredeskTimeline): TimelineEvent {
  return {
    id: event.id,
    jobId: event.jobId,
    type: event.type === "assignment" || event.type === "checklist" || event.type === "report" || event.type === "settings" ? "audit" : (event.type as TimelineEvent["type"]),
    title: event.title,
    detail: event.detail,
    actor: event.actorUserId,
    createdAt: event.createdAt,
    important: true
  };
}

function mapNotification(record: CaredeskNotification): NotificationRecord {
  return {
    id: record.id,
    jobId: record.jobId,
    technicianId: record.technicianId,
    type: notificationTypeForPickupStage(record.stageDay ?? 0),
    stageDay: record.stageDay,
    channel: record.channel === "Phone Call" ? "Phone Call" : "WhatsApp",
    dueLabel: "API",
    status: record.status,
    result: record.result === "no response" ? "no response" : record.result === "sent successfully" ? "sent successfully" : record.result === "failed" ? "wrong number" : undefined,
    createdAt: record.createdAt,
    contactedAt: record.contactedAt,
    messagePreview: record.messagePreview
  };
}

function mapChecklistReport(report: CaredeskChecklistReport, seed: PrototypeState): ChecklistReport {
  const images = report.images.map(mapChecklistImage);
  const fallbackJob = mapJobFallback(report);
  const state: PrototypeState = {
    ...seed,
    customers: [
      {
        id: fallbackJob.customerId,
        name: String(report.deviceInfo.customerName ?? "Customer"),
        phone: String(report.deviceInfo.customerPhone ?? "-"),
        preferredChannel: "WhatsApp"
      }
    ],
    devices: [
      {
        id: fallbackJob.deviceId,
        customerId: fallbackJob.customerId,
        type: String(report.deviceInfo.type ?? "Laptop"),
        brand: String(report.deviceInfo.brand ?? report.deviceInfo.model ?? "Device"),
        model: String(report.deviceInfo.model ?? "Model"),
        serialNumber: typeof report.deviceInfo.serialNumber === "string" ? report.deviceInfo.serialNumber : undefined
      }
    ],
    jobs: [fallbackJob],
    checklistReports: []
  };
  const fallback = buildChecklistReport(state, fallbackJob);
  return {
    ...fallback,
    jobId: report.jobId,
    jobIdDisplay: report.jobIdDisplay,
    status: report.status,
    technicianId: report.technicianId,
    customerName: String(report.deviceInfo.customerName ?? fallback.customerName),
    customerPhone: String(report.deviceInfo.customerPhone ?? fallback.customerPhone),
    deviceType: String(report.deviceInfo.type ?? fallback.deviceType),
    deviceModel: String(report.deviceInfo.model ?? fallback.deviceModel),
    serialNumber: typeof report.deviceInfo.serialNumber === "string" ? report.deviceInfo.serialNumber : fallback.serialNumber,
    checkedBy: String(report.deviceInfo.checkedBy ?? fallback.checkedBy),
    dateCompleted: new Date(report.lastUpdated).toLocaleDateString("en-MY"),
    catatan: String(report.deviceInfo.catatan ?? fallback.catatan),
    initialCheck: { ...fallback.initialCheck, ...report.initialCheck, images: images.filter((image) => image.section === "initialCheck") } as ChecklistReport["initialCheck"],
    drive: { ...fallback.drive, ...report.drive, images: images.filter((image) => image.section === "drive") } as ChecklistReport["drive"],
    battery: { ...fallback.battery, ...report.battery, images: images.filter((image) => image.section === "battery") } as ChecklistReport["battery"],
    ram: { ...fallback.ram, ...report.ram, slots: Array.isArray(report.ram.slots) ? report.ram.slots : fallback.ram.slots, images: images.filter((image) => image.section === "ram") } as ChecklistReport["ram"],
    diagnosisSummary: report.diagnosisSummary || fallback.diagnosisSummary,
    diagnosisImages: images.filter((image) => image.section === "diagnosis"),
    lastUpdated: report.lastUpdated
  };
}

function mapChecklistImage(image: CaredeskChecklistImage): ChecklistImage {
  return {
    id: image.id,
    section: image.section,
    fileName: image.fileName,
    dataUrl: caredeskFileUrl(image.storagePath),
    caption: image.caption,
    createdAt: image.createdAt
  };
}

function mapJobFallback(report: CaredeskChecklistReport): Job {
  return {
    id: report.jobId,
    jobIdDisplay: report.jobIdDisplay,
    rawReportNumber: report.jobIdDisplay.replace(/[^0-9]/g, ""),
    status: "NEW JOB",
    customerId: `${report.jobId}_customer`,
    deviceId: `${report.jobId}_device`,
    statusAge: "API",
    reportedIssue: "",
    nextAction: "",
    badges: [],
    lastUpdate: report.lastUpdated
  };
}

function nextActionForStatus(status: CaredeskJobStatus) {
  const actions: Record<CaredeskJobStatus, string> = {
    "NEW JOB": "Technician perlu take job dan mula diagnosis.",
    "WAITING FADHIL REVIEW": "Owner perlu semak diagnosis.",
    "WAITING CUSTOMER CONFIRMATION": "Rekod keputusan customer.",
    "IN PROGRESS": "Technician boleh update repair progress.",
    "NOT PROCEED": "Tiada action repair.",
    "READY PICKUP": "Hubungi customer untuk pickup.",
    UNCLAIMED: "Owner perlu decide next action.",
    COMPLETE: "Archived history."
  };
  return actions[status];
}

function badgesForStatus(status: CaredeskJobStatus) {
  const badges: Record<CaredeskJobStatus, string[]> = {
    "NEW JOB": ["New"],
    "WAITING FADHIL REVIEW": ["Need Review"],
    "WAITING CUSTOMER CONFIRMATION": ["Customer Waiting"],
    "IN PROGRESS": ["In Progress"],
    "NOT PROCEED": ["Not Proceed"],
    "READY PICKUP": ["Ready Pickup"],
    UNCLAIMED: ["Unclaimed"],
    COMPLETE: ["Complete"]
  };
  return badges[status];
}

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(key(item), item);
  }
  return [...map.values()];
}

function omitImages<T extends { images?: unknown }>(value: T) {
  const { images: _images, ...rest } = value;
  return rest;
}

function scannerSettingsPayload(settings: ScannerSettings) {
  const payload: ScannerSettings = {
    ...settings,
    apiKey: undefined
  };
  if (settings.apiKey?.trim()) {
    payload.apiKey = settings.apiKey.trim();
  }
  return payload;
}

function parseApiError(detail: string, status: number) {
  try {
    const parsed = JSON.parse(detail) as { message?: unknown };
    const message = Array.isArray(parsed.message) ? parsed.message.join(", ") : parsed.message;
    return typeof message === "string" ? message : `CareDesk API request failed with ${status}`;
  } catch {
    return detail || `CareDesk API request failed with ${status}`;
  }
}

interface CaredeskReportsResponse {
  totalJobs?: number;
  activeJobs?: number;
  readyPickup?: number;
  unclaimed?: number;
  remindersSent?: number;
  needFollowUp?: number;
  statusBreakdown?: Partial<Record<ReportsDashboard["statusBreakdown"][number]["status"], number>>;
  technicianWorkload?: ReportsDashboard["technicianWorkload"];
  notProceedRows?: ReportsDashboard["notProceedRows"];
  completedRows?: ReportsDashboard["completedRows"];
}
