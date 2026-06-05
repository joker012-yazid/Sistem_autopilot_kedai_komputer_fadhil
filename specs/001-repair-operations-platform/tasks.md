# Tasks: Repair Operations Platform

**Input**: Design documents from `/specs/001-repair-operations-platform/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests**: Included because the implementation plan, quickstart, and constitution require coverage for lifecycle transitions, RBAC, upload validation, quotation approval, payment completion, and audit logging.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and does not depend on incomplete tasks.
- **[Story]**: Which user story this task belongs to.
- Every task includes an exact file path.

## Path Conventions

- **Web app**: `apps/web/src/`
- **Backend API**: `apps/api/src/`
- **Shared domain**: `packages/domain/src/`
- **Database**: `packages/database/prisma/`
- **Tests**: `tests/contract/`, `tests/integration/`, `tests/e2e/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the TypeScript monorepo, app skeletons, tooling, and local runtime files.

- [X] T001 Create monorepo workspace configuration in package.json
- [X] T002 Create package manager workspace file in pnpm-workspace.yaml
- [X] T003 [P] Configure TypeScript base settings in tsconfig.base.json
- [X] T004 [P] Configure linting rules in eslint.config.js
- [X] T005 [P] Configure formatting rules in .prettierrc
- [X] T006 Create frontend Next.js app scaffold in apps/web/package.json
- [X] T007 Create backend NestJS app scaffold in apps/api/package.json
- [-] T008 Skipped - cron scheduler runs in API via @nestjs/schedule
- [X] T009 [P] Create shared domain package scaffold in packages/domain/package.json
- [X] T010 [P] Create config package scaffold in packages/config/package.json
- [X] T011 [P] Create database package scaffold in packages/database/package.json
- [X] T012 [P] Create test utilities package scaffold in packages/test-utils/package.json
- [X] T013 Configure local Docker services for PostgreSQL and test storage in infra/docker/docker-compose.yml
- [X] T014 Create environment example with database, session, storage, and notification settings in infra/env/.env.example
- [X] T015 Create repository README with setup commands in README.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared domain, database, auth, RBAC, storage, audit, and routing foundations required by all user stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T016 Define repair lifecycle, role, attachment, notification, payment, and quote enums in packages/domain/src/enums.ts
- [X] T017 Define shared Zod schemas for customers, devices, jobs, diagnoses, quotations, approvals, attachments, payments, notifications, and audit logs in packages/domain/src/schemas.ts
- [X] T018 Define RBAC permission map for Owner/Manager, Technician, and Store Staff in packages/domain/src/permissions.ts
- [X] T019 Define lifecycle transition guardrails in packages/domain/src/lifecycle.ts
- [X] T020 Define audit action names and audit payload helpers in packages/domain/src/audit.ts
- [X] T021 Create Prisma schema for organizations, branches, users, customers, devices, jobs, status history, diagnoses, quotations, approvals, attachments, payments, notifications, and audit logs in packages/database/prisma/schema.prisma
- [X] T022 Create initial seed data for one organization, one branch, Owner/Manager, Technician, and Store Staff in packages/database/prisma/seed.ts
- [X] T023 Configure database client module in apps/api/src/database/database.module.ts
- [X] T024 Configure API application bootstrap, validation, CORS, and error handling in apps/api/src/main.ts
- [X] T025 Configure API root module wiring auth, audit, jobs, attachments, notifications, and reports modules in apps/api/src/app.module.ts
- [X] T026 Implement session authentication guard in apps/api/src/auth/session.guard.ts
- [X] T027 Implement role permission guard using shared RBAC map in apps/api/src/auth/permission.guard.ts
- [X] T028 Implement current-user decorator in apps/api/src/auth/current-user.decorator.ts
- [X] T029 Implement append-only audit service in apps/api/src/audit/audit.service.ts
- [X] T030 Implement audit interceptor for sensitive commands in apps/api/src/audit/audit.interceptor.ts
- [X] T031 Implement storage adapter interface for local, SMB, and WebDAV drivers in apps/api/src/attachments/storage.adapter.ts
- [X] T032 Implement deterministic job evidence path builder in apps/api/src/attachments/storage-path.service.ts
- [X] T033 Implement upload validation for category, size, filename, MIME, and permission in apps/api/src/attachments/upload-validation.service.ts
- [X] T034 Implement notification consent policy in apps/api/src/notifications/consent-policy.service.ts
- [X] T035 Implement secure approval token service in apps/api/src/quotations/approval-token.service.ts
- [X] T036 Configure OpenAPI generation from API modules in apps/api/src/openapi.ts
- [X] T037 Configure Vitest for shared and API tests in vitest.config.ts
- [X] T038 Configure Playwright for browser journeys in playwright.config.ts
- [X] T039 Create API test app bootstrap utilities in packages/test-utils/src/api-test-app.ts
- [X] T040 Create authenticated test user fixtures for all roles in packages/test-utils/src/auth-fixtures.ts

