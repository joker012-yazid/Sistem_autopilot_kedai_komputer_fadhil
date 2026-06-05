import { BadGatewayException, BadRequestException, Injectable } from "@nestjs/common";
import { z } from "zod";
import type { CaredeskStoredFile } from "./caredesk-storage.adapter";

export interface ServiceNoteScanResult {
  serviceReportNumber: string;
  customer: { name: string; phone: string; preferredChannel?: string };
  device: { type: string; brand: string; model?: string; serialNumber?: string };
  reportedIssue: string;
  sourceFileName?: string;
  confidence: number;
  confidenceByField?: Record<string, number>;
  warnings?: string[];
  rawTextNotes?: string;
}

interface ScannerRuntimeConfig {
  apiKey: string;
  model: string;
}

const scanResultSchema = z.object({
  serviceReportNumber: z.string().min(1).default("NO.0000"),
  customer: z.object({
    name: z.string().default(""),
    phone: z.string().default(""),
    preferredChannel: z.string().optional().default("WhatsApp")
  }),
  device: z.object({
    type: z.string().default("Laptop"),
    brand: z.string().default("Device"),
    model: z.string().optional(),
    serialNumber: z.string().optional()
  }),
  reportedIssue: z.string().default(""),
  confidence: z.number().min(0).max(1).default(0),
  confidenceByField: z.record(z.number().min(0).max(1)).optional(),
  warnings: z.array(z.string()).optional(),
  rawTextNotes: z.string().optional()
});

@Injectable()
export class CaredeskServiceNoteScannerService {
  async testConfig(config: ScannerRuntimeConfig): Promise<{ ok: true; model: string }> {
    let response: Response;
    try {
      response = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(config.model)}`, {
        headers: { Authorization: `Bearer ${config.apiKey}` }
      });
    } catch {
      throw new BadGatewayException("OpenAI scanner provider is unavailable");
    }
    if (!response.ok) {
      const payload = await response.text();
      throw new BadGatewayException(openAiErrorMessage(payload, response.status));
    }
    return { ok: true, model: config.model };
  }

  async scan(file: CaredeskStoredFile, config: ScannerRuntimeConfig): Promise<ServiceNoteScanResult> {
    const body = {
      model: config.model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Extract fields from this Fadhil CareDesk service note.",
                "Return only facts visible in the file. If a field is unclear, use an empty string and add a warning.",
                "Normalize service report numbers to NO.0000 format when possible.",
                "Customer phone should preserve Malaysian phone numbers as written.",
                "Device brand/model/type and reported issue must be suitable for a technician to review before creating a job."
              ].join(" ")
            },
            fileContent(file)
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "caredesk_service_note_scan",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "serviceReportNumber",
              "customer",
              "device",
              "reportedIssue",
              "confidence",
              "confidenceByField",
              "warnings",
              "rawTextNotes"
            ],
            properties: {
              serviceReportNumber: { type: "string" },
              customer: {
                type: "object",
                additionalProperties: false,
                required: ["name", "phone", "preferredChannel"],
                properties: {
                  name: { type: "string" },
                  phone: { type: "string" },
                  preferredChannel: { type: "string" }
                }
              },
              device: {
                type: "object",
                additionalProperties: false,
                required: ["type", "brand", "model", "serialNumber"],
                properties: {
                  type: { type: "string" },
                  brand: { type: "string" },
                  model: { type: "string" },
                  serialNumber: { type: "string" }
                }
              },
              reportedIssue: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              confidenceByField: {
                type: "object",
                additionalProperties: false,
                required: ["serviceReportNumber", "customer", "device", "reportedIssue"],
                properties: {
                  serviceReportNumber: { type: "number", minimum: 0, maximum: 1 },
                  customer: { type: "number", minimum: 0, maximum: 1 },
                  device: { type: "number", minimum: 0, maximum: 1 },
                  reportedIssue: { type: "number", minimum: 0, maximum: 1 }
                }
              },
              warnings: { type: "array", items: { type: "string" } },
              rawTextNotes: { type: "string" }
            }
          }
        }
      }
    };

    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
    } catch {
      throw new BadGatewayException("OpenAI scanner provider is unavailable");
    }

    const payload = await response.text();
    if (!response.ok) {
      throw new BadGatewayException(openAiErrorMessage(payload, response.status));
    }

    const parsedPayload = parseJson(payload);
    const outputText = extractOutputText(parsedPayload);
    if (!outputText) {
      throw new BadGatewayException("OpenAI scanner returned no structured output");
    }

    const result = scanResultSchema.safeParse(parseJson(outputText));
    if (!result.success) {
      throw new BadGatewayException("OpenAI scanner returned invalid service-note fields");
    }

    return {
      ...result.data,
      serviceReportNumber: normalizeServiceReportNumber(result.data.serviceReportNumber),
      customer: { ...result.data.customer, preferredChannel: result.data.customer.preferredChannel || "WhatsApp" },
      sourceFileName: file.originalname
    };
  }
}

function fileContent(file: CaredeskStoredFile) {
  const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  if (file.mimetype === "application/pdf") {
    return {
      type: "input_file",
      filename: file.originalname,
      file_data: dataUrl
    };
  }
  return {
    type: "input_image",
    image_url: dataUrl,
    detail: "high"
  };
}

function extractOutputText(payload: unknown): string | undefined {
  if (payload && typeof payload === "object" && typeof (payload as { output_text?: unknown }).output_text === "string") {
    return (payload as { output_text: string }).output_text;
  }
  const output = payload && typeof payload === "object" ? (payload as { output?: unknown }).output : undefined;
  if (!Array.isArray(output)) {
    return undefined;
  }
  for (const item of output) {
    const content = item && typeof item === "object" ? (item as { content?: unknown }).content : undefined;
    if (!Array.isArray(content)) {
      continue;
    }
    for (const contentItem of content) {
      if (contentItem && typeof contentItem === "object") {
        const text = (contentItem as { text?: unknown }).text;
        if (typeof text === "string") {
          return text;
        }
      }
    }
  }
  return undefined;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new BadGatewayException("OpenAI scanner returned non-JSON output");
  }
}

function openAiErrorMessage(payload: string, status: number): string {
  try {
    const parsed = JSON.parse(payload) as { error?: { message?: string } };
    return parsed.error?.message ? `OpenAI scanner failed: ${parsed.error.message}` : `OpenAI scanner failed with ${status}`;
  } catch {
    return `OpenAI scanner failed with ${status}`;
  }
}

function normalizeServiceReportNumber(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) {
    return value.trim() || "NO.0000";
  }
  return `NO.${digits.padStart(4, "0").slice(-4)}`;
}

export function assertSupportedScannerFile(file: CaredeskStoredFile | undefined, maxUploadBytes: number): asserts file is CaredeskStoredFile {
  if (!file) {
    throw new BadRequestException("Service note file is required");
  }
  if (file.size > maxUploadBytes) {
    throw new BadRequestException(`Service note file exceeds the scanner upload limit of ${Math.round(maxUploadBytes / 1024 / 1024)}MB`);
  }
  const supported = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
  if (!supported.includes(file.mimetype)) {
    throw new BadRequestException("Scanner supports PNG, JPEG, WEBP, GIF, and PDF service notes only");
  }
}
