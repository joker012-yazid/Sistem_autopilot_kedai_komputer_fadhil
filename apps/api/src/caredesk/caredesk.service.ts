import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import type {
  CaredeskChecklistReport,
  CaredeskEvidenceFile,
  CaredeskJob,
  CaredeskNotificationRecord,
  CaredeskRole,
  CaredeskSettings,
  CaredeskUser,
  ChecklistImageSection,
  NotificationResult,
  PickupStageDay
} from "../../../../packages/domain/src";
import type { UserRecord } from "../auth/user-record";
import type { CaredeskStoredFile } from "./caredesk-storage.adapter";
import { CaredeskNasStorageAdapter } from "./caredesk-storage.adapter";
import { CaredeskDisplayEventsService } from "./caredesk-display-events.service";
import { CaredeskRepository } from "./caredesk.repository";
import { CaredeskReportPdfService, type CaredeskCustomerReportData } from "./caredesk-report-pdf.service";
import { assertSupportedScannerFile, CaredeskServiceNoteScannerService } from "./caredesk-service-note-scanner.service";

interface CreateJobBody {
  serviceReportNumber: string;
  customer: { name: string; phone: string; preferredChannel?: string };
  device: { type: string; brand: string; model?: string; serialNumber?: string };
  reportedIssue: string;
}

interface PickupQueueItem {
  jobId: string;
  jobIdDisplay: string;
  customerName: string;
  customerPhone: string;
  deviceLabel: string;
  technicianId?: string;
  stageDay: PickupStageDay;
  ageDays: number;
  unclaimedEligible: boolean;
  nextAction: string;
}

const scrypt = promisify(scryptCallback);
const sessionDurationMs = 12 * 60 * 60 * 1000;
const passwordPolicyMessage = "Password must be at least 8 characters and include at least one letter and number.";

@Injectable()
export class CaredeskService {
  constructor(
    @Inject(CaredeskRepository) private readonly repository: CaredeskRepository,
    @Inject(CaredeskNasStorageAdapter) private readonly storage: CaredeskNasStorageAdapter,
    @Inject(CaredeskReportPdfService) private readonly pdf: CaredeskReportPdfService,
    @Inject(CaredeskServiceNoteScannerService) private readonly scanner: CaredeskServiceNoteScannerService,
    @Inject(CaredeskDisplayEventsService) private readonly displayEvents: CaredeskDisplayEventsService
  ) {}

  session(user: UserRecord): Promise<CaredeskUser> {
    return this.repository.ensureDemoActor(user);
  }

  async setupStatus() {
    await this.repository.cleanupExpiredSessions();
    return { needsSetup: !(await this.repository.hasActiveOwner()) };
  }

  async setupOwner(body: { setupToken: string; name: string; email: string; password: string }, meta: { userAgent?: string; ip?: string }) {
    await this.repository.cleanupExpiredSessions();
    if (await this.repository.hasActiveOwner()) {
      throw new ConflictException("CareDesk owner already exists");
    }
    if (!process.env.CAREDESK_SETUP_TOKEN) {
      throw new ForbiddenException("CAREDESK_SETUP_TOKEN is not configured on the server");
    }
    if (process.env.CAREDESK_SETUP_TOKEN.length < 16) {
      throw new ForbiddenException("CAREDESK_SETUP_TOKEN must be at least 16 characters long");
    }
    if (body.setupToken !== process.env.CAREDESK_SETUP_TOKEN) {
      throw new ForbiddenException("Setup token is invalid");
    }
    this.assertPasswordPolicy(body.password);
    const password = await this.hashPassword(body.password);
    const user = await this.repository.createUser({ name: body.name, email: body.email, role: "owner", passwordHash: password.hash, passwordSalt: password.salt });
    const session = await this.repository.createSession(user.id, this.sessionMeta(meta));
    return { user, sessionId: session.id, expiresAt: session.expiresAt };
  }

