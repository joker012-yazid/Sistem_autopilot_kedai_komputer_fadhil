import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ??= "postgresql://repair_ops:repair_ops@localhost:5432/repair_ops";

const prisma = new PrismaClient();

async function resetCaredeskTables() {
  await prisma.caredeskChecklistImage.deleteMany();
  await prisma.caredeskChecklistReport.deleteMany();
  await prisma.caredeskCustomerReport.deleteMany();
  await prisma.caredeskNotification.deleteMany();
  await prisma.caredeskEvidenceFile.deleteMany();
  await prisma.caredeskTimelineEvent.deleteMany();
  await prisma.caredeskJobAssignment.deleteMany();
  await prisma.caredeskJob.deleteMany();
  await prisma.caredeskDevice.deleteMany();
  await prisma.caredeskCustomer.deleteMany();
  await prisma.caredeskAuditLog.deleteMany();
  await prisma.caredeskSettings.deleteMany();
  await prisma.caredeskSession.deleteMany();
  await prisma.caredeskUser.deleteMany();
}

async function seedSettingsOnly() {
  await prisma.caredeskSettings.create({
    data: {
      id: "default",
      shopInfo: { name: "Fadhil CareDesk", subtitle: "Operasi Servis & Repair" },
      defaultLanguage: "bm",
      posReferenceLabel: "POS Reference",
      flowRules: {
        reminderDays: [0, 7, 14, 30, 60],
        unclaimedDay: 90,
        lockedRules: [
          "Technician tidak boleh repair sebelum IN PROGRESS.",
          "Owner review diperlukan sebelum customer decision.",
          "Role utama sistem hanya Owner dan Technician."
        ]
      }
    }
  });
}

try {
  await resetCaredeskTables();
  await seedSettingsOnly();
  console.log("CareDesk QA reset complete. No Owner/Technician users were seeded.");
} finally {
  await prisma.$disconnect();
}
