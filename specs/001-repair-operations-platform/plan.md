# Implementation Plan: Repair Operations Platform

**Branch**: `001-repair-operations-platform` | **Date**: 2026-05-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-repair-operations-platform/spec.md`

## Summary

Build the MVP for Sistem Autopilot Kedai Komputer Fadhil as a responsive repair
operations platform. The system centralizes counter intake, technician diagnosis,
owner quotation review, customer approval, repair progress, pickup, payment,
completion, notifications, evidence storage, dashboard monitoring, and audit
history. The technical approach is a TypeScript web application with a dedicated
backend API, PostgreSQL as the operational source of truth, NAS-backed evidence
storage through an adapter layer, and explicit RBAC, audit logging, and
notification consent throughout the repair lifecycle.

## Technical Context

**Language/Version**: TypeScript on the active Node.js LTS line for frontend,
backend, shared validation, and test code.

**Primary Dependencies**: Next.js frontend, NestJS backend API, Prisma ORM,
PostgreSQL, Zod validation, Playwright browser tests, Vitest unit tests,
OpenAPI contract generation, and a NAS storage adapter using SMB or WebDAV based
on deployment configuration.

**Storage**: PostgreSQL for organizations, branches, users, customers, devices,
jobs, status history, diagnoses, quotations, approvals, attachment metadata,
payments, notifications, and audit logs. Synology NAS stores binary evidence
files under deterministic application-owned job paths.

**Testing**: Vitest for unit and service tests, API contract tests generated from
OpenAPI, Playwright for role-based web journeys, and integration tests for job
lifecycle transitions, RBAC, upload validation, quotation approval, payment, and
audit logging.

**Target Platform**: Browser-based desktop workflows for counter staff and owner
review, responsive mobile-friendly technician screens, backend API deployable on
a shop-controlled server or VPS with network access to Synology NAS.

**Project Type**: Web application with frontend, backend API, shared domain
package, database migrations, and infrastructure configuration.

**Performance Goals**: Staff can register a complete job in under 3 minutes;
owner dashboard identifies action-required jobs in under 30 seconds; common
job-list, job-detail, and dashboard views feel immediate for normal shop usage;
evidence upload progress is visible for files within configured size limits.

**Constraints**: Pricing authority remains Owner/Manager-only; operational data
inside the system is the source of truth; uploads must be validated server-side;
files must not be stored in public web paths; customer notification requires
channel consent; repair records and evidence must remain auditable after
completion.

**Scale/Scope**: MVP supports one shop first, with organization and branch
fields retained for future multi-branch or multi-tenant reuse. MVP excludes
spare-parts inventory, full accounting, public customer self-registration, AI
diagnosis, and white labeling.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Controlled repair lifecycle: PASS. The plan preserves intake, diagnosis,
  owner review, quotation, customer decision, repair progress, ready pickup,
  payment, completion, `CANCELLED`, and `CLOSED_NO_REPAIR` with status history.
- Role-separated authority: PASS. Owner/Manager owns pricing and closure;
  Technician owns diagnosis and repair updates; Store Staff owns intake,
  notification support, and payment capture.
- Evidence-centered records: PASS. Attachment metadata stays in PostgreSQL and
  binary evidence is stored through an application-owned NAS adapter using
  deterministic job paths.
- Auditable and secure data handling: PASS. Audit logs cover job creation,
  state change, diagnosis, quotation, approval, payment, export, role changes,
  and overrides. Upload validation, consent, privacy, retention, and backup
  impact are planned.
- Incremental MVP delivery: PASS. The first implementation path supports the
  end-to-end repair loop before deferred modules such as inventory, accounting,
  AI diagnosis, public self-registration, or white labeling.

Post-design re-check: PASS. The data model, OpenAPI contracts, and quickstart
preserve lifecycle states, RBAC boundaries, attachment handling, audit events,
customer approval links, and MVP scope.

## Project Structure

### Documentation (this feature)

```text
specs/001-repair-operations-platform/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- openapi.yaml
`-- checklists/
    `-- requirements.md
```

### Source Code (repository root)

```text
apps/
|-- web/
|   |-- src/
|   |   |-- app/
|   |   |-- components/
|   |   |-- features/
|   |   `-- lib/
|   `-- tests/
|-- api/
|   |-- src/
|   |   |-- auth/
|   |   |-- audit/
|   |   |-- attachments/
|   |   |-- customers/
|   |   |-- diagnoses/
|   |   |-- jobs/
|   |   |-- notifications/
|   |   |-- payments/
|   |   |-- quotations/
|   |   |-- reports/
|   |   `-- users/
|   `-- tests/
`-- worker/
    `-- src/
        |-- notifications/
        |-- cleanup/
        `-- backups/

packages/
|-- domain/
|   `-- src/
|-- config/
|-- database/
|   |-- prisma/
|   `-- migrations/
`-- test-utils/

infra/
|-- docker/
|-- env/
`-- nas/

tests/
|-- contract/
|-- integration/
`-- e2e/
```

**Structure Decision**: Use a TypeScript monorepo with separate `apps/web` and
`apps/api` ownership because the PRD requires both rich browser workflows and a
backend API that controls RBAC, audit logging, upload validation, NAS paths, and
notification delivery. Shared lifecycle enums, schemas, and permissions live in
`packages/domain` to prevent frontend/backend drift.

## Complexity Tracking

No constitution violations are introduced.