**Checkpoint**: Foundation ready. User story work can begin.

---

## Phase 3: User Story 1 - Register and Track a Repair Job (Priority: P1) MVP

**Goal**: Store Staff can register a customer repair job with device details and service-note evidence, receive a Job ID, and see it in the active repair queue.

**Independent Test**: Create a job from customer arrival through service-note capture, locate it by Job ID, and verify it appears as `NEW JOB` without using chat as the record.

### Tests for User Story 1

- [X] T041 [P] [US1] Add contract tests for POST /jobs and GET /jobs in tests/contract/jobs.contract.test.ts
- [X] T042 [P] [US1] Add integration tests for customer, device, job, status history, NAS path, and audit creation in tests/integration/job-intake.integration.test.ts
- [X] T043 [P] [US1] Add upload validation tests for service-note evidence in tests/integration/service-note-upload.integration.test.ts
- [X] T044 [P] [US1] Add Store Staff intake browser journey in tests/e2e/store-staff-intake.spec.ts

### Implementation for User Story 1

- [X] T045 [P] [US1] Create customers API module, service, controller, and DTOs in apps/api/src/customers/customers.module.ts
- [X] T046 [P] [US1] Create devices API module, service, controller, and DTOs in apps/api/src/devices/devices.module.ts
- [X] T047 [US1] Create jobs API module, service, controller, and DTOs for intake and list views in apps/api/src/jobs/jobs.module.ts
- [X] T048 [US1] Implement Job ID generation and deterministic NAS folder creation in apps/api/src/jobs/job-number.service.ts
- [X] T049 [US1] Implement job status history creation on intake in apps/api/src/jobs/status-history.service.ts
- [X] T050 [US1] Implement service-note attachment endpoint for intake evidence in apps/api/src/attachments/attachments.controller.ts
- [X] T051 [US1] Implement Store Staff intake form and validation in apps/web/src/features/intake/IntakeForm.tsx
- [X] T052 [US1] Implement active repair queue view with Job ID search and status filters in apps/web/src/features/jobs/JobQueue.tsx
- [X] T053 [US1] Implement owner dashboard active job summary card in apps/web/src/features/dashboard/ActiveJobsSummary.tsx
- [X] T054 [US1] Wire intake, queue, and job detail routes in apps/web/src/app/jobs/page.tsx
- [X] T055 [US1] Add US1 audit events for job creation, service-note upload, and status initialization in apps/api/src/jobs/jobs.service.ts

**Checkpoint**: US1 works independently.

---

## Phase 4: User Story 2 - Diagnose and Submit Evidence (Priority: P1)

**Goal**: Technicians can add diagnosis notes, attach evidence, submit jobs for owner review, and cannot set final pricing.

**Independent Test**: A technician opens a job, adds diagnosis and evidence, submits for review, and the owner sees complete context in the timeline.

### Tests for User Story 2

- [X] T056 [P] [US2] Add contract tests for POST /jobs/{jobId}/diagnoses in tests/contract/diagnoses.contract.test.ts
- [X] T057 [P] [US2] Add integration tests for diagnosis submission and `WAITING FADHIL REVIEW` transition in tests/integration/diagnosis-submission.integration.test.ts
- [X] T058 [P] [US2] Add RBAC tests proving Technician cannot finalize quotation price in tests/integration/technician-pricing-rbac.integration.test.ts
- [X] T059 [P] [US2] Add technician job detail browser journey in tests/e2e/technician-diagnosis.spec.ts

### Implementation for User Story 2

