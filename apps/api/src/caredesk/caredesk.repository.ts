import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { BadRequestException } from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import type {
  CaredeskChecklistReport,
  CaredeskCustomer,
  CaredeskDevice,
  CaredeskEvidenceFile,
  CaredeskJob,
  CaredeskJobStatus,
  CaredeskNotificationRecord,
  CaredeskRole,
  CaredeskSettings,
  CaredeskTimelineEvent,
  CaredeskUser,
  ChecklistImageSection,
  NotificationResult,
  PickupStageDay
} from "../../../../packages/domain/src";
import type { UserRecord } from "../auth/user-record";
import { PrismaService } from "../database/prisma.service";
import {
  domainToPrismaStatus,
  mapChecklistImage,
  mapChecklistReport,
  mapCustomer,
  mapDevice,
  mapEvidence,
  mapJob,
  mapNotification,
  mapSettings,
  mapTimelineEvent,
  defaultNotificationTemplates,
  prismaToDomainStatus,
  toDateOnly,
  toIso
} from "./caredesk-prisma.mapper";
import type { CaredeskDisplayRow } from "./caredesk-display";

interface CreateJobBody {
  serviceReportNumber: string;
  customer: { name: string; phone: string; preferredChannel?: string };
  device: { type: string; brand: string; model?: string; serialNumber?: string };
  reportedIssue: string;
}

const defaultFlowRules: CaredeskSettings["flowRules"] = {
  reminderDays: [0, 7, 14, 30, 60],
  unclaimedDay: 90,
  stuckThresholds: {
    "NEW JOB": "24 jam",
    "WAITING FADHIL REVIEW": "4 jam",
    "WAITING CUSTOMER CONFIRMATION": "24 jam",
    "IN PROGRESS": "48 jam"
  },
  requiredEvidence: {
    diagnosis: "note_and_photo",
    readyPickup: "testing_note_required",
    completePickup: "pickup_note_required"
  },
  notProceedReasons: [
    "Customer tak mahu proceed",
    "Harga terlalu tinggi",
    "Delay parts",
    "Customer belum decide"
  ],
  releaseReasons: [
    "Technician sakit/cuti",
    "Overload job",
    "Customer request tukar technician"
  ],
  lockedRules: [
    "Technician tidak boleh repair sebelum IN PROGRESS.",
    "Owner review diperlukan sebelum customer decision.",
    "Role utama sistem hanya Owner dan Technician."
  ],
  retentionDays: 365
};

const defaultSettings: CaredeskSettings = {
  shopInfo: { name: "Fadhil CareDesk", subtitle: "Operasi Servis & Repair" },
  defaultLanguage: "bm",
  posReferenceLabel: "POS Reference",
  flowRules: defaultFlowRules,
  notificationTemplates: defaultNotificationTemplates(),
  scannerSettings: {
    provider: "openai",
    enabled: false,
    model: "gpt-5.4-mini",
    apiKeyConfigured: false,
    maxUploadBytes: 10 * 1024 * 1024
  }
};

type StoredScannerSettings = {
  provider: "openai";
  enabled: boolean;
  model: string;
  encryptedApiKey?: string;
  apiKeyMasked?: string;
  maxUploadBytes: number;
};

type ScannerSettingsUpdate = Partial<CaredeskSettings["scannerSettings"]> & { apiKey?: string };

type SettingsUpdate = Partial<Omit<CaredeskSettings, "scannerSettings">> & {
  scannerSettings?: ScannerSettingsUpdate;
};

