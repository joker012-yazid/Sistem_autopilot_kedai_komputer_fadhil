export const careDeskStatuses = [
  "NEW JOB",
  "WAITING FADHIL REVIEW",
  "WAITING CUSTOMER CONFIRMATION",
  "IN PROGRESS",
  "NOT PROCEED",
  "READY PICKUP",
  "UNCLAIMED",
  "COMPLETE"
] as const;

export type JobStatus = (typeof careDeskStatuses)[number];
export type CareDeskRole = "owner" | "technician";
export type Language = "bm" | "en";
export type NavKey = "dashboard" | "jobs" | "scanJob" | "myJobs" | "review" | "checklistReports" | "pickup" | "notifications" | "customers" | "reports" | "settings";
export type JobAction =
  | "take_job"
  | "release_job"
  | "add_diagnosis"
  | "submit_owner_review"
  | "approve_owner_review"
  | "record_customer_decision"
  | "update_repair"
  | "mark_ready_pickup"
  | "notify_customer"
  | "complete_pickup"
  | "mark_unclaimed";

export interface NavigationItem {
  key: NavKey;
  href: string;
}

export interface User {
  id: string;
  name: string;
  role: CareDeskRole;
  language: Language;
  email?: string;
  status?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  secondaryContact?: string;
  preferredChannel: "WhatsApp" | "Phone Call" | "In Shop";
  notes?: string;
}

export interface CustomerSummary {
  customer: Customer;
  jobs: Job[];
  activeJobs: Job[];
  activeJobCount: number;
  totalJobCount: number;
  lastVisit: string;
  lastJobIdDisplay?: string;
  preferredChannel: Customer["preferredChannel"];
}

export interface CustomerJobHistoryItem {
  job: Job;
  device: Device;
  technician?: User;
  status: JobStatus;
  lastUpdate: string;
  posReference?: string;
}

export interface CustomerDeviceHistoryItem {
  device: Device;
  issueHistory: CustomerJobHistoryItem[];
}

export interface CustomerContactHistoryItem {
  id: string;
  jobId: string;
  jobIdDisplay: string;
  type: string;
  detail: string;
  channel?: NotificationRecord["channel"] | NonNullable<Job["customerDecision"]>["method"];
  status?: NotificationRecord["status"];
  result?: string;
  createdAt: string;
}

export interface CustomerDetail {
  customer: Customer;
  summary: CustomerSummary;
  activeJobs: CustomerJobHistoryItem[];
  jobHistory: CustomerJobHistoryItem[];
  deviceHistory: CustomerDeviceHistoryItem[];
  contactHistory: CustomerContactHistoryItem[];
}

export interface Device {
  id: string;
  customerId: string;
  type: string;
  brand: string;
  model: string;
  serialNumber?: string;
  accessories?: string;
}

export interface Evidence {
  id: string;
  jobId: string;
  type: "service_note" | "diagnosis" | "customer_decision" | "pickup" | "other";
  label: string;
  createdAt: string;
  caption?: string;
  imageUrl?: string;
  testResult?: string;
  customerVisible?: boolean;
}

export interface TimelineEvent {
  id: string;
  jobId: string;
  type: "status" | "diagnosis" | "evidence" | "owner_review" | "customer_decision" | "pickup" | "notification" | "audit";
  title: string;
  detail: string;
  actor: string;
  createdAt: string;
  important?: boolean;
}

export interface NotificationRecord {
  id: string;
  jobId: string;
  technicianId?: string;
  type: "Ready pickup Day 0" | "Reminder Day 7" | "Reminder Day 14" | "Reminder Day 30" | "Final notice Day 60" | "Customer confirmation follow-up";
  stageDay?: PickupReminderDay;
  channel: "WhatsApp" | "Phone Call";
  dueLabel: string;
  status: "Pending" | "Sent" | "Failed" | "Need follow-up";
  result?: "customer replied" | "no response" | "sent successfully" | "wrong number";
  method?: string;
  note?: string;
  createdAt: string;
  contactedAt?: string;
  messagePreview: string;
}

export type PickupReminderDay = 0 | 7 | 14 | 30 | 60;

export interface PickupStage {
  ageDays: number;
  stageDay: PickupReminderDay;
  label: string;
  unclaimedEligible: boolean;
}

export interface PickupReminder {
  stageDay: PickupReminderDay;
  label: string;
  status: NotificationRecord["status"];
  dueToday: boolean;
  needsFollowUp: boolean;
  notification?: NotificationRecord;
  nextAction: string;
}

export interface PickupQueueItem {
  job: Job;
  customer: Customer;
  device: Device;
  technician?: User;
  stage: PickupStage;
  nextReminder: PickupReminder;
}

export interface FlowRules {
  reminderDays: number[];
  unclaimedDay: number;
  stuckThresholds: Record<"NEW JOB" | "WAITING FADHIL REVIEW" | "WAITING CUSTOMER CONFIRMATION" | "IN PROGRESS", string>;
  requiredEvidence: {
    diagnosis: "note" | "note_and_photo";
    readyPickup: "testing_note_optional" | "testing_note_required";
    completePickup: "pickup_note_optional" | "pickup_note_required";
  };
  notProceedReasons: string[];
  releaseReasons: string[];
  lockedRules: string[];
  retentionDays: number;
}

export interface ShopInfo {
  name: string;
  subtitle: string;
  phone?: string;
  address?: string;
}

export interface NotificationTemplateEntry {
  stageDay: PickupReminderDay;
  channel: "WhatsApp";
  messageTemplate: string;
  language: Language;
}

export type NotificationTemplates = NotificationTemplateEntry[];

export interface UploadRules {
  evidenceMaxImages: number;
  allowPdfUpload: boolean;
  allowImageUpload: boolean;
}

export interface ScannerSettings {
  provider: "openai";
  enabled: boolean;
  model: string;
  apiKey?: string;
  apiKeyConfigured: boolean;
  apiKeyMasked?: string;
  maxUploadBytes: number;
}

export interface SettingsDraft {
  shopInfo: ShopInfo;
  defaultLanguage: Language;
  posReferenceLabel: string;
  notificationTemplates: NotificationTemplates;
  uploadRules: UploadRules;
  scannerSettings: ScannerSettings;
  flowRules: FlowRules;
}

export interface Job {
  id: string;
  jobIdDisplay: string;
  rawReportNumber: string;
  status: JobStatus;
  customerId: string;
  deviceId: string;
  assignedTechnicianId?: string;
  statusAge: string;
  reportedIssue: string;
  nextAction: string;
  diagnosisNotes?: string;
  ownerInstruction?: string;
  posReference?: string;
  customerDecision?: {
    result: "proceed" | "not_proceed";
    method: "WhatsApp" | "Phone Call" | "In Shop" | "Other";
    note?: string;
    reason?: string;
  };
  readyPickupDate?: string;
  pickupReminderStage?: string;
  badges: string[];
  lastUpdate: string;
}

export interface PrototypeState {
  users: User[];
  customers: Customer[];
  devices: Device[];
  jobs: Job[];
  evidence: Evidence[];
  checklistReports: ChecklistReport[];
  timeline: TimelineEvent[];
  notifications: NotificationRecord[];
  flowRules: FlowRules;
  shopInfo: ShopInfo;
  defaultLanguage: Language;
  notificationTemplates: NotificationTemplates;
  posReferenceLabel: string;
  uploadRules: UploadRules;
  scannerSettings: ScannerSettings;
  auditLog: TimelineEvent[];
}