- [X] T060 [US2] Create diagnoses API module, service, controller, and DTOs in apps/api/src/diagnoses/diagnoses.module.ts
- [X] T061 [US2] Implement diagnosis evidence category handling in apps/api/src/attachments/diagnosis-attachment.service.ts
- [X] T062 [US2] Implement diagnosis submission lifecycle transition in apps/api/src/jobs/lifecycle.service.ts
- [X] T063 [US2] Implement technician-safe job detail API projection in apps/api/src/jobs/job-detail.presenter.ts
- [X] T064 [US2] Implement technician diagnosis form, save draft, update progress, and submit actions in apps/web/src/features/diagnosis/DiagnosisPanel.tsx
- [X] T065 [US2] Implement job timeline component showing diagnosis and evidence events in apps/web/src/features/jobs/JobTimeline.tsx
- [X] T066 [US2] Add owner review queue item for diagnosis submissions in apps/web/src/features/dashboard/OwnerReviewQueue.tsx
- [X] T067 [US2] Add US2 audit events for diagnosis draft, evidence upload, submission, and blocked pricing attempt in apps/api/src/diagnoses/diagnoses.service.ts

**Checkpoint**: US2 works independently after foundation and US1 job records exist.

---

## Phase 5: User Story 3 - Review, Quote, and Capture Customer Decision (Priority: P1)

**Goal**: Owner/Manager can review diagnosis, create/send quotation, and capture customer approval, rejection, or no-repair decision through a secure link.

**Independent Test**: Owner sends a quotation, customer records a structured decision, and the job moves to the correct next status.

### Tests for User Story 3

- [X] T068 [P] [US3] Add contract tests for quotation create, send, and approval-link decision endpoints in tests/contract/quotations.contract.test.ts
- [X] T069 [P] [US3] Add integration tests for quotation revision, send, and customer approval transition to `IN PROGRESS` in tests/integration/quotation-approval.integration.test.ts
- [X] T070 [P] [US3] Add integration tests for rejection and no-repair terminal states in tests/integration/customer-decision-terminal.integration.test.ts
- [X] T071 [P] [US3] Add approval link expiry and reuse tests in tests/integration/approval-link-security.integration.test.ts
- [X] T072 [P] [US3] Add owner quotation browser journey in tests/e2e/owner-quotation.spec.ts

### Implementation for User Story 3

- [X] T073 [US3] Create quotations API module, service, controller, and DTOs in apps/api/src/quotations/quotations.module.ts
- [X] T074 [US3] Implement Owner/Manager-only quotation pricing guard in apps/api/src/quotations/quotation-permissions.service.ts
- [X] T075 [US3] Implement quotation revision and superseded-version behavior in apps/api/src/quotations/quotation-version.service.ts
- [X] T076 [US3] Implement quotation send flow with notification consent and approval token creation in apps/api/src/quotations/send-quotation.service.ts
- [X] T077 [US3] Implement public approval-link decision controller in apps/api/src/quotations/approval-links.controller.ts
- [X] T078 [US3] Implement customer decision lifecycle updates for approved, rejected, and no-repair outcomes in apps/api/src/jobs/customer-decision.service.ts
- [X] T079 [US3] Implement owner quotation review and send UI in apps/web/src/features/quotations/QuotationReview.tsx
- [X] T080 [US3] Implement customer approval link page in apps/web/src/app/approve/[token]/page.tsx
- [-] T081 Skipped - notification cron runs in CaredeskCronService within API
- [X] T082 [US3] Add US3 audit events for quotation create, revision, send, approval, rejection, no-repair, and expired link attempts in apps/api/src/quotations/quotations.service.ts

**Checkpoint**: US3 completes the approval handoff and enables repair progress.

---

## Phase 6: User Story 4 - Complete Repair, Pickup, and Payment (Priority: P2)

**Goal**: Approved jobs can move through repair progress, ready pickup, payment capture, and completion with payment proof and audit history.

**Independent Test**: An approved job is marked ready pickup, paid, completed, and remains reviewable in timeline and reports.

### Tests for User Story 4

- [X] T083 [P] [US4] Add contract tests for POST /jobs/{jobId}/payments and POST /jobs/{jobId}/complete in tests/contract/payments.contract.test.ts
- [X] T084 [P] [US4] Add integration tests for ready pickup, payment proof, and completion preconditions in tests/integration/payment-completion.integration.test.ts
- [X] T085 [P] [US4] Add RBAC tests for payment capture and completion authority in tests/integration/payment-rbac.integration.test.ts
- [X] T086 [P] [US4] Add pickup and payment browser journey in tests/e2e/pickup-payment.spec.ts

### Implementation for User Story 4