@Injectable()
export class CaredeskRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async ensureDemoActor(user: UserRecord): Promise<CaredeskUser> {
    if (user.role !== "owner" && user.role !== "technician") {
      throw new ForbiddenException("Role is not part of Fadhil CareDesk v2");
    }
    const saved = await this.prisma.caredeskUser.findUnique({ where: { id: user.id } });
    if (!saved || saved.status !== "active") {
      throw new ForbiddenException("CareDesk user is not active");
    }
    return this.publicUser(saved);
  }

  async hasActiveOwner(): Promise<boolean> {
    return (await this.prisma.caredeskUser.count({ where: { role: "owner", status: "active" } })) > 0;
  }

  async cleanupExpiredSessions(now = new Date()) {
    return this.prisma.caredeskSession.deleteMany({
      where: { expiresAt: { lte: now } }
    });
  }

  async findUserByEmail(email: string) {
    return this.prisma.caredeskUser.findUnique({ where: { email: email.toLowerCase() } });
  }

  async createUser(data: { name: string; email: string; role: CaredeskRole; passwordHash: string; passwordSalt: string }, actor?: CaredeskUser): Promise<CaredeskUser> {
    const created = await this.prisma.caredeskUser.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        role: data.role,
        status: "active",
        passwordHash: data.passwordHash,
        passwordSalt: data.passwordSalt,
        passwordUpdatedAt: new Date()
      }
    });
    if (actor) {
      await this.createAuditLog(actor.id, "User created", `${created.name} created as ${created.role}.`);
    }
    return this.publicUser(created);
  }

  async listUsers(): Promise<CaredeskUser[]> {
    const users = await this.prisma.caredeskUser.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });
    return users.map((user) => this.publicUser(user));
  }

  async updateUser(userId: string, body: { name?: string; email?: string; role?: CaredeskRole; status?: string }, actor: CaredeskUser): Promise<CaredeskUser> {
    await this.ensureLastActiveOwnerIsPreserved(userId, body);
    const updated = await this.prisma.caredeskUser.update({
      where: { id: userId },
      data: {
        name: body.name,
        email: body.email?.toLowerCase(),
        role: body.role,
        status: body.status
      }
    });
    await this.createAuditLog(actor.id, "User updated", `${updated.name} account updated.`);
    return this.publicUser(updated);
  }

  async resetUserPassword(userId: string, password: { hash: string; salt: string }, actor: CaredeskUser): Promise<CaredeskUser> {
    const updated = await this.prisma.caredeskUser.update({
      where: { id: userId },
      data: {
        passwordHash: password.hash,
        passwordSalt: password.salt,
        passwordUpdatedAt: new Date()
      }
    });
    await this.prisma.caredeskSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.createAuditLog(actor.id, "Password reset", `${updated.name} password reset.`);
    return this.publicUser(updated);
  }

  async createSession(userId: string, meta: { userAgent?: string; ipHash?: string; expiresAt: Date }) {
    await this.prisma.caredeskUser.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    return this.prisma.caredeskSession.create({
      data: {
        id: randomUUID(),
        userId,
        expiresAt: meta.expiresAt,
        userAgent: meta.userAgent,
        ipHash: meta.ipHash
      }
    });
  }

  async revokeSession(sessionId: string) {
    await this.prisma.caredeskSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  async getOrCreateSettings(): Promise<CaredeskSettings> {
    const settings = await this.prisma.caredeskSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        shopInfo: json(defaultSettings.shopInfo),
        defaultLanguage: defaultSettings.defaultLanguage,
        posReferenceLabel: defaultSettings.posReferenceLabel,
        flowRules: json(defaultSettings.flowRules),
        notificationTemplates: json(defaultNotificationTemplates()),
        scannerSettings: json(defaultStoredScannerSettings())
      },
      update: {}
    });
    return mapSettings(settings);
  }

  private publicUser(user: { id: string; name: string; email?: string | null; role: string; status?: string | null }): CaredeskUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email ?? undefined,
      role: user.role as CaredeskRole,
      status: user.status ?? undefined
    };
  }

  private async ensureLastActiveOwnerIsPreserved(userId: string, body: { role?: CaredeskRole; status?: string }) {
    const current = await this.prisma.caredeskUser.findUnique({ where: { id: userId } });
    if (!current || current.role !== "owner" || current.status !== "active") {
      return;
    }
    const wouldRemoveActiveOwner = (body.role !== undefined && body.role !== "owner") || body.status === "disabled";
    if (!wouldRemoveActiveOwner) {
      return;
    }
    const otherActiveOwners = await this.prisma.caredeskUser.count({
      where: { id: { not: userId }, role: "owner", status: "active" }
    });
    if (otherActiveOwners === 0) {
      throw new ConflictException("At least one active Owner account is required");
    }
  }

  async updateSettings(body: SettingsUpdate, actor: CaredeskUser): Promise<CaredeskSettings> {
    const current = await this.getOrCreateSettings();
    const currentRaw = await this.prisma.caredeskSettings.findUnique({ where: { id: "default" } });
    const scannerSettings = this.mergeScannerSettings(currentRaw?.scannerSettings, body.scannerSettings);
    const next = await this.prisma.caredeskSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        shopInfo: json({ ...current.shopInfo, ...(body.shopInfo ?? {}) }),
        defaultLanguage: body.defaultLanguage ?? current.defaultLanguage,
        posReferenceLabel: body.posReferenceLabel ?? current.posReferenceLabel,
        flowRules: json({ ...current.flowRules, ...(body.flowRules ?? {}) }),
        notificationTemplates: json(body.notificationTemplates ?? current.notificationTemplates),
        scannerSettings: json(scannerSettings)
      },
      update: {
        shopInfo: json({ ...current.shopInfo, ...(body.shopInfo ?? {}) }),
        defaultLanguage: body.defaultLanguage ?? current.defaultLanguage,
        posReferenceLabel: body.posReferenceLabel ?? current.posReferenceLabel,
        flowRules: json({ ...current.flowRules, ...(body.flowRules ?? {}) }),
        notificationTemplates: json(body.notificationTemplates ?? current.notificationTemplates),
        scannerSettings: json(scannerSettings)
      }
    });
    await this.createAuditLog(actor.id, "Settings updated", "Caredesk settings updated.");
    return mapSettings(next);
  }

  async getScannerRuntimeSettings(): Promise<{ enabled: boolean; model: string; apiKey?: string; maxUploadBytes: number }> {
    await this.getOrCreateSettings();
    const settings = await this.prisma.caredeskSettings.findUnique({ where: { id: "default" } });
    const scanner = storedScannerSettings(settings?.scannerSettings);
    return {
      enabled: scanner.enabled,
      model: scanner.model,
      apiKey: scanner.encryptedApiKey ? decryptSettingSecret(scanner.encryptedApiKey) : undefined,
      maxUploadBytes: scanner.maxUploadBytes
    };
  }

  async createJobWithCustomerDeviceChecklist(body: CreateJobBody, actor: CaredeskUser) {
    const rawReportNumber = body.serviceReportNumber.replace(/[^0-9]/g, "").padStart(4, "0");
    const jobIdDisplay = `NO.${rawReportNumber}`;
    const existing = await this.prisma.caredeskJob.findUnique({ where: { jobIdDisplay } });
    if (existing) {
      throw new ConflictException("Service report number already exists");
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.caredeskCustomer.create({
        data: {
          id: `cus_${randomUUID()}`,
          name: body.customer.name,
          phone: body.customer.phone,
          preferredChannel: body.customer.preferredChannel ?? "WhatsApp"
        }
      });
      const device = await tx.caredeskDevice.create({
        data: {
          id: `dev_${randomUUID()}`,
          customerId: customer.id,
          type: body.device.type,
          brand: body.device.brand,
          model: body.device.model,
          serialNumber: body.device.serialNumber
        }
      });
      const job = await tx.caredeskJob.create({
        data: {
          id: `job_${rawReportNumber}`,
          jobIdDisplay,
          rawReportNumber,
          status: "NEW_JOB",
          customerId: customer.id,
          deviceId: device.id,
          reportedIssue: body.reportedIssue,
          lastUpdate: "Job created"
        }
      });
      await tx.caredeskChecklistReport.create({
        data: this.defaultChecklistReportData(job.id, jobIdDisplay, mapDevice(device), actor.id)
      });
      await this.createTimeline(tx, job.id, "status", "Job created", `${jobIdDisplay} created from service note scan.`, actor.id);
      return tx.caredeskJob.findUniqueOrThrow({ where: { id: job.id }, include: { customer: true, device: true } });
    });

    return this.presentJob(created);
  }

  async listJobsForActor(actor: CaredeskUser): Promise<CaredeskJob[]> {
    const jobs = await this.prisma.caredeskJob.findMany({
      where: actor.role === "owner" ? undefined : { OR: [{ assignedTechnicianId: null }, { assignedTechnicianId: actor.id }] },
      orderBy: { createdAt: "desc" }
    });
    return jobs.map(mapJob);
  }

  async listDisplayJobs(): Promise<CaredeskDisplayRow[]> {
    const jobs = await this.prisma.caredeskJob.findMany({
      select: {
        jobIdDisplay: true,
        status: true,
        updatedAt: true,
        readyPickupDate: true
      }
    });
    return jobs.map((job) => ({
      jobIdDisplay: job.jobIdDisplay,
      status: prismaToDomainStatus[job.status],
      updatedAt: toIso(job.updatedAt),
      readyPickupDate: toDateOnly(job.readyPickupDate)
    }));
  }

  async getJobDetail(jobId: string) {
    const job = await this.findJobRecord(jobId);
    const [evidence, notifications, checklistReport, timeline] = await Promise.all([
      this.prisma.caredeskEvidenceFile.findMany({ where: { jobId: job.id }, orderBy: { createdAt: "desc" } }),
      this.prisma.caredeskNotification.findMany({ where: { jobId: job.id }, orderBy: { createdAt: "desc" } }),
      this.prisma.caredeskChecklistReport.findUnique({ where: { jobId: job.id }, include: { job: true, images: { orderBy: { createdAt: "desc" } } } }),
      this.prisma.caredeskTimelineEvent.findMany({ where: { jobId: job.id }, orderBy: { createdAt: "desc" } })
    ]);
    return {
      ...this.presentJob(job),
      customer: mapCustomer(job.customer),
      device: mapDevice(job.device),
      evidence: evidence.map(mapEvidence),
      notifications: notifications.map(mapNotification),
      checklistReport: checklistReport ? mapChecklistReport(checklistReport) : undefined,
      timeline: timeline.map(mapTimelineEvent)
    };
  }

  async findJob(jobId: string): Promise<CaredeskJob> {
    return mapJob(await this.findJobRecord(jobId));
  }

  async takeJob(jobId: string, actor: CaredeskUser) {
    const job = await this.findJobRecord(jobId);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.caredeskJobAssignment.create({ data: { jobId: job.id, technicianId: actor.id, action: "take" } });
      await tx.caredeskChecklistReport.updateMany({ where: { jobId: job.id, technicianId: null }, data: { technicianId: actor.id } });
      await this.createTimeline(tx, job.id, "assignment", "Job taken", `${actor.name} took this job.`, actor.id);
      return tx.caredeskJob.update({
        where: { id: job.id },
        data: { assignedTechnicianId: actor.id, lastUpdate: `Taken by ${actor.name}` },
        include: { customer: true, device: true }
      });
    });
    return this.presentJob(updated);
  }

  async releaseJob(job: CaredeskJob, actor: CaredeskUser) {
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.caredeskJobAssignment.create({ data: { jobId: job.id, technicianId: actor.id, action: "release" } });
      await this.createTimeline(tx, job.id, "assignment", "Job released", `${actor.name} released this job.`, actor.id);
      return tx.caredeskJob.update({
        where: { id: job.id },
        data: { assignedTechnicianId: null, lastUpdate: "Job released" },
        include: { customer: true, device: true }
      });
    });
    return this.presentJob(updated);
  }

  async addDiagnosis(job: CaredeskJob, summary: string, submitToOwner: boolean | undefined, actor: CaredeskUser) {
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.caredeskJob.update({
        where: { id: job.id },
        data: {
          assignedTechnicianId: job.assignedTechnicianId ?? actor.id,
          diagnosisNotes: summary
        }
      });
      if (submitToOwner) {
        await this.updateJobStatus(tx, job.id, job.status, "WAITING FADHIL REVIEW", actor.id, "Diagnosis submitted for Owner review.");
      }
      await this.createTimeline(tx, job.id, "diagnosis", "Diagnosis submitted", summary, actor.id);
      return tx.caredeskJob.findUniqueOrThrow({ where: { id: job.id }, include: { customer: true, device: true } });
    });
    void updated;
    return { id: `diag_${randomUUID()}`, jobId: job.id, technicianId: actor.id, summary, submittedForReviewAt: new Date().toISOString() };
  }

  async ownerReview(job: CaredeskJob, instruction: string, posReference: string | undefined, actor: CaredeskUser) {
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.caredeskJob.update({ where: { id: job.id }, data: { ownerInstruction: instruction, posReference } });
      await this.updateJobStatus(tx, job.id, job.status, "WAITING CUSTOMER CONFIRMATION", actor.id, instruction);
      await this.createTimeline(tx, job.id, "owner_review", "Owner review approved", instruction, actor.id);
      return tx.caredeskJob.findUniqueOrThrow({ where: { id: job.id }, include: { customer: true, device: true } });
    });
    return this.presentJob(updated);
  }

  async customerDecision(job: CaredeskJob, decision: NonNullable<CaredeskJob["customerDecision"]>, actor: CaredeskUser) {
    const nextStatus = decision.result === "proceed" ? "IN PROGRESS" : "NOT PROCEED";
    const detail = decision.note ?? decision.reason ?? "Customer decision recorded.";
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.caredeskJob.update({ where: { id: job.id }, data: { customerDecision: json(decision) } });
      await this.updateJobStatus(tx, job.id, job.status, nextStatus, actor.id, detail);
      await this.createTimeline(tx, job.id, "customer_decision", "Customer decision recorded", decision.note ?? decision.reason ?? decision.result, actor.id);
      return tx.caredeskJob.findUniqueOrThrow({ where: { id: job.id }, include: { customer: true, device: true } });
    });
    return this.presentJob(updated);
  }

  async repairProgress(job: CaredeskJob, note: string, actor: CaredeskUser) {
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.createTimeline(tx, job.id, "diagnosis", "Repair progress updated", note, actor.id);
      return tx.caredeskJob.update({
        where: { id: job.id },
        data: { lastUpdate: "Repair progress updated" },
        include: { customer: true, device: true }
      });
    });
    return this.presentJob(updated);
  }

  async readyPickup(job: CaredeskJob, readyPickupDate: string, actor: CaredeskUser) {
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.caredeskJob.update({ where: { id: job.id }, data: { readyPickupDate: new Date(`${readyPickupDate}T00:00:00.000Z`) } });
      await this.updateJobStatus(tx, job.id, job.status, "READY PICKUP", actor.id, "Repair/testing complete.");
      const latest = await tx.caredeskJob.findUniqueOrThrow({ where: { id: job.id }, include: { customer: true, device: true } });
      await tx.caredeskNotification.create({
        data: this.pickupNotificationData(this.presentJob(latest), latest.customer, 0)
      });
      return latest;
    });
    return this.presentJob(updated);
  }

  async completePickup(job: CaredeskJob, actor: CaredeskUser) {
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.updateJobStatus(tx, job.id, job.status, "COMPLETE", actor.id, "Pickup completed.");
      return tx.caredeskJob.findUniqueOrThrow({ where: { id: job.id }, include: { customer: true, device: true } });
    });
    return this.presentJob(updated);
  }

  async markUnclaimed(job: CaredeskJob, actor: CaredeskUser) {
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.updateJobStatus(tx, job.id, job.status, "UNCLAIMED", actor.id, "Owner marked job as unclaimed.");
      return tx.caredeskJob.findUniqueOrThrow({ where: { id: job.id }, include: { customer: true, device: true } });
    });
    return this.presentJob(updated);
  }

  async saveEvidenceMetadata(job: CaredeskJob, file: Omit<CaredeskEvidenceFile, "id" | "createdAt">, actor: CaredeskUser) {
    const saved = await this.prisma.$transaction(async (tx) => {
      const evidence = await tx.caredeskEvidenceFile.create({
        data: {
          jobId: job.id,
          category: file.category,
          section: file.section,
          fileName: file.fileName,
          storagePath: file.storagePath,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          caption: file.caption,
          uploadedByUserId: file.uploadedByUserId
        }
      });
      await this.createTimeline(tx, job.id, "audit", "Evidence uploaded", evidence.fileName, actor.id);
      return evidence;
    });
    return mapEvidence(saved);
  }

  async listChecklistReports(actor: CaredeskUser) {
    const reports = await this.prisma.caredeskChecklistReport.findMany({
      where: actor.role === "owner" ? undefined : { technicianId: actor.id },
      include: { job: true, images: { orderBy: { createdAt: "desc" } } },
      orderBy: { lastUpdated: "desc" }
    });
    return reports.map(mapChecklistReport);
  }

  async findChecklistReport(jobId: string): Promise<CaredeskChecklistReport> {
    const job = await this.findJobRecord(jobId);
    const report = await this.prisma.caredeskChecklistReport.findUnique({
      where: { jobId: job.id },
      include: { job: true, images: { orderBy: { createdAt: "desc" } } }
    });
    if (!report) {
      throw new NotFoundException("Checklist report not found");
    }
    return mapChecklistReport(report);
  }

  async saveChecklistReport(job: CaredeskJob, body: Partial<CaredeskChecklistReport>, actor: CaredeskUser) {
    const report = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.caredeskChecklistReport.update({
        where: { jobId: job.id },
        data: {
          status: body.status,
          deviceInfo: body.deviceInfo === undefined ? undefined : json(body.deviceInfo),
          initialCheck: body.initialCheck === undefined ? undefined : json(body.initialCheck),
          drive: body.drive === undefined ? undefined : json(body.drive),
          battery: body.battery === undefined ? undefined : json(body.battery),
          ram: body.ram === undefined ? undefined : json(body.ram),
          diagnosisSummary: body.diagnosisSummary,
          lastUpdated: new Date()
        },
        include: { job: true, images: { orderBy: { createdAt: "desc" } } }
      });
      await this.createTimeline(tx, job.id, "checklist", "Checklist report saved", `Checklist ${saved.status}.`, actor.id);
      return saved;
    });
    return mapChecklistReport(report as Parameters<typeof mapChecklistReport>[0]);
  }

  async saveChecklistImageMetadata(
    job: CaredeskJob,
    report: CaredeskChecklistReport,
    section: ChecklistImageSection,
    file: Omit<CaredeskEvidenceFile, "id" | "createdAt" | "category" | "section">,
    actor: CaredeskUser
  ) {
    const saved = await this.prisma.$transaction(async (tx) => {
      const image = await tx.caredeskChecklistImage.create({
        data: {
          reportId: await this.findChecklistReportId(tx, report.jobId),
          jobId: job.id,
          section,
          fileName: file.fileName,
          storagePath: file.storagePath,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          caption: file.caption,
          uploadedByUserId: file.uploadedByUserId
        }
      });
      await tx.caredeskEvidenceFile.create({
        data: {
          jobId: job.id,
          category: "checklist",
          section,
          fileName: file.fileName,
          storagePath: file.storagePath,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          caption: file.caption,
          uploadedByUserId: file.uploadedByUserId
        }
      });
      await this.createTimeline(tx, job.id, "checklist", "Checklist image uploaded", `${section}: ${file.fileName}`, actor.id);
      return image;
    });
    return mapChecklistImage(saved);
  }

  async updateChecklistImageCaption(job: CaredeskJob, imageId: string, caption: string | undefined, actor: CaredeskUser) {
    const saved = await this.prisma.$transaction(async (tx) => {
      const image = await tx.caredeskChecklistImage.findFirst({ where: { id: imageId, jobId: job.id } });
      if (!image) {
        throw new NotFoundException("Checklist image not found");
      }
      const updated = await tx.caredeskChecklistImage.update({
        where: { id: image.id },
        data: { caption: caption?.trim() || null }
      });
      await tx.caredeskEvidenceFile.updateMany({
        where: { jobId: job.id, category: "checklist", section: image.section, storagePath: image.storagePath },
        data: { caption: caption?.trim() || null }
      });
      await this.createTimeline(tx, job.id, "checklist", "Checklist image caption updated", `${image.section}: ${image.fileName}`, actor.id);
      return updated;
    });
    return mapChecklistImage(saved);
  }

  async deleteChecklistImage(job: CaredeskJob, imageId: string, actor: CaredeskUser) {
    const deleted = await this.prisma.$transaction(async (tx) => {
      const image = await tx.caredeskChecklistImage.findFirst({ where: { id: imageId, jobId: job.id } });
      if (!image) {
        throw new NotFoundException("Checklist image not found");
      }
      await tx.caredeskChecklistImage.delete({ where: { id: image.id } });
      await tx.caredeskEvidenceFile.deleteMany({
        where: { jobId: job.id, category: "checklist", section: image.section, storagePath: image.storagePath }
      });
      await this.createTimeline(tx, job.id, "checklist", "Checklist image removed", `${image.section}: ${image.fileName}`, actor.id);
      return image;
    });
    return mapChecklistImage(deleted);
  }

  async listPickupJobs(actor: CaredeskUser) {
    const rows = await this.prisma.caredeskJob.findMany({
      where: {
        status: { in: ["READY_PICKUP", "UNCLAIMED"] },
        ...(actor.role === "owner" ? {} : { assignedTechnicianId: actor.id })
      },
      include: { customer: true, device: true },
      orderBy: { readyPickupDate: "asc" }
    });
    return rows.map((row) => ({ job: this.presentJob(row), customer: mapCustomer(row.customer), device: mapDevice(row.device) }));
  }

  async listNotifications(actor: CaredeskUser): Promise<CaredeskNotificationRecord[]> {
    const notifications = await this.prisma.caredeskNotification.findMany({
      where: actor.role === "owner" ? undefined : { job: { assignedTechnicianId: actor.id } },
      orderBy: { createdAt: "desc" }
    });
    return notifications.map(mapNotification);
  }

  async recordNotificationResult(notificationId: string, result: NotificationResult, method: string | undefined, note: string | undefined, actor: CaredeskUser) {
    const saved = await this.prisma.$transaction(async (tx) => {
      const notification = await tx.caredeskNotification.findUnique({ where: { id: notificationId }, include: { job: true } });
      if (!notification) {
        throw new NotFoundException("Notification not found");
      }
      const status = result === "sent successfully" ? "Sent" : result === "failed" ? "Failed" : "Need follow-up";
      const updated = await tx.caredeskNotification.update({
        where: { id: notificationId },
        data: { result, status, method, note, contactedAt: new Date() }
      });
      await this.createTimeline(tx, notification.jobId, "notification", "Pickup notification updated", result, actor.id);
      return updated;
    });
    return mapNotification(saved);
  }

  async listCustomers() {
    const customers = await this.prisma.caredeskCustomer.findMany({
      include: { jobs: true },
      orderBy: { updatedAt: "desc" }
    });
    return customers.map((customer) => ({ ...mapCustomer(customer), jobs: customer.jobs.map(mapJob) }));
  }

  async getCustomer(customerId: string) {
    const customer = await this.prisma.caredeskCustomer.findUnique({
      where: { id: customerId },
      include: {
        jobs: { include: { device: true }, orderBy: { updatedAt: "desc" } },
        devices: true
      }
    });
    if (!customer) {
      throw new NotFoundException("Customer not found");
    }
    const notifications = await this.prisma.caredeskNotification.findMany({
      where: { job: { customerId } },
      orderBy: { createdAt: "desc" }
    });
    return {
      ...mapCustomer(customer),
      activeJobs: customer.jobs.filter((job) => !["COMPLETE", "NOT_PROCEED"].includes(job.status)).map(mapJob),
      jobHistory: customer.jobs.map(mapJob),
      devices: customer.devices.map(mapDevice),
      contactHistory: notifications.map(mapNotification)
    };
  }

  async reports() {
    const jobs = await this.prisma.caredeskJob.findMany({
      include: { customer: true, device: true, assignedTechnician: true, notifications: true, timeline: true }
    });

    const activeStatuses = ["COMPLETE", "NOT_PROCEED"];
    const now = new Date();

    const technicianMap = new Map<string, { name: string; assignedJobs: number; activeJobs: number; completedJobs: number; readyPickupTimes: number[] }>();

    const notProceedRows: Array<{
      jobId: string; jobIdDisplay: string; customerName: string; deviceType: string;
      technicianName: string; reason: string; method: string;
    }> = [];

    const completedRows: Array<{
      jobId: string; jobIdDisplay: string; customerName: string; deviceLabel: string;
      technicianName: string; completedDate: string; posReference?: string;
    }> = [];

    let remindersSent = 0;
    let needFollowUp = 0;

    for (const job of jobs) {
      const techName = job.assignedTechnician?.name ?? "Unassigned";

      if (job.assignedTechnicianId) {
        const entry = technicianMap.get(job.assignedTechnicianId) ?? {
          name: techName, assignedJobs: 0, activeJobs: 0, completedJobs: 0, readyPickupTimes: []
        };
        entry.assignedJobs++;
        if (!activeStatuses.includes(job.status)) {
          entry.activeJobs++;
        }
        if (job.status === "COMPLETE") {
          entry.completedJobs++;
        }
        if (job.readyPickupDate && job.createdAt) {
          const readyTime = new Date(job.readyPickupDate).getTime() - new Date(job.createdAt).getTime();
          if (readyTime > 0) entry.readyPickupTimes.push(readyTime);
        }
        technicianMap.set(job.assignedTechnicianId, entry);
      }

      if (job.status === "NOT_PROCEED") {
        const decisionEvent = job.timeline.find((t) => t.title.includes("NOT PROCEED") || t.detail.includes("not proceed"));
        const reason = (job.customerDecision as { reason?: string } | null)?.reason ??
                       decisionEvent?.detail ?? "Customer decided not to proceed";
        notProceedRows.push({
          jobId: job.id,
          jobIdDisplay: job.jobIdDisplay,
          customerName: job.customer.name,
          deviceType: job.device.type,
          technicianName: techName,
          reason,
          method: (job.customerDecision as { method?: string } | null)?.method ?? "In-person"
        });
      }

      if (job.status === "COMPLETE") {
        const completeEvent = job.timeline.find((t) => t.title.includes("COMPLETE") || t.type === "status");
        completedRows.push({
          jobId: job.id,
          jobIdDisplay: job.jobIdDisplay,
          customerName: job.customer.name,
          deviceLabel: [job.device.brand, job.device.model ?? job.device.type].filter(Boolean).join(" "),
          technicianName: techName,
          completedDate: completeEvent ? new Date(completeEvent.createdAt).toLocaleDateString("en-MY") : new Date(job.updatedAt).toLocaleDateString("en-MY"),
          posReference: job.posReference ?? undefined
        });
      }

      if (job.status === "READY_PICKUP" && job.readyPickupDate) {
        const ageDays = Math.max(0, Math.floor((now.getTime() - new Date(job.readyPickupDate).getTime()) / 86_400_000));
        if (ageDays > 0) {
          const contacted = job.notifications.some((n) => n.result === "sent successfully" || n.result === "contacted");
          if (contacted) {
            remindersSent++;
          } else {
            needFollowUp++;
          }
        }
      }
    }

    const technicianWorkload = Array.from(technicianMap.values()).map((t) => ({
      technicianId: "",
      technicianName: t.name,
      assignedJobs: t.assignedJobs,
      activeJobs: t.activeJobs,
      completedJobs: t.completedJobs,
      averageReadyPickupDays: t.readyPickupTimes.length
        ? (t.readyPickupTimes.reduce((a, b) => a + b, 0) / t.readyPickupTimes.length / 86_400_000).toFixed(1)
        : "0.0"
    }));

    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((job) => !["COMPLETE", "NOT_PROCEED"].includes(job.status)).length,
      readyPickup: jobs.filter((job) => job.status === "READY_PICKUP").length,
      unclaimed: jobs.filter((job) => job.status === "UNCLAIMED").length,
      remindersSent,
      needFollowUp,
      statusBreakdown: jobs.reduce<Record<string, number>>((counts, job) => {
        const status = mapJob(job).status;
        return { ...counts, [status]: (counts[status] ?? 0) + 1 };
      }, {}),
      technicianWorkload,
      notProceedRows,
      completedRows
    };
  }

  async recordReportExport(actor: CaredeskUser, action = "export") {
    const event = await this.createAuditLog(actor.id, "Report export audit", action);
    return {
      id: event.id,
      jobId: "system",
      type: "audit",
      title: event.action,
      detail: event.detail,
      actorUserId: event.actorId,
      createdAt: event.createdAt.toISOString()
    };
  }

  async canActorAccessNotification(notificationId: string, actor: CaredeskUser): Promise<boolean> {
    if (actor.role === "owner") {
      return true;
    }
    const notification = await this.prisma.caredeskNotification.findUnique({ where: { id: notificationId }, include: { job: true } });
    return notification?.job.assignedTechnicianId === actor.id;
  }

  async findJobRecord(jobId: string) {
    const job = await this.prisma.caredeskJob.findFirst({
      where: { OR: [{ id: jobId }, { jobIdDisplay: jobId }] },
      include: { customer: true, device: true }
    });
    if (!job) {
      throw new NotFoundException("Job not found");
    }
    return job;

  }
  async findEvidenceByStoragePath(storagePath: string) {
    return this.prisma.caredeskEvidenceFile.findFirst({ where: { storagePath } }) ??
           this.prisma.caredeskChecklistImage.findFirst({ where: { storagePath } });
  }

  presentJob(job: Parameters<typeof mapJob>[0] & { customer: Parameters<typeof mapCustomer>[0]; device: Parameters<typeof mapDevice>[0] }) {
    const mapped = mapJob(job);
    const customer = mapCustomer(job.customer);
    const device = mapDevice(job.device);
    return { ...mapped, customerName: customer.name, customerPhone: customer.phone, deviceLabel: this.deviceLabel(device) };
  }

  deviceLabel(device: CaredeskDevice): string {
    return [device.brand, device.model ?? device.type].filter(Boolean).join(" ");
  }

  private mergeScannerSettings(currentValue: unknown, update: ScannerSettingsUpdate | undefined): StoredScannerSettings {
    const current = storedScannerSettings(currentValue);
    if (!update) {
      return current;
    }
    const next: StoredScannerSettings = {
      provider: "openai",
      enabled: update.enabled ?? current.enabled,
      model: normalizeScannerModel(update.model ?? current.model),
      encryptedApiKey: current.encryptedApiKey,
      apiKeyMasked: current.apiKeyMasked,
      maxUploadBytes: normalizeMaxUploadBytes(update.maxUploadBytes ?? current.maxUploadBytes)
    };
    if (typeof update.apiKey === "string" && update.apiKey.trim()) {
      const apiKey = update.apiKey.trim();
      next.encryptedApiKey = encryptSettingSecret(apiKey);
      next.apiKeyMasked = maskApiKey(apiKey);
    }
    return next;
  }

  private async updateJobStatus(
    tx: Prisma.TransactionClient,
    jobId: string,
    fromStatus: CaredeskJobStatus,
    toStatus: CaredeskJobStatus,
    actorUserId: string,
    reason: string
  ) {
    await tx.caredeskJob.update({
      where: { id: jobId },
      data: { status: domainToPrismaStatus[toStatus], lastUpdate: reason }
    });
    await this.createTimeline(tx, jobId, "status", `${fromStatus} -> ${toStatus}`, reason, actorUserId);
  }

  private async createTimeline(
    tx: Prisma.TransactionClient,
    jobId: string,
    type: CaredeskTimelineEvent["type"],
    title: string,
    detail: string,
    actorUserId: string
  ) {
    return tx.caredeskTimelineEvent.create({ data: { jobId, type, title, detail, actorUserId } });
  }

  private async createAuditLog(actorId: string, action: string, detail: string) {
    return this.prisma.caredeskAuditLog.create({ data: { actorId, action, detail } });
  }

  private defaultChecklistReportData(jobId: string, jobIdDisplay: string, device: CaredeskDevice, technicianId?: string) {
    void jobIdDisplay;
    return {
      jobId,
      technicianId,
      deviceInfo: json({ type: device.type, brand: device.brand, model: device.model, serialNumber: device.serialNumber }),
      initialCheck: json({}),
      drive: json({}),
      battery: json(device.type.toLowerCase().includes("desktop") ? { applicable: false, status: "N/A" } : { applicable: true }),
      ram: json({}),
      diagnosisSummary: ""
    };
  }

  private pickupNotificationData(job: CaredeskJob, customer: CaredeskCustomer, stageDay: PickupStageDay) {
    return {
      jobId: job.id,
      technicianId: job.assignedTechnicianId,
      stageDay,
      channel: "WhatsApp",
      status: "Pending",
      messagePreview: `Hi ${customer.name}, ${job.jobIdDisplay} sudah siap untuk pickup di Fadhil CareDesk. Reminder Day ${stageDay}.`
    };
  }

  private async findChecklistReportId(tx: Prisma.TransactionClient, jobId: string): Promise<string> {
    const report = await tx.caredeskChecklistReport.findUnique({ where: { jobId }, select: { id: true } });
    if (!report) {
      throw new NotFoundException("Checklist report not found");
    }
    return report.id;
  }
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function defaultStoredScannerSettings(): StoredScannerSettings {
  return {
    provider: "openai",
    enabled: false,
    model: "gpt-5.4-mini",
    maxUploadBytes: 10 * 1024 * 1024
  };
}

