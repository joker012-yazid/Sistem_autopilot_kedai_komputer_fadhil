import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import type { Request } from "express";
import type { ChecklistImageSection } from "../../../../packages/domain/src";
import { CurrentUser } from "../auth/current-user.decorator";
import { SessionGuard } from "../auth/session.guard";
import type { UserRecord } from "../auth/user-record";
import { CaredeskService } from "./caredesk.service";
import type { CaredeskStoredFile } from "./caredesk-storage.adapter";

type CreateJobRequest = Parameters<CaredeskService["createJob"]>[0];
type DiagnosisRequest = Parameters<CaredeskService["addDiagnosis"]>[1];
type OwnerReviewRequest = Parameters<CaredeskService["ownerReview"]>[1];
type CustomerDecisionRequest = Parameters<CaredeskService["customerDecision"]>[1];
type RepairProgressRequest = Parameters<CaredeskService["repairProgress"]>[1];
type ReadyPickupRequest = Parameters<CaredeskService["readyPickup"]>[1];
type SaveChecklistRequest = Parameters<CaredeskService["saveChecklistReport"]>[1];
type UpdateChecklistImageRequest = Parameters<CaredeskService["updateChecklistImageCaption"]>[2];
type NotificationResultRequest = Parameters<CaredeskService["recordNotificationResult"]>[1];
type ReportExportRequest = Parameters<CaredeskService["recordReportExport"]>[1];
type UpdateSettingsRequest = Parameters<CaredeskService["updateSettings"]>[1];
type TestScannerSettingsRequest = Parameters<CaredeskService["testScannerSettings"]>[1];
type LoginRequest = Parameters<CaredeskService["login"]>[0];
type SetupOwnerRequest = Parameters<CaredeskService["setupOwner"]>[0];
type CreateUserRequest = Parameters<CaredeskService["createUser"]>[0];
type UpdateUserRequest = Parameters<CaredeskService["updateUser"]>[1];
type ResetPasswordRequest = Parameters<CaredeskService["resetUserPassword"]>[1];

@Controller("caredesk")
@UseGuards(SessionGuard)
export class CaredeskController {
  constructor(@Inject(CaredeskService) private readonly caredesk: CaredeskService) {}

  @Get("auth/setup-status")
  setupStatus() {
    return this.caredesk.setupStatus();
  }

  @Post("auth/setup")
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  async setup(@Body() body: SetupOwnerRequest, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.caredesk.setupOwner(body, requestMeta(request));
    setSessionCookie(response, result.sessionId, result.expiresAt);
    return result.user;
  }

  @Post("auth/login")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  async login(@Body() body: LoginRequest, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.caredesk.login(body, requestMeta(request));
    setSessionCookie(response, result.sessionId, result.expiresAt);
    return result.user;
  }

