import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { createApiTestApp } from "@repair-ops/test-utils";
import { execSync } from "node:child_process";
import request from "supertest";
import { CaredeskCronService } from "../../apps/api/src/caredesk/caredesk-cron.service";
import { CaredeskDisplayEventsService } from "../../apps/api/src/caredesk/caredesk-display-events.service";
import { CaredeskRepository } from "../../apps/api/src/caredesk/caredesk.repository";
import { CaredeskService } from "../../apps/api/src/caredesk/caredesk.service";
import { PrismaService } from "../../apps/api/src/database/prisma.service";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

process.env.DATABASE_URL ??= "postgresql://repair_ops:repair_ops@localhost:5432/repair_ops";

const prisma = new PrismaClient();

const createPayload = {
  serviceReportNumber: "NO.0009",
  customer: { name: "Lim Wei", phone: "016-338 2200", preferredChannel: "WhatsApp" },
  device: { type: "Desktop", brand: "HP", model: "ProDesk", serialNumber: "HPD-1101" },
  reportedIssue: "Desktop restart sendiri selepas 10 minit."
};
const validPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);
const setupPayload = {
  setupToken: "test-setup-token",
  name: "Fadhil",
  email: "fadhil@example.com",
  password: "OwnerPass123!"
};

async function createCaredeskJob(app: INestApplication, technicianCookie: string) {
  const response = await request(app.getHttpServer()).post("/caredesk/jobs").set("Cookie", technicianCookie).send(createPayload).expect(201);
  return response.body;
}

async function createCaredeskJobWithPayload(app: INestApplication, technicianCookie: string, serviceReportNumber: string) {
  const response = await request(app.getHttpServer())
    .post("/caredesk/jobs")
    .set("Cookie", technicianCookie)
    .send({ ...createPayload, serviceReportNumber })
    .expect(201);
  return response.body;
}

async function moveToInProgress(app: INestApplication, ownerCookie: string, technicianCookie: string) {
  const job = await createCaredeskJob(app, technicianCookie);
  await request(app.getHttpServer()).post(`/caredesk/jobs/${job.id}/take`).set("Cookie", technicianCookie).expect(200);
  await request(app.getHttpServer())
    .post(`/caredesk/jobs/${job.id}/diagnosis`)
    .set("Cookie", technicianCookie)
    .send({ summary: "PSU voltage unstable under load", submitToOwner: true })
    .expect(201);
  await request(app.getHttpServer())
    .post(`/caredesk/jobs/${job.id}/owner-review`)
    .set("Cookie", ownerCookie)
    .send({ instruction: "Proceed only after customer confirms. POS ref Q-1044.", posReference: "Q-1044" })
    .expect(200);
  await request(app.getHttpServer())
    .post(`/caredesk/jobs/${job.id}/customer-decision`)
    .set("Cookie", ownerCookie)
    .send({ result: "proceed", method: "WhatsApp", note: "Customer agrees to proceed." })
    .expect(200);
  return job;
}

