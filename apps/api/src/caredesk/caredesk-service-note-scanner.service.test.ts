import { describe, expect, it, vi, afterEach } from "vitest";
import { CaredeskServiceNoteScannerService } from "./caredesk-service-note-scanner.service";
import type { CaredeskStoredFile } from "./caredesk-storage.adapter";

const file: CaredeskStoredFile = {
  originalname: "service-note-no-23.png",
  mimetype: "image/png",
  size: 128,
  buffer: Buffer.from("image")
};

describe("CaredeskServiceNoteScannerService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends service note images to OpenAI Responses and maps structured output", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      output_text: JSON.stringify({
        serviceReportNumber: "NO.0023",
        customer: { name: "Lim Wei", phone: "016-338 2200", preferredChannel: "WhatsApp" },
        device: { type: "Desktop", brand: "HP", model: "ProDesk", serialNumber: "HPD-1101" },
        reportedIssue: "Desktop restart sendiri selepas 10 minit.",
        confidence: 0.91,
        confidenceByField: { serviceReportNumber: 0.98 },
        warnings: [],
        rawTextNotes: "NO.0023 Lim Wei"
      })
    }), { status: 200 }));
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await new CaredeskServiceNoteScannerService().scan(file, { apiKey: "sk-test", model: "gpt-5.1" });

    expect(result).toMatchObject({
      serviceReportNumber: "NO.0023",
      customer: { name: "Lim Wei", phone: "016-338 2200" },
      device: { brand: "HP", model: "ProDesk" },
      confidence: 0.91,
      sourceFileName: "service-note-no-23.png"
    });
    const firstCall = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    const requestBody = JSON.parse(firstCall[1].body as string);
    expect(requestBody.model).toBe("gpt-5.1");
    expect(requestBody.input[0].content[1]).toMatchObject({ type: "input_image", detail: "high" });
    const schema = requestBody.text.format.schema;
    expect(schema.required).toEqual(Object.keys(schema.properties));
    expect(schema.properties.confidenceByField).toMatchObject({
      additionalProperties: false,
      required: ["serviceReportNumber", "customer", "device", "reportedIssue"]
    });
  });

  it("throws a bad gateway error when OpenAI output is not valid scan JSON", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ output_text: "not json" }), { status: 200 })) as typeof fetch;

    await expect(new CaredeskServiceNoteScannerService().scan(file, { apiKey: "sk-test", model: "gpt-5.1" })).rejects.toThrow(/non-JSON|invalid/i);
  });

  it("tests model access without uploading a service note", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ id: "gpt-5.1" }), { status: 200 }));
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(new CaredeskServiceNoteScannerService().testConfig({ apiKey: "sk-test", model: "gpt-5.1" })).resolves.toEqual({
      ok: true,
      model: "gpt-5.1"
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/v1/models/gpt-5.1");
  });
});
