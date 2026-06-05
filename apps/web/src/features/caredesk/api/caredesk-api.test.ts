import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  createCaredeskUser,
  exportCaredeskCsv,
  exportCaredeskPdf,
  getCaredeskSetupStatus,
  loginCaredesk,
  loadCaredeskAppState,
  loadReportsDashboard,
  loadSettingsDraft,
  deleteCaredeskChecklistImage,
  recordCaredeskReportExport,
  resetCaredeskUserPassword,
  setupCaredeskOwner,
  testCaredeskScannerSettings,
  updateCaredeskSettings,
  updateCaredeskChecklistImageCaption,
  updateCaredeskUser,
  uploadCaredeskChecklistImage,
  validateCaredeskPassword
} from "./caredesk-api";

const originalFetch = globalThis.fetch;

describe("CareDesk API adapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("does not fall back to seeded mock jobs when the API fails", async () => {
    globalThis.fetch = vi.fn(async () => new Response("API down", { status: 503 })) as typeof fetch;

    await expect(loadCaredeskAppState()).rejects.toThrow("API down");
  });

  it("maps network failures to a clear CareDesk API unavailable message", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;

    await expect(getCaredeskSetupStatus()).rejects.toThrow("CareDesk API tidak dapat dihubungi");
  });

  it("validates the production password policy before auth/user forms submit", () => {
    expect(validateCaredeskPassword("password").valid).toBe(false);
    expect(validateCaredeskPassword("short1").valid).toBe(false);
    expect(validateCaredeskPassword("OwnerPass123!")).toEqual({ valid: true });
  });

  it("uses cookie credentials and never sends demo x-user-id headers", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([]));
    globalThis.fetch = fetchMock as typeof fetch;

    await uploadCaredeskChecklistImage("job_0009", "drive", new File(["image"], "smart.png", { type: "image/png" }));

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.credentials).toBe("include");
    expect(JSON.stringify(init.headers)).not.toContain("x-user-id");
  });

  it("calls production auth endpoints with cookie credentials", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/caredesk/auth/setup-status")) {
        return jsonResponse({ needsSetup: false });
      }
      if (url.endsWith("/caredesk/auth/setup") && init?.method === "POST") {
        return jsonResponse({ id: "user_owner", name: "Fadhil", email: "fadhil@example.com", role: "owner", status: "active" });
      }
      if (url.endsWith("/caredesk/auth/login") && init?.method === "POST") {
        return jsonResponse({ id: "user_owner", name: "Fadhil", email: "fadhil@example.com", role: "owner", status: "active" });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await getCaredeskSetupStatus();
    await setupCaredeskOwner({ setupToken: "setup", name: "Fadhil", email: "fadhil@example.com", password: "password123" });
    await loginCaredesk({ email: "fadhil@example.com", password: "password123" });

    for (const call of fetchMock.mock.calls) {
      const init = call[1] as RequestInit | undefined;
      expect(init?.credentials).toBe("include");
      expect(JSON.stringify(init?.headers ?? {})).not.toContain("x-user-id");
    }
  });

  it("calls Owner user management endpoints", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/caredesk/users") && init?.method === "POST") {
        return jsonResponse({ id: "user_2", name: "Tech", email: "tech@example.com", role: "technician", status: "active" });
      }
      if (url.endsWith("/caredesk/users/user_2") && init?.method === "PATCH") {
        return jsonResponse({ id: "user_2", name: "Tech 2", email: "tech2@example.com", role: "technician", status: "disabled" });
      }
      if (url.endsWith("/caredesk/users/user_2/reset-password") && init?.method === "POST") {
        return jsonResponse({ id: "user_2", name: "Tech 2", email: "tech2@example.com", role: "technician", status: "active" });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await createCaredeskUser({ name: "Tech", email: "tech@example.com", role: "technician", password: "password123" });
    await updateCaredeskUser("user_2", { name: "Tech 2", status: "disabled" });
    await resetCaredeskUserPassword("user_2", "password456");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:4000/caredesk/users",
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:4000/caredesk/users/user_2",
      expect.objectContaining({ method: "PATCH", credentials: "include" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://127.0.0.1:4000/caredesk/users/user_2/reset-password",
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
  });

  it("keeps the CareDesk runtime API-first without local seed or mutation branches", () => {
    const appSource = readFileSync(fileURLToPath(new URL("../ui/FadhilCareDeskApp.tsx", import.meta.url)), "utf8");

    expect(appSource).not.toContain("apiMode");
    expect(appSource).not.toMatch(/seedPrototypeState\s*\(/);
    expect(appSource).not.toMatch(/function\s+updateJob|updateJob\s*\(/);
  });

  it("maps backend job detail, checklist images, settings, and empty jobs into prototype state", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/caredesk/jobs")) {
        return jsonResponse([{ id: "job_0009" }]);
      }
      if (url.endsWith("/caredesk/settings")) {
        return jsonResponse({
          shopInfo: { name: "Fadhil CareDesk API", subtitle: "Operasi Servis & Repair" },
          defaultLanguage: "bm",
          posReferenceLabel: "POS Ref",
          flowRules: { reminderDays: [0, 7, 14], unclaimedDay: 90, lockedRules: ["Locked"] }
        });
      }
      if (url.endsWith("/caredesk/jobs/job_0009")) {
        return jsonResponse({
          id: "job_0009",
          jobIdDisplay: "NO.0009",
          rawReportNumber: "0009",
          status: "WAITING FADHIL REVIEW",
          customerId: "cus_lim",
          deviceId: "dev_hp",
          assignedTechnicianId: "user_technician",
          reportedIssue: "Tidak power",
          diagnosisNotes: "PSU unstable",
          lastUpdate: "Diagnosis submitted",
          createdAt: "2026-05-01T00:00:00.000Z",
          customer: { id: "cus_lim", name: "Lim Wei", phone: "012", preferredChannel: "WhatsApp" },
          device: { id: "dev_hp", customerId: "cus_lim", type: "Desktop", brand: "HP", model: "ProDesk" },
          evidence: [],
          notifications: [],
          timeline: [],
          checklistReport: {
            jobId: "job_0009",
            jobIdDisplay: "NO.0009",
            status: "submitted",
            technicianId: "user_technician",
            deviceInfo: { type: "Desktop", model: "HP ProDesk", customerName: "Lim Wei", customerPhone: "012", checkedBy: "Hafiz" },
            initialCheck: {},
            drive: { healthStatus: "Good" },
            battery: { applicable: false, status: "N/A" },
            ram: {},
            diagnosisSummary: "Power supply issue",
            images: [
              {
                id: "img_1",
                jobId: "job_0009",
                section: "drive",
                fileName: "smart.png",
                storagePath: "/caredesk/NO.0009/checklist/drive/smart.png",
                mimeType: "image/png",
                sizeBytes: 100,
                caption: "SMART check",
                createdAt: "2026-05-01T01:00:00.000Z",
                uploadedByUserId: "user_technician"
              }
            ],
            lastUpdated: "2026-05-01T01:00:00.000Z"
          }
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    }) as typeof fetch;

    const state = await loadCaredeskAppState();

    expect(state.jobs).toHaveLength(1);
    expect(state.jobs[0]).toMatchObject({ id: "job_0009", status: "WAITING FADHIL REVIEW", diagnosisNotes: "PSU unstable" });
    expect(state.customers[0]).toMatchObject({ id: "cus_lim", name: "Lim Wei" });
    expect(state.checklistReports[0].drive.images[0]).toMatchObject({ fileName: "smart.png", caption: "SMART check" });
    expect(state.checklistReports[0].ram.slots.length).toBeGreaterThan(0);
    expect(state.checklistReports[0].ram.images).toEqual([]);
    expect(state.checklistReports[0].initialCheck.problemVerified).toBe(false);
    expect(state.shopInfo.name).toBe("Fadhil CareDesk API");
    expect(state.flowRules.reminderDays).toEqual([0, 7, 14]);
  });

  it("calls checklist image upload with multipart form data", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        id: "img_1",
        jobId: "job_0009",
        section: "drive",
        fileName: "smart.png",
        storagePath: "/caredesk/NO.0009/checklist/drive/smart.png",
        mimeType: "image/png",
        sizeBytes: 10,
        createdAt: "2026-05-01T01:00:00.000Z",
        uploadedByUserId: "user_technician"
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;
    const file = new File(["image"], "smart.png", { type: "image/png" });

    await uploadCaredeskChecklistImage("job_0009", "drive", file, "SMART check");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:4000/caredesk/checklist-reports/job_0009/images",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) })
    );
  });

  it("loads customers from /caredesk/customers and merges with job-derived customers", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/caredesk/jobs")) {
        return jsonResponse([]);
      }
      if (url.endsWith("/caredesk/customers")) {
        return jsonResponse([
          { id: "cus_1", name: "Ahmad", phone: "012-000 0000", preferredChannel: "WhatsApp", notes: "VIP customer", secondaryContact: "011-111 1111" }
        ]);
      }
      if (url.endsWith("/caredesk/settings")) {
        return jsonResponse({
          shopInfo: { name: "Fadhil API", subtitle: "Repair" },
          defaultLanguage: "bm",
          posReferenceLabel: "POS Ref",
          scannerSettings: {
            provider: "openai",
            enabled: true,
            model: "gpt-5.4-mini",
            apiKeyConfigured: true,
            apiKeyMasked: "sk-...7890",
            maxUploadBytes: 10485760
          },
          flowRules: { reminderDays: [0, 7], unclaimedDay: 88, lockedRules: ["Locked"] },
          notificationTemplates: []
        });
      }
      if (url.endsWith("/caredesk/users")) {
        return jsonResponse([]);
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const state = await loadCaredeskAppState();
    expect(state.customers.length).toBe(1);
    expect(state.customers[0].name).toBe("Ahmad");
    expect(state.customers[0].notes).toBe("VIP customer");
    expect(state.customers[0].secondaryContact).toBe("011-111 1111");
  });

  it("updates and deletes checklist images through the backend API", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/caredesk/checklist-reports/job_0009/images/img_1") && init?.method === "PATCH") {
        return jsonResponse({ id: "img_1", caption: "Updated caption" });
      }
      if (url.endsWith("/caredesk/checklist-reports/job_0009/images/img_1") && init?.method === "DELETE") {
        return jsonResponse({ ok: true });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await updateCaredeskChecklistImageCaption("job_0009", "img_1", "Updated caption");
    await deleteCaredeskChecklistImage("job_0009", "img_1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:4000/caredesk/checklist-reports/job_0009/images/img_1",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ caption: "Updated caption" }) })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:4000/caredesk/checklist-reports/job_0009/images/img_1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("loads reports from /caredesk/reports and records export audit", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/caredesk/reports") && !init?.method) {
        return jsonResponse({
          totalJobs: 3,
          activeJobs: 2,
          readyPickup: 1,
          unclaimed: 1,
          statusBreakdown: { "NEW JOB": 1, "READY PICKUP": 1, UNCLAIMED: 1 }
        });
      }
      if (url.endsWith("/caredesk/reports/export-audit")) {
        return jsonResponse({ id: "audit_1" });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const report = await loadReportsDashboard();
    await recordCaredeskReportExport("Export CSV");

    expect(report.counts).toMatchObject({ totalJobs: 3, activeJobs: 2, readyPickup: 1, unclaimed: 1 });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://127.0.0.1:4000/caredesk/reports/export-audit",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "Export CSV" }) })
    );
  });

  it("calls export CSV and PDF endpoints and triggers download", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/caredesk/reports/export-csv")) {
        return new Response(new Blob(["Job ID,Status"], { type: "text/csv" }), { status: 200, headers: { "Content-Type": "text/csv" } });
      }
      if (url.endsWith("/caredesk/reports/export-pdf")) {
        return new Response(new Blob(["%PDF-1.4"], { type: "application/pdf" }), { status: 200, headers: { "Content-Type": "application/pdf" } });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const mockAnchor = { click: vi.fn(), remove: vi.fn() };
    (globalThis as any).document = {
      createElement: vi.fn(() => mockAnchor),
      body: { appendChild: vi.fn(() => null), removeChild: vi.fn(() => null) }
    };
    (globalThis as any).URL = {
      createObjectURL: vi.fn(() => "blob:test"),
      revokeObjectURL: vi.fn(() => undefined)
    };

    await exportCaredeskCsv("all");
    await exportCaredeskPdf("7d");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:4000/caredesk/reports/export-csv",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ range: "all" }) })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:4000/caredesk/reports/export-pdf",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ range: "7d" }) })
    );
    expect(mockAnchor.click).toHaveBeenCalled();

    delete (globalThis as any).document;
  });

  it("loads settings draft and saves supported backend settings", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/caredesk/settings") && !init?.method) {
        return jsonResponse({
          shopInfo: { name: "Fadhil API", subtitle: "Repair" },
          defaultLanguage: "en",
          posReferenceLabel: "POS Ref",
          scannerSettings: {
            provider: "openai",
            enabled: true,
            model: "gpt-5.4-mini",
            apiKeyConfigured: true,
            apiKeyMasked: "sk-...7890",
            maxUploadBytes: 10485760
          },
          flowRules: { reminderDays: [0, 7], unclaimedDay: 88, lockedRules: ["Locked"] },
          notificationTemplates: [
            { stageDay: 0, channel: "WhatsApp", messageTemplate: "Hi {{customerName}}, {{jobIdDisplay}} sudah siap.", language: "bm" },
            { stageDay: 0, channel: "WhatsApp", messageTemplate: "Hi {{customerName}}, {{jobIdDisplay}} is ready.", language: "en" }
          ]
        });
      }
      if (url.endsWith("/caredesk/settings") && init?.method === "PUT") {
        return jsonResponse({ ok: true });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const draft = await loadSettingsDraft();
    expect(draft.notificationTemplates.length).toBeGreaterThanOrEqual(2);
    expect(draft.notificationTemplates[0].messageTemplate).toContain("{{customerName}}");
    await updateCaredeskSettings({
      shopInfo: draft.shopInfo,
      defaultLanguage: draft.defaultLanguage,
      posReferenceLabel: draft.posReferenceLabel,
      flowRules: draft.flowRules
    });

    expect(draft.shopInfo.name).toBe("Fadhil API");
    expect(draft.defaultLanguage).toBe("en");
    expect(draft.scannerSettings).toMatchObject({
      enabled: true,
      model: "gpt-5.4-mini",
      apiKeyConfigured: true,
      apiKeyMasked: "sk-...7890"
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://127.0.0.1:4000/caredesk/settings",
      expect.objectContaining({ method: "PUT" })
    );
    const putCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith("/caredesk/settings") && (call[1] as RequestInit | undefined)?.method === "PUT");
    expect((putCall?.[1] as RequestInit).body).not.toContain("apiKey");
  });

  it("saves scanner settings with a one-time API key payload", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    globalThis.fetch = fetchMock as typeof fetch;

    await updateCaredeskSettings({
      scannerSettings: {
        provider: "openai",
        enabled: true,
        model: "gpt-5.1",
        apiKey: "sk-owner-secret-1234567890",
        maxUploadBytes: 10485760
      }
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.scannerSettings).toMatchObject({
      provider: "openai",
      enabled: true,
      model: "gpt-5.1",
      apiKey: "sk-owner-secret-1234567890"
    });
  });

  it("tests scanner config through the owner settings endpoint", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, model: "gpt-5.1" }));
    globalThis.fetch = fetchMock as typeof fetch;

    await testCaredeskScannerSettings({ model: "gpt-5.1", apiKey: "sk-test" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:4000/caredesk/settings/scanner/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ model: "gpt-5.1", apiKey: "sk-test" })
      })
    );
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
