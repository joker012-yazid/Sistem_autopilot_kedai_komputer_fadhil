import { Inject, Injectable } from "@nestjs/common";
import type { CaredeskDisplaySnapshot } from "../../../../packages/domain/src";
import { buildDisplaySnapshot } from "./caredesk-display";
import { CaredeskDisplayEventsService } from "./caredesk-display-events.service";
import { CaredeskRepository } from "./caredesk.repository";

@Injectable()
export class CaredeskDisplayService {
  constructor(
    @Inject(CaredeskRepository) private readonly repository: CaredeskRepository,
    @Inject(CaredeskDisplayEventsService) private readonly events: CaredeskDisplayEventsService
  ) {}

  async getSnapshot(revision = this.events.currentRevision()): Promise<CaredeskDisplaySnapshot> {
    const rows = await this.repository.listDisplayJobs();
    return buildDisplaySnapshot(rows, { revision });
  }
}
