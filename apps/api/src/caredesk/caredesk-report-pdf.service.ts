import { Inject, Injectable, Logger, Optional, RequestTimeoutException, ServiceUnavailableException } from "@nestjs/common";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CaredeskChecklistReport, CaredeskEvidenceFile, CaredeskJob } from "../../../../packages/domain/src";

export interface CaredeskCustomerReportData {
  jobId: string;
  jobIdDisplay: string;
  customer: { name: string; phone: string; preferredChannel?: string };
  device: { type: string; brand: string; model?: string; serialNumber?: string };
  status: string;
  reportedIssue: string;
  diagnosisNotes?: string;
  ownerInstruction?: string;
  posReference?: string;
  evidence: CaredeskEvidenceFile[];
  generatedAt: string;
}

@Injectable()
export class CaredeskReportPdfService {
  private readonly logger = new Logger(CaredeskReportPdfService.name);
  private readonly renderTimeoutMs: number;
  private browserPromise: Promise<CaredeskPdfBrowser> | undefined;

  constructor(@Optional() @Inject("CAREDESK_PDF_OPTIONS") options?: CaredeskPdfOptions) {
    this.renderTimeoutMs = options?.renderTimeoutMs ?? Number(process.env.CAREDESK_PDF_RENDER_TIMEOUT_MS ?? 15_000);
  }

  async customerReportPdf(report: CaredeskCustomerReportData): Promise<Buffer> {
    return this.htmlToPdf(this.customerReportHtml(report));
  }

  async checklistReportPdf(report: CaredeskChecklistReport & { customer?: { name: string; phone: string }; device?: CaredeskCustomerReportData["device"] }): Promise<Buffer> {
    return this.htmlToPdf(this.checklistReportHtml(report));
  }

  customerReportHtml(report: CaredeskCustomerReportData): string {
    const evidence = report.evidence.filter((item) => ["diagnosis", "repair_progress", "customer_decision"].includes(item.category));
    return this.documentShell(
      `${escapeHtml(report.jobIdDisplay)} Customer Report`,
      `
        ${this.header(report.jobIdDisplay, "Customer Technical Report")}
        ${this.table([
          ["Customer", report.customer.name],
          ["Phone", report.customer.phone],
          ["Preferred Contact", report.customer.preferredChannel ?? "WhatsApp"],
          ["Device", deviceLabel(report.device)],
          ["Serial", report.device.serialNumber ?? "N/A"]
        ])}
        ${this.section("Job Info", this.table([
          ["Status", report.status],
          ["Reported Issue", report.reportedIssue],
          ["POS Reference", report.posReference ?? "N/A"]
        ]))}
        ${this.section("Technician Diagnosis", paragraph(report.diagnosisNotes || "Diagnosis belum direkodkan."))}
        ${this.section("Owner Recommendation", paragraph(report.ownerInstruction || "Owner recommendation belum direkodkan."))}
        ${this.imageGrid(evidence)}
        ${this.note("Dokumen ini ialah ringkasan teknikal untuk customer. Rujukan harga rasmi diurus dalam POS kedai.")}
      `
    );
  }

  checklistReportHtml(report: CaredeskChecklistReport & { customer?: { name: string; phone: string }; device?: CaredeskCustomerReportData["device"] }): string {
    const battery = asRecord(report.battery);
    return this.documentShell(
      `${escapeHtml(report.jobIdDisplay)} Checklist Report`,
      `
        ${this.header(report.jobIdDisplay, "Checklist Condition Report")}
        ${this.table([
          ["No Job", report.jobIdDisplay],
          ["Customer", report.customer?.name ?? "N/A"],
          ["Phone", report.customer?.phone ?? "N/A"],
          ["Device", report.device ? deviceLabel(report.device) : readValue(report.deviceInfo, "brand", "Device")],
          ["Checked By", report.technicianId ?? "N/A"],
          ["Date Completed", new Date(report.lastUpdated).toLocaleDateString("en-MY")]
        ])}
        ${this.section("Maklumat Peranti", this.objectTable(report.deviceInfo))}
        ${this.section("Pemeriksaan Awal", this.objectTable(report.initialCheck))}
        ${this.section("Drive Health", this.objectTable(report.drive))}
        ${this.section("Battery Report", battery.applicable === false ? paragraph("N/A untuk PC desktop.") : this.objectTable(report.battery))}
        ${this.section("RAM Specification", this.objectTable(report.ram))}
        ${this.section("Ringkasan Diagnosis", paragraph(report.diagnosisSummary || "Belum diisi."))}
        ${this.imageGrid(report.images)}
      `
    );
  }

