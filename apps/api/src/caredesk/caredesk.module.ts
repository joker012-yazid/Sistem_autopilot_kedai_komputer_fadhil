import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SessionGuard } from "../auth/session.guard";
import { DatabaseModule } from "../database/database.module";
import { CaredeskController } from "./caredesk.controller";
import { CaredeskDisplayController } from "./caredesk-display.controller";
import { CaredeskDisplayEventsService } from "./caredesk-display-events.service";
import { CaredeskDisplayService } from "./caredesk-display.service";
import { CaredeskCronService } from "./caredesk-cron.service";
import { CaredeskRepository } from "./caredesk.repository";
import { CaredeskReportPdfService } from "./caredesk-report-pdf.service";
import { CaredeskServiceNoteScannerService } from "./caredesk-service-note-scanner.service";
import { CaredeskNasStorageAdapter } from "./caredesk-storage.adapter";
import { CaredeskService } from "./caredesk.service";
import { DisplayAccessGuard } from "./display-access.guard";

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot()],
  controllers: [CaredeskController, CaredeskDisplayController],
  providers: [
    SessionGuard,
    DisplayAccessGuard,
    CaredeskDisplayEventsService,
    CaredeskDisplayService,
    CaredeskService,
    CaredeskRepository,
    CaredeskNasStorageAdapter,
    CaredeskReportPdfService,
    CaredeskServiceNoteScannerService,
    CaredeskCronService
  ]
})
export class CaredeskModule {}
