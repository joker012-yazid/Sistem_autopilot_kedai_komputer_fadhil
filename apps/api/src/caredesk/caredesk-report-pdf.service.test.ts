import { RequestTimeoutException, ServiceUnavailableException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CaredeskReportPdfService } from "./caredesk-report-pdf.service";

const launchMock = vi.hoisted(() => vi.fn());

vi.mock("puppeteer", () => ({
  launch: launchMock
}));

const sampleCustomerReport = {
  jobId: "job_0009",
  jobIdDisplay: "NO.0009",
  customer: { name: "Aminah", phone: "012-456 7788", preferredChannel: "WhatsApp" },
  device: { type: "Desktop", brand: "HP", model: "ProDesk", serialNumber: "HPD-1101" },
  status: "IN PROGRESS",
  reportedIssue: "Desktop restart sendiri selepas 10 minit.",
  diagnosisNotes: "PSU voltage unstable under load.",
  ownerInstruction: "Proceed after customer confirmation.",
  posReference: "Q-1044",
  evidence: [],
  generatedAt: "2026-05-26T00:00:00.000Z"
};

const sampleChecklistReport = {
  jobId: "job_0009",
  jobIdDisplay: "NO.0009",
  status: "submitted" as const,
  technicianId: "user_technician",
  deviceInfo: { type: "Desktop", brand: "HP", model: "ProDesk" },
  initialCheck: { condition: "Powers on" },
  drive: { note: "SMART pass" },
  battery: { applicable: false },
  ram: { capacity: "8GB" },
  diagnosisSummary: "PSU issue suspected",
  images: [
    {
      id: "img_1",
      jobId: "job_0009",
      section: "drive" as const,
      fileName: "smart.png",
      storagePath: "/caredesk/NO.0009/checklist/drive/missing-smart.png",
      mimeType: "image/png",
      sizeBytes: 100,
      caption: "Updated SMART caption",
      uploadedByUserId: "user_technician",
      createdAt: "2026-05-26T00:00:00.000Z"
    }
  ],
  lastUpdated: "2026-05-26T00:00:00.000Z",
  customer: { name: "Aminah", phone: "012-456 7788" },
  device: { type: "Desktop", brand: "HP", model: "ProDesk", serialNumber: "HPD-1101" }
};

describe("CaredeskReportPdfService", () => {
  beforeEach(() => {
    launchMock.mockReset();
  });

  afterEach(async () => {
    vi.useRealTimers();
  });

  it("generates customer and checklist PDF buffers with one reusable browser", async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    const setContent = vi.fn().mockResolvedValue(undefined);
    const pdf = vi.fn().mockResolvedValue(Buffer.from("%PDF caredesk"));
    const newPage = vi.fn().mockResolvedValue({ setContent, pdf, close });
    const browserClose = vi.fn().mockResolvedValue(undefined);
    launchMock.mockResolvedValue({ newPage, close: browserClose, isConnected: () => true });

    const service = new CaredeskReportPdfService();

    await expect(service.customerReportPdf(sampleCustomerReport)).resolves.toMatchObject(Buffer.from("%PDF caredesk"));
    await expect(service.checklistReportPdf(sampleChecklistReport)).resolves.toMatchObject(Buffer.from("%PDF caredesk"));

    expect(launchMock).toHaveBeenCalledTimes(1);
    expect(newPage).toHaveBeenCalledTimes(2);
    expect(setContent).toHaveBeenCalledWith(expect.stringContaining("NO.0009"), { waitUntil: "load", timeout: expect.any(Number) });
    expect(setContent).toHaveBeenCalledWith(expect.stringContaining("Updated SMART caption"), { waitUntil: "load", timeout: expect.any(Number) });
    expect(close).toHaveBeenCalledTimes(2);

    await service.onModuleDestroy();
    expect(browserClose).toHaveBeenCalledTimes(1);
  });

  it("throws a clear timeout exception when PDF rendering takes too long", async () => {
    vi.useFakeTimers();
    const service = new CaredeskReportPdfService({ renderTimeoutMs: 25 });
    const newPage = vi.fn().mockResolvedValue({
      setContent: vi.fn().mockReturnValue(new Promise(() => undefined)),
      pdf: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined)
    });
    launchMock.mockResolvedValue({ newPage, close: vi.fn().mockResolvedValue(undefined), isConnected: () => true });

    const render = service.customerReportPdf(sampleCustomerReport);
    const rejectsAsTimeout = expect(render).rejects.toBeInstanceOf(RequestTimeoutException);
    const rejectsWithMessage = expect(render).rejects.toThrow("CareDesk PDF generation timed out");
    await vi.advanceTimersByTimeAsync(30);

    await rejectsAsTimeout;
    await rejectsWithMessage;
    await service.onModuleDestroy();
  });

  it("wraps browser launch failures as a clear service unavailable exception", async () => {
    launchMock.mockRejectedValue(new Error("Chrome failed to launch"));
    const service = new CaredeskReportPdfService({ renderTimeoutMs: 1000 });
    const render = service.customerReportPdf(sampleCustomerReport);

    await expect(render).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(render).rejects.toThrow("CareDesk PDF renderer is unavailable");
  });
});
