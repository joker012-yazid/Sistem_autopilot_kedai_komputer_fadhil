# Quickstart: Repair Operations Platform

This quickstart validates the completed US1-US5 MVP for Sistem Autopilot Kedai Komputer Fadhil.

## Prerequisites

- Node.js 22.x with Corepack.
- `pnpm@9.15.9` activated through Corepack.
- Local ports available:
  - API: `http://127.0.0.1:4000`
  - Web dev: `http://127.0.0.1:3000`
  - E2E web server: `http://127.0.0.1:3101`
- Local evidence storage configured through `.env`.

The current MVP uses demo auth, an in-memory runtime data layer, local multipart evidence storage, and in-app quotation approval link mode.

## Local Setup

```powershell
corepack enable
corepack prepare pnpm@9.15.9 --activate
corepack pnpm install
Copy-Item infra/env/.env.example .env
```

Use these local values while developing:

```text
STORAGE_DRIVER=local
STORAGE_ROOT=./.data/evidence
APP_BASE_URL=http://127.0.0.1:3000
NOTIFICATION_MODE=test
```

## Run Locally

Start the API:

```powershell
corepack pnpm dev:api
```

Start the web app:

```powershell
corepack pnpm dev:web
```

Open `http://127.0.0.1:3000/login`.

Demo accounts:

- Store Staff
- Technician
- Fadhil Owner/Manager

## MVP Validation Journey

1. Sign in as Store Staff.
2. Create a repair job with customer, device, issue description, consent flags, and service-note evidence.
3. Confirm the job appears in the queue as `NEW JOB`.
4. Sign in as Technician.
5. Open the job detail page, add diagnosis notes, upload diagnosis evidence, and submit for owner review.
6. Confirm the job changes to `WAITING FADHIL REVIEW`.
7. Sign in as Fadhil Owner/Manager.
8. Create and send a quotation.
9. Confirm the job changes to `WAITING CUSTOMER CONFIRMATION` and an in-app approval link is shown.
10. Open the approval link and approve the quotation.
11. Confirm the job changes to `IN PROGRESS`.
12. Sign in as Technician and mark the job `READY PICKUP`.
13. Sign in as Store Staff, upload payment proof, record payment, and complete the job.
14. Confirm the job changes to `COMPLETE`.
15. Sign in as Fadhil Owner/Manager and open `/dashboard`.
16. Confirm status counts, action queues, recent payments, and technician workload are visible.
17. Open `/reports` and confirm the last-30-days report includes the completed job and payment total.

## Required Validation Commands

```powershell
corepack pnpm test:contract
corepack pnpm test:integration
corepack pnpm test:e2e
corepack pnpm build
```

## Validation Outcome

Recorded on 2026-05-17:

- Contract tests passed: 6 files, 8 tests.
- Integration tests passed: 11 files, 18 tests.
- E2E journey passed for intake, diagnosis, quotation approval, pickup, payment, completion, dashboard, and reports.
- Build passed for API, worker, packages, and web app.
- Browser verification passed for `/login`, `/jobs`, `/jobs/[jobId]`, `/dashboard`, and `/reports`.

## Done Criteria

- End-to-end MVP validation journey passes.
- Owner dashboard shows action-required jobs and reporting metrics.
- Job intake supports required evidence.
- Sensitive actions produce audit entries.
- Evidence metadata resolves to application-owned storage paths.
- Unauthorized role attempts are blocked.