- [X] T087 [US4] Create payments API module, service, controller, and DTOs in apps/api/src/payments/payments.module.ts
- [X] T088 [US4] Implement repair progress and ready-pickup transitions in apps/api/src/jobs/repair-progress.service.ts
- [X] T089 [US4] Implement payment proof attachment category and validation in apps/api/src/attachments/payment-proof.service.ts
- [X] T090 [US4] Implement job completion precondition checks in apps/api/src/jobs/completion.service.ts
- [X] T091 [US4] Implement technician ready-pickup action in apps/web/src/features/repair/ReadyPickupAction.tsx
- [X] T092 [US4] Implement Store Staff payment capture form in apps/web/src/features/payments/PaymentForm.tsx
- [X] T093 [US4] Implement complete job action and completed-state view in apps/web/src/features/jobs/CompleteJobAction.tsx
- [X] T094 [US4] Add US4 audit events for ready pickup, payment record, payment proof upload, and completion in apps/api/src/payments/payments.service.ts

**Checkpoint**: US4 closes the repair loop from approval to completion.

---

## Phase 7: User Story 5 - Monitor Operations and Reports (Priority: P3)

**Goal**: Owner can monitor active jobs, bottlenecks, payments, technician workload, and completed repair history.

**Independent Test**: Owner dashboard and reports show jobs by status, owner-action queues, customer-confirmation queues, ready pickups, payments, and completed jobs for a selected period.

### Tests for User Story 5

- [X] T095 [P] [US5] Add contract tests for GET /dashboard/owner and GET /reports/jobs in tests/contract/reports.contract.test.ts
- [X] T096 [P] [US5] Add integration tests for dashboard metrics and report date filtering in tests/integration/owner-reporting.integration.test.ts
- [X] T097 [P] [US5] Add Owner/Manager-only report access tests in tests/integration/reports-rbac.integration.test.ts
- [X] T098 [P] [US5] Add owner dashboard and reports browser journey in tests/e2e/owner-dashboard-reports.spec.ts

### Implementation for User Story 5

- [X] T099 [US5] Create reports API module, service, controller, and DTOs in apps/api/src/reports/reports.module.ts
- [X] T100 [US5] Implement owner dashboard aggregation queries in apps/api/src/reports/owner-dashboard.service.ts
- [X] T101 [US5] Implement job and payment report date-range queries in apps/api/src/reports/job-report.service.ts
- [X] T102 [US5] Implement dashboard status cards and action queues in apps/web/src/features/dashboard/OwnerDashboard.tsx
- [X] T103 [US5] Implement reports filters and result table in apps/web/src/features/reports/JobReports.tsx
- [X] T104 [US5] Implement technician workload report card in apps/web/src/features/reports/TechnicianWorkload.tsx
- [X] T105 [US5] Add US5 audit events for report export and sensitive report access in apps/api/src/reports/reports.service.ts

**Checkpoint**: US5 gives owner monitoring and reporting without chat reconstruction.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Harden the MVP, verify quickstart, and prepare for implementation handoff.

- [X] T106 [P] Update local developer quickstart commands in docs/development.md
- [X] T107 [P] Add production deployment notes for database, NAS, backups, and environment secrets in docs/deployment.md
- [X] T108 [P] Add privacy notice and notification consent wording in docs/privacy-notice.md
- [X] T109 [P] Add backup and recovery checklist for PostgreSQL and NAS evidence in docs/backup-recovery.md
- [X] T110 Run full contract test suite and document command in docs/test-results.md
- [X] T111 Run full integration test suite and document command in docs/test-results.md
- [X] T112 Run full Playwright journey suite and document command in docs/test-results.md
- [X] T113 Validate OpenAPI contract against implemented routes in tests/contract/openapi-validation.test.ts
- [X] T114 Validate quickstart MVP journey end-to-end and record outcome in specs/001-repair-operations-platform/quickstart.md
- [X] T115 Review all role boundaries, audit events, upload validation, notification consent, and lifecycle transitions against specs/001-repair-operations-platform/checklists/requirements.md

---

## Phase 9: Advanced Operational UI Polish & Module Backend

**Purpose**: Add complete operational sidebar modules, full read/update/archive backend support, and shared UI polish without changing the completed repair workflow.