  async generateReportPdf(jobs: CaredeskJob[], rangeLabel: string): Promise<Buffer> {
    const statuses = ["NEW JOB", "WAITING FADHIL REVIEW", "WAITING CUSTOMER CONFIRMATION", "IN PROGRESS", "NOT PROCEED", "READY PICKUP", "UNCLAIMED", "COMPLETE"];
    const counts = statuses.map((s) => ({ status: s, count: jobs.filter((j) => j.status === s).length })).filter((c) => c.count > 0);
    const html = this.documentShell(
      `Fadhil CareDesk Report - ${escapeHtml(rangeLabel)}`,
      `
        <header class="report-header">
          <div>
            <div class="brand">Fadhil CareDesk</div>
            <div class="subtitle">Operasi Servis & Repair</div>
          </div>
          <div>
            <div class="job-id">Report</div>
            <div class="subtitle">${escapeHtml(rangeLabel)}</div>
          </div>
        </header>
        <section class="section">
          <h2>Summary</h2>
          <table>
            <tr><th>Total Jobs</th><td>${jobs.length}</td></tr>
            <tr><th>Active Jobs</th><td>${jobs.filter((j) => !["COMPLETE", "NOT_PROCEED"].includes(j.status)).length}</td></tr>
            <tr><th>Completed</th><td>${jobs.filter((j) => j.status === "COMPLETE").length}</td></tr>
            <tr><th>Not Proceed</th><td>${jobs.filter((j) => j.status === "NOT PROCEED").length}</td></tr>
            <tr><th>Ready Pickup</th><td>${jobs.filter((j) => j.status === "READY PICKUP").length}</td></tr>
            <tr><th>Unclaimed</th><td>${jobs.filter((j) => j.status === "UNCLAIMED").length}</td></tr>
          </table>
        </section>
        <section class="section">
          <h2>Status Breakdown</h2>
          <table>
            ${counts.map((c) => `<tr><th>${escapeHtml(c.status)}</th><td>${c.count}</td></tr>`).join("")}
          </table>
        </section>
        <section class="section">
          <h2>Job List</h2>
          <table>
            <tr>
              <th>Job ID</th>
              <th>Status</th>
              <th>Customer</th>
              <th>Device</th>
              <th>Technician</th>
              <th>POS Reference</th>
            </tr>
            ${jobs.map((j) => `
              <tr>
                <td>${escapeHtml(j.jobIdDisplay)}</td>
                <td>${escapeHtml(j.status)}</td>
                <td>${escapeHtml((j as any).customer?.name ?? j.customerId ?? "")}</td>
                <td>${escapeHtml((j as any).device?.type ?? j.deviceId ?? "")}</td>
                <td>${escapeHtml((j as any).assignedTechnician?.name ?? j.assignedTechnicianId ?? "Unassigned")}</td>
                <td>${escapeHtml(j.posReference ?? "")}</td>
              </tr>
            `).join("")}
          </table>
        </section>
        <div class="note">Generated by Fadhil CareDesk on ${new Date().toLocaleDateString("en-MY")}</div>
      `
    );
    return this.htmlToPdf(html);
  }

  async onModuleDestroy() {
    const browser = await this.browserPromise?.catch(() => undefined);
    this.browserPromise = undefined;
    if (browser?.isConnected?.() === false) {
      return;
    }
    await this.closeBrowserGracefully(browser);
  }

