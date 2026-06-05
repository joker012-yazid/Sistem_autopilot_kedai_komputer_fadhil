import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.caredeskSettings.upsert({
    where: { id: "default" },
    create: {
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
    },
    update: {}
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