- [X] T116 [P] [P9] Add contract tests for customer and device CRUD endpoints in tests/contract/operational-modules.contract.test.ts
- [X] T117 [P] [P9] Add contract tests for technician, quotation, payment, and settings module endpoints in tests/contract/operational-modules.contract.test.ts
- [X] T118 [P] [P9] Add integration tests for module RBAC, soft archive/deactivate/void behavior, and audit logging in tests/integration/operational-modules.integration.test.ts
- [X] T119 [P] [P9] Extend E2E journey for owner sidebar modules and Store Staff blocked management actions in tests/e2e/store-staff-intake.cjs
- [X] T120 [P9] Add Phase 9 domain schemas, summaries, permissions, and audit actions in packages/domain/src
- [X] T121 [P9] Implement customer and device CRUD services/controllers in apps/api/src/customers and apps/api/src/devices
- [X] T122 [P9] Implement technician CRUD/deactivate services/controllers in apps/api/src/technicians
- [X] T123 [P9] Implement quotation list/detail/revise/void module endpoints in apps/api/src/quotations
- [X] T124 [P9] Implement payment list/detail/edit/void module endpoints in apps/api/src/payments
- [X] T125 [P9] Implement system settings read/update module endpoints in apps/api/src/settings
- [X] T126 [P9] Extend in-memory database service with Phase 9 module records, soft state, audit events, and settings state
- [X] T127 [P9] Update OpenAPI metadata and contract for Phase 9 endpoints
- [X] T128 [P9] Add typed frontend API client methods for customers, devices, technicians, quotations, payments, and settings in apps/web/src/lib/api.ts
- [X] T129 [P9] Create shared operational UI components for shell, nav, headers, cards, tables, states, badges, and modal forms in apps/web/src/components
- [X] T130 [P9] Replace duplicated sidebar/topbar layout in existing jobs, job detail, dashboard, and reports routes
- [X] T131 [P9] Implement /customers management route
- [X] T132 [P9] Implement /technicians management route
- [X] T133 [P9] Implement /quotations management route
- [X] T134 [P9] Implement /payments management route
- [X] T135 [P9] Implement /settings system settings route
- [X] T136 [P9] Polish responsive operational layout, focus states, empty/error/loading states, and data table behavior
- [X] T137 [P9] Run full contract suite and record Phase 9 result in docs/test-results.md
- [X] T138 [P9] Run full integration suite and record Phase 9 result in docs/test-results.md
- [X] T139 [P9] Run full E2E suite, browser-verify new routes, and record screenshots/result in docs/test-results.md
- [X] T140 [P9] Run build, confirm no workflow regressions, and mark Phase 9 complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **US1 Intake (Phase 3)**: Depends on Foundational.
- **US2 Diagnosis (Phase 4)**: Depends on Foundational and requires existing job records from US1 for full journey validation.
- **US3 Quotation (Phase 5)**: Depends on US2 diagnosis submissions.
- **US4 Closure (Phase 6)**: Depends on US3 approved jobs.
- **US5 Reports (Phase 7)**: Depends on data created by US1-US4 for complete reporting validation.
- **Polish (Phase 8)**: Depends on selected user stories being complete.

### User Story Dependencies

- **US1**: Independent MVP slice for job intake and tracking.
- **US2**: Builds on job records; diagnosis service remains independently testable with seeded jobs.
- **US3**: Builds on diagnoses waiting for owner review; quotation and approval link logic remains independently testable with seeded diagnoses.
- **US4**: Builds on approved jobs; payment and completion logic remains independently testable with seeded approved jobs.
- **US5**: Builds on lifecycle data from earlier stories; report services can be tested with seeded data.

### Within Each User Story

- Tests first and expected to fail before implementation.
- Domain and database primitives before services.
- Services before controllers and UI.
- API behavior before browser journey completion.
- Audit events included before a story checkpoint is accepted.

### Parallel Opportunities

- T003-T005 and T009-T012 can run in parallel during setup.
- T016-T020 can run in parallel with T021-T022 after workspace setup.
- Contract, integration, and e2e tests for each story can be written in parallel.
- UI components and API modules within a story can proceed in parallel once DTOs and shared schemas are stable.
- US1-US3 are all P1, but implementation should sequence US1 -> US2 -> US3 for the natural repair workflow unless separate developers seed test data for parallel work.

---

## Parallel Examples

### User Story 1

```bash
Task: "T041 [US1] Add contract tests for POST /jobs and GET /jobs in tests/contract/jobs.contract.test.ts"
Task: "T042 [US1] Add integration tests for customer, device, job, status history, NAS path, and audit creation in tests/integration/job-intake.integration.test.ts"
Task: "T043 [US1] Add upload validation tests for service-note evidence in tests/integration/service-note-upload.integration.test.ts"
Task: "T044 [US1] Add Store Staff intake browser journey in tests/e2e/store-staff-intake.spec.ts"
```

