import { describe, expect, it } from "vitest";
import {
  addChecklistImage,
  applySettingsDraft,
  buildSettingsAuditEvent,
  buildChecklistCustomerSummary,
  buildChecklistReport,
  buildCustomerReport,
  buildPickupWhatsAppMessage,
  buildReportsDashboard,
  buildReportSummaryText,
  buildSettingsDraft,
  buildWhatsAppReportSummary,
  canAddChecklistImage,
  canEditChecklistReport,
  careDeskStatuses,
  canApplyJobAction,
  getChecklistReportsForRole,
  getCustomerContactHistory,
  getCustomerDetail,
  getCustomerDeviceHistory,
  getCustomerSummariesForRole,
  getNavigationForRole,
  getNextPickupReminder,
  getPickupQueueForRole,
  getPickupStage,
  getReportRangeLabel,
  normalizeReminderDays,
  parseReasonList,
  removeChecklistImage,
  recordNotificationResult,
  getText,
  seedPrototypeState,
  updateChecklistImageCaption,
  type CareDeskRole
} from "./domain";

describe("Fadhil CareDesk prototype domain", () => {
  it("exposes only Owner/Fadhil and Technician navigation", () => {
    const ownerNav = getNavigationForRole("owner").map((item) => item.href);
    const technicianNav = getNavigationForRole("technician").map((item) => item.href);

    expect(ownerNav).toEqual(["/dashboard", "/jobs", "/review", "/checklist-reports", "/pickup", "/notifications", "/customers", "/reports", "/settings"]);
    expect(technicianNav).toEqual(["/scan", "/jobs", "/my-jobs", "/checklist-reports", "/pickup", "/notifications"]);
    expect([...ownerNav, ...technicianNav].join(" ")).not.toMatch(/quotation|payment|approve/i);
  });

  it("locks the agreed repair statuses", () => {
    expect(careDeskStatuses).toEqual([
      "NEW JOB",
      "WAITING FADHIL REVIEW",
      "WAITING CUSTOMER CONFIRMATION",
      "IN PROGRESS",
      "NOT PROCEED",
      "READY PICKUP",
      "UNCLAIMED",
      "COMPLETE"
    ]);
  });

  it("blocks technician repair work until the job is in progress", () => {
    const state = seedPrototypeState();
    const waitingJob = state.jobs.find((job) => job.status === "WAITING CUSTOMER CONFIRMATION");
    const inProgressJob = state.jobs.find((job) => job.status === "IN PROGRESS");

    expect(waitingJob).toBeDefined();
    expect(inProgressJob).toBeDefined();
    expect(canApplyJobAction(waitingJob!, "technician", "update_repair")).toBe(false);
    expect(canApplyJobAction(inProgressJob!, "technician", "update_repair")).toBe(true);
  });

  it("supports BM and EN interface labels from the same keys", () => {
    expect(getText("bm", "appName")).toBe("Fadhil CareDesk");
    expect(getText("bm", "jobs")).toBe("Kerja");
    expect(getText("en", "jobs")).toBe("Jobs");
    expect(getText("bm", "scanJob")).toBe("Imbas Job");
    expect(getText("en", "scanJob")).toBe("Scan Job");
  });

  it("does not seed removed roles", () => {
    const roles = seedPrototypeState().users.map((user) => user.role);
    expect(new Set<CareDeskRole>(roles)).toEqual(new Set(["owner", "technician"]));
  });

  it("builds a customer report from technician diagnosis and evidence", () => {
    const state = seedPrototypeState();
    const job = state.jobs.find((item) => item.id === "job_0009");

    expect(job).toBeDefined();
    const report = buildCustomerReport(state, job!);
    const reportText = [
      report.jobIdDisplay,
      report.customerName,
      report.deviceLabel,
      report.reportedIssue,
      report.diagnosisSummary,
      report.ownerRecommendation,
      report.posReference,
      ...report.evidence.flatMap((item) => [item.label, item.caption, item.testResult])
    ].join(" ");

    expect(report.jobIdDisplay).toBe("NO.0009");
    expect(report.customerName).toBe("Lim Wei");
    expect(report.deviceLabel).toContain("HP ProDesk");
    expect(report.diagnosisSummary).toMatch(/PSU/i);
    expect(report.ownerRecommendation).toMatch(/PSU|POS reference/i);
    expect(report.evidence.map((item) => item.label)).toEqual(
      expect.arrayContaining(["PSU load test photo", "Power supply voltage unstable", "Storage SMART check screenshot"])
    );
    expect(reportText).not.toMatch(/quotation|payment|invoice/i);
  });

  it("builds a WhatsApp report summary without commercial document wording", () => {
    const state = seedPrototypeState();
    const job = state.jobs.find((item) => item.id === "job_0009");

    expect(job).toBeDefined();
    const summary = buildWhatsAppReportSummary(buildCustomerReport(state, job!));

    expect(summary).toContain("NO.0009");
    expect(summary).toContain("Lim Wei");
    expect(summary).toMatch(/PSU/i);
    expect(summary).not.toMatch(/quotation|payment|invoice/i);
  });

  it("builds a checklist report from job, customer, device, and technician data", () => {
    const state = seedPrototypeState();
    const job = state.jobs.find((item) => item.id === "job_0009");

    expect(job).toBeDefined();
    const report = buildChecklistReport(state, job!);

    expect(report.jobIdDisplay).toBe("NO.0009");
    expect(report.customerName).toBe("Lim Wei");
    expect(report.deviceModel).toContain("HP ProDesk");
    expect(report.checkedBy).toBe("Hafiz");
    expect(report.battery.applicable).toBe(false);
    expect(report.battery.status).toBe("N/A");
    expect(buildChecklistCustomerSummary(report)).toMatch(/NO.0009|HP ProDesk|PSU/i);
  });

  it("filters checklist report queues by role and assignment", () => {
    const state = seedPrototypeState();
    const ownerReports = getChecklistReportsForRole(state, "owner", "user_owner");
    const technicianReports = getChecklistReportsForRole(state, "technician", "user_technician");

    expect(ownerReports.length).toBe(state.jobs.length);
    expect(technicianReports.every((report) => report.technicianId === "user_technician")).toBe(true);
    expect(technicianReports.map((report) => report.jobId)).toContain("job_0009");
  });

  it("keeps checklist editing technician-only", () => {
    const state = seedPrototypeState();
    const report = buildChecklistReport(state, state.jobs.find((item) => item.id === "job_0009")!);

    expect(canEditChecklistReport(report, "technician", "user_technician")).toBe(true);
    expect(canEditChecklistReport({ ...report, status: "submitted" }, "technician", "user_technician")).toBe(true);
    expect(canEditChecklistReport(report, "owner", "user_owner")).toBe(false);
    expect(canEditChecklistReport(report, "technician", "user_technician_2")).toBe(false);
  });

  it("supports checklist images per section with optional captions", () => {
    const state = seedPrototypeState();
    const report = buildChecklistReport(state, state.jobs.find((item) => item.id === "job_0009")!);

    expect(report.initialCheck.images).toEqual([]);
    expect(report.drive.images).toEqual(expect.arrayContaining([expect.objectContaining({ section: "drive" })]));
    expect(report.ram.images).toEqual(expect.arrayContaining([expect.objectContaining({ section: "ram" })]));

    const withImage = addChecklistImage(report, "drive", {
      fileName: "smart-test.png",
      dataUrl: "data:image/png;base64,abc123"
    });
    const uploaded = withImage.drive.images.find((image) => image.fileName === "smart-test.png");

    expect(uploaded).toMatchObject({ section: "drive", caption: "" });
    expect(withImage.drive.images.length).toBe(report.drive.images.length + 1);
  });

  it("updates and removes checklist images without affecting other sections", () => {
    const state = seedPrototypeState();
    const report = buildChecklistReport(state, state.jobs.find((item) => item.id === "job_0009")!);
    const withImage = addChecklistImage(report, "ram", {
      fileName: "ram-slot.jpg",
      dataUrl: "data:image/jpeg;base64,ram123",
      caption: "Slot RAM test"
    });
    const imageId = withImage.ram.images.find((image) => image.fileName === "ram-slot.jpg")!.id;
    const withCaption = updateChecklistImageCaption(withImage, "ram", imageId, "RAM slot 1 dan 2 OK");
    const removed = removeChecklistImage(withCaption, "ram", imageId);

    expect(withCaption.ram.images.find((image) => image.id === imageId)?.caption).toBe("RAM slot 1 dan 2 OK");
    expect(removed.ram.images.some((image) => image.id === imageId)).toBe(false);
    expect(removed.drive.images.length).toBe(report.drive.images.length);
  });

  it("blocks checklist image upload for owner and non-applicable battery sections", () => {
    const state = seedPrototypeState();
    const desktopReport = buildChecklistReport(state, state.jobs.find((item) => item.id === "job_0009")!);
    const laptopReport = buildChecklistReport(state, state.jobs.find((item) => item.id === "job_0011")!);

    expect(canAddChecklistImage(desktopReport, "battery", "technician", "user_technician")).toBe(false);
    expect(canAddChecklistImage(laptopReport, "battery", "technician", "user_technician")).toBe(true);
    expect(canAddChecklistImage(laptopReport, "drive", "owner", "user_owner")).toBe(false);
    expect(canAddChecklistImage(laptopReport, "drive", "technician", "user_technician_2")).toBe(false);
  });

  it("calculates pickup reminder stages from ready pickup date", () => {
    const state = seedPrototypeState();
    const job = state.jobs.find((item) => item.id === "job_0011")!;

    expect(getPickupStage({ ...job, readyPickupDate: "2026-05-22" }, "2026-05-22T12:00:00.000Z")).toMatchObject({ stageDay: 0, ageDays: 0, unclaimedEligible: false });
    expect(getPickupStage({ ...job, readyPickupDate: "2026-05-15" }, "2026-05-22T12:00:00.000Z")).toMatchObject({ stageDay: 7, ageDays: 7 });
    expect(getPickupStage({ ...job, readyPickupDate: "2026-05-08" }, "2026-05-22T12:00:00.000Z")).toMatchObject({ stageDay: 14, ageDays: 14 });
    expect(getPickupStage({ ...job, readyPickupDate: "2026-04-22" }, "2026-05-22T12:00:00.000Z")).toMatchObject({ stageDay: 30, ageDays: 30 });
    expect(getPickupStage({ ...job, readyPickupDate: "2026-03-23" }, "2026-05-22T12:00:00.000Z")).toMatchObject({ stageDay: 60, ageDays: 60 });
    expect(getPickupStage({ ...job, readyPickupDate: "2026-02-21" }, "2026-05-22T12:00:00.000Z")).toMatchObject({ stageDay: 60, ageDays: 90, unclaimedEligible: true });
  });

  it("builds role-filtered pickup queues with next reminder details", () => {
    const state = seedPrototypeState();
    const now = "2026-05-22T12:00:00.000Z";
    const ownerQueue = getPickupQueueForRole(state, "owner", "user_owner", now);
    const technicianQueue = getPickupQueueForRole(state, "technician", "user_technician", now);

    expect(ownerQueue.map((item) => item.job.id)).toEqual(expect.arrayContaining(["job_0011", "job_0012"]));
    expect(technicianQueue.every((item) => item.job.assignedTechnicianId === "user_technician")).toBe(true);
    expect(ownerQueue.find((item) => item.job.id === "job_0011")).toMatchObject({ stage: { stageDay: 14 }, nextReminder: { stageDay: 14 } });
    expect(ownerQueue.find((item) => item.job.id === "job_0012")?.stage.unclaimedEligible).toBe(true);
  });

  it("updates notification result for contacted and no response outcomes", () => {
    const state = seedPrototypeState();
    const pending = state.notifications.find((item) => item.id === "noti_0011")!;
    const noResponseState = recordNotificationResult(state, pending.id, "no response", "2026-05-22T13:00:00.000Z");
    const contactedState = recordNotificationResult(state, pending.id, "sent successfully", "2026-05-22T14:00:00.000Z");

    expect(noResponseState.notifications.find((item) => item.id === pending.id)).toMatchObject({
      status: "Need follow-up",
      result: "no response",
      contactedAt: "2026-05-22T13:00:00.000Z"
    });
    expect(contactedState.notifications.find((item) => item.id === pending.id)).toMatchObject({
      status: "Sent",
      result: "sent successfully",
      contactedAt: "2026-05-22T14:00:00.000Z"
    });
  });

  it("builds pickup WhatsApp copy with shop, job, customer, and stage", () => {
    const state = seedPrototypeState();
    const job = state.jobs.find((item) => item.id === "job_0011")!;
    const reminder = getNextPickupReminder(job, state.notifications, "2026-05-22T12:00:00.000Z");
    const message = buildPickupWhatsAppMessage(state, job, reminder.stageDay);

    expect(message).toContain("Fadhil CareDesk");
    expect(message).toContain("NO.0011");
    expect(message).toContain("Faiz");
    expect(message).toContain("Day 14");
  });

  it("builds owner customer summaries for all customers with active count and last visit", () => {
    const state = seedPrototypeState();
    const summaries = getCustomerSummariesForRole(state, "owner", "user_owner");
    const aminah = summaries.find((item) => item.customer.id === "cus_aminah");

    expect(summaries.map((item) => item.customer.id)).toEqual(state.customers.map((customer) => customer.id));
    expect(aminah).toMatchObject({
      activeJobCount: 2,
      totalJobCount: 2,
      preferredChannel: "WhatsApp",
      lastJobIdDisplay: "NO.0012"
    });
  });

  it("limits technician customer summaries to assigned customers only", () => {
    const state = seedPrototypeState();
    const summaries = getCustomerSummariesForRole(state, "technician", "user_technician");
    const customerIds = summaries.map((item) => item.customer.id);

    expect(customerIds).toEqual(expect.arrayContaining(["cus_raj", "cus_lim", "cus_nora", "cus_faiz"]));
    expect(customerIds).not.toContain("cus_aminah");
    expect(summaries.every((summary) => summary.jobs.some((job) => job.assignedTechnicianId === "user_technician"))).toBe(true);
  });

  it("builds customer detail with active jobs, history, and POS reference", () => {
    const state = seedPrototypeState();
    const detail = getCustomerDetail(state, "cus_lim", "owner", "user_owner");

    expect(detail).toBeDefined();
    expect(detail?.customer.name).toBe("Lim Wei");
    expect(detail?.activeJobs.map((item) => item.job.id)).toContain("job_0009");
    expect(detail?.jobHistory.map((item) => item.job.id)).toEqual(expect.arrayContaining(["job_0009", "job_0014"]));
    expect(detail?.jobHistory.find((item) => item.job.id === "job_0009")?.posReference).toBe("Q-1044");
  });

  it("builds contact history from notifications and customer decisions", () => {
    const state = seedPrototypeState();
    const contactHistory = getCustomerContactHistory(state, "cus_lim");
    const text = contactHistory.map((item) => `${item.jobIdDisplay} ${item.type} ${item.channel} ${item.result} ${item.detail}`).join(" ");

    expect(text).toContain("NO.0009");
    expect(text).toMatch(/Customer confirmation|Customer decision/i);
    expect(text).toMatch(/WhatsApp|proceed|not proceed/i);
  });

  it("builds device history for devices owned by the customer only", () => {
    const state = seedPrototypeState();
    const limDevices = getCustomerDeviceHistory(state, "cus_lim");

    expect(limDevices).toHaveLength(1);
    expect(limDevices[0].device.id).toBe("dev_hp");
    expect(limDevices[0].issueHistory.map((item) => item.job.id)).toEqual(expect.arrayContaining(["job_0009", "job_0014"]));
    expect(limDevices[0].issueHistory.every((item) => item.device.id === "dev_hp")).toBe(true);
  });

  it("builds reports dashboard counts and status breakdown", () => {
    const state = seedPrototypeState();
    const report = buildReportsDashboard(state, "all", "2026-05-23T12:00:00.000Z");

    expect(getReportRangeLabel("7d")).toBe("7 Days");
    expect(report.counts).toMatchObject({
      totalJobs: 8,
      activeJobs: 6,
      completed: 1,
      notProceed: 1,
      readyPickup: 1,
      unclaimed: 1
    });
    expect(report.statusBreakdown.map((item) => item.status)).toEqual(careDeskStatuses);
    expect(report.statusBreakdown.find((item) => item.status === "WAITING CUSTOMER CONFIRMATION")?.count).toBe(1);
  });

  it("builds reports dashboard technician workload and pickup metrics", () => {
    const state = seedPrototypeState();
    const report = buildReportsDashboard(state, "all", "2026-05-23T12:00:00.000Z");
    const hafiz = report.technicianWorkload.find((item) => item.technicianId === "user_technician");

    expect(hafiz).toMatchObject({
      technicianName: "Hafiz",
      assignedJobs: 5,
      activeJobs: 4,
      completedJobs: 1
    });
    expect(report.pickup).toMatchObject({
      readyPickup: 1,
      remindersSent: 1,
      needFollowUp: 1,
      unclaimed: 1
    });
  });

  it("builds reports dashboard not proceed and completed history rows", () => {
    const state = seedPrototypeState();
    const report = buildReportsDashboard(state, "all", "2026-05-23T12:00:00.000Z");

    expect(report.notProceedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          jobIdDisplay: "NO.0013",
          customerName: "Raj Kumar",
          reason: "Harga mahal",
          method: "Phone Call"
        })
      ])
    );
    expect(report.completedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          jobIdDisplay: "NO.0014",
          customerName: "Lim Wei",
          deviceLabel: "HP ProDesk"
        })
      ])
    );
  });

  it("builds report summary copy without commercial wording", () => {
    const state = seedPrototypeState();
    const report = buildReportsDashboard(state, "all", "2026-05-23T12:00:00.000Z");
    const summary = buildReportSummaryText(report);

    expect(summary).toContain("Fadhil CareDesk Reports");
    expect(summary).toContain("Total jobs: 8");
    expect(summary).toContain("Unclaimed: 1");
    expect(summary).not.toMatch(/payment|quotation|invoice|sales total/i);
  });

  it("builds settings draft from prototype state", () => {
    const state = seedPrototypeState();
    const draft = buildSettingsDraft(state);

    expect(draft.shopInfo.name).toBe("Fadhil CareDesk");
    expect(draft.shopInfo.subtitle).toMatch(/Repair/i);
    expect(draft.defaultLanguage).toBe("bm");
    expect(draft.posReferenceLabel).toBe("POS Reference");
    expect(draft.notificationTemplates.length).toBeGreaterThanOrEqual(2);
    expect(draft.notificationTemplates[0].messageTemplate).toContain("{{jobIdDisplay}}");
    expect(draft.uploadRules.evidenceMaxImages).toBeGreaterThan(0);
    expect(draft.flowRules.reminderDays).toEqual([0, 7, 14, 30, 60]);
    expect(draft.flowRules.unclaimedDay).toBe(90);
  });

  it("normalizes reminder days and parses reason lists", () => {
    expect(normalizeReminderDays([14, 0, 7, 14, 60, -1, 30, 120])).toEqual([0, 7, 14, 30, 60]);
    expect(parseReasonList("Harga mahal\n\nCustomer nak fikir dulu\n  \nPart tiada")).toEqual(["Harga mahal", "Customer nak fikir dulu", "Part tiada"]);
  });

  it("applies settings draft and records audit without changing locked flow", () => {
    const state = seedPrototypeState();
    const draft = buildSettingsDraft(state);
    const next = applySettingsDraft(
      state,
      {
        ...draft,
        shopInfo: { ...draft.shopInfo, name: "Fadhil CareDesk Workshop" },
        defaultLanguage: "en",
        posReferenceLabel: "POS Ref",
        notificationTemplates: { ...draft.notificationTemplates, pickupReminderBm: "BM reminder {jobId}" },
        flowRules: {
          ...draft.flowRules,
          reminderDays: [0, 7, 7, 30],
          unclaimedDay: 88,
          notProceedReasons: ["Harga mahal", "Part tiada"],
          releaseReasons: ["Tidak sempat buat"]
        }
      },
      "Fadhil"
    );

    expect(next.shopInfo.name).toBe("Fadhil CareDesk Workshop");
    expect(next.defaultLanguage).toBe("en");
    expect(next.posReferenceLabel).toBe("POS Ref");
    expect(next.notificationTemplates.pickupReminderBm).toBe("BM reminder {jobId}");
    expect(next.flowRules.reminderDays).toEqual([0, 7, 30]);
    expect(next.flowRules.unclaimedDay).toBe(88);
    expect(next.flowRules.notProceedReasons).toEqual(["Harga mahal", "Part tiada"]);
    expect(next.flowRules.lockedRules).toEqual(state.flowRules.lockedRules);
    expect(next.auditLog[0]).toMatchObject({ type: "audit", actor: "Fadhil", title: "Settings updated" });
    expect(buildSettingsAuditEvent("Fadhil", "Flow Rules")).toMatchObject({ title: "Settings updated", detail: "Flow Rules updated." });
  });


  it("returns customer detail for a customer without any jobs", () => {
    const state = seedPrototypeState();
    const orphanCustomer = { id: "cus_orphan", name: "Orphan", phone: "017-000 0000", preferredChannel: "WhatsApp" as const };
    state.customers.push(orphanCustomer);
    const detail = getCustomerDetail(state, "cus_orphan", "owner", "user_owner");
    expect(detail).toBeDefined();
    expect(detail?.customer.name).toBe("Orphan");
    expect(detail?.summary.totalJobCount).toBe(0);
    expect(detail?.activeJobs.length).toBe(0);
    expect(detail?.jobHistory.length).toBe(0);
    expect(detail?.deviceHistory.length).toBe(0);
  });
});
