import { Controller, Get, Inject, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { CaredeskDisplayEventsService } from "./caredesk-display-events.service";
import { CaredeskDisplayService } from "./caredesk-display.service";
import { DisplayAccessGuard } from "./display-access.guard";

@Controller("caredesk/display")
@UseGuards(DisplayAccessGuard)
export class CaredeskDisplayController {
  constructor(
    @Inject(CaredeskDisplayService) private readonly display: CaredeskDisplayService,
    @Inject(CaredeskDisplayEventsService) private readonly events: CaredeskDisplayEventsService
  ) {}

  @Get("snapshot")
  snapshot() {
    return this.display.getSnapshot();
  }

  @Get("stream")
  async stream(@Req() request: Request, @Res() response: Response) {
    response.status(200);
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders?.();

    const writeSnapshot = async (revision = this.events.currentRevision()) => {
      const payload = await this.display.getSnapshot(revision);
      response.write(`event: snapshot\n`);
      response.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    await writeSnapshot();

    const heartbeat = setInterval(() => {
      response.write(`event: heartbeat\n`);
      response.write(`data: {"ok":true}\n\n`);
    }, 15_000);

    const unsubscribe = this.events.subscribe((revision) => {
      void writeSnapshot(revision).catch(() => undefined);
    });

    request.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      response.end();
    });
  }
}