export interface CustomerReportEvidence {
  id: string;
  label: string;
  caption: string;
  imageUrl?: string;
  testResult?: string;
}

export interface CustomerReport {
  jobIdDisplay: string;
  generatedAt: string;
  customerName: string;
  customerPhone: string;
  preferredChannel: Customer["preferredChannel"];
  deviceType: string;
  deviceLabel: string;
  serialNumber?: string;
  accessories?: string;
  reportedIssue: string;
  status: JobStatus;
  assignedTechnician: string;
  statusAge: string;
  diagnosisSummary: string;
  ownerRecommendation: string;
  posReference?: string;
  evidence: CustomerReportEvidence[];
  customerNote: string;
}

export type ReportRange = "all" | "today" | "7d" | "30d";

export interface ReportsDashboard {
  range: ReportRange;
  rangeLabel: string;
  generatedAt: string;
  counts: {
    totalJobs: number;
    activeJobs: number;
    completed: number;
    notProceed: number;
    readyPickup: number;
    unclaimed: number;
  };
  statusBreakdown: Array<{ status: JobStatus; count: number }>;
  technicianWorkload: Array<{
    technicianId: string;
    technicianName: string;
    assignedJobs: number;
    activeJobs: number;
    completedJobs: number;
    averageReadyPickupDays: string;
  }>;
  pickup: {
    readyPickup: number;
    remindersSent: number;
    needFollowUp: number;
    unclaimed: number;
  };
  notProceedRows: Array<{
    jobId: string;
    jobIdDisplay: string;
    customerName: string;
    deviceType: string;
    technicianName: string;
    reason: string;
    method: string;
  }>;
  completedRows: Array<{
    jobId: string;
    jobIdDisplay: string;
    customerName: string;
    deviceLabel: string;
    technicianName: string;
    completedDate: string;
    posReference?: string;
  }>;
}

export type ChecklistReportStatus = "not_started" | "draft" | "submitted";
export type ChecklistImageSection = "initialCheck" | "drive" | "battery" | "ram" | "diagnosis";

export interface ChecklistImage {
  id: string;
  section: ChecklistImageSection;
  fileName: string;
  dataUrl: string;
  caption?: string;
  createdAt: string;
}

export interface InitialDeviceCheck {
  problemVerified: boolean;
  technicianNote: string;
  images: ChecklistImage[];
}

export interface DriveChecklist {
  driveType: "HDD" | "SSD SATA" | "SSD NVMe";
  software: string;
  healthStatus: "Good" | "Warning" | "Critical";
  badSectorDetected: boolean;
  healthPercent: string;
  performancePercent: string;
  readSpeed: string;
  writeSpeed: string;
  screenshotTaken: boolean;
  note: string;
  images: ChecklistImage[];
}

export interface BatteryChecklist {
  applicable: boolean;
  designCapacity: string;
  fullChargeCapacity: string;
  estimatedHealth: string;
  status: "Normal" | "Lemah" | "Perlu Tukar Battery" | "N/A";
  screenshotTaken: boolean;
  note: string;
  images: ChecklistImage[];
}

export interface RamChecklist {
  totalSlots: string;
  usedSlots: string;
  emptySlots: string;
  ramType: "DDR3" | "DDR4" | "DDR5";
  formFactor: "SO-DIMM (Laptop)" | "DIMM (PC)";
  voltage: string;
  slots: Array<{
    slot: number;
    sizeGb: string;
    ddrType: string;
    speedMhz: string;
    singleDual: "Single" | "Dual" | "-";
    status: "OK" | "Tidak Dikesan";
  }>;
  note: string;
  images: ChecklistImage[];
}

export interface ChecklistReport {
  jobId: string;
  jobIdDisplay: string;
  customerName: string;
  customerPhone: string;
  deviceType: string;
  deviceModel: string;
  serialNumber?: string;
  technicianId?: string;
  checkedBy: string;
  dateCompleted: string;
  status: ChecklistReportStatus;
  lastUpdated: string;
  catatan: string;
  initialCheck: InitialDeviceCheck;
  drive: DriveChecklist;
  battery: BatteryChecklist;
  ram: RamChecklist;
  diagnosisSummary: string;
  diagnosisImages: ChecklistImage[];
}

export const text = {
  bm: {
    appName: "Fadhil CareDesk",
    subtitle: "Operasi Servis & Repair",
    dashboard: "Papan Pemuka",
    jobs: "Kerja",
    scanJob: "Imbas Job",
    myJobs: "Kerja Saya",
    review: "Semakan",
    checklistReports: "Checklist Report",
    pickup: "Ambil Barang",
    notifications: "Notifikasi",
    customers: "Pelanggan",
    reports: "Laporan",
    settings: "Tetapan",
    owner: "Owner/Fadhil",
    technician: "Technician"
  },
  en: {
    appName: "Fadhil CareDesk",
    subtitle: "Repair Operations",
    dashboard: "Dashboard",
    jobs: "Jobs",
    scanJob: "Scan Job",
    myJobs: "My Jobs",
    review: "Review",
    checklistReports: "Checklist Report",
    pickup: "Pickup",
    notifications: "Notifications",
    customers: "Customers",
    reports: "Reports",
    settings: "Settings",
    owner: "Owner/Fadhil",
    technician: "Technician"
  }
} satisfies Record<Language, Record<NavKey | "appName" | "subtitle" | CareDeskRole, string>>;

const ownerNav: NavigationItem[] = [
  { key: "dashboard", href: "/dashboard" },
  { key: "jobs", href: "/jobs" },
  { key: "review", href: "/review" },
  { key: "checklistReports", href: "/checklist-reports" },
  { key: "pickup", href: "/pickup" },
  { key: "notifications", href: "/notifications" },
  { key: "customers", href: "/customers" },
  { key: "reports", href: "/reports" },
  { key: "settings", href: "/settings" }
];

const technicianNav: NavigationItem[] = [
  { key: "scanJob", href: "/scan" },
  { key: "jobs", href: "/jobs" },
  { key: "myJobs", href: "/my-jobs" },
  { key: "checklistReports", href: "/checklist-reports" },
  { key: "pickup", href: "/pickup" },
  { key: "notifications", href: "/notifications" }
];

export function getNavigationForRole(role: CareDeskRole): NavigationItem[] {
  return role === "owner" ? ownerNav : technicianNav;
}

export function getText(language: Language, key: keyof (typeof text)["bm"]): string {
  return text[language][key];
}

export function canApplyJobAction(job: Job, role: CareDeskRole, action: JobAction, userId = "user_technician"): boolean {
  const isAssignedTechnician = role === "technician" && job.assignedTechnicianId === userId;
  if (role === "owner") {
    return ["approve_owner_review", "record_customer_decision", "notify_customer", "complete_pickup", "mark_unclaimed"].includes(action);
  }
  switch (action) {
    case "take_job":
      return job.status === "NEW JOB" && !job.assignedTechnicianId;
    case "release_job":
      return isAssignedTechnician && !["COMPLETE", "NOT PROCEED", "UNCLAIMED"].includes(job.status);
    case "add_diagnosis":
      return isAssignedTechnician && job.status === "NEW JOB";
    case "submit_owner_review":
      return isAssignedTechnician && job.status === "NEW JOB";
    case "record_customer_decision":
      return isAssignedTechnician && job.status === "WAITING CUSTOMER CONFIRMATION";
    case "update_repair":
      return isAssignedTechnician && job.status === "IN PROGRESS";
    case "mark_ready_pickup":
      return isAssignedTechnician && job.status === "IN PROGRESS";
    case "notify_customer":
      return isAssignedTechnician && job.status === "READY PICKUP";
    case "complete_pickup":
      return isAssignedTechnician && job.status === "READY PICKUP";
    default:
      return false;
  }
}