describe("caredesk v2 clean backend", () => {
  let app: INestApplication;
  let ownerCookie: string;
  let technicianCookie: string;
  let technicianUserId: string;
  const invalidCookie = "caredesk_session=invalid-session";

  beforeAll(async () => {
    ensureDockerPostgresReady();
    startPostgresContainer();
    await waitForDatabase();
    execSync("corepack pnpm --filter @repair-ops/database prisma db push --force-reset --skip-generate", {
      cwd: process.cwd(),
      stdio: "pipe"
    });
  });

  beforeEach(async () => {
    await resetCaredeskTables();
    process.env.CAREDESK_SETUP_TOKEN = "test-setup-token";
    process.env.CAREDESK_SETTINGS_ENCRYPTION_KEY = "test-settings-encryption-key-for-caredesk";
    ({ app } = await createApiTestApp());
    ownerCookie = await createOwnerSession(app);
    ({ cookie: technicianCookie, userId: technicianUserId } = await createTechnicianSession(app, ownerCookie));
  }, 20_000);

  afterEach(async () => {
    await app.close();
  }, 20_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("sets up first owner, blocks second setup, logs in with cookie session, and rejects invalid sessions", async () => {
    await resetCaredeskTables();

    await request(app.getHttpServer()).get("/caredesk/auth/setup-status").expect(200).expect(({ body }) => {
      expect(body).toEqual({ needsSetup: true });
    });
    await request(app.getHttpServer()).post("/caredesk/auth/setup").send({ ...setupPayload, setupToken: "wrong" }).expect(403);
    const setup = await request(app.getHttpServer()).post("/caredesk/auth/setup").send(setupPayload).expect(201);
    expect(setup.headers["set-cookie"]?.join(";")).toContain("caredesk_session=");
    await request(app.getHttpServer()).post("/caredesk/auth/setup").send(setupPayload).expect(409);
    await request(app.getHttpServer()).post("/caredesk/auth/login").send({ email: setupPayload.email, password: "wrong" }).expect(401);
    const login = await request(app.getHttpServer()).post("/caredesk/auth/login").send({ email: setupPayload.email, password: setupPayload.password }).expect(200);
    const cookie = extractSessionCookie(login);
    await request(app.getHttpServer()).get("/caredesk/auth/me").set("Cookie", cookie).expect(200).expect(({ body }) => {
      expect(body).toMatchObject({ email: setupPayload.email, role: "owner" });
    });
    await request(app.getHttpServer()).post("/caredesk/auth/logout").set("Cookie", cookie).expect(200);
    await request(app.getHttpServer()).get("/caredesk/auth/me").set("Cookie", cookie).expect(401);
    await request(app.getHttpServer()).get("/caredesk/jobs").set("Cookie", invalidCookie).expect(401);
  });

  it("hardens production auth password, origin, expired session, disabled user, and last Owner rules", async () => {
    await resetCaredeskTables();

    await request(app.getHttpServer()).post("/caredesk/auth/setup").send({ ...setupPayload, password: "password" }).expect(400);
    const setup = await request(app.getHttpServer()).post("/caredesk/auth/setup").send(setupPayload).expect(201);
    const freshOwnerCookie = extractSessionCookie(setup);

    await request(app.getHttpServer())
      .post("/caredesk/auth/login")
      .set("Origin", "https://evil.example")
      .send({ email: setupPayload.email, password: setupPayload.password })
      .expect(403);

    const weakTech = await request(app.getHttpServer())
      .post("/caredesk/users")
      .set("Cookie", freshOwnerCookie)
      .send({ name: "Weak Tech", email: "weak-tech@example.com", role: "technician", password: "password" })
      .expect(400);
    expect(weakTech.body.message).toMatch(/letter and number/i);

    const tech = await request(app.getHttpServer())
      .post("/caredesk/users")
      .set("Cookie", freshOwnerCookie)
      .send({ name: "Runtime Tech", email: "runtime-tech@example.com", role: "technician", password: "TechPass123!" })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/caredesk/users/${tech.body.id}/reset-password`)
      .set("Cookie", freshOwnerCookie)
      .send({ password: "short1" })
      .expect(400);

    const techLogin = await request(app.getHttpServer())
      .post("/caredesk/auth/login")
      .send({ email: "runtime-tech@example.com", password: "TechPass123!" })
      .expect(200);
    const freshTechCookie = extractSessionCookie(techLogin);
    await request(app.getHttpServer()).patch(`/caredesk/users/${tech.body.id}`).set("Cookie", freshOwnerCookie).send({ status: "disabled" }).expect(200);
    await request(app.getHttpServer()).get("/caredesk/auth/me").set("Cookie", freshTechCookie).expect(401);

    const expired = await prisma.caredeskSession.create({
      data: {
        id: "expired_session_for_cleanup",
        userId: setup.body.id,
        expiresAt: new Date(Date.now() - 60_000)
      }
    });
    await request(app.getHttpServer()).post("/caredesk/auth/login").send({ email: setupPayload.email, password: setupPayload.password }).expect(200);
    await expect(prisma.caredeskSession.findUnique({ where: { id: expired.id } })).resolves.toBeNull();

    await request(app.getHttpServer()).patch(`/caredesk/users/${setup.body.id}`).set("Cookie", freshOwnerCookie).send({ status: "disabled" }).expect(409);
    await request(app.getHttpServer()).patch(`/caredesk/users/${setup.body.id}`).set("Cookie", freshOwnerCookie).send({ role: "technician" }).expect(409);
  });

  it("supports technician job creation, take/release, diagnosis, owner review, and customer decision", async () => {
    const job = await createCaredeskJob(app, technicianCookie);

    expect(job).toMatchObject({
      jobIdDisplay: "NO.0009",
      rawReportNumber: "0009",
      status: "NEW JOB",
      customerName: "Lim Wei",
      deviceLabel: "HP ProDesk"
    });
    await request(app.getHttpServer()).post("/caredesk/jobs").set("Cookie", technicianCookie).send(createPayload).expect(409);

    const persistedJob = await prisma.caredeskJob.findUnique({
      where: { id: job.id },
      include: { customer: true, device: true, checklistReport: true, timeline: true }
    });
    expect(persistedJob).toMatchObject({
      jobIdDisplay: "NO.0009",
      rawReportNumber: "0009",
      status: "NEW_JOB",
      customer: { name: "Lim Wei", phone: "016-338 2200" },
      device: { brand: "HP", model: "ProDesk" }
    });
    expect(persistedJob?.checklistReport).toBeTruthy();
    expect(persistedJob?.timeline.length).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer()).post(`/caredesk/jobs/${job.id}/take`).set("Cookie", technicianCookie).expect(200);
    await request(app.getHttpServer()).post(`/caredesk/jobs/${job.id}/release`).set("Cookie", technicianCookie).expect(200);
    await request(app.getHttpServer()).post(`/caredesk/jobs/${job.id}/take`).set("Cookie", technicianCookie).expect(200);

    const diagnosis = await request(app.getHttpServer())
      .post(`/caredesk/jobs/${job.id}/diagnosis`)
      .set("Cookie", technicianCookie)
      .send({ summary: "PSU voltage unstable under load", submitToOwner: true })
      .expect(201);
    expect(diagnosis.body).toMatchObject({ jobId: job.id, technicianId: technicianUserId, summary: "PSU voltage unstable under load" });
    await expect(prisma.caredeskJobAssignment.count({ where: { jobId: job.id } })).resolves.toBe(3);

    const reviewed = await request(app.getHttpServer())
      .post(`/caredesk/jobs/${job.id}/owner-review`)
      .set("Cookie", ownerCookie)
      .send({ instruction: "Proceed only after customer confirms. POS ref Q-1044.", posReference: "Q-1044" })
      .expect(200);
    expect(reviewed.body).toMatchObject({ status: "WAITING CUSTOMER CONFIRMATION", posReference: "Q-1044" });

    const decided = await request(app.getHttpServer())
      .post(`/caredesk/jobs/${job.id}/customer-decision`)
      .set("Cookie", ownerCookie)
      .send({ result: "proceed", method: "WhatsApp", note: "Customer agrees to proceed." })
      .expect(200);
    expect(decided.body).toMatchObject({ status: "IN PROGRESS" });
    await expect(prisma.caredeskJob.findUnique({ where: { id: job.id } })).resolves.toMatchObject({
      status: "IN_PROGRESS",
      posReference: "Q-1044"
    });
  });

  it("enforces v2 RBAC and blocks repair before IN PROGRESS", async () => {
    const job = await createCaredeskJob(app, technicianCookie);

    await request(app.getHttpServer()).get("/caredesk/reports").set("Cookie", technicianCookie).expect(200);
    await request(app.getHttpServer()).get("/caredesk/settings").set("Cookie", technicianCookie).expect(403);
    await request(app.getHttpServer()).post("/caredesk/jobs").set("Cookie", invalidCookie).send(createPayload).expect(401);
    await request(app.getHttpServer()).get("/jobs").set("Cookie", ownerCookie).expect(404);
    await request(app.getHttpServer()).get("/quotations").set("Cookie", ownerCookie).expect(404);
    await request(app.getHttpServer()).get("/payments").set("Cookie", ownerCookie).expect(404);
    await request(app.getHttpServer()).get("/approval-links/demo").expect(404);
    await request(app.getHttpServer()).get("/technicians").set("Cookie", ownerCookie).expect(404);
    await request(app.getHttpServer()).get(`/caredesk/jobs/${job.id}/customer-report.pdf`).set("Cookie", invalidCookie).expect(401);
    await request(app.getHttpServer()).get(`/caredesk/checklist-reports/${job.id}.pdf`).set("Cookie", invalidCookie).expect(401);
    await request(app.getHttpServer())
      .post(`/caredesk/jobs/${job.id}/repair-progress`)
      .set("Cookie", technicianCookie)
      .send({ note: "Trying to repair early" })
      .expect(409);
  });

  it("serves a sanitized Action-First display snapshot and blocks non-LAN requests", async () => {
    await moveToInProgress(app, ownerCookie, technicianCookie);
    const readyJob = await createCaredeskJobWithPayload(app, technicianCookie, "NO.0010");
    await request(app.getHttpServer()).post(`/caredesk/jobs/${readyJob.id}/take`).set("Cookie", technicianCookie).expect(200);
    await request(app.getHttpServer())
      .post(`/caredesk/jobs/${readyJob.id}/diagnosis`)
      .set("Cookie", technicianCookie)
      .send({ summary: "Ready-pickup smoke flow", submitToOwner: true })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/caredesk/jobs/${readyJob.id}/owner-review`)
      .set("Cookie", ownerCookie)
      .send({ instruction: "Proceed ready-pickup path", posReference: "Q-1050" })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/caredesk/jobs/${readyJob.id}/customer-decision`)
      .set("Cookie", ownerCookie)
      .send({ result: "proceed", method: "WhatsApp", note: "Customer approves second job." })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/caredesk/jobs/${readyJob.id}/ready-pickup`)
      .set("Cookie", technicianCookie)
      .send({ readyPickupDate: "2026-06-04" })
      .expect(200);

    const snapshot = await request(app.getHttpServer()).get("/caredesk/display/snapshot").expect(200);
    expect(snapshot.body).toMatchObject({
      revision: expect.any(Number),
      generatedAt: expect.any(String),
      lanes: [
        { key: "action_required", label: "Perlu Buat Dulu" },
        { key: "in_flight", label: "Sedang Jalan" },
        { key: "ready_backlog", label: "Siap / Tertunggak" }
      ]
    });
    expect(snapshot.body.counts["IN PROGRESS"]).toBeGreaterThanOrEqual(1);
    expect(snapshot.body.counts["READY PICKUP"]).toBe(1);
    const readyPickupCard = snapshot.body.lanes[2].sections[0].items[0];
    expect(readyPickupCard).toEqual({
      jobIdDisplay: readyJob.jobIdDisplay,
      status: "READY PICKUP",
      updatedAt: expect.any(String),
      readyPickupDate: "2026-06-04"
    });
    expect(JSON.stringify(snapshot.body)).not.toContain("Lim Wei");
    expect(JSON.stringify(snapshot.body)).not.toContain("016-338 2200");
    expect(JSON.stringify(snapshot.body)).not.toContain("PSU voltage unstable");

    await request(app.getHttpServer())
      .get("/caredesk/display/snapshot")
      .set("x-forwarded-for", "8.8.8.8")
      .expect(403);
  });

  it("pushes a new display snapshot over SSE when a job status changes", async () => {
    const job = await moveToInProgress(app, ownerCookie, technicianCookie);
    const server = app.getHttpServer();
    if (!server.listening) {
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    }
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected HTTP server to listen on an ephemeral port");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/caredesk/display/stream`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Expected readable SSE body");
    }

    let text = "";
    let triggered = false;
    let snapshotCount = 0;
    let finalRevision = 0;
    const timeoutAt = Date.now() + 5_000;

    while (Date.now() < timeoutAt) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      text += Buffer.from(value).toString("utf8");
      snapshotCount = (text.match(/event: snapshot/g) ?? []).length;
      const revisions = [...text.matchAll(/"revision":(\d+)/g)].map((match) => Number(match[1]));
      finalRevision = revisions.at(-1) ?? finalRevision;

      if (snapshotCount >= 1 && !triggered) {
        triggered = true;
        await request(app.getHttpServer())
          .post(`/caredesk/jobs/${job.id}/ready-pickup`)
          .set("Cookie", technicianCookie)
          .send({ readyPickupDate: "2026-06-05" })
          .expect(200);
      }

      if (snapshotCount >= 2 && text.includes(`"jobIdDisplay":"${job.jobIdDisplay}"`) && text.includes(`"status":"READY PICKUP"`)) {
        break;
      }
    }

    await reader.cancel();
    expect(snapshotCount).toBeGreaterThanOrEqual(2);
    expect(finalRevision).toBeGreaterThanOrEqual(1);
    expect(text).toContain(`"jobIdDisplay":"${job.jobIdDisplay}"`);
    expect(text).toContain(`"status":"READY PICKUP"`);
  }, 20_000);

  it("allows owner to export CSV and PDF reports, blocks technician", async () => {
    await createCaredeskJob(app, technicianCookie);

    const csvRes = await request(app.getHttpServer())
      .post("/caredesk/reports/export-csv")
      .set("Cookie", ownerCookie)
      .send({ range: "all" })
      .expect(200);
    expect(csvRes.headers["content-type"]).toContain("text/csv");
    expect(csvRes.headers["content-disposition"]).toContain("caredesk-report-all-");

    const pdfRes = await request(app.getHttpServer())
      .post("/caredesk/reports/export-pdf")
      .set("Cookie", ownerCookie)
      .send({ range: "all" })
      .expect(200);
    expect(pdfRes.headers["content-type"]).toContain("application/pdf");
    expect(pdfRes.headers["content-disposition"]).toContain("caredesk-report-all-");

    await request(app.getHttpServer())
      .post("/caredesk/reports/export-csv")
      .set("Cookie", technicianCookie)
      .send({ range: "all" })
      .expect(403);

    await request(app.getHttpServer())
      .post("/caredesk/reports/export-pdf")
      .set("Cookie", technicianCookie)
      .send({ range: "all" })
      .expect(403);
  });

  it("enforces locked rules cannot be modified by owner", async () => {
    const current = await request(app.getHttpServer()).get("/caredesk/settings").set("Cookie", ownerCookie).expect(200);
    const lockedRules = current.body.flowRules.lockedRules;
    expect(lockedRules.length).toBeGreaterThan(0);

    // Try to remove a locked rule
    await request(app.getHttpServer())
      .put("/caredesk/settings")
      .set("Cookie", ownerCookie)
      .send({
        flowRules: {
          ...current.body.flowRules,
          lockedRules: lockedRules.slice(1)
        }
      })
      .expect(403);

    // Try to change reminderDays to invalid values
    await request(app.getHttpServer())
      .put("/caredesk/settings")
      .set("Cookie", ownerCookie)
      .send({
        flowRules: {
          ...current.body.flowRules,
          reminderDays: [0, 7, 99]
        }
      })
      .expect(403);

    // Valid update should succeed
    await request(app.getHttpServer())
      .put("/caredesk/settings")
      .set("Cookie", ownerCookie)
      .send({
        flowRules: {
          ...current.body.flowRules,
          stuckThresholds: { "NEW JOB": "12 jam", "WAITING FADHIL REVIEW": "2 jam", "WAITING CUSTOMER CONFIRMATION": "12 jam", "IN PROGRESS": "24 jam" }
        }
      })
      .expect(200);
  });

  it("lets Owner configure scanner AI without exposing the raw API key and blocks scan before configuration", async () => {
    await request(app.getHttpServer())
      .post("/caredesk/service-notes/scan")
      .set("Cookie", technicianCookie)
      .attach("file", validPng, { filename: "service-note.png", contentType: "image/png" })
      .expect(409)
      .expect(({ body }) => {
        expect(body.message).toMatch(/Scanner AI belum dikonfigurasi/i);
      });

    const current = await request(app.getHttpServer()).get("/caredesk/settings").set("Cookie", ownerCookie).expect(200);
    expect(current.body.scannerSettings).toMatchObject({
      provider: "openai",
      enabled: false,
      model: "gpt-5.4-mini",
      apiKeyConfigured: false
    });

    await request(app.getHttpServer())
      .put("/caredesk/settings")
      .set("Cookie", technicianCookie)
      .send({ scannerSettings: { enabled: true, model: "gpt-5.1", apiKey: "sk-technician-should-not-save" } })
      .expect(403);

    const saved = await request(app.getHttpServer())
      .put("/caredesk/settings")
      .set("Cookie", ownerCookie)
      .send({ scannerSettings: { enabled: true, model: "gpt-5.1", apiKey: "sk-owner-secret-1234567890" } })
      .expect(200);

    expect(saved.body.scannerSettings).toMatchObject({
      provider: "openai",
      enabled: true,
      model: "gpt-5.1",
      apiKeyConfigured: true
    });
    expect(saved.body.scannerSettings.apiKey).toBeUndefined();
    expect(saved.body.scannerSettings.apiKeyMasked).toMatch(/^sk-\.\.\./);

    const persisted = await prisma.caredeskSettings.findUniqueOrThrow({ where: { id: "default" } });
    expect(JSON.stringify(persisted.scannerSettings)).not.toContain("sk-owner-secret-1234567890");

    const reloaded = await request(app.getHttpServer()).get("/caredesk/settings").set("Cookie", ownerCookie).expect(200);
    expect(reloaded.body.scannerSettings).toMatchObject({
      enabled: true,
      model: "gpt-5.1",
      apiKeyConfigured: true
    });
    expect(reloaded.body.scannerSettings.apiKey).toBeUndefined();
  });

  it("handles pickup reminder stages, notifications, and unclaimed action", async () => {
    const job = await moveToInProgress(app, ownerCookie, technicianCookie);
    await request(app.getHttpServer())
      .post(`/caredesk/jobs/${job.id}/ready-pickup`)
      .set("Cookie", technicianCookie)
      .send({ readyPickupDate: "2026-05-24" })
      .expect(200);

    const pickup = await request(app.getHttpServer()).get("/caredesk/pickup?now=2026-08-22T12:00:00.000Z").set("Cookie", ownerCookie).expect(200);
    expect(pickup.body[0]).toMatchObject({ jobId: job.id, stageDay: 60, unclaimedEligible: true });

    const notifications = await request(app.getHttpServer()).get("/caredesk/notifications").set("Cookie", ownerCookie).expect(200);
    expect(notifications.body[0]).toMatchObject({ jobId: job.id, stageDay: 0, status: "Pending" });

    await request(app.getHttpServer())
      .post(`/caredesk/notifications/${notifications.body[0].id}/result`)
      .set("Cookie", technicianCookie)
      .send({ result: "no response" })
      .expect(200);
    await expect(prisma.caredeskNotification.findUnique({ where: { id: notifications.body[0].id } })).resolves.toMatchObject({
      status: "Need follow-up",
      result: "no response"
    });

    const unclaimed = await request(app.getHttpServer()).post(`/caredesk/jobs/${job.id}/mark-unclaimed`).set("Cookie", ownerCookie).expect(200);
    expect(unclaimed.body).toMatchObject({ status: "UNCLAIMED" });
  });

  it("auto-transitions job to UNCLAIMED when cron runs on Day 91", async () => {
    const job = await moveToInProgress(app, ownerCookie, technicianCookie);
    await request(app.getHttpServer())
      .post(`/caredesk/jobs/${job.id}/ready-pickup`)
      .set("Cookie", technicianCookie)
      .send({ readyPickupDate: "2026-05-01" })
      .expect(200);

    // Move ready date to 91 days ago relative to today
    const daysAgo91 = new Date();
    daysAgo91.setDate(daysAgo91.getDate() - 91);
    await prisma.caredeskJob.update({ where: { id: job.id }, data: { readyPickupDate: daysAgo91 } });

    const prismaService = app.get(PrismaService);
    const repository = app.get(CaredeskRepository);
    const caredeskService = app.get(CaredeskService);
    const displayEvents = app.get(CaredeskDisplayEventsService);
    const cron = new CaredeskCronService(prismaService, repository, caredeskService, displayEvents);
    await cron.handleDailyPickupReminders();

    const updated = await prisma.caredeskJob.findUnique({ where: { id: job.id } });
    expect(updated?.status).toBe("UNCLAIMED");

    const timeline = await prisma.caredeskTimelineEvent.findFirst({ where: { jobId: job.id, type: "status", title: { contains: "UNCLAIMED" } } });
    expect(timeline?.title).toContain("UNCLAIMED");

    const audit = await prisma.caredeskAuditLog.findFirst({ where: { action: "Auto-unclaimed", detail: { contains: job.jobIdDisplay } } });
    expect(audit?.action).toBe("Auto-unclaimed");
  }, 20_000);

  it("creates a Day 7 reminder notification when cron runs", async () => {
    const job = await moveToInProgress(app, ownerCookie, technicianCookie);
    await request(app.getHttpServer())
      .post(`/caredesk/jobs/${job.id}/ready-pickup`)
      .set("Cookie", technicianCookie)
      .send({ readyPickupDate: "2026-05-01" })
      .expect(200);

    const daysAgo7 = new Date();
    daysAgo7.setDate(daysAgo7.getDate() - 7);
    await prisma.caredeskJob.update({ where: { id: job.id }, data: { readyPickupDate: daysAgo7 } });

    const prismaService = app.get(PrismaService);
    const repository = app.get(CaredeskRepository);
    const caredeskService = app.get(CaredeskService);
    const displayEvents = app.get(CaredeskDisplayEventsService);
    const cron = new CaredeskCronService(prismaService, repository, caredeskService, displayEvents);
    await cron.handleDailyPickupReminders();

    const notification = await prisma.caredeskNotification.findFirst({ where: { jobId: job.id, stageDay: 7 } });
    expect(notification).toMatchObject({ stageDay: 7, status: "Pending", channel: "WhatsApp" });
    expect(notification?.messagePreview).toContain("Reminder Day 7");
  }, 20_000);

  it("does not create duplicate notifications on repeated cron runs", async () => {
    const job = await moveToInProgress(app, ownerCookie, technicianCookie);
    await request(app.getHttpServer())
      .post(`/caredesk/jobs/${job.id}/ready-pickup`)
      .set("Cookie", technicianCookie)
      .send({ readyPickupDate: "2026-05-01" })
      .expect(200);

    const daysAgo7 = new Date();
    daysAgo7.setDate(daysAgo7.getDate() - 7);
    await prisma.caredeskJob.update({ where: { id: job.id }, data: { readyPickupDate: daysAgo7 } });

    const prismaService = app.get(PrismaService);
    const repository = app.get(CaredeskRepository);
    const caredeskService = app.get(CaredeskService);
    const displayEvents = app.get(CaredeskDisplayEventsService);
    const cron = new CaredeskCronService(prismaService, repository, caredeskService, displayEvents);
    await cron.handleDailyPickupReminders();
    await cron.handleDailyPickupReminders();

    const count = await prisma.caredeskNotification.count({ where: { jobId: job.id, stageDay: 7 } });
    expect(count).toBe(1);
  }, 20_000);

  it("saves checklist reports, uploads checklist images through storage adapter, and keeps owner read-only", async () => {
    const job = await moveToInProgress(app, ownerCookie, technicianCookie);

    const saved = await request(app.getHttpServer())
      .put(`/caredesk/checklist-reports/${job.id}`)
      .set("Cookie", technicianCookie)
      .send({ status: "submitted", drive: { note: "SMART pass" }, diagnosisSummary: "PSU issue suspected" })
      .expect(200);
    expect(saved.body).toMatchObject({ jobId: job.id, status: "submitted", diagnosisSummary: "PSU issue suspected" });

    const image = await request(app.getHttpServer())
      .post(`/caredesk/checklist-reports/${job.id}/images`)
      .set("Cookie", technicianCookie)
      .field("section", "drive")
      .field("caption", "SMART screenshot")
      .attach("file", validPng, { filename: "smart.png", contentType: "image/png" })
      .expect(201);
    expect(image.body).toMatchObject({ jobId: job.id, section: "drive", caption: "SMART screenshot" });
    expect(image.body.storagePath).toContain("/caredesk/NO.0009/checklist/drive/");
    await expect(prisma.caredeskChecklistImage.count({ where: { jobId: job.id, section: "drive" } })).resolves.toBe(1);
    await expect(prisma.caredeskEvidenceFile.count({ where: { jobId: job.id, category: "checklist", section: "drive" } })).resolves.toBe(1);

    const updatedImage = await request(app.getHttpServer())
      .patch(`/caredesk/checklist-reports/${job.id}/images/${image.body.id}`)
      .set("Cookie", technicianCookie)
      .send({ caption: "SMART screenshot updated for customer" })
      .expect(200);
    expect(updatedImage.body).toMatchObject({ id: image.body.id, caption: "SMART screenshot updated for customer" });
    await expect(prisma.caredeskChecklistImage.findUnique({ where: { id: image.body.id } })).resolves.toMatchObject({
      caption: "SMART screenshot updated for customer"
    });
    await expect(
      prisma.caredeskEvidenceFile.findFirst({ where: { jobId: job.id, category: "checklist", section: "drive", storagePath: image.body.storagePath } })
    ).resolves.toMatchObject({ caption: "SMART screenshot updated for customer" });

    const reportAfterCaption = await request(app.getHttpServer()).get(`/caredesk/checklist-reports/${job.id}`).set("Cookie", ownerCookie).expect(200);
    expect(reportAfterCaption.body.images[0]).toMatchObject({ id: image.body.id, caption: "SMART screenshot updated for customer" });

    const checklistPdf = await request(app.getHttpServer())
      .get(`/caredesk/checklist-reports/${job.id}.pdf`)
      .set("Cookie", ownerCookie)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);
    expect(checklistPdf.headers["content-type"]).toMatch(/application\/pdf/);
    expect(checklistPdf.headers["content-disposition"]).toContain("NO.0009-checklist-report.pdf");
    expect(Buffer.from(checklistPdf.body).subarray(0, 4).toString()).toBe("%PDF");

    await request(app.getHttpServer())
      .patch(`/caredesk/checklist-reports/${job.id}/images/${image.body.id}`)
      .set("Cookie", ownerCookie)
      .send({ caption: "Owner should not update" })
      .expect(403);

    await request(app.getHttpServer()).delete(`/caredesk/checklist-reports/${job.id}/images/${image.body.id}`).set("Cookie", ownerCookie).expect(403);

    await prisma.caredeskUser.create({ data: { id: "user_other_technician", name: "Other Technician", email: "other-tech@example.com", role: "technician" } });
    await prisma.caredeskJob.update({ where: { id: job.id }, data: { assignedTechnicianId: "user_other_technician" } });
    await request(app.getHttpServer())
      .patch(`/caredesk/checklist-reports/${job.id}/images/${image.body.id}`)
      .set("Cookie", technicianCookie)
      .send({ caption: "Unassigned technician should not update" })
      .expect(403);
    await request(app.getHttpServer()).delete(`/caredesk/checklist-reports/${job.id}/images/${image.body.id}`).set("Cookie", technicianCookie).expect(403);
    await prisma.caredeskJob.update({ where: { id: job.id }, data: { assignedTechnicianId: technicianUserId } });

    await request(app.getHttpServer()).delete(`/caredesk/checklist-reports/${job.id}/images/${image.body.id}`).set("Cookie", technicianCookie).expect(200);
    await expect(prisma.caredeskChecklistImage.count({ where: { id: image.body.id } })).resolves.toBe(0);
    await expect(prisma.caredeskEvidenceFile.count({ where: { jobId: job.id, category: "checklist", section: "drive", storagePath: image.body.storagePath } })).resolves.toBe(0);

    const checklistPdfAfterDelete = await request(app.getHttpServer())
      .get(`/caredesk/checklist-reports/${job.id}.pdf`)
      .set("Cookie", ownerCookie)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);
    expect(Buffer.from(checklistPdfAfterDelete.body).subarray(0, 4).toString()).toBe("%PDF");

    await request(app.getHttpServer())
      .put(`/caredesk/checklist-reports/${job.id}`)
      .set("Cookie", ownerCookie)
      .send({ diagnosisSummary: "Owner should not edit" })
      .expect(403);
  }, 20_000);

  it("lists customers and returns customer detail with devices, jobs, and contact history", async () => {
    await moveToInProgress(app, ownerCookie, technicianCookie);

    const customers = await request(app.getHttpServer()).get("/caredesk/customers").set("Cookie", ownerCookie).expect(200);
    expect(customers.body.length).toBeGreaterThanOrEqual(1);
    expect(customers.body[0]).toMatchObject({ name: expect.any(String), phone: expect.any(String) });

    const customerId = customers.body[0].id;
    const detail = await request(app.getHttpServer()).get(`/caredesk/customers/${customerId}`).set("Cookie", ownerCookie).expect(200);
    expect(detail.body).toMatchObject({
      name: expect.any(String),
      phone: expect.any(String),
      activeJobs: expect.any(Array),
      jobHistory: expect.any(Array),
      devices: expect.any(Array),
      contactHistory: expect.any(Array)
    });

    await request(app.getHttpServer()).get("/caredesk/customers").set("Cookie", technicianCookie).expect(403);
    await request(app.getHttpServer()).get(`/caredesk/customers/${customerId}`).set("Cookie", technicianCookie).expect(403);
  }, 20_000);

  it("generates customer report PDFs for owner and assigned technician", async () => {
    const job = await moveToInProgress(app, ownerCookie, technicianCookie);

    const ownerPdf = await request(app.getHttpServer())
      .get(`/caredesk/jobs/${job.id}/customer-report.pdf`)
      .set("Cookie", ownerCookie)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);
    expect(ownerPdf.headers["content-type"]).toMatch(/application\/pdf/);
    expect(ownerPdf.headers["content-disposition"]).toContain("NO.0009-customer-report.pdf");
    expect(Buffer.from(ownerPdf.body).subarray(0, 4).toString()).toBe("%PDF");

    const technicianPdf = await request(app.getHttpServer())
      .get(`/caredesk/jobs/${job.id}/customer-report.pdf`)
      .set("Cookie", technicianCookie)
      .buffer(true)
      .parse(binaryParser)
      .expect(200);
    expect(Buffer.from(technicianPdf.body).subarray(0, 4).toString()).toBe("%PDF");
  }, 20_000);
  it("purges completed jobs older than retention days via cron", async () => {
    const job = await createCaredeskJob(app, technicianCookie);

    // Move job to COMPLETE
    await request(app.getHttpServer())
      .post(`/caredesk/jobs/${job.id}/take`)
      .set("Cookie", technicianCookie)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/caredesk/jobs/${job.id}/diagnosis`)
      .set("Cookie", technicianCookie)
      .send({ summary: "Test retention", submitToOwner: true })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/caredesk/jobs/${job.id}/owner-review`)
      .set("Cookie", ownerCookie)
      .send({ instruction: "Proceed", posReference: "RET-001" })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/caredesk/jobs/${job.id}/customer-decision`)
      .set("Cookie", technicianCookie)
      .send({ result: "proceed", method: "In-person" })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/caredesk/jobs/${job.id}/ready-pickup`)
      .set("Cookie", technicianCookie)
      .send({ readyPickupDate: new Date().toISOString().slice(0, 10) })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/caredesk/jobs/${job.id}/payments`)
      .set("Cookie", ownerCookie)
      .send({ amount: 150, method: "cash", note: "Paid in full" })
      .expect(404);
    await request(app.getHttpServer())
      .get(`/caredesk/jobs/${job.id}/payments`)
      .set("Cookie", ownerCookie)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/caredesk/jobs/${job.id}/complete-pickup`)
      .set("Cookie", technicianCookie)
      .expect(200);

    // Set retention to 0 days (disabled) — job should remain
    await request(app.getHttpServer())
      .put("/caredesk/settings")
      .set("Cookie", ownerCookie)
      .send({ flowRules: { retentionDays: 0 } })
      .expect(200);

    const prismaService = app.get(PrismaService);
    const repository = app.get(CaredeskRepository);
    const caredeskService = app.get(CaredeskService);
    const displayEvents = app.get(CaredeskDisplayEventsService);
    const cronService = new CaredeskCronService(prismaService, repository, caredeskService, displayEvents);
    await cronService.handleDataRetention();

    // Job should still exist since retention is disabled
    const beforePurge = await request(app.getHttpServer())
      .get(`/caredesk/jobs/${job.id}`)
      .set("Cookie", ownerCookie)
      .expect(200);
    expect(beforePurge.body.status).toBe("COMPLETE");

    // Enable retention with 1 day and backdate the job
    await prisma.caredeskJob.update({
      where: { id: job.id },
      data: { updatedAt: new Date(Date.now() - 2 * 86_400_000) }
    });

    await request(app.getHttpServer())
      .put("/caredesk/settings")
      .set("Cookie", ownerCookie)
      .send({ flowRules: { retentionDays: 1 } })
      .expect(200);

    await cronService.handleDataRetention();

    // Job should be purged
    await request(app.getHttpServer())
      .get(`/caredesk/jobs/${job.id}`)
      .set("Cookie", ownerCookie)
      .expect(404);

    // Verify audit log
    const audit = await prisma.caredeskAuditLog.findFirst({
      where: { action: "Data retention purge" },
      orderBy: { createdAt: "desc" }
    });
    expect(audit).toBeTruthy();
    expect(audit?.detail).toContain(job.jobIdDisplay);
  }, 20_000);
});

