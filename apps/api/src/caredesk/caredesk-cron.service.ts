import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../database/prisma.service";
import { CaredeskDisplayEventsService } from "./caredesk-display-events.service";
import { CaredeskRepository } from "./caredesk.repository";
import { CaredeskService } from "./caredesk.service";

@Injectable()
export class CaredeskCronService {
  private readonly logger = new Logger(CaredeskCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: CaredeskRepository,
    private readonly caredeskService: CaredeskService,
    private readonly displayEvents: CaredeskDisplayEventsService
  ) {}

  @Cron("0 0 * * *")
  async handleDailyPickupReminders() {
    this.logger.log("Running daily pickup reminder cron");

    const settings = await this.prisma.caredeskSettings.findUnique({ where: { id: "default" } });
    const flowRules = (settings?.flowRules as { reminderDays?: number[]; unclaimedDay?: number } | null) ?? { reminderDays: [0, 7, 14, 30, 60], unclaimedDay: 90 };
    const reminderDays = flowRules.reminderDays ?? [0, 7, 14, 30, 60];
    const unclaimedDay = flowRules.unclaimedDay ?? 90;
    const templates = (settings?.notificationTemplates as Array<{ stageDay: number; channel: string; messageTemplate: string; language: string }> | null) ?? [];

    const readyJobs = await this.prisma.caredeskJob.findMany({
      where: { status: "READY_PICKUP", readyPickupDate: { not: null } },
      include: { customer: true, device: true }
    });

    const now = new Date();

    for (const job of readyJobs) {
      const ready = new Date(job.readyPickupDate!).getTime();
      const ageDays = Math.max(0, Math.floor((now.getTime() - ready) / 86_400_000));

      if (ageDays >= unclaimedDay) {
        await this.prisma.$transaction(async (tx) => {
          await tx.caredeskJob.update({
            where: { id: job.id },
            data: { status: "UNCLAIMED", lastUpdate: `Auto-transitioned to UNCLAIMED after ${ageDays} days` }
          });
          await tx.caredeskTimelineEvent.create({
            data: {
              jobId: job.id,
              type: "status",
              title: "READY PICKUP -> UNCLAIMED",
              detail: `Auto-transitioned after ${ageDays} days. Owner decide next action.`,
              actorUserId: "system"
            }
          });
          await tx.caredeskAuditLog.create({
            data: { actorId: "system", action: "Auto-unclaimed", detail: `Job ${job.jobIdDisplay} auto-transitioned after ${ageDays} days` }
          });
        });
        this.logger.log(`Job ${job.jobIdDisplay} auto-transitioned to UNCLAIMED (${ageDays} days)`);
        this.displayEvents.publishRefresh();
        continue;
      }

      if (!reminderDays.includes(ageDays)) continue;

      const existing = await this.prisma.caredeskNotification.findFirst({
        where: { jobId: job.id, stageDay: ageDays }
      });
      if (existing) continue;

      const templateEntry = templates.find((t) => t.stageDay === ageDays && t.language === "bm") ??
                            templates.find((t) => t.stageDay === ageDays);
      const messagePreview = templateEntry
        ? templateEntry.messageTemplate
            .replace(/\{\{customerName\}\}/g, job.customer.name)
            .replace(/\{\{jobIdDisplay\}\}/g, job.jobIdDisplay)
            .replace(/\{\{stageDay\}\}/g, String(ageDays))
        : `Hi ${job.customer.name}, ${job.jobIdDisplay} sudah siap untuk pickup di Fadhil CareDesk. Reminder Day ${ageDays}.`;

      await this.prisma.caredeskNotification.create({
        data: {
          jobId: job.id,
          technicianId: job.assignedTechnicianId,
          stageDay: ageDays,
          channel: templateEntry?.channel ?? "WhatsApp",
          status: "Pending",
          messagePreview
        }
      });
      this.logger.log(`Created reminder Day ${ageDays} for job ${job.jobIdDisplay}`);
    }

    this.logger.log("Daily pickup reminder cron complete");
  }

  @Cron("0 0 0 * * 0")
  async handleDataRetention() {
    this.logger.log("Running weekly data retention cron");

    const settings = await this.prisma.caredeskSettings.findUnique({ where: { id: "default" } });
    const flowRules = (settings?.flowRules as { retentionDays?: number } | null) ?? {};
    const retentionDays = flowRules.retentionDays ?? 365;

    if (retentionDays <= 0) {
      this.logger.log("Data retention is disabled (retentionDays <= 0)");
      return;
    }

    const cutoffDate = new Date(Date.now() - retentionDays * 86_400_000);

    const jobsToDelete = await this.prisma.caredeskJob.findMany({
      where: {
        status: { in: ["COMPLETE", "NOT_PROCEED"] },
        updatedAt: { lt: cutoffDate }
      },
      include: {
        evidence: { select: { storagePath: true } },
        checklistReport: { include: { images: { select: { storagePath: true } } } },
        customer: { select: { name: true } },
        device: { select: { brand: true, model: true } }
      }
    });

    if (jobsToDelete.length === 0) {
      this.logger.log("No jobs exceeded retention period");
      return;
    }

    for (const job of jobsToDelete) {
      const evidencePaths = [
        ...job.evidence.map((e) => e.storagePath),
        ...(job.checklistReport?.images ?? []).map((i) => i.storagePath)
      ];

      await this.prisma.$transaction(async (tx) => {
        // Delete child records first
        await tx.caredeskChecklistImage.deleteMany({
          where: { reportId: { in: job.checklistReport ? [job.checklistReport.id] : [] } }
        });
        await tx.caredeskChecklistReport.deleteMany({ where: { jobId: job.id } });
        await tx.caredeskTimelineEvent.deleteMany({ where: { jobId: job.id } });
        await tx.caredeskNotification.deleteMany({ where: { jobId: job.id } });
        await tx.caredeskEvidenceFile.deleteMany({ where: { jobId: job.id } });
        await tx.caredeskJobAssignment.deleteMany({ where: { jobId: job.id } });
        await tx.caredeskPayment.deleteMany({ where: { jobId: job.id } });
        await tx.caredeskJob.delete({ where: { id: job.id } });

        // Archive audit log
        await tx.caredeskAuditLog.create({
          data: {
            actorId: "system",
            action: "Data retention purge",
            detail: `Job ${job.jobIdDisplay} (${job.customer.name} - ${job.device.brand} ${job.device.model ?? ""}) deleted after ${retentionDays} days retention.`,
            metadata: {
              jobId: job.id,
              jobIdDisplay: job.jobIdDisplay,
              status: job.status,
              updatedAt: job.updatedAt.toISOString(),
              evidenceCount: evidencePaths.length,
              retentionDays
            }
          }
        });
      });

      this.logger.log(`Purged job ${job.jobIdDisplay} (${evidencePaths.length} evidence files)`);
    }

    this.logger.log(`Data retention complete. Purged ${jobsToDelete.length} jobs.`);
  }
}