export function getPickupStage(job: Job, now: string | Date = new Date()): PickupStage {
  const readyDate = job.readyPickupDate ?? toDateOnly(now);
  const ageDays = Math.max(0, daysBetween(readyDate, now));
  const stageDay: PickupReminderDay = ageDays >= 60 ? 60 : ageDays >= 30 ? 30 : ageDays >= 14 ? 14 : ageDays >= 7 ? 7 : 0;
  return {
    ageDays,
    stageDay,
    label: `Day ${stageDay}`,
    unclaimedEligible: ageDays >= 90
  };
}

export function getNextPickupReminder(job: Job, notifications: NotificationRecord[], now: string | Date = new Date()): PickupReminder {
  const stage = getPickupStage(job, now);
  const stageNotifications = notifications
    .filter((notification) => notification.jobId === job.id && notification.stageDay === stage.stageDay)
    .sort((a, b) => (b.contactedAt ?? b.createdAt).localeCompare(a.contactedAt ?? a.createdAt));
  const notification = stageNotifications[0];
  const status = notification?.status ?? "Pending";
  const needsFollowUp = status === "Need follow-up";
  const nextAction = stage.unclaimedEligible
    ? "Eligible for Day 90 unclaimed decision."
    : needsFollowUp
      ? `${stage.label} needs follow-up. Try WhatsApp or phone call again.`
      : status === "Sent"
        ? `${stage.label} reminder already contacted. Monitor pickup.`
        : `${stage.label} reminder is due.`;
  return {
    stageDay: stage.stageDay,
    label: stage.label,
    status,
    dueToday: !notification || status === "Pending" || needsFollowUp,
    needsFollowUp,
    notification,
    nextAction
  };
}

export function getPickupQueueForRole(state: PrototypeState, role: CareDeskRole, userId: string, now: string | Date = new Date()): PickupQueueItem[] {
  return state.jobs
    .filter((job) => (job.status === "READY PICKUP" || job.status === "UNCLAIMED") && (role === "owner" || job.assignedTechnicianId === userId))
    .map((job) => ({
      job,
      customer: getCustomer(state, job.customerId),
      device: getDevice(state, job.deviceId),
      technician: getAssignedTechnician(state, job),
      stage: getPickupStage(job, now),
      nextReminder: getNextPickupReminder(job, state.notifications, now)
    }))
    .sort((a, b) => Number(b.stage.unclaimedEligible) - Number(a.stage.unclaimedEligible) || b.stage.ageDays - a.stage.ageDays);
}

export function getCustomerSummariesForRole(state: PrototypeState, role: CareDeskRole, userId: string): CustomerSummary[] {
  return state.customers
    .map((customer) => {
      const jobs = getCustomerJobsForRole(state, customer.id, role, userId);
      return buildCustomerSummary(customer, jobs);
    })
    .filter((summary) => role === "owner" || summary.jobs.length > 0);
}

export function getCustomerDetail(state: PrototypeState, customerId: string, role: CareDeskRole, userId: string): CustomerDetail | undefined {
  const customer = state.customers.find((item) => item.id === customerId);
  if (!customer) {
    return undefined;
  }
  const jobs = getCustomerJobsForRole(state, customerId, role, userId);
  if (role !== "owner" && jobs.length === 0) {
    return undefined;
  }
  const jobHistory = buildCustomerJobHistory(state, jobs);
  return {
    customer,
    summary: buildCustomerSummary(customer, jobs),
    activeJobs: jobHistory.filter((item) => !["COMPLETE", "NOT PROCEED"].includes(item.job.status)),
    jobHistory,
    deviceHistory: getCustomerDeviceHistory(state, customerId, role, userId),
    contactHistory: getCustomerContactHistory(state, customerId, role, userId)
  };
}