  private async htmlToPdf(html: string): Promise<Buffer> {
    let page: CaredeskPdfPage | undefined;
    try {
      return await this.withTimeout(
        (async () => {
          const browser = await this.getBrowser();
          page = await browser.newPage();
          await page.setContent(html, { waitUntil: "load", timeout: this.renderTimeoutMs });
          return Buffer.from(
            await page.pdf({
              format: "A4",
              printBackground: true,
              margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" },
              timeout: this.renderTimeoutMs
            })
          );
        })(),
        "render"
      );
    } catch (error) {
      if (error instanceof RequestTimeoutException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(`CareDesk PDF renderer failed: ${errorMessage(error)}`);
      throw new ServiceUnavailableException("CareDesk PDF renderer is unavailable");
    } finally {
      await page?.close().catch((error) => {
        this.logger.warn(`CareDesk PDF page close failed: ${errorMessage(error)}`);
      });
    }
  }

  private async getBrowser(): Promise<CaredeskPdfBrowser> {
    const existing = await this.browserPromise?.catch(() => undefined);
    if (existing && existing.isConnected?.() !== false) {
      return existing;
    }
    this.browserPromise = this.launchBrowser();
    return this.browserPromise;
  }

  private async launchBrowser(): Promise<CaredeskPdfBrowser> {
    try {
      const puppeteer = await import("puppeteer");
      const executablePath = findBrowserExecutable();
      this.logger.debug(`Launching CareDesk PDF browser${executablePath ? ` at ${executablePath}` : ""}`);
      return await this.withTimeout(
        puppeteer.launch({
          headless: true,
          ...(executablePath ? { executablePath } : {}),
          args: ["--no-sandbox", "--disable-setuid-sandbox"]
        }),
        "launch"
      );
    } catch (error) {
      this.browserPromise = undefined;
      if (error instanceof RequestTimeoutException) {
        throw error;
      }
      this.logger.error(`CareDesk PDF browser launch failed: ${errorMessage(error)}`);
      throw new ServiceUnavailableException("CareDesk PDF renderer is unavailable");
    }
  }

  private async closeBrowserGracefully(browser: CaredeskPdfBrowser | undefined) {
    if (!browser) {
      return;
    }
    let timeout: NodeJS.Timeout | undefined;
    await Promise.race([
      browser.close().catch((error) => {
        this.logger.warn(`CareDesk PDF browser close failed: ${errorMessage(error)}`);
      }),
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, 2_000);
      })
    ]);
    if (timeout) {
      clearTimeout(timeout);
    }
  }

  private async withTimeout<T>(operation: Promise<T>, step: "launch" | "render"): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        this.logger.error(`CareDesk PDF ${step} timed out after ${this.renderTimeoutMs}ms`);
        reject(new RequestTimeoutException("CareDesk PDF generation timed out"));
      }, this.renderTimeoutMs);
    });
    operation.catch(() => undefined);
    try {
      return await Promise.race([operation, timeoutPromise]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private documentShell(title: string, body: string) {
    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; color: #18120f; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.45; }
            .report-header { border-bottom: 2px solid #b56b16; margin-bottom: 14px; padding-bottom: 10px; display: flex; justify-content: space-between; gap: 16px; }
            .brand { font-size: 22px; font-weight: 800; }
            .subtitle { color: #62564d; margin-top: 2px; }
            .job-id { font-size: 18px; font-weight: 800; text-align: right; }
            .section { margin-top: 14px; break-inside: avoid; }
            .section h2 { font-size: 14px; margin: 0 0 7px; color: #8b4f0b; }
            table { width: 100%; border-collapse: collapse; margin: 0; }
            td, th { border: 1px solid #d8cec2; padding: 7px 8px; vertical-align: top; }
            th { background: #f7f1e8; text-align: left; width: 34%; }
            .note { margin-top: 14px; padding: 9px 10px; background: #f8f5ef; border: 1px solid #d8cec2; color: #4e463f; }
            .image-grid { margin-top: 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
            .image-card { break-inside: avoid; border: 1px solid #d8cec2; padding: 8px; }
            .image-card img { width: 100%; height: 170px; object-fit: contain; background: #f8f5ef; border: 1px solid #eee5d9; }
            .image-card figcaption { margin-top: 6px; font-size: 11px; color: #4e463f; }
            .placeholder { height: 170px; display: grid; place-items: center; background: #f8f5ef; border: 1px solid #eee5d9; color: #62564d; text-align: center; padding: 10px; }
            p { margin: 0; white-space: pre-wrap; }
          </style>
        </head>
        <body>${body}</body>
      </html>`;
  }

  private header(jobIdDisplay: string, reportTitle: string) {
    return `<header class="report-header">
      <div>
        <div class="brand">Fadhil CareDesk</div>
        <div class="subtitle">Operasi Servis & Repair</div>
      </div>
      <div>
        <div class="job-id">${escapeHtml(jobIdDisplay)}</div>
        <div class="subtitle">${escapeHtml(reportTitle)}</div>
      </div>
    </header>`;
  }

  private section(title: string, content: string) {
    return `<section class="section"><h2>${escapeHtml(title)}</h2>${content}</section>`;
  }

  private table(rows: Array<[string, unknown]>) {
    return `<table>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(formatValue(value))}</td></tr>`).join("")}</table>`;
  }

  private objectTable(record: Record<string, unknown>) {
    const rows = Object.entries(record).filter(([, value]) => value !== undefined && value !== "");
    return rows.length ? this.table(rows) : paragraph("Belum diisi.");
  }

  private note(text: string) {
    return `<div class="note">${escapeHtml(text)}</div>`;
  }

  private imageGrid(images: Array<CaredeskEvidenceFile | CaredeskChecklistReport["images"][number]>) {
    if (!images.length) {
      return this.section("Gambar / Evidence", paragraph("Tiada gambar dilampirkan."));
    }
    return this.section(
      "Gambar / Evidence",
      `<div class="image-grid">${images
        .map((image) => {
          const src = imageToDataUrl(image);
          return `<figure class="image-card" data-storage="${escapeHtml(image.storagePath)}">
            ${
              src
                ? `<img src="${src}" alt="${escapeHtml(image.caption || image.fileName)}" />`
                : `<div class="placeholder">${escapeHtml(image.fileName)}</div>`
            }
            <figcaption>${escapeHtml(image.caption || image.fileName)}</figcaption>
          </figure>`;
        })
        .join("")}</div>`
    );
  }
}

function paragraph(text: string) {
  return `<p>${escapeHtml(text)}</p>`;
}

function deviceLabel(device: CaredeskCustomerReportData["device"]) {
  return [device.brand, device.model ?? device.type].filter(Boolean).join(" ");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readValue(record: Record<string, unknown>, key: string, fallback: string) {
  return typeof record[key] === "string" ? (record[key] as string) : fallback;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function findBrowserExecutable() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter((item): item is string => Boolean(item));
  return candidates.find((candidate) => existsSync(candidate));
}

function imageToDataUrl(image: { storagePath: string; mimeType: string }) {
  try {
    const relative = image.storagePath.replace(/^\/caredesk\/?/, "");
    const filePath = path.join(process.cwd(), ".data", "caredesk-nas", relative);
    const data = readFileSync(filePath);
    return `data:${image.mimeType};base64,${data.toString("base64")}`;
  } catch {
    return undefined;
  }
}

interface CaredeskPdfOptions {
  renderTimeoutMs?: number;
}

interface CaredeskPdfBrowser {
  newPage(): Promise<CaredeskPdfPage>;
  close(): Promise<void>;
  isConnected?(): boolean;
}

interface CaredeskPdfPage {
  setContent(html: string, options: { waitUntil: "load"; timeout: number }): Promise<void>;
  pdf(options: {
    format: "A4";
    printBackground: boolean;
    margin: { top: string; right: string; bottom: string; left: string };
    timeout: number;
  }): Promise<Uint8Array | Buffer>;
  close(): Promise<void>;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