function ensureDockerPostgresReady() {
  try {
    execSync("docker info", {
      cwd: process.cwd(),
      stdio: "pipe"
    });
  } catch {
    throw new Error(
      [
        "Docker Desktop/daemon must be running to execute CareDesk Prisma integration tests.",
        "Start Docker Desktop, then rerun:",
        "corepack pnpm vitest run tests/integration/caredesk-v2.integration.test.ts"
      ].join("\n")
    );
  }
}

function startPostgresContainer() {
  try {
    execSync("docker compose -f infra/docker/docker-compose.yml up -d postgres", {
      cwd: process.cwd(),
      stdio: "pipe"
    });
  } catch {
    try {
      const containerId = execSync('docker ps --filter "name=postgres" --filter "status=running" -q', {
        cwd: process.cwd(),
        stdio: "pipe"
      }).toString().trim();
      if (containerId) {
        return;
      }
    } catch {
      // Fall through to the original error message below.
    }
    throw new Error(
      [
        "Docker is running, but the CareDesk Postgres container could not be started.",
        "Check infra/docker/docker-compose.yml and rerun:",
        "docker compose -f infra/docker/docker-compose.yml up -d postgres"
      ].join("\n")
    );
  }
}

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

async function waitForDatabase() {
  let lastError: unknown;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw lastError;
}

