# Repair Operations Platform

CareDesk for Sistem Autopilot Kedai Komputer Fadhil is a repair operations app for computer shop intake, technician workflow, owner review, pickup reminders, reports, and evidence tracking.

## Overview

- Monorepo for the CareDesk web app, read-only display board, API, shared domain packages, and local infrastructure.
- Built for kedai komputer daily operations: intake, diagnosis, approval, repair, pickup, reminders, reports, and evidence storage.
- Supports separate Owner/Fadhil and Technician workflows, plus a LAN-only public display board.

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start on Windows](#quick-start-on-windows)
- [Quick Start on Linux or macOS](#quick-start-on-linux-or-macos)
- [Full Docker Setup](#full-docker-setup)
- [Environment Variables](#environment-variables)
- [First Owner Setup](#first-owner-setup)
- [Display Board](#display-board)
- [How to Use the Web App](#how-to-use-the-web-app)
- [Common Commands](#common-commands)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Deployment Notes](#deployment-notes)

## Architecture

This repository is a pnpm monorepo:

- `apps/web` - Next.js CareDesk frontend.
- `apps/display` - Next.js read-only display board for TV, monitor, tablet, and phone at `/display`.
- `apps/api` - NestJS API with the embedded cron scheduler.
- `packages/domain` - Shared CareDesk domain types and Zod schemas.
- `packages/database` - Prisma schema, Prisma Client, and seed script.
- `packages/config` - Shared runtime configuration helpers.
- `packages/test-utils` - Test utilities for API and integration tests.
- `infra/docker` - Docker Compose and image definitions.
- `infra/env` - Environment variable examples.

Background jobs run inside the API process through `CaredeskCronService`; no separate worker service is required for a single-instance deployment.

## Tech Stack

- Node.js 22
- pnpm 9.15.9 through Corepack
- Next.js 15 and React 19
- NestJS 10
- Prisma 6 with PostgreSQL 16
- Vitest and Playwright
- Docker Compose for local container runs

## Prerequisites

Install these before running the project:

- Git
- Node.js 22.x
- Corepack, included with recent Node.js releases
- Docker Desktop on Windows/macOS, or Docker Engine plus Docker Compose v2 on Linux

The default local ports are:

- Web: `http://127.0.0.1:3000`
- Display: `http://127.0.0.1:3001/display`
- API: `http://127.0.0.1:4000`
- Postgres: `localhost:5432`

## Quick Start on Windows

Run these commands in PowerShell from the repository root:

```powershell
corepack enable
corepack prepare pnpm@9.15.9 --activate
corepack pnpm install
Copy-Item infra/env/.env.example .env
Copy-Item apps/web/.env.example apps/web/.env
docker compose -f infra/docker/docker-compose.yml up -d postgres
corepack pnpm db:generate
corepack pnpm --filter @repair-ops/database prisma db push
```

Start the API:

```powershell
corepack pnpm dev:api
```

Start the web app in another PowerShell window:

```powershell
corepack pnpm dev:web
```

Start the display app in another PowerShell window:

```powershell
corepack pnpm dev:display
```

Open `http://127.0.0.1:3000/login`.
Open `http://127.0.0.1:3001/display` for the display board.

## Quick Start on Linux or macOS

Run these commands from the repository root:

```sh
corepack enable
corepack prepare pnpm@9.15.9 --activate
corepack pnpm install
cp infra/env/.env.example .env
cp apps/web/.env.example apps/web/.env
docker compose -f infra/docker/docker-compose.yml up -d postgres
corepack pnpm db:generate
corepack pnpm --filter @repair-ops/database prisma db push
```

Start the API:

```sh
corepack pnpm dev:api
```

Start the web app in another terminal:

```sh
corepack pnpm dev:web
```

Start the display app in another terminal:

```sh
corepack pnpm dev:display
```

Open `http://127.0.0.1:3000/login`.
Open `http://127.0.0.1:3001/display` for the display board.

## Full Docker Setup

Use this path when you want Postgres, API, and Web to run in containers.

On Windows PowerShell:

```powershell
Copy-Item infra/env/.env.docker.example .env.docker
docker compose --env-file .env.docker -f infra/docker/docker-compose.full.yml up --build
```

On Linux or macOS:

```sh
cp infra/env/.env.docker.example .env.docker
docker compose --env-file .env.docker -f infra/docker/docker-compose.full.yml up --build
```

The full Docker compose file starts:

- `postgres` on host port `5432`.
- `db-setup`, a one-shot Prisma `db push` bootstrap for local Docker use.
- `api` on host port `4000`.
- `web` on host port `3000`.
- `display` is available when the dedicated app is started or reverse-proxied to `/display`.

After the containers are healthy, open `http://localhost:3000/login`.

Useful Docker commands:

```sh
docker compose --env-file .env.docker -f infra/docker/docker-compose.full.yml logs -f
docker compose --env-file .env.docker -f infra/docker/docker-compose.full.yml down
docker compose --env-file .env.docker -f infra/docker/docker-compose.full.yml down -v
```

`down -v` removes the Docker database and evidence volumes, so use it only when you want a clean local reset.

If you use pnpm locally, the same commands are available as:

```sh
corepack pnpm docker:build
corepack pnpm docker:up
corepack pnpm docker:logs
corepack pnpm docker:down
corepack pnpm docker:db-push
```

## Environment Variables

Start from one of the committed examples:

- Local API development: `infra/env/.env.example`
- Local web development: `apps/web/.env.example`
- Full Docker: `infra/env/.env.docker.example`

Important variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma and the API. |
| `SESSION_SECRET` | Secret used for session security; replace it before sharing or deploying. |
| `STORAGE_DRIVER` | Storage mode, currently `local` for the public setup. |
| `STORAGE_ROOT` | Evidence storage path. Docker uses `/app/.data/evidence`. |
| `APP_BASE_URL` | Public web URL. |
| `API_BASE_URL` | Internal API URL for server-side use. |
| `NEXT_PUBLIC_API_BASE_URL` | Browser-visible API URL used by the web app. |
| `CAREDESK_WEB_ORIGIN` | Allowed web origin for API CORS. |
| `CAREDESK_DISPLAY_ALLOWED_CIDRS` | CIDR allowlist for the public display endpoints and display app route protection. |
| `CAREDESK_COOKIE_SECURE` | Set `false` only for local HTTP Docker runs; keep `true` or unset behind HTTPS. |
| `CAREDESK_SETUP_TOKEN` | One-time token for creating the first Owner account. Must be at least 16 characters. |
| `CAREDESK_PDF_RENDER_TIMEOUT_MS` | PDF rendering timeout for report export. |
| `NOTIFICATION_MODE` | Notification mode; `test` records notification actions without a real provider. |
| `CAREDESK_SETTINGS_ENCRYPTION_KEY` | Secret used to encrypt saved Scanner AI API keys. Replace it before enabling Scanner AI. |

Never commit `.env` or `.env.docker`. Both are ignored by Git.

## First Owner Setup

When the database has no active Owner user, the login page shows the first-owner setup form. Use the value from `CAREDESK_SETUP_TOKEN`, then create the Owner/Fadhil account with an email and password.

After the first Owner exists, the login page switches to normal sign-in. Keep the setup token private and rotate it before any real deployment.

## Display Board

The repository includes a separate read-only display app at `/display`. This board is designed for TV, monitor, tablet, or phone use so staff can see job priorities without opening the main CareDesk system.

### What the Display Board Shows

- `NEW JOB`
- `WAITING FADHIL REVIEW`
- `IN PROGRESS`
- `WAITING CUSTOMER CONFIRMATION`
- `READY PICKUP`
- `UNCLAIMED`
- footer totals for `NOT PROCEED` and `COMPLETE hari ini`

The layout is `Action-First`, so the left side shows what staff should act on first, while pickup and unclaimed items remain visible on the right.

### Privacy and Access Rules

- The display board is read-only.
- It only shows `No. rujukan` and status-derived grouping.
- It does **not** show customer names, phone numbers, device details, technician names, diagnosis notes, or owner instructions.
- The backend display endpoints and the display app are intended for `local network only`.

### Local Development

Start the API and display app:

```sh
corepack pnpm dev:api
corepack pnpm dev:display
```

Useful URLs:

- Staff web app: `http://127.0.0.1:3000/login`
- Display board: `http://127.0.0.1:3001/display`
- Kiosk mode: `http://127.0.0.1:3001/display?kiosk=1`

### Live Updates

The display board loads its first snapshot from:

- `GET /caredesk/display/snapshot`

It then receives live updates through:

- `GET /caredesk/display/stream`

These endpoints are LAN-protected and are meant for the display app, not for staff editing workflows.

## How to Use the Web App

Use CareDesk from `http://127.0.0.1:3000/login` during local runs, or from the deployed web URL in production. The web app is role-based, so Owner/Fadhil and Technician users will see different tools.

### Roles

- **Owner/Fadhil** manages shop settings, users, Scanner AI, job review, customer decisions, reports, customer history, pickup follow-up, notifications, and locked workflow rules.
- **Technician** scans service notes, creates jobs, takes or releases work, records diagnosis, uploads evidence, completes checklist reports, and updates repair progress.

### Sign In and First Setup

1. Open `/login`.
2. If no Owner account exists yet, complete the first-owner setup form using the `CAREDESK_SETUP_TOKEN`.
3. After the Owner account exists, sign in with the Owner or Technician email and password.
4. Use **Logout** when leaving a shared workstation.

### Owner Workflow

1. Open **Settings** to confirm shop details, locked workflow rules, notification templates, and user accounts.
2. Create Technician accounts from **Settings**. Give each technician their own email and password.
3. Configure **Scanner AI** in **Settings**:
   Enable the service note scanner, choose the OpenAI model, enter the OpenAI API key, set the maximum upload size, and use **Test scanner config** before asking technicians to scan service notes.
4. Review technician diagnosis from **Semakan** or the job detail screen.
5. Record Owner review instructions, POS reference, and customer decision before repair work continues.
6. Use **Pelanggan** to review customer and device history.
7. Use **Laporan** to monitor job totals, technician workload, unclaimed devices, exports, and audit information.
8. Use **Ambil Barang** and **Notifikasi** to monitor ready-pickup reminders and follow-up status.

### Technician Workflow

1. Open **Imbas Job** or **Scan Job**.
2. Upload a service note image or PDF.
3. Review the scanner result, correct the customer, device, and problem details, then create the job.
4. Open **Kerja** to see available jobs and use **Take Job** when starting work.
5. Use **Kerja Saya** or **My Jobs** for jobs currently assigned to you.
6. Add diagnosis notes and evidence photos before submitting the job for Owner review.
7. After Owner and customer approval, continue repair progress and upload required evidence.
8. Mark the job ready for pickup when testing is complete.
9. Complete pickup after the customer collects the device.

### Checklist Reports

1. Open **Checklist Report**.
2. Select the job from **Checklist Report Queue**.
3. Complete each checklist step: device info, initial inspection, drive health, battery report, RAM specification, diagnosis summary, and preview.
4. Upload checklist images in the matching section when evidence is available.
5. Use **Preview PDF** to inspect the report before sending or downloading it.
6. Use **Download PDF** when the report is ready.
7. Technician can save drafts and submit reports. Owner can read reports and copy the customer summary.

### Pickup, Reminders, and Unclaimed Devices

1. Jobs appear in **Ambil Barang** after they are marked ready for pickup.
2. Reminder stages follow the configured reminder days in **Settings**.
3. Use **Notifikasi** to review message previews and record notification results.
4. Complete pickup when the customer collects the device.
5. If a device passes the unclaimed threshold, Owner can mark it as unclaimed according to the shop policy.

### Common User Issues

- **Cannot log in**: confirm the email, password, and that the user account is active. If this is a fresh database, create the first Owner account from `/login`.
- **Scanner is not configured**: sign in as Owner, open **Settings**, enable Scanner AI, add the API key, choose a model, and run **Test scanner config**.
- **Scanner upload fails**: check that the file is PNG, JPEG, WEBP, GIF, or PDF and below the configured upload limit. If the error mentions the API, confirm the OpenAI key and model in **Settings**.
- **Checklist report looks empty**: open the job from **Checklist Report Queue**, move through each step, save the draft, then use **Preview PDF** again.
- **Web app cannot reach the API**: confirm the API is running at `http://127.0.0.1:4000` and `NEXT_PUBLIC_API_BASE_URL` points to that URL for local browser use.
- **Display board shows reconnecting or failed to fetch**: confirm the API is running, the display app uses the correct `NEXT_PUBLIC_API_BASE_URL`, and the request comes from an allowed CIDR in `CAREDESK_DISPLAY_ALLOWED_CIDRS`.

## Common Commands

```sh
corepack pnpm dev:api
corepack pnpm dev:web
corepack pnpm dev:display
corepack pnpm build
corepack pnpm lint
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm db:generate
corepack pnpm db:migrate:dev
corepack pnpm db:migrate:deploy
corepack pnpm db:seed
corepack pnpm db:studio
```

Production deployments should use Prisma migrations with `corepack pnpm db:migrate:deploy`. The Docker quickstart uses `prisma db push` only to make local trial runs easier.

## Verification

Before opening a pull request or publishing a release, run:

```sh
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```

For Docker smoke testing:

```sh
docker compose --env-file .env.docker -f infra/docker/docker-compose.full.yml up --build
```

Then check:

- API health: `http://localhost:4000/health`
- Web login: `http://localhost:3000/login`
- Display board: `http://localhost:3001/display`

## Troubleshooting

- If `pnpm` is missing, run `corepack enable` and `corepack prepare pnpm@9.15.9 --activate`.
- If Postgres is unavailable, confirm Docker is running and port `5432` is not already used by another database.
- If Prisma Client errors after schema changes, run `corepack pnpm db:generate`.
- If local login fails after a fresh database, run `corepack pnpm --filter @repair-ops/database prisma db push`, then refresh `/login`.
- If Docker login fails after a clean start, run `corepack pnpm docker:db-push` or restart the stack so `db-setup` can finish.
- If the web app cannot reach the API, confirm `NEXT_PUBLIC_API_BASE_URL` points to `http://localhost:4000` for browser access.
- If the display board cannot load snapshots, confirm `NEXT_PUBLIC_API_BASE_URL` is correct for the display app and the API allows the caller IP through `CAREDESK_DISPLAY_ALLOWED_CIDRS`.
- For Docker, open `http://localhost:3000` instead of `http://127.0.0.1:3000` so browser cookies match the default API host.
- If PDF export fails in a container, check API logs; the Docker API image installs Chromium and sets `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.
- If Playwright fails locally, install browsers with `corepack pnpm exec playwright install`.

## Deployment Notes

The included Docker compose files are intended for local development and self-hosted evaluation. For real production, use strong secrets, HTTPS, managed backups, restricted storage access, and Prisma migrations instead of `db push`.

See `docs/deployment.md` for the production checklist and `docs/development.md` for deeper local development notes.