  @Post("auth/logout")
  @HttpCode(200)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.caredesk.logout(sessionIdFromCookie(request));
    clearSessionCookie(response);
    return { ok: true };
  }

  @Get("auth/me")
  me(@CurrentUser() user: UserRecord) {
    return this.caredesk.me(user);
  }

  @Get("session")
  session(@CurrentUser() user: UserRecord) {
    return this.caredesk.session(user);
  }
  @Get("files")
  async serveFile(@Query("path") storagePath: string, @CurrentUser() user: UserRecord, @Res() response: Response) {
    const { buffer, mimeType } = await this.caredesk.serveFile(storagePath, user);
    response.setHeader("Content-Type", mimeType);
    response.send(buffer);
  }

  @Post("service-notes/scan")
  @UseInterceptors(FileInterceptor("file"))
  scanServiceNote(@UploadedFile() file: CaredeskStoredFile | undefined, @CurrentUser() user: UserRecord) {
    return this.caredesk.scanServiceNote(file, user);
  }

  @Get("jobs")
  listJobs(@CurrentUser() user: UserRecord) {
    return this.caredesk.listJobs(user);
  }

  @Post("jobs")
  createJob(@Body() body: CreateJobRequest, @CurrentUser() user: UserRecord) {
    return this.caredesk.createJob(body, user);
  }

  @Get("jobs/:jobId")
  getJob(@Param("jobId") jobId: string, @CurrentUser() user: UserRecord) {
    return this.caredesk.getJob(jobId, user);
  }

  @Get("jobs/:jobId/customer-report")
  customerReport(@Param("jobId") jobId: string, @CurrentUser() user: UserRecord) {
    return this.caredesk.getCustomerReport(jobId, user);
  }

  @Get("jobs/:jobId/customer-report.pdf")
  async customerReportPdf(@Param("jobId") jobId: string, @CurrentUser() user: UserRecord, @Res() response: Response) {
    const report = await this.caredesk.getCustomerReport(jobId, user);
    const pdf = await this.caredesk.customerReportPdf(jobId, user);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${report.jobIdDisplay}-customer-report.pdf"`);
    response.send(pdf);
  }

  @Post("jobs/:jobId/take")
  @HttpCode(200)
  takeJob(@Param("jobId") jobId: string, @CurrentUser() user: UserRecord) {
    return this.caredesk.takeJob(jobId, user);
  }

  @Post("jobs/:jobId/release")
  @HttpCode(200)
  releaseJob(@Param("jobId") jobId: string, @CurrentUser() user: UserRecord) {
    return this.caredesk.releaseJob(jobId, user);
  }

  @Post("jobs/:jobId/diagnosis")
  addDiagnosis(@Param("jobId") jobId: string, @Body() body: DiagnosisRequest, @CurrentUser() user: UserRecord) {
    return this.caredesk.addDiagnosis(jobId, body, user);
  }

  @Post("jobs/:jobId/owner-review")
  @HttpCode(200)
  ownerReview(@Param("jobId") jobId: string, @Body() body: OwnerReviewRequest, @CurrentUser() user: UserRecord) {
    return this.caredesk.ownerReview(jobId, body, user);
  }

  @Post("jobs/:jobId/customer-decision")
  @HttpCode(200)
  customerDecision(@Param("jobId") jobId: string, @Body() body: CustomerDecisionRequest, @CurrentUser() user: UserRecord) {
    return this.caredesk.customerDecision(jobId, body, user);
  }

  @Post("jobs/:jobId/repair-progress")
  @HttpCode(200)
  repairProgress(@Param("jobId") jobId: string, @Body() body: RepairProgressRequest, @CurrentUser() user: UserRecord) {
    return this.caredesk.repairProgress(jobId, body, user);
  }

  @Post("jobs/:jobId/ready-pickup")
  @HttpCode(200)
  readyPickup(@Param("jobId") jobId: string, @Body() body: ReadyPickupRequest, @CurrentUser() user: UserRecord) {
    return this.caredesk.readyPickup(jobId, body, user);
  }

  @Post("jobs/:jobId/complete-pickup")
  @HttpCode(200)
  completePickup(@Param("jobId") jobId: string, @CurrentUser() user: UserRecord) {
    return this.caredesk.completePickup(jobId, user);
  }

  @Post("jobs/:jobId/mark-unclaimed")
  @HttpCode(200)
  markUnclaimed(@Param("jobId") jobId: string, @CurrentUser() user: UserRecord) {
    return this.caredesk.markUnclaimed(jobId, user);
  }

  @Post("jobs/:jobId/evidence")
  @UseInterceptors(FileInterceptor("file"))
  uploadEvidence(
    @Param("jobId") jobId: string,
    @Body() body: { category?: string; caption?: string },
    @UploadedFile() file: CaredeskStoredFile | undefined,
    @CurrentUser() user: UserRecord
  ) {
    if (!file) {
      throw new BadRequestException("Evidence file is required");
    }
    return this.caredesk.uploadEvidence(jobId, file, { category: body.category ?? "diagnosis", caption: body.caption }, user);
  }

  @Get("checklist-reports")
  listChecklistReports(@CurrentUser() user: UserRecord) {
    return this.caredesk.listChecklistReports(user);
  }

  @Get("checklist-reports/:jobId.pdf")
  async checklistReportPdf(@Param("jobId") jobId: string, @CurrentUser() user: UserRecord, @Res() response: Response) {
    const report = await this.caredesk.getChecklistReport(jobId, user);
    const pdf = await this.caredesk.checklistReportPdf(jobId, user);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${report.jobIdDisplay}-checklist-report.pdf"`);
    response.send(pdf);
  }

  @Get("checklist-reports/:jobId")
  getChecklistReport(@Param("jobId") jobId: string, @CurrentUser() user: UserRecord) {
    return this.caredesk.getChecklistReport(jobId, user);
  }

  @Put("checklist-reports/:jobId")
  saveChecklistReport(@Param("jobId") jobId: string, @Body() body: SaveChecklistRequest, @CurrentUser() user: UserRecord) {
    return this.caredesk.saveChecklistReport(jobId, body, user);
  }

  @Post("checklist-reports/:jobId/images")
  @UseInterceptors(FileInterceptor("file"))
  uploadChecklistImage(
    @Param("jobId") jobId: string,
    @Body() body: { section?: ChecklistImageSection; caption?: string },
    @UploadedFile() file: CaredeskStoredFile | undefined,
    @CurrentUser() user: UserRecord
  ) {
    if (!file) {
      throw new BadRequestException("Checklist image file is required");
    }
    return this.caredesk.uploadChecklistImage(jobId, body.section ?? "diagnosis", body.caption, file, user);
  }

  @Patch("checklist-reports/:jobId/images/:imageId")
  updateChecklistImageCaption(
    @Param("jobId") jobId: string,
    @Param("imageId") imageId: string,
    @Body() body: UpdateChecklistImageRequest,
    @CurrentUser() user: UserRecord
  ) {
    return this.caredesk.updateChecklistImageCaption(jobId, imageId, body, user);
  }

  @Delete("checklist-reports/:jobId/images/:imageId")
  @HttpCode(200)
  deleteChecklistImage(@Param("jobId") jobId: string, @Param("imageId") imageId: string, @CurrentUser() user: UserRecord) {
    return this.caredesk.deleteChecklistImage(jobId, imageId, user);
  }

  @Get("pickup")
  pickup(@Query("now") now: string | undefined, @CurrentUser() user: UserRecord) {
    return this.caredesk.pickupQueue(user, now);
  }

  @Get("notifications")
  notifications(@CurrentUser() user: UserRecord) {
    return this.caredesk.listNotifications(user);
  }

  @Post("notifications/:notificationId/result")
  @HttpCode(200)
  notificationResult(
    @Param("notificationId") notificationId: string,
    @Body() body: NotificationResultRequest,
    @CurrentUser() user: UserRecord
  ) {
    return this.caredesk.recordNotificationResult(notificationId, body, user);
  }

  @Get("customers")
  customers(@CurrentUser() user: UserRecord) {
    return this.caredesk.listCustomers(user);
  }

  @Get("customers/:customerId")
  customer(@Param("customerId") customerId: string, @CurrentUser() user: UserRecord) {
    return this.caredesk.getCustomer(customerId, user);
  }

  @Get("reports")
  reports(@CurrentUser() user: UserRecord) {
    return this.caredesk.reports(user);
  }

  @Post("reports/export-audit")
  @HttpCode(200)
  reportExportAudit(@Body() body: ReportExportRequest, @CurrentUser() user: UserRecord) {
    return this.caredesk.recordReportExport(user, body);
  }

  @Post("reports/export-csv")
  @HttpCode(200)
  async exportCsv(@Body() body: { range?: string }, @CurrentUser() user: UserRecord, @Res() response: Response) {
    const { csvBuffer, filename } = await this.caredesk.exportJobsCsv(user, body.range ?? "all");
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    response.send(csvBuffer);
  }

  @Post("reports/export-pdf")
  @HttpCode(200)
  async exportPdf(@Body() body: { range?: string }, @CurrentUser() user: UserRecord, @Res() response: Response) {
    const { pdfBuffer, filename } = await this.caredesk.exportJobsPdf(user, body.range ?? "all");
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    response.send(pdfBuffer);
  }

  @Get("settings")
  settings(@CurrentUser() user: UserRecord) {
    return this.caredesk.getSettings(user);
  }

  @Put("settings")
  updateSettings(@Body() body: UpdateSettingsRequest, @CurrentUser() user: UserRecord) {
    return this.caredesk.updateSettings(user, body);
  }

  @Post("settings/scanner/test")
  @HttpCode(200)
  testScannerSettings(@Body() body: TestScannerSettingsRequest, @CurrentUser() user: UserRecord) {
    return this.caredesk.testScannerSettings(user, body);
  }

  @Get("users")
  users(@CurrentUser() user: UserRecord) {
    return this.caredesk.listUsers(user);
  }

  @Post("users")
  createUser(@Body() body: CreateUserRequest, @CurrentUser() user: UserRecord) {
    return this.caredesk.createUser(body, user);
  }

  @Patch("users/:userId")
  updateUser(@Param("userId") userId: string, @Body() body: UpdateUserRequest, @CurrentUser() user: UserRecord) {
    return this.caredesk.updateUser(userId, body, user);
  }

  @Post("users/:userId/reset-password")
  @HttpCode(200)
  resetUserPassword(@Param("userId") userId: string, @Body() body: ResetPasswordRequest, @CurrentUser() user: UserRecord) {
    return this.caredesk.resetUserPassword(userId, body, user);
  }

}

function requestMeta(request: Request) {
  return {
    userAgent: request.header("user-agent"),
    ip: request.ip
  };
}

function setSessionCookie(response: Response, sessionId: string, expiresAt: Date) {
  response.cookie("caredesk_session", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSessionCookieSecure(),
    expires: expiresAt,
    path: "/"
  });
}

function clearSessionCookie(response: Response) {
  response.clearCookie("caredesk_session", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSessionCookieSecure(),
    path: "/"
  });
}

function isSessionCookieSecure() {
  const configured = process.env.CAREDESK_COOKIE_SECURE?.trim().toLowerCase();
  if (configured === "true") {
    return true;
  }
  if (configured === "false") {
    return false;
  }
  return process.env.NODE_ENV === "production";
}

function sessionIdFromCookie(request: Request) {
  return request.header("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("caredesk_session="))
    ?.slice("caredesk_session=".length);
}



