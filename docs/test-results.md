# Test Results

Validation date: 2026-05-27

This note supersedes earlier v1 validation notes. Active runtime scope is Fadhil CareDesk only: \/caredesk\/* backend endpoints and the current CareDesk frontend routes.

## Current Verification

| Command | Result | Notes |
| --- | --- | --- |
| \corepack pnpm vitest run tests\/contract\/openapi-validation.test.ts\ | PASS | Active controller routes match \caredeskOpenApiMetadata\; legacy route names are absent from active metadata. |
| \corepack pnpm vitest run tests\/contract\/caredesk-v2.contract.test.ts\ | PASS | CareDesk v2 endpoint list, role enum, and status enum remain locked. |
| \corepack pnpm vitest run apps\/web\/src\/features\/caredesk\/api\/caredesk-api.test.ts\ | PASS | Frontend API adapter passes; includes customer merging, checklist image CRUD, export CSV\/PDF, and settings with flow rules. |
| \corepack pnpm vitest run apps\/web\/src\/features\/caredesk\/domain\/domain.test.ts\ | PASS | Domain helpers pass; includes reports dashboard with technician workload, pickup metrics, and customer detail. |
| \corepack pnpm vitest run tests\/integration\/caredesk-v2.integration.test.ts\ | PASS | Prisma\/Postgres CareDesk workflow, RBAC, PDF, checklist image, pickup, cron, locked rules enforcement, retention purge, and CSV\/PDF export checks pass. |
| \corepack pnpm --filter @repair-ops\/api build\ | PASS | API builds with \DatabaseModule\ + \CareDeskModule\ + \ThrottlerModule\ + helmet + production exception filter. |
| \corepack pnpm --filter @repair-ops\/domain build\ | PASS | Domain exports CareDesk types including extended \CaredeskFlowRules\. |
| \corepack pnpm --filter @repair-ops\/web build\ | PASS | Build output contains 16 static CareDesk routes; no legacy routes. |
| \corepack pnpm --filter @repair-ops\/database prisma generate\ | PASS | Prisma Client generated successfully. |
| \corepack pnpm exec playwright test tests\/e2e\/ --project=chromium\ | PASS | 13\/13 E2E specs pass (owner journey, technician journey, mobile viewport). |

## Test Summary

- **Test files**: 6 passed (6)
- **Total tests**: 66 passed (66)
- **Integration tests**: 14 passed (14) -- includes cron, locked rules, CSV\/PDF export, retention purge
- **Contract tests**: 2 passed (2)
- **Frontend tests**: 14 passed (14) -- API adapter + domain
- **Backend unit tests**: 4 passed (4) -- PDF service + cron

## Active Frontend Routes

- \/dashboard\
- \/jobs\
- \/jobs\/[jobId]\
- \/scan\
- \/my-jobs\
- \/review\
- \/checklist-reports\
- \/pickup\
- \/notifications\
- \/customers\
- \/reports\
- \/settings\

## Active Backend Endpoints (CareDesk v2)

Auth, jobs, diagnosis, owner review, customer decision, repair progress, ready pickup, complete pickup, mark unclaimed, evidence upload, checklist reports, checklist images, pickup queue, notifications, customers, reports (with CSV\/PDF export), settings, users, service notes scan, files, and health check.

## Removed Legacy Surface

- Store Staff runtime role.
- Quotation module.
- Payment module and payment proof flow.
- Invoice\/receipt handling.
- Customer approval links.
- Legacy \/repair\/, \/technicians\/, \/quotations\/, \/payments\/, and \/approve\/[token] frontend routes.

## Known Limitations

- PDF service unit tests show occasional Chrome launch failures under parallel test load; integration PDF tests pass.
- Rate limiting uses in-memory storage; for multi-instance deployment, switch to Redis-backed \ThrottlerStorage\.
- Notification templates use simple variable substitution (\{{customerName}}\, \{{jobIdDisplay}}\, \{{stageDay}}); no rich logic yet.