  async login(body: { email: string; password: string }, meta: { userAgent?: string; ip?: string }) {
    await this.repository.cleanupExpiredSessions();
    const user = await this.repository.findUserByEmail(body.email);
    if (!user || user.status !== "active" || !user.passwordHash || !user.passwordSalt) {
      throw new UnauthorizedException("Invalid email or password");
    }
    if (!(await this.verifyPassword(body.password, user.passwordSalt, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const session = await this.repository.createSession(user.id, this.sessionMeta(meta));
    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
      sessionId: session.id,
      expiresAt: session.expiresAt
    };
  }

  async logout(sessionId: string | undefined) {
    await this.repository.cleanupExpiredSessions();
    if (sessionId) {
      await this.repository.revokeSession(sessionId);
    }
    return { ok: true };
  }

  me(user: UserRecord): CaredeskUser {
    if (user.role !== "owner" && user.role !== "technician") {
      throw new UnauthorizedException("CareDesk session is required");
    }
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  async listJobs(user: UserRecord): Promise<CaredeskJob[]> {
    const actor = await this.repository.ensureDemoActor(user);
    return this.repository.listJobsForActor(actor);
  }

  async createJob(body: CreateJobBody, user: UserRecord) {
    const actor = await this.requireRole(user, ["technician", "owner"]);
    const created = await this.repository.createJobWithCustomerDeviceChecklist(body, actor);
    this.publishDisplayRefresh();
    return created;
  }

  async scanServiceNote(file: CaredeskStoredFile | undefined, user: UserRecord) {
    await this.requireRole(user, ["technician", "owner"]);
    const scannerSettings = await this.repository.getScannerRuntimeSettings();
    if (!scannerSettings.enabled || !scannerSettings.apiKey) {
      throw new ConflictException("Scanner AI belum dikonfigurasi oleh Owner.");
    }
    assertSupportedScannerFile(file, scannerSettings.maxUploadBytes);
    return this.scanner.scan(file, { apiKey: scannerSettings.apiKey, model: scannerSettings.model });
  }

  async getJob(jobId: string, user: UserRecord) {
    const actor = await this.repository.ensureDemoActor(user);
    const detail = await this.repository.getJobDetail(jobId);
    if (!this.canViewJob(actor, detail)) {
      throw new ForbiddenException("Role is not allowed to view this job");
    }
    return detail;
  }

  async getCustomerReport(jobId: string, user: UserRecord): Promise<CaredeskCustomerReportData> {
    const detail = await this.getJob(jobId, user);
    return {
      jobId: detail.id,
      jobIdDisplay: detail.jobIdDisplay,
      customer: detail.customer,
      device: detail.device,
      status: detail.status,
      reportedIssue: detail.reportedIssue,
      diagnosisNotes: detail.diagnosisNotes,
      ownerInstruction: detail.ownerInstruction,
      posReference: detail.posReference,
      evidence: detail.evidence,
      generatedAt: new Date().toISOString()
    };
  }

  async customerReportPdf(jobId: string, user: UserRecord): Promise<Buffer> {
    return this.pdf.customerReportPdf(await this.getCustomerReport(jobId, user));
  }

  async checklistReportPdf(jobId: string, user: UserRecord): Promise<Buffer> {
    const detail = await this.getJob(jobId, user);
    const report = await this.getChecklistReport(jobId, user);
    return this.pdf.checklistReportPdf({ ...report, customer: detail.customer, device: detail.device });
  }

  async takeJob(jobId: string, user: UserRecord) {
    const actor = await this.requireRole(user, ["technician"]);
    const job = await this.repository.takeJob(jobId, actor);
    this.publishDisplayRefresh();
    return job;
  }

  async releaseJob(jobId: string, user: UserRecord) {
    const actor = await this.requireRole(user, ["technician"]);
    const job = await this.findAssignedJob(jobId, actor);
    const released = await this.repository.releaseJob(job, actor);
    this.publishDisplayRefresh();
    return released;
  }

  async addDiagnosis(jobId: string, body: { summary: string; submitToOwner?: boolean }, user: UserRecord) {
    const actor = await this.requireRole(user, ["technician"]);
    const job = await this.findAssignedOrTakeableJob(jobId, actor);
    const diagnosis = await this.repository.addDiagnosis(job, body.summary, body.submitToOwner, actor);
    this.publishDisplayRefresh();
    return diagnosis;
  }

  async ownerReview(jobId: string, body: { instruction: string; posReference?: string }, user: UserRecord) {
    const actor = await this.requireRole(user, ["owner"]);
    const job = await this.repository.findJob(jobId);
    if (job.status !== "WAITING FADHIL REVIEW") {
      throw new ConflictException(`Cannot owner review from ${job.status}`);
    }
    const reviewed = await this.repository.ownerReview(job, body.instruction, body.posReference, actor);
    this.publishDisplayRefresh();
    return reviewed;
  }

  async customerDecision(jobId: string, body: { result: "proceed" | "not_proceed"; method: string; note?: string; reason?: string }, user: UserRecord) {
    const actor = await this.requireRole(user, ["owner", "technician"]);
    const job = actor.role === "technician" ? await this.findAssignedJob(jobId, actor) : await this.repository.findJob(jobId);
    if (job.status !== "WAITING CUSTOMER CONFIRMATION") {
      throw new ConflictException(`Cannot record customer decision from ${job.status}`);
    }
    if (body.result === "not_proceed" && !body.reason) {
      throw new ConflictException("Reason is required for not proceed decision");
    }
    const decided = await this.repository.customerDecision(job, body, actor);
    this.publishDisplayRefresh();
    return decided;
  }

  async repairProgress(jobId: string, body: { note: string }, user: UserRecord) {
    const actor = await this.requireRole(user, ["technician"]);
    const job = await this.repository.findJob(jobId);
    if (job.status !== "IN PROGRESS") {
      throw new ConflictException("Technician cannot repair before IN PROGRESS");
    }
    if (job.assignedTechnicianId !== actor.id) {
      throw new ForbiddenException("Technician can only act on assigned jobs");
    }
    const updated = await this.repository.repairProgress(job, body.note, actor);
    this.publishDisplayRefresh();
    return updated;
  }

  async readyPickup(jobId: string, body: { readyPickupDate?: string } | undefined, user: UserRecord) {
    const actor = await this.requireRole(user, ["technician"]);
    const job = await this.findAssignedJob(jobId, actor);
    if (job.status !== "IN PROGRESS") {
      throw new ConflictException(`Cannot mark ready pickup from ${job.status}`);
    }
    const ready = await this.repository.readyPickup(job, body?.readyPickupDate ?? new Date().toISOString().slice(0, 10), actor);
    this.publishDisplayRefresh();
    return ready;
  }

  async completePickup(jobId: string, user: UserRecord) {
    const actor = await this.requireRole(user, ["technician", "owner"]);
    const job = actor.role === "technician" ? await this.findAssignedJob(jobId, actor) : await this.repository.findJob(jobId);
    if (job.status !== "READY PICKUP") {
      throw new ConflictException(`Cannot complete pickup from ${job.status}`);
    }
    const completed = await this.repository.completePickup(job, actor);
    this.publishDisplayRefresh();
    return completed;
  }

  async markUnclaimed(jobId: string, user: UserRecord) {
    const actor = await this.requireRole(user, ["owner"]);
    const job = await this.repository.findJob(jobId);
    const updated = await this.repository.markUnclaimed(job, actor);
    this.publishDisplayRefresh();
    return updated;
  }

  async uploadEvidence(jobId: string, file: CaredeskStoredFile, body: { category?: string; caption?: string }, user: UserRecord) {
    const actor = await this.requireRole(user, ["owner", "technician"]);
    const job = actor.role === "technician" ? await this.findAssignedOrTakeableJob(jobId, actor) : await this.repository.findJob(jobId);
    const saved = await this.saveBinary(job, body.category ?? "diagnosis", file);
    return this.repository.saveEvidenceMetadata(
      job,
      {
        jobId: job.id,
        category: (body.category as CaredeskEvidenceFile["category"]) ?? "diagnosis",
        fileName: file.originalname,
        storagePath: saved.storagePath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        caption: body.caption,
        uploadedByUserId: actor.id
      },
      actor
    );
  }

  async listChecklistReports(user: UserRecord) {
    const actor = await this.repository.ensureDemoActor(user);
    return this.repository.listChecklistReports(actor);
  }

  async getChecklistReport(jobId: string, user: UserRecord) {
    const actor = await this.repository.ensureDemoActor(user);
    const report = await this.repository.findChecklistReport(jobId);
    if (actor.role !== "owner" && report.technicianId !== actor.id) {
      throw new ForbiddenException("Role is not allowed to view this checklist report");
    }
    return report;
  }

  async saveChecklistReport(jobId: string, body: Partial<CaredeskChecklistReport>, user: UserRecord) {
    const actor = await this.requireRole(user, ["technician"]);
    const job = await this.findAssignedJob(jobId, actor);
    return this.repository.saveChecklistReport(job, body, actor);
  }

  async uploadChecklistImage(jobId: string, section: ChecklistImageSection, caption: string | undefined, file: CaredeskStoredFile, user: UserRecord) {
    const actor = await this.requireRole(user, ["technician"]);
    const job = await this.findAssignedJob(jobId, actor);
    const report = await this.repository.findChecklistReport(job.id);
    this.ensureChecklistSectionAvailable(report, section);
    const saved = await this.saveBinary(job, `checklist/${section}`, file);
    return this.repository.saveChecklistImageMetadata(
      job,
      report,
      section,
      {
        jobId: job.id,
        fileName: file.originalname,
        storagePath: saved.storagePath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        caption,
        uploadedByUserId: actor.id
      },
      actor
    );
  }

  async updateChecklistImageCaption(jobId: string, imageId: string, body: { caption?: string }, user: UserRecord) {
    const actor = await this.requireRole(user, ["technician"]);
    const job = await this.findAssignedJob(jobId, actor);
    return this.repository.updateChecklistImageCaption(job, imageId, body.caption, actor);
  }

  async deleteChecklistImage(jobId: string, imageId: string, user: UserRecord) {
    const actor = await this.requireRole(user, ["technician"]);
    const job = await this.findAssignedJob(jobId, actor);
    const image = await this.repository.deleteChecklistImage(job, imageId, actor);
    await this.storage.delete(image.storagePath).catch(() => undefined);
    return { ok: true, image };
  }

  async pickupQueue(user: UserRecord, now: string | Date = new Date()): Promise<PickupQueueItem[]> {
    const actor = await this.repository.ensureDemoActor(user);
    const settings = await this.repository.getOrCreateSettings();
    const rows = await this.repository.listPickupJobs(actor);
    return rows.map(({ job, customer, device }) => {
      const stage = this.pickupStage(job, settings, now);
      return {
        jobId: job.id,
        jobIdDisplay: job.jobIdDisplay,
        customerName: customer.name,
        customerPhone: customer.phone,
        deviceLabel: this.repository.deviceLabel(device),
        technicianId: job.assignedTechnicianId,
        ...stage,
        nextAction: stage.unclaimedEligible ? "Owner can mark unclaimed." : `Send Day ${stage.stageDay} reminder.`
      };
    });
  }

  async listNotifications(user: UserRecord): Promise<CaredeskNotificationRecord[]> {
    const actor = await this.repository.ensureDemoActor(user);
    return this.repository.listNotifications(actor);
  }

  async recordNotificationResult(notificationId: string, body: { result: NotificationResult; method?: string; note?: string }, user: UserRecord) {
    const actor = await this.repository.ensureDemoActor(user);
    if (!(await this.repository.canActorAccessNotification(notificationId, actor))) {
      throw new ForbiddenException("Role is not allowed to update this notification");
    }
    return this.repository.recordNotificationResult(notificationId, body.result, body.method, body.note, actor);
  }

  async listCustomers(user: UserRecord) {
    await this.requireRole(user, ["owner"]);
    return this.repository.listCustomers();
  }

  async getCustomer(customerId: string, user: UserRecord) {
    await this.requireRole(user, ["owner"]);
    return this.repository.getCustomer(customerId);
  }

  async reports(user: UserRecord) {
    await this.requireRole(user, ["owner", "technician"]);
    return this.repository.reports();
  }

  async recordReportExport(user: UserRecord, body: { action?: string }) {
    const actor = await this.requireRole(user, ["owner"]);
    return this.repository.recordReportExport(actor, body.action);
  }

  async exportJobsCsv(user: UserRecord, range: string) {
    const actor = await this.requireRole(user, ["owner"]);
    const allJobs = await this.repository.listJobsForActor(actor);
    const filtered = this.filterJobsByRange(allJobs, range);
    const headers = ["Job ID", "Status", "Customer", "Phone", "Device", "Technician", "Created At", "Ready Pickup", "Completed Date", "POS Reference"];
    const rows = filtered.map((job) => {
      const customer = job.customerId ?? "";
      const device = job.deviceId ?? "";
      const tech = job.assignedTechnicianId ?? "Unassigned";
      return [
        job.jobIdDisplay,
        job.status,
        customer,
        "",
        device,
        tech,
        new Date(job.createdAt).toLocaleDateString("en-MY"),
        job.readyPickupDate ?? "",
        job.status === "COMPLETE" ? new Date(job.lastUpdate).toLocaleDateString("en-MY") : "",
        job.posReference ?? ""
      ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    await this.repository.recordReportExport(actor, `CSV export (${range})`);
    return { csvBuffer: Buffer.from(csv, "utf-8"), filename: `caredesk-report-${range}-${Date.now()}.csv` };
  }

  async exportJobsPdf(user: UserRecord, range: string) {
    const actor = await this.requireRole(user, ["owner"]);
    const allJobs = await this.repository.listJobsForActor(actor);
    const filtered = this.filterJobsByRange(allJobs, range);
    const enriched = await Promise.all(
      filtered.map(async (job) => {
        const detail = await this.repository.findJob(job.id).catch(() => job);
        return { ...job, customer: (detail as any)?.customer ?? { name: "", phone: "" }, device: (detail as any)?.device ?? { type: "", brand: "" } };
      })
    );
    const pdfBuffer = await this.pdf.generateReportPdf(enriched, range);
    await this.repository.recordReportExport(actor, `PDF export (${range})`);
    return { pdfBuffer, filename: `caredesk-report-${range}-${Date.now()}.pdf` };
  }

  private filterJobsByRange(jobs: CaredeskJob[], range: string): CaredeskJob[] {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (range) {
      case "today":
        return jobs.filter((job) => new Date(job.createdAt) >= startOfDay);
      case "7d":
        return jobs.filter((job) => new Date(job.createdAt) >= new Date(now.getTime() - 7 * 86_400_000));
      case "30d":
        return jobs.filter((job) => new Date(job.createdAt) >= new Date(now.getTime() - 30 * 86_400_000));
      case "all":
      default:
        return jobs;
    }
  }

  async getSettings(user: UserRecord) {
    await this.requireRole(user, ["owner"]);
    return this.repository.getOrCreateSettings();
  }

  async updateSettings(user: UserRecord, body: Partial<Omit<CaredeskSettings, "scannerSettings">> & { scannerSettings?: Partial<CaredeskSettings["scannerSettings"]> & { apiKey?: string } }) {
    const actor = await this.requireRole(user, ["owner"]);
    const current = await this.repository.getOrCreateSettings();
    if (body.flowRules) {
      const nextLocked = body.flowRules.lockedRules ?? current.flowRules.lockedRules;
      if (nextLocked.length < current.flowRules.lockedRules.length) {
        throw new ForbiddenException("Locked rules cannot be removed");
      }
      for (const rule of current.flowRules.lockedRules) {
        if (!nextLocked.includes(rule)) {
          throw new ForbiddenException("Locked rules cannot be removed");
        }
      }
      const validReminderDays = [0, 7, 14, 30, 60];
      const nextReminderDays = body.flowRules.reminderDays ?? current.flowRules.reminderDays;
      if (!nextReminderDays.every((d) => validReminderDays.includes(d))) {
        throw new ForbiddenException("Reminder days must be from the allowed set: 0, 7, 14, 30, 60");
      }
      if ("statusOrder" in (body.flowRules as unknown as Record<string, unknown>)) {
        throw new ForbiddenException("Core status sequence cannot be modified");
      }
    }
    return this.repository.updateSettings(body, actor);
  }

  async testScannerSettings(user: UserRecord, body: { model?: string; apiKey?: string }) {
    await this.requireRole(user, ["owner"]);
    const current = await this.repository.getScannerRuntimeSettings();
    const apiKey = body.apiKey?.trim() || current.apiKey;
    if (!apiKey) {
      throw new ConflictException("Scanner AI belum dikonfigurasi oleh Owner.");
    }
    return this.scanner.testConfig({ apiKey, model: body.model?.trim() || current.model });
  }

  async listUsers(user: UserRecord) {
    await this.requireRole(user, ["owner"]);
    return this.repository.listUsers();
  }

  async createUser(body: { name: string; email: string; role: CaredeskRole; password: string }, user: UserRecord) {
    const actor = await this.requireRole(user, ["owner"]);
    if (!["owner", "technician"].includes(body.role)) {
      throw new ForbiddenException("Role is not part of Fadhil CareDesk");
    }
    this.assertPasswordPolicy(body.password);
    const password = await this.hashPassword(body.password);
    return this.repository.createUser({ name: body.name, email: body.email, role: body.role, passwordHash: password.hash, passwordSalt: password.salt }, actor);
  }

  async updateUser(userId: string, body: { name?: string; email?: string; role?: CaredeskRole; status?: string }, user: UserRecord) {
    const actor = await this.requireRole(user, ["owner"]);
    return this.repository.updateUser(userId, body, actor);
  }

  async resetUserPassword(userId: string, body: { password: string }, user: UserRecord) {
    const actor = await this.requireRole(user, ["owner"]);
    this.assertPasswordPolicy(body.password);
    const password = await this.hashPassword(body.password);
    return this.repository.resetUserPassword(userId, password, actor);
  }
  async serveFile(storagePath: string, user: UserRecord): Promise<{ buffer: Buffer; mimeType: string }> {
    await this.requireRole(user, ["owner", "technician"]);
    const metadata = await this.repository.findEvidenceByStoragePath(storagePath);
    if (!metadata) {
      throw new NotFoundException("File not found");
    }
    const buffer = await this.storage.read(storagePath);
    return { buffer, mimeType: metadata.mimeType };
  }

  private async requireRole(user: UserRecord, roles: CaredeskRole[]): Promise<CaredeskUser> {
    const actor = await this.repository.ensureDemoActor(user);
    if (!roles.includes(actor.role)) {
      throw new ForbiddenException("Role is not allowed to perform this action");
    }
    return actor;
  }

  private async findAssignedJob(jobId: string, actor: CaredeskUser): Promise<CaredeskJob> {
    const job = await this.repository.findJob(jobId);
    if (job.assignedTechnicianId !== actor.id) {
      throw new ForbiddenException("Technician can only act on assigned jobs");
    }
    return job;
  }

  private async findAssignedOrTakeableJob(jobId: string, actor: CaredeskUser): Promise<CaredeskJob> {
    const job = await this.repository.findJob(jobId);
    if (job.assignedTechnicianId && job.assignedTechnicianId !== actor.id) {
      throw new ForbiddenException("Technician can only act on assigned jobs");
    }
    return job;
  }

  private canViewJob(actor: CaredeskUser, job: CaredeskJob): boolean {
    return actor.role === "owner" || !job.assignedTechnicianId || job.assignedTechnicianId === actor.id;
  }

  private async saveBinary(job: CaredeskJob, category: string, file: CaredeskStoredFile) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storedFilename = `${randomUUID()}-${safeName}`;
    const folder = `/caredesk/${job.jobIdDisplay}/${category}`;
    const storagePath = await this.storage.save(folder, storedFilename, file);
    return { storagePath, storedFilename };
  }

  private ensureChecklistSectionAvailable(report: CaredeskChecklistReport, section: ChecklistImageSection) {
    if (section !== "battery") {
      return;
    }
    if (report.battery.applicable === false) {
      throw new ConflictException("Battery checklist images are not applicable for this device");
    }
  }

  private pickupStage(job: CaredeskJob, settings: CaredeskSettings, now: string | Date): { stageDay: PickupStageDay; ageDays: number; unclaimedEligible: boolean } {
    const ready = new Date(job.readyPickupDate ?? new Date()).getTime();
    const current = new Date(now).getTime();
    const ageDays = Math.max(0, Math.floor((current - ready) / 86_400_000));
    const stageDay: PickupStageDay = ageDays >= 60 ? 60 : ageDays >= 30 ? 30 : ageDays >= 14 ? 14 : ageDays >= 7 ? 7 : 0;
    return { stageDay, ageDays, unclaimedEligible: ageDays >= settings.flowRules.unclaimedDay };
  }

  private async hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    return { salt, hash: derived.toString("hex") };
  }

  private assertPasswordPolicy(password: string) {
    if (password.length < 8 || !/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
      throw new BadRequestException(passwordPolicyMessage);
    }
  }

  private async verifyPassword(password: string, salt: string, expectedHash: string) {
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    const expected = Buffer.from(expectedHash, "hex");
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  }

  private sessionMeta(meta: { userAgent?: string; ip?: string }) {
    return {
      userAgent: meta.userAgent,
      ipHash: meta.ip ? createHash("sha256").update(meta.ip).digest("hex") : undefined,
      expiresAt: new Date(Date.now() + sessionDurationMs)
    };
  }

  private publishDisplayRefresh() {
    this.displayEvents.publishRefresh();
  }
}