### User Story 2

```bash
Task: "T056 [US2] Add contract tests for POST /jobs/{jobId}/diagnoses in tests/contract/diagnoses.contract.test.ts"
Task: "T057 [US2] Add integration tests for diagnosis submission and WAITING FADHIL REVIEW transition in tests/integration/diagnosis-submission.integration.test.ts"
Task: "T058 [US2] Add RBAC tests proving Technician cannot finalize quotation price in tests/integration/technician-pricing-rbac.integration.test.ts"
Task: "T059 [US2] Add technician job detail browser journey in tests/e2e/technician-diagnosis.spec.ts"
```

### User Story 3

```bash
Task: "T068 [US3] Add contract tests for quotation create, send, and approval-link decision endpoints in tests/contract/quotations.contract.test.ts"
Task: "T069 [US3] Add integration tests for quotation revision, send, and customer approval transition to IN PROGRESS in tests/integration/quotation-approval.integration.test.ts"
Task: "T070 [US3] Add integration tests for rejection and no-repair terminal states in tests/integration/customer-decision-terminal.integration.test.ts"
Task: "T071 [US3] Add approval link expiry and reuse tests in tests/integration/approval-link-security.integration.test.ts"
```

### User Story 4

```bash
Task: "T083 [US4] Add contract tests for POST /jobs/{jobId}/payments and POST /jobs/{jobId}/complete in tests/contract/payments.contract.test.ts"
Task: "T084 [US4] Add integration tests for ready pickup, payment proof, and completion preconditions in tests/integration/payment-completion.integration.test.ts"
Task: "T085 [US4] Add RBAC tests for payment capture and completion authority in tests/integration/payment-rbac.integration.test.ts"
Task: "T086 [US4] Add pickup and payment browser journey in tests/e2e/pickup-payment.spec.ts"
```

### User Story 5

```bash
Task: "T095 [US5] Add contract tests for GET /dashboard/owner and GET /reports/jobs in tests/contract/reports.contract.test.ts"
Task: "T096 [US5] Add integration tests for dashboard metrics and report date filtering in tests/integration/owner-reporting.integration.test.ts"
Task: "T097 [US5] Add Owner/Manager-only report access tests in tests/integration/reports-rbac.integration.test.ts"
Task: "T098 [US5] Add owner dashboard and reports browser journey in tests/e2e/owner-dashboard-reports.spec.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 to make intake and job tracking usable.
3. Complete US2 and US3 to make owner review, quotation, and customer approval usable.
4. Validate the core repair handoff before adding payment closure and reporting.

### Operational MVP

1. Complete Setup + Foundational.
2. Add US1 intake.
3. Add US2 diagnosis.
4. Add US3 quotation and customer decision.
5. Add US4 pickup, payment, and completion.
6. Run the full quickstart journey.

### Incremental Delivery

1. US1 delivers searchable job records and active queue.
2. US2 adds technician evidence and owner review readiness.
3. US3 adds quotation authority and structured customer decisions.
4. US4 closes the repair loop with pickup, payment, and completion.
5. US5 adds monitoring and reports.

### Parallel Team Strategy

With multiple developers:

1. One developer owns `packages/domain/` and `packages/database/` during foundation.
2. One developer owns `apps/api/src/` modules per story.
3. One developer owns `apps/web/src/features/` modules per story.
4. One developer owns `tests/contract/`, `tests/integration/`, and `tests/e2e/` coverage.

### Background Jobs Architecture

Cron jobs run inside the API process using @nestjs/schedule. This is the correct choice for single-instance deployments:

- **Daily pickup reminders**: @Cron("0 0 * * *") in CaredeskCronService
- **Weekly data retention**: @Cron("0 0 0 * * 0") in CaredeskCronService

**When to extract a separate worker:**
- Multi-instance API deployment requires Redis-backed scheduling
- Heavy background jobs (batch PDF generation, large imports) block API requests
- Need independent scaling of background job processing

For MVP, keep cron jobs in API. Extract to pps/worker only when scaling requirements demand it.

---

## Notes

- [P] tasks are safe to run in parallel when their dependencies are met.
- Story labels map directly to spec user stories.
- Every user story has an independent test criterion and checkpoint.
- Tests are intentionally first-class because this project depends on lifecycle, RBAC, audit, evidence, and payment correctness.
- Auto-commit hooks are installed but disabled in `.specify/extensions/git/git-config.yml`.