function binaryParser(response: NodeJS.ReadableStream, callback: (error: Error | null, body?: Buffer) => void) {
  const chunks: Buffer[] = [];
  response.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
  response.on("end", () => callback(null, Buffer.concat(chunks)));
  response.on("error", (error) => callback(error));
}

async function createOwnerSession(app: INestApplication) {
  const response = await request(app.getHttpServer()).post("/caredesk/auth/setup").send(setupPayload).expect(201);
  return extractSessionCookie(response);
}

async function createTechnicianSession(app: INestApplication, ownerCookie: string) {
  const created = await request(app.getHttpServer())
    .post("/caredesk/users")
    .set("Cookie", ownerCookie)
    .send({ name: "Hafiz", email: "hafiz@example.com", role: "technician", password: "TechPass123!" })
    .expect(201);
  const response = await request(app.getHttpServer())
    .post("/caredesk/auth/login")
    .send({ email: "hafiz@example.com", password: "TechPass123!" })
    .expect(200);
  return { cookie: extractSessionCookie(response), userId: created.body.id as string };
}

function extractSessionCookie(response: request.Response) {
  const cookies = response.headers["set-cookie"];
  const cookie = (Array.isArray(cookies) ? cookies : [cookies]).find((item) => item?.startsWith("caredesk_session="));
  if (!cookie) {
    throw new Error("Expected caredesk_session cookie");
  }
  return cookie.split(";")[0];
}

