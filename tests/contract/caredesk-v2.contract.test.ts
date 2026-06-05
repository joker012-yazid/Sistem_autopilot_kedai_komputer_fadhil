import { describe, expect, it } from "vitest";
import { caredeskOpenApiMetadata } from "../../apps/api/src/openapi";
import { caredeskJobStatuses, caredeskRoles } from "@repair-ops/domain";

describe("caredesk v2 contract", () => {
  it("exposes only repair-only caredesk routes", () => {
    expect(caredeskOpenApiMetadata.endpoints).toEqual([
      "GET /caredesk/auth/setup-status",
      "POST /caredesk/auth/setup",
      "POST /caredesk/auth/login",
      "POST /caredesk/auth/logout",
      "GET /caredesk/auth/me",
      "GET /caredesk/session",
      "GET /caredesk/files",
      "GET /caredesk/users",
      "POST /caredesk/users",
      "PATCH /caredesk/users/:userId",
      "POST /caredesk/users/:userId/reset-password",
      "POST /caredesk/service-notes/scan",
      "GET /caredesk/display/snapshot",
      "GET /caredesk/display/stream",
      "GET /caredesk/jobs",
      "POST /caredesk/jobs",
      "GET /caredesk/jobs/:jobId",
      "GET /caredesk/jobs/:jobId/customer-report",
      "GET /caredesk/jobs/:jobId/customer-report.pdf",
      "POST /caredesk/jobs/:jobId/take",
      "POST /caredesk/jobs/:jobId/release",
      "POST /caredesk/jobs/:jobId/diagnosis",
      "POST /caredesk/jobs/:jobId/owner-review",
      "POST /caredesk/jobs/:jobId/customer-decision",
      "POST /caredesk/jobs/:jobId/repair-progress",
      "POST /caredesk/jobs/:jobId/ready-pickup",
      "POST /caredesk/jobs/:jobId/complete-pickup",
      "POST /caredesk/jobs/:jobId/mark-unclaimed",
      "POST /caredesk/jobs/:jobId/evidence",
      "GET /caredesk/checklist-reports",
      "GET /caredesk/checklist-reports/:jobId",
      "GET /caredesk/checklist-reports/:jobId.pdf",
      "PUT /caredesk/checklist-reports/:jobId",
      "POST /caredesk/checklist-reports/:jobId/images",
      "PATCH /caredesk/checklist-reports/:jobId/images/:imageId",
      "DELETE /caredesk/checklist-reports/:jobId/images/:imageId",
      "GET /caredesk/pickup",
      "GET /caredesk/notifications",
      "POST /caredesk/notifications/:notificationId/result",
      "GET /caredesk/customers",
      "GET /caredesk/customers/:customerId",
      "GET /caredesk/reports",
      "POST /caredesk/reports/export-audit",
      "POST /caredesk/reports/export-csv",
      "POST /caredesk/reports/export-pdf",
      "GET /caredesk/settings",
      "POST /caredesk/settings/scanner/test",
      "PUT /caredesk/settings"
    ]);
    expect(caredeskOpenApiMetadata.endpoints.join(" ")).not.toMatch(/quotation|payment|invoice|approval-links/i);
  });

  it("locks v2 roles and job statuses to the prototype scope", () => {
    expect(caredeskRoles).toEqual(["owner", "technician"]);
    expect(caredeskJobStatuses).toEqual([
      "NEW JOB",
      "WAITING FADHIL REVIEW",
      "WAITING CUSTOMER CONFIRMATION",
      "IN PROGRESS",
      "NOT PROCEED",
      "READY PICKUP",
      "UNCLAIMED",
      "COMPLETE"
    ]);
  });
});