function storedScannerSettings(value: unknown): StoredScannerSettings {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    provider: "openai",
    enabled: record.enabled === true,
    model: normalizeScannerModel(typeof record.model === "string" ? record.model : "gpt-5.4-mini"),
    encryptedApiKey: typeof record.encryptedApiKey === "string" ? record.encryptedApiKey : undefined,
    apiKeyMasked: typeof record.apiKeyMasked === "string" ? record.apiKeyMasked : undefined,
    maxUploadBytes: normalizeMaxUploadBytes(typeof record.maxUploadBytes === "number" ? record.maxUploadBytes : 10 * 1024 * 1024)
  };
}

function normalizeScannerModel(model: string): string {
  const trimmed = model.trim();
  return trimmed || "gpt-5.4-mini";
}

function normalizeMaxUploadBytes(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 10 * 1024 * 1024;
  }
  return Math.min(Math.max(Math.round(value), 256 * 1024), 50 * 1024 * 1024);
}

function encryptionKey(): Buffer {
  const secret = process.env.CAREDESK_SETTINGS_ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new BadRequestException("CAREDESK_SETTINGS_ENCRYPTION_KEY is required before saving scanner API keys");
  }
  return createHash("sha256").update(secret).digest();
}

function encryptSettingSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptSettingSecret(value: string): string {
  const [version, ivBase64, tagBase64, encryptedBase64] = value.split(":");
  if (version !== "v1" || !ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new BadRequestException("Stored scanner API key cannot be decrypted");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedBase64, "base64")), decipher.final()]).toString("utf8");
}

function maskApiKey(apiKey: string): string {
  return `${apiKey.slice(0, 3)}...${apiKey.slice(-4)}`;
}