export function getCustomerContactHistory(state: PrototypeState, customerId: string, role: CareDeskRole = "owner", userId = "user_owner"): CustomerContactHistoryItem[] {
  const jobs = getCustomerJobsForRole(state, customerId, role, userId);
  const jobIds = new Set(jobs.map((job) => job.id));
  const notifications = state.notifications
    .filter((notification) => jobIds.has(notification.jobId))
    .map<CustomerContactHistoryItem>((notification) => {
      const job = state.jobs.find((item) => item.id === notification.jobId)!;
      return {
        id: notification.id,
        jobId: job.id,
        jobIdDisplay: job.jobIdDisplay,
        type: notification.type,
        detail: notification.messagePreview,
        channel: notification.channel,
        status: notification.status,
        result: notification.result,
        createdAt: notification.contactedAt ?? notification.createdAt
      };
    });
  const decisions = jobs
    .filter((job) => job.customerDecision)
    .map<CustomerContactHistoryItem>((job) => ({
      id: `decision_${job.id}`,
      jobId: job.id,
      jobIdDisplay: job.jobIdDisplay,
      type: "Customer decision",
      detail: job.customerDecision?.result === "proceed"
        ? `Customer proceed repair. ${job.customerDecision.note ?? ""}`.trim()
        : `Customer not proceed. ${job.customerDecision?.reason ?? ""} ${job.customerDecision?.note ?? ""}`.trim(),
      channel: job.customerDecision!.method,
      result: job.customerDecision!.result,
      createdAt: job.lastUpdate
    }));
  return [...notifications, ...decisions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getCustomerDeviceHistory(state: PrototypeState, customerId: string, role: CareDeskRole = "owner", userId = "user_owner"): CustomerDeviceHistoryItem[] {
  const jobs = getCustomerJobsForRole(state, customerId, role, userId);
  const devices = state.devices.filter((device) => device.customerId === customerId);
  return devices.map((device) => ({
    device,
    issueHistory: buildCustomerJobHistory(state, jobs.filter((job) => job.deviceId === device.id))
  }));
}

export function getReportRangeLabel(range: ReportRange): string {
  const labels: Record<ReportRange, string> = {
    all: "All",
    today: "Today",
    "7d": "7 Days",
    "30d": "30 Days"
  };
  return labels[range];
}

export function filterJobsByReportRange(jobs: Job[], range: ReportRange, now: string | Date = new Date()): Job[] {
  if (range === "all") {
    return jobs;
  }
  const days = range === "today" ? 0 : range === "7d" ? 7 : 30;
  return jobs.filter((job) => daysBetween(getReportJobDate(job), now) <= days);
}

export function buildReportsDashboard(state: PrototypeState, range: ReportRange, now: string | Date = new Date()): ReportsDashboard {
  const jobs = filterJobsByReportRange(state.jobs, range, now);
  const completedJobs = jobs.filter((job) => job.status === "COMPLETE");
  const notProceedJobs = jobs.filter((job) => job.status === "NOT PROCEED");
  const unclaimedJobs = jobs.filter((job) => job.status === "UNCLAIMED");
  const readyPickupJobs = jobs.filter((job) => job.status === "READY PICKUP");
  const remindersSent = state.notifications.filter((notification) => notification.status === "Sent" || notification.status === "Need follow-up").length;
  const needFollowUp = state.notifications.filter((notification) => notification.status === "Need follow-up").length;
  return {
    range,
    rangeLabel: getReportRangeLabel(range),
    generatedAt: typeof now === "string" ? now : now.toISOString(),
    counts: {
      totalJobs: jobs.length,
      activeJobs: activeJobs(jobs).length,
      completed: completedJobs.length,
      notProceed: notProceedJobs.length,
      readyPickup: readyPickupJobs.length,
      unclaimed: unclaimedJobs.length
    },
    statusBreakdown: careDeskStatuses.map((status) => ({ status, count: jobs.filter((job) => job.status === status).length })),
    technicianWorkload: state.users
      .filter((user) => user.role === "technician")
      .map((technician) => buildTechnicianWorkload(state, jobs, technician)),
    pickup: {
      readyPickup: readyPickupJobs.length,
      remindersSent,
      needFollowUp,
      unclaimed: unclaimedJobs.length
    },
    notProceedRows: notProceedJobs.map((job) => {
      const customer = getCustomer(state, job.customerId);
      const device = getDevice(state, job.deviceId);
      const technician = getAssignedTechnician(state, job);
      return {
        jobId: job.id,
        jobIdDisplay: job.jobIdDisplay,
        customerName: customer.name,
        deviceType: device.type,
        technicianName: technician?.name ?? "Unassigned",
        reason: job.customerDecision?.reason ?? "-",
        method: job.customerDecision?.method ?? "-"
      };
    }),
    completedRows: completedJobs.map((job) => {
      const customer = getCustomer(state, job.customerId);
      const device = getDevice(state, job.deviceId);
      const technician = getAssignedTechnician(state, job);
      return {
        jobId: job.id,
        jobIdDisplay: job.jobIdDisplay,
        customerName: customer.name,
        deviceLabel: deviceLabel(device),
        technicianName: technician?.name ?? "Unassigned",
        completedDate: job.lastUpdate,
        posReference: job.posReference
      };
    })
  };
}

export function buildReportSummaryText(report: ReportsDashboard): string {
  return [
    "Fadhil CareDesk Reports",
    `Range: ${report.rangeLabel}`,
    `Total jobs: ${report.counts.totalJobs}`,
    `Active jobs: ${report.counts.activeJobs}`,
    `Completed: ${report.counts.completed}`,
    `Not proceed: ${report.counts.notProceed}`,
    `Ready pickup: ${report.counts.readyPickup}`,
    `Unclaimed: ${report.counts.unclaimed}`,
    `Pickup follow-up: ${report.pickup.needFollowUp} need follow-up`,
    "Operational repair report only."
  ].join("\n");
}

export function buildSettingsDraft(state: PrototypeState): SettingsDraft {
  return {
    shopInfo: { ...defaultShopInfo(), ...(state.shopInfo ?? {}) },
    defaultLanguage: state.defaultLanguage ?? "bm",
    posReferenceLabel: state.posReferenceLabel ?? "POS Reference",
    notificationTemplates: state.notificationTemplates?.length ? state.notificationTemplates : defaultNotificationTemplates(),
    uploadRules: { ...defaultUploadRules(), ...(state.uploadRules ?? {}) },
    scannerSettings: { ...defaultScannerSettings(), ...(state.scannerSettings ?? {}) },
    flowRules: {
      ...state.flowRules,
      reminderDays: normalizeReminderDays(state.flowRules.reminderDays),
      notProceedReasons: [...state.flowRules.notProceedReasons],
      releaseReasons: [...state.flowRules.releaseReasons],
      lockedRules: [...state.flowRules.lockedRules],
      stuckThresholds: { ...state.flowRules.stuckThresholds },
      requiredEvidence: { ...state.flowRules.requiredEvidence }
    }
  };
}

export function applySettingsDraft(state: PrototypeState, draft: SettingsDraft, actorName: string): PrototypeState {
  return {
    ...state,
    shopInfo: { ...draft.shopInfo },
    defaultLanguage: draft.defaultLanguage,
    posReferenceLabel: draft.posReferenceLabel,
    notificationTemplates: { ...draft.notificationTemplates },
    uploadRules: { ...draft.uploadRules },
    scannerSettings: { ...draft.scannerSettings, apiKey: undefined },
    flowRules: {
      ...state.flowRules,
      ...draft.flowRules,
      reminderDays: normalizeReminderDays(draft.flowRules.reminderDays),
      notProceedReasons: [...draft.flowRules.notProceedReasons],
      releaseReasons: [...draft.flowRules.releaseReasons],
      lockedRules: [...state.flowRules.lockedRules],
      stuckThresholds: { ...draft.flowRules.stuckThresholds },
      requiredEvidence: { ...draft.flowRules.requiredEvidence }
    },
    auditLog: [buildSettingsAuditEvent(actorName, "Settings"), ...state.auditLog]
  };
}

export function normalizeReminderDays(days: number[]): number[] {
  return Array.from(new Set(days.map((day) => Math.round(day)).filter((day) => day >= 0 && day <= 90))).sort((a, b) => a - b);
}

export function parseReasonList(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function buildSettingsAuditEvent(actorName: string, section: string): TimelineEvent {
  return {
    id: `audit_settings_${Date.now()}`,
    jobId: "system",
    type: "audit",
    title: "Settings updated",
    detail: `${section} updated.`,
    actor: actorName,
    createdAt: new Date().toISOString(),
    important: true
  };
}

export function buildPickupWhatsAppMessage(state: PrototypeState, job: Job, stageDay: PickupReminderDay): string {
  const customer = getCustomer(state, job.customerId);
  const device = getDevice(state, job.deviceId);
  return [
    `Hi ${customer.name}, ini Fadhil CareDesk.`,
    `Job ${job.jobIdDisplay} (${deviceLabel(device)}) sudah siap untuk pickup.`,
    `Reminder: Day ${stageDay}.`,
    "Boleh datang kedai untuk ambil barang bila lapang. Terima kasih."
  ].join("\n");
}

export function recordNotificationResult(
  state: PrototypeState,
  notificationId: string,
  result: NonNullable<NotificationRecord["result"]>,
  contactedAt: string = new Date().toISOString()
): PrototypeState {
  const notification = state.notifications.find((item) => item.id === notificationId);
  const nextStatus: NotificationRecord["status"] = result === "no response" ? "Need follow-up" : result === "wrong number" ? "Failed" : "Sent";
  const nextNotifications = state.notifications.map((item) =>
    item.id === notificationId ? { ...item, status: nextStatus, result, contactedAt } : item
  );
  if (!notification) {
    return { ...state, notifications: nextNotifications };
  }
  const job = state.jobs.find((item) => item.id === notification.jobId);
  const event: TimelineEvent = {
    id: `tl_notification_${notificationId}_${Date.parse(contactedAt) || Date.now()}`,
    jobId: notification.jobId,
    type: "notification",
    title: result === "no response" ? "Pickup reminder no response" : "Pickup reminder contacted",
    detail: `${notification.type}: ${result}`,
    actor: "System",
    createdAt: contactedAt,
    important: job?.status === "READY PICKUP"
  };
  return {
    ...state,
    notifications: nextNotifications,
    timeline: [event, ...state.timeline]
  };
}

export function notificationTypeForPickupStage(stageDay: PickupReminderDay): NotificationRecord["type"] {
  if (stageDay === 0) {
    return "Ready pickup Day 0";
  }
  if (stageDay === 60) {
    return "Final notice Day 60";
  }
  return `Reminder Day ${stageDay}` as NotificationRecord["type"];
}

export function buildChecklistReport(state: PrototypeState, job: Job): ChecklistReport {
  const customer = getCustomer(state, job.customerId);
  const device = getDevice(state, job.deviceId);
  const technician = getAssignedTechnician(state, job);
  const isDesktop = device.type.toLowerCase().includes("desktop") || device.model.toLowerCase().includes("prodesk");

  return {
    jobId: job.id,
    jobIdDisplay: job.jobIdDisplay,
    customerName: customer.name,
    customerPhone: customer.phone,
    deviceType: device.type,
    deviceModel: deviceLabel(device),
    serialNumber: device.serialNumber,
    technicianId: job.assignedTechnicianId,
    checkedBy: technician?.name ?? "Unassigned",
    dateCompleted: "2026-05-22",
    status: job.id === "job_0009" ? "draft" : "not_started",
    lastUpdated: job.lastUpdate,
    catatan: job.id === "job_0009" ? "Desktop restart sendiri semasa load test. Fokus pemeriksaan PSU, storage dan RAM." : "",
    initialCheck: {
      problemVerified: Boolean(job.diagnosisNotes),
      technicianNote: job.diagnosisNotes ?? "Pemeriksaan awal belum lengkap.",
      images: []
    },
    drive: {
      driveType: isDesktop ? "SSD SATA" : "SSD NVMe",
      software: isDesktop ? "HDD Sentinel Portable" : "CrystalDiskMark",
      healthStatus: "Good",
      badSectorDetected: false,
      healthPercent: "96",
      performancePercent: "94",
      readSpeed: isDesktop ? "540 MB/s" : "3100 MB/s",
      writeSpeed: isDesktop ? "480 MB/s" : "2400 MB/s",
      screenshotTaken: job.id === "job_0009",
      note: isDesktop ? "Storage SMART check pass; tiada bad sector dikesan." : "Drive check normal dalam data mock.",
      images: job.id === "job_0009" ? [mockChecklistImage("drive", "storage-smart-check.png", "Storage SMART check screenshot", "#1e7a78")] : []
    },
    battery: {
      applicable: !isDesktop,
      designCapacity: isDesktop ? "N/A" : "42000 mWh",
      fullChargeCapacity: isDesktop ? "N/A" : "31800 mWh",
      estimatedHealth: isDesktop ? "N/A" : "76%",
      status: isDesktop ? "N/A" : "Normal",
      screenshotTaken: !isDesktop && job.id !== "job_0007",
      note: isDesktop ? "N/A untuk PC desktop." : "Battery report perlu disemak jika health lemah.",
      images: !isDesktop && job.id === "job_0011" ? [mockChecklistImage("battery", "battery-report.png", "Battery report screenshot", "#b86e13")] : []
    },
    ram: {
      totalSlots: isDesktop ? "4" : "2",
      usedSlots: isDesktop ? "2" : "1",
      emptySlots: isDesktop ? "2" : "1",
      ramType: "DDR4",
      formFactor: isDesktop ? "DIMM (PC)" : "SO-DIMM (Laptop)",
      voltage: "1.2",
      slots: [
        { slot: 1, sizeGb: isDesktop ? "8" : "4", ddrType: "DDR4", speedMhz: "2666", singleDual: "Dual", status: "OK" },
        { slot: 2, sizeGb: isDesktop ? "8" : "", ddrType: "DDR4", speedMhz: isDesktop ? "2666" : "", singleDual: isDesktop ? "Dual" : "-", status: isDesktop ? "OK" : "Tidak Dikesan" },
        { slot: 3, sizeGb: "", ddrType: "", speedMhz: "", singleDual: "-", status: isDesktop ? "Tidak Dikesan" : "OK" },
        { slot: 4, sizeGb: "", ddrType: "", speedMhz: "", singleDual: "-", status: isDesktop ? "Tidak Dikesan" : "OK" }
      ],
      note: isDesktop ? "RAM dikesan normal pada slot 1 dan 2." : "RAM utama dikesan normal.",
      images: job.id === "job_0009" ? [mockChecklistImage("ram", "ram-slot-check.jpg", "RAM slot 1 dan 2 dikesan normal", "#3568b8")] : []
    },
    diagnosisSummary: job.diagnosisNotes ?? job.reportedIssue,
    diagnosisImages: []
  };
}

export function canAddChecklistImage(report: ChecklistReport, section: ChecklistImageSection, role: CareDeskRole, userId: string): boolean {
  if (!canEditChecklistReport(report, role, userId)) {
    return false;
  }
  return section !== "battery" || report.battery.applicable;
}

export function addChecklistImage(
  report: ChecklistReport,
  section: ChecklistImageSection,
  image: { fileName: string; dataUrl: string; caption?: string }
): ChecklistReport {
  const nextImage: ChecklistImage = {
    id: `check_img_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    section,
    fileName: image.fileName,
    dataUrl: image.dataUrl,
    caption: image.caption ?? "",
    createdAt: new Date().toISOString()
  };
  return updateChecklistImages(report, section, (images) => [...images, nextImage]);
}

export function removeChecklistImage(report: ChecklistReport, section: ChecklistImageSection, imageId: string): ChecklistReport {
  return updateChecklistImages(report, section, (images) => images.filter((image) => image.id !== imageId));
}

export function updateChecklistImageCaption(report: ChecklistReport, section: ChecklistImageSection, imageId: string, caption: string): ChecklistReport {
  return updateChecklistImages(report, section, (images) =>
    images.map((image) => (image.id === imageId ? { ...image, caption } : image))
  );
}

function updateChecklistImages(report: ChecklistReport, section: ChecklistImageSection, updater: (images: ChecklistImage[]) => ChecklistImage[]): ChecklistReport {
  if (section === "diagnosis") {
    return { ...report, diagnosisImages: updater(report.diagnosisImages ?? []) };
  }
  return {
    ...report,
    [section]: {
      ...report[section],
      images: updater(report[section].images ?? [])
    }
  };
}

export function getChecklistReportsForRole(state: PrototypeState, role: CareDeskRole, userId: string): ChecklistReport[] {
  const reports = state.checklistReports?.length
    ? state.checklistReports
    : state.jobs.map((job) => buildChecklistReport(state, job));
  return role === "owner" ? reports : reports.filter((report) => report.technicianId === userId);
}

export function canEditChecklistReport(report: ChecklistReport, role: CareDeskRole, userId: string): boolean {
  return role === "technician" && report.technicianId === userId;
}

export function buildChecklistCustomerSummary(report: ChecklistReport): string {
  return [
    `Checklist Report ${report.jobIdDisplay}`,
    `Customer: ${report.customerName}`,
    `Device: ${report.deviceModel}`,
    `Drive: ${report.drive.healthStatus}, health ${report.drive.healthPercent}%`,
    `Battery: ${report.battery.status}`,
    `RAM: ${report.ram.usedSlots}/${report.ram.totalSlots} slot digunakan`,
    `Diagnosis: ${report.diagnosisSummary}`
  ].join("\n");
}

function mockEvidenceImage(title: string, subtitle: string, accent = "#a35f17"): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
      <rect width="960" height="720" fill="#f7f4ef"/>
      <rect x="44" y="44" width="872" height="632" rx="24" fill="#fffdf8" stroke="#ded7cb" stroke-width="6"/>
      <rect x="92" y="96" width="776" height="388" rx="18" fill="#26211d"/>
      <path d="M138 430 L300 254 L422 360 L548 226 L818 430 Z" fill="#58616a"/>
      <circle cx="732" cy="178" r="54" fill="${accent}"/>
      <rect x="104" y="538" width="520" height="32" rx="16" fill="${accent}"/>
      <rect x="104" y="594" width="350" height="26" rx="13" fill="#697179"/>
      <text x="104" y="524" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#1f2428">${title}</text>
      <text x="104" y="650" font-family="Arial, sans-serif" font-size="28" fill="#46515d">${subtitle}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function mockChecklistImage(section: ChecklistImageSection, fileName: string, caption: string, accent: string): ChecklistImage {
  return {
    id: `check_seed_${section}_${fileName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`,
    section,
    fileName,
    caption,
    dataUrl: mockEvidenceImage(caption, fileName, accent),
    createdAt: "2026-05-22T11:00:00.000Z"
  };
}

export function seedPrototypeState(): PrototypeState {
  const users: User[] = [
    { id: "user_owner", name: "Fadhil", role: "owner", language: "bm" },
    { id: "user_technician", name: "Hafiz", role: "technician", language: "bm" },
    { id: "user_technician_2", name: "Aiman", role: "technician", language: "en" }
  ];
  const customers: Customer[] = [
    { id: "cus_aminah", name: "Aminah", phone: "012-456 7788", preferredChannel: "WhatsApp", notes: "Prefer WhatsApp selepas 6 petang." },
    { id: "cus_raj", name: "Raj Kumar", phone: "019-220 0044", preferredChannel: "Phone Call" },
    { id: "cus_lim", name: "Lim Wei", phone: "016-338 2200", preferredChannel: "WhatsApp" },
    { id: "cus_nora", name: "Nora", phone: "011-1888 2929", preferredChannel: "In Shop" },
    { id: "cus_faiz", name: "Faiz", phone: "013-700 8811", preferredChannel: "WhatsApp" }
  ];
  const devices: Device[] = [
    { id: "dev_acer", customerId: "cus_aminah", type: "Laptop", brand: "Acer", model: "Aspire 5", serialNumber: "ACR-5531", accessories: "Charger" },
    { id: "dev_dell", customerId: "cus_raj", type: "Laptop", brand: "Dell", model: "Latitude 5420", serialNumber: "DL-9200" },
    { id: "dev_hp", customerId: "cus_lim", type: "Desktop", brand: "HP", model: "ProDesk", serialNumber: "HPD-1101" },
    { id: "dev_lenovo", customerId: "cus_nora", type: "Laptop", brand: "Lenovo", model: "IdeaPad 3" },
    { id: "dev_asus", customerId: "cus_faiz", type: "Laptop", brand: "Asus", model: "VivoBook 14" }
  ];
  const jobs: Job[] = [
    {
      id: "job_0007",
      jobIdDisplay: "NO.0007",
      rawReportNumber: "0007",
      status: "NEW JOB",
      customerId: "cus_aminah",
      deviceId: "dev_acer",
      statusAge: "2 jam",
      reportedIssue: "Laptop tidak boleh boot selepas update Windows.",
      nextAction: "Technician perlu take job dan mula diagnosis.",
      badges: ["New", "Evidence 1"],
      lastUpdate: "Service note discan oleh Hafiz"
    },
    {
      id: "job_0008",
      jobIdDisplay: "NO.0008",
      rawReportNumber: "0008",
      status: "WAITING FADHIL REVIEW",
      customerId: "cus_raj",
      deviceId: "dev_dell",
      assignedTechnicianId: "user_technician",
      statusAge: "5 jam",
      reportedIssue: "Skrin berkelip dan kadang-kadang gelap.",
      nextAction: "Fadhil perlu semak diagnosis dan beri arahan.",
      diagnosisNotes: "Panel LCD atau kabel flex disyaki longgar. Bukti gambar hinge telah dimuat naik.",
      badges: ["Need Review", "Evidence 3"],
      lastUpdate: "Diagnosis submitted by Hafiz"
    },
    {
      id: "job_0009",
      jobIdDisplay: "NO.0009",
      rawReportNumber: "0009",
      status: "WAITING CUSTOMER CONFIRMATION",
      customerId: "cus_lim",
      deviceId: "dev_hp",
      assignedTechnicianId: "user_technician",
      statusAge: "1 hari",
      reportedIssue: "Desktop restart sendiri selepas 10 minit.",
      nextAction: "Rekod keputusan customer selepas WhatsApp/call.",
      diagnosisNotes: "PSU tidak stabil ketika load test.",
      ownerInstruction: "Proceed jika customer setuju tukar PSU. Rujuk POS reference Q-1044.",
      posReference: "Q-1044",
      badges: ["Customer Waiting", "POS Ref"],
      lastUpdate: "Owner instruction approved"
    },
    {
      id: "job_0010",
      jobIdDisplay: "NO.0010",
      rawReportNumber: "0010",
      status: "IN PROGRESS",
      customerId: "cus_nora",
      deviceId: "dev_lenovo",
      assignedTechnicianId: "user_technician",
      statusAge: "3 hari",
      reportedIssue: "Keyboard beberapa key tidak berfungsi.",
      nextAction: "Technician teruskan repair dan testing.",
      diagnosisNotes: "Keyboard module rosak akibat liquid spill lama.",
      ownerInstruction: "Tukar keyboard, simpan gambar sebelum/selepas.",
      customerDecision: { result: "proceed", method: "WhatsApp", note: "Customer setuju repair." },
      badges: ["Ready to Repair", "Evidence 2"],
      lastUpdate: "Customer proceed repair"
    },
    {
      id: "job_0011",
      jobIdDisplay: "NO.0011",
      rawReportNumber: "0011",
      status: "READY PICKUP",
      customerId: "cus_faiz",
      deviceId: "dev_asus",
      assignedTechnicianId: "user_technician",
      statusAge: "14 hari",
      reportedIssue: "Laptop panas dan shutdown.",
      nextAction: "Reminder pickup Day 14 perlu dibuat.",
      readyPickupDate: "2026-05-08",
      pickupReminderStage: "Day 14",
      badges: ["Day 14", "Ready Pickup"],
      lastUpdate: "Reminder Day 7 completed"
    },
    {
      id: "job_0012",
      jobIdDisplay: "NO.0012",
      rawReportNumber: "0012",
      status: "UNCLAIMED",
      customerId: "cus_aminah",
      deviceId: "dev_acer",
      assignedTechnicianId: "user_technician_2",
      statusAge: "90 hari",
      reportedIssue: "Data recovery external drive.",
      nextAction: "Owner perlu decide tindakan unclaimed.",
      readyPickupDate: "2026-02-21",
      pickupReminderStage: "Day 90",
      badges: ["Unclaimed", "Final Notice"],
      lastUpdate: "System marked unclaimed"
    },
    {
      id: "job_0013",
      jobIdDisplay: "NO.0013",
      rawReportNumber: "0013",
      status: "NOT PROCEED",
      customerId: "cus_raj",
      deviceId: "dev_dell",
      statusAge: "Selesai",
      reportedIssue: "Battery cepat habis.",
      nextAction: "Tiada action.",
      customerDecision: { result: "not_proceed", method: "Phone Call", reason: "Harga mahal", note: "Customer ambil semula barang." },
      badges: ["Not Proceed"],
      lastUpdate: "Customer not proceed"
    },
    {
      id: "job_0014",
      jobIdDisplay: "NO.0014",
      rawReportNumber: "0014",
      status: "COMPLETE",
      customerId: "cus_lim",
      deviceId: "dev_hp",
      assignedTechnicianId: "user_technician",
      statusAge: "Selesai",
      reportedIssue: "Upgrade RAM dan SSD.",
      nextAction: "Archived history.",
      badges: ["Complete"],
      lastUpdate: "Pickup completed"
    }
  ];

  const evidence: Evidence[] = jobs.flatMap((job, index) => {
    const baseEvidence: Evidence[] = [
      {
        id: `ev_service_${index}`,
        jobId: job.id,
        type: "service_note",
        label: `${job.jobIdDisplay} service note`,
        createdAt: "2026-05-22T09:00:00.000Z",
        caption: "Service note asal yang discan semasa job dibuka.",
        customerVisible: false
      }
    ];
    if (job.id === "job_0009") {
      return [
        ...baseEvidence,
        {
          id: "ev_0009_psu_photo",
          jobId: job.id,
          type: "diagnosis",
          label: "PSU load test photo",
          caption: "Gambar ujian beban PSU semasa desktop restart sendiri.",
          testResult: "Fail",
          imageUrl: mockEvidenceImage("PSU load test", "Desktop restart under load", "#a35f17"),
          createdAt: "2026-05-22T10:12:00.000Z"
        },
        {
          id: "ev_0009_voltage",
          jobId: job.id,
          type: "diagnosis",
          label: "Power supply voltage unstable",
          caption: "Bacaan voltage tidak stabil dan jatuh semasa stress test.",
          testResult: "12V rail drop detected",
          imageUrl: mockEvidenceImage("Voltage unstable", "12V rail drop detected", "#b22929"),
          createdAt: "2026-05-22T10:24:00.000Z"
        },
        {
          id: "ev_0009_smart",
          jobId: job.id,
          type: "diagnosis",
          label: "Storage SMART check screenshot",
          caption: "SMART check storage tiada critical error semasa diagnosis.",
          testResult: "Pass",
          imageUrl: mockEvidenceImage("SMART check", "Storage status pass", "#1e7a78"),
          createdAt: "2026-05-22T10:40:00.000Z"
        }
      ];
    }
    return [
      ...baseEvidence,
      ...(job.diagnosisNotes
        ? [
            {
              id: `ev_diag_${index}`,
              jobId: job.id,
              type: "diagnosis" as const,
              label: "Diagnosis photo",
              caption: "Bukti diagnosis technician untuk rujukan customer.",
              imageUrl: mockEvidenceImage("Diagnosis photo", job.jobIdDisplay, "#3568b8"),
              createdAt: "2026-05-22T10:00:00.000Z"
            }
          ]
        : [])
    ];
  });

  const timeline: TimelineEvent[] = jobs.flatMap((job, index) => [
    {
      id: `tl_create_${index}`,
      jobId: job.id,
      type: "status",
      title: `${job.jobIdDisplay} created`,
      detail: "Job created from service note.",
      actor: "Technician",
      createdAt: "2026-05-22T09:00:00.000Z",
      important: true
    },
    {
      id: `tl_update_${index}`,
      jobId: job.id,
      type: job.status === "READY PICKUP" ? "pickup" : "status",
      title: job.lastUpdate,
      detail: job.nextAction,
      actor: job.assignedTechnicianId ? "Hafiz" : "System",
      createdAt: "2026-05-22T12:00:00.000Z",
      important: ["WAITING FADHIL REVIEW", "READY PICKUP", "UNCLAIMED", "COMPLETE"].includes(job.status)
    }
  ]);

  const notifications: NotificationRecord[] = [
    {
      id: "noti_0011",
      jobId: "job_0011",
      technicianId: "user_technician",
      type: "Reminder Day 14",
      stageDay: 14,
      channel: "WhatsApp",
      dueLabel: "Hari ini",
      status: "Pending",
      createdAt: "2026-05-22T09:00:00.000Z",
      messagePreview: "Hi Faiz, Fadhil CareDesk reminder Day 14 untuk pickup NO.0011."
    },
    {
      id: "noti_0012",
      jobId: "job_0012",
      technicianId: "user_technician_2",
      type: "Final notice Day 60",
      stageDay: 60,
      channel: "Phone Call",
      dueLabel: "Overdue",
      status: "Need follow-up",
      result: "no response",
      createdAt: "2026-05-21T09:00:00.000Z",
      contactedAt: "2026-05-21T10:30:00.000Z",
      messagePreview: "Final notice pickup NO.0012 sebelum unclaimed decision."
    },
    {
      id: "noti_0009",
      jobId: "job_0009",
      technicianId: "user_technician",
      type: "Customer confirmation follow-up",
      channel: "WhatsApp",
      dueLabel: "Hari ini",
      status: "Pending",
      createdAt: "2026-05-22T09:30:00.000Z",
      messagePreview: "Follow-up customer confirmation untuk NO.0009."
    }
  ];
  const flowRules: FlowRules = {
    reminderDays: [0, 7, 14, 30, 60],
    retentionDays: 365,
    unclaimedDay: 90,
    stuckThresholds: {
      "NEW JOB": "2 hari",
      "WAITING FADHIL REVIEW": "1 hari",
      "WAITING CUSTOMER CONFIRMATION": "3 hari",
      "IN PROGRESS": "7 hari tanpa update"
    },
    requiredEvidence: {
      diagnosis: "note_and_photo",
      readyPickup: "testing_note_optional",
      completePickup: "pickup_note_optional"
    },
    notProceedReasons: ["Harga mahal", "Customer nak fikir dulu", "Customer ambil balik barang", "Device tidak berbaloi repair", "Part tiada", "Customer tidak dapat dihubungi", "Lain-lain"],
    releaseReasons: ["Tersalah ambil", "Tidak sempat buat", "Tidak available", "Perlu technician lain"],
    lockedRules: [
      "Technician tidak boleh repair sebelum IN PROGRESS.",
      "Owner review diperlukan sebelum customer decision.",
      "Audit log diperlukan untuk action penting.",
      "Role utama sistem hanya Owner dan Technician."
    ]
  };
  const baseState: PrototypeState = {
    users,
    customers,
    devices,
    jobs,
    evidence,
    checklistReports: [],
    timeline,
    notifications,
    flowRules,
    shopInfo: defaultShopInfo(),
    defaultLanguage: "bm",
    notificationTemplates: defaultNotificationTemplates(),
    posReferenceLabel: "POS Reference",
    uploadRules: defaultUploadRules(),
    scannerSettings: defaultScannerSettings(),
    auditLog: []
  };
  return {
    ...baseState,
    checklistReports: jobs.map((job) => buildChecklistReport(baseState, job))
  };
}

export function createEmptyCareDeskState(): PrototypeState {
  const seed = seedPrototypeState();
  return {
    ...seed,
    users: [],
    customers: [],
    devices: [],
    jobs: [],
    evidence: [],
    checklistReports: [],
    timeline: [],
    notifications: [],
    auditLog: []
  };
}

export function getCustomer(state: PrototypeState, id: string): Customer {
  return state.customers.find((customer) => customer.id === id) ?? state.customers[0];
}

export function getDevice(state: PrototypeState, id: string): Device {
  return state.devices.find((device) => device.id === id) ?? state.devices[0];
}

export function getAssignedTechnician(state: PrototypeState, job: Job): User | undefined {
  return state.users.find((user) => user.id === job.assignedTechnicianId);
}

export function deviceLabel(device: Device): string {
  return [device.brand, device.model].filter(Boolean).join(" ");
}

export function activeJobs(jobs: Job[]): Job[] {
  return jobs.filter((job) => !["COMPLETE", "NOT PROCEED"].includes(job.status));
}

function getCustomerJobsForRole(state: PrototypeState, customerId: string, role: CareDeskRole, userId: string): Job[] {
  return sortCustomerJobs(
    state.jobs.filter((job) => job.customerId === customerId && (role === "owner" || job.assignedTechnicianId === userId))
  );
}

function sortCustomerJobs(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => Number(b.rawReportNumber) - Number(a.rawReportNumber));
}

function buildCustomerSummary(customer: Customer, jobs: Job[]): CustomerSummary {
  const sortedJobs = sortCustomerJobs(jobs);
  const latestJob = sortedJobs[0];
  return {
    customer,
    jobs: sortedJobs,
    activeJobs: activeJobs(sortedJobs),
    activeJobCount: activeJobs(sortedJobs).length,
    totalJobCount: sortedJobs.length,
    lastVisit: latestJob?.lastUpdate ?? "No visit yet",
    lastJobIdDisplay: latestJob?.jobIdDisplay,
    preferredChannel: customer.preferredChannel
  };
}

function buildCustomerJobHistory(state: PrototypeState, jobs: Job[]): CustomerJobHistoryItem[] {
  return sortCustomerJobs(jobs).map((job) => ({
    job,
    device: getDevice(state, job.deviceId),
    technician: getAssignedTechnician(state, job),
    status: job.status,
    lastUpdate: job.lastUpdate,
    posReference: job.posReference
  }));
}

function buildTechnicianWorkload(state: PrototypeState, jobs: Job[], technician: User): ReportsDashboard["technicianWorkload"][number] {
  const assigned = jobs.filter((job) => job.assignedTechnicianId === technician.id);
  const readyDurations = assigned
    .filter((job) => job.readyPickupDate)
    .map((job) => daysBetween(getReportJobDate(job), job.readyPickupDate!))
    .filter((days) => Number.isFinite(days));
  const average = readyDurations.length
    ? `${Math.round(readyDurations.reduce((sum, value) => sum + value, 0) / readyDurations.length)} days`
    : "-";
  return {
    technicianId: technician.id,
    technicianName: technician.name,
    assignedJobs: assigned.length,
    activeJobs: activeJobs(assigned).length,
    completedJobs: assigned.filter((job) => job.status === "COMPLETE").length,
    averageReadyPickupDays: average
  };
}

function getReportJobDate(job: Job): string {
  return job.readyPickupDate ?? "2026-05-22";
}

function defaultShopInfo(): ShopInfo {
  return {
    name: "Fadhil CareDesk",
    subtitle: "Operasi Servis & Repair",
    phone: "012-000 0000",
    address: "Workshop service counter"
  };
}

function defaultNotificationTemplates(): NotificationTemplates {
  const days: PickupReminderDay[] = [0, 7, 14, 30, 60];
  const templates: NotificationTemplateEntry[] = [];
  for (const day of days) {
    templates.push({
      stageDay: day,
      channel: "WhatsApp",
      messageTemplate: `Hi {{customerName}}, {{jobIdDisplay}} sudah siap untuk pickup. Reminder Day ${day}.`,
      language: "bm"
    });
    templates.push({
      stageDay: day,
      channel: "WhatsApp",
      messageTemplate: `Hi {{customerName}}, {{jobIdDisplay}} is ready for pickup. Reminder Day ${day}.`,
      language: "en"
    });
  }
  return templates;
}

function defaultUploadRules(): UploadRules {
  return {
    evidenceMaxImages: 12,
    allowPdfUpload: true,
    allowImageUpload: true
  };
}

function defaultScannerSettings(): ScannerSettings {
  return {
    provider: "openai",
    enabled: false,
    model: "gpt-5.4-mini",
    apiKeyConfigured: false,
    maxUploadBytes: 10 * 1024 * 1024
  };
}

export function buildCustomerReport(state: PrototypeState, job: Job): CustomerReport {
  const customer = getCustomer(state, job.customerId);
  const device = getDevice(state, job.deviceId);
  const technician = getAssignedTechnician(state, job);
  const reportEvidence = state.evidence
    .filter((item) => item.jobId === job.id && item.customerVisible !== false)
    .map<CustomerReportEvidence>((item) => ({
      id: item.id,
      label: item.label,
      caption: item.caption ?? item.label,
      imageUrl: item.imageUrl,
      testResult: item.testResult
    }));

  return {
    jobIdDisplay: job.jobIdDisplay,
    generatedAt: "2026-05-22T12:00:00.000Z",
    customerName: customer.name,
    customerPhone: customer.phone,
    preferredChannel: customer.preferredChannel,
    deviceType: device.type,
    deviceLabel: `${device.type} ${deviceLabel(device)}`,
    serialNumber: device.serialNumber,
    accessories: device.accessories,
    reportedIssue: job.reportedIssue,
    status: job.status,
    assignedTechnician: technician?.name ?? "Unassigned",
    statusAge: job.statusAge,
    diagnosisSummary: job.diagnosisNotes ?? "Diagnosis belum lengkap.",
    ownerRecommendation: job.ownerInstruction ?? "Owner/Fadhil akan semak diagnosis sebelum tindakan seterusnya.",
    posReference: job.posReference,
    evidence: reportEvidence,
    customerNote: "Harga rasmi dan resit kedai diurus melalui POS Fadhil CareDesk."
  };
}

export function buildWhatsAppReportSummary(report: CustomerReport): string {
  return [
    "Fadhil CareDesk",
    `Job: ${report.jobIdDisplay}`,
    `Customer: ${report.customerName}`,
    `Device: ${report.deviceLabel}`,
    `Diagnosis: ${report.diagnosisSummary}`,
    `Recommendation: ${report.ownerRecommendation}`,
    report.posReference ? `POS reference: ${report.posReference}` : undefined,
    `Evidence: ${report.evidence.length} item(s) dalam report PDF.`,
    "Report PDF dilampirkan untuk semakan customer."
  ]
    .filter(Boolean)
    .join("\n");
}

function toDateOnly(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}

function daysBetween(fromDate: string, toDate: string | Date): number {
  const from = Date.UTC(Number(fromDate.slice(0, 4)), Number(fromDate.slice(5, 7)) - 1, Number(fromDate.slice(8, 10)));
  const toOnly = toDateOnly(toDate);
  const to = Date.UTC(Number(toOnly.slice(0, 4)), Number(toOnly.slice(5, 7)) - 1, Number(toOnly.slice(8, 10)));
  return Math.floor((to - from) / 86_400_000);
}
