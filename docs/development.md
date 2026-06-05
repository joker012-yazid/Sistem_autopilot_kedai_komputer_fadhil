# Development Guide

Fadhil CareDesk is a TypeScript monorepo with a Next.js web app, NestJS API (with embedded cron scheduler), Prisma/Postgres persistence, shared CareDesk domain types, and local/NAS-style evidence storage.

## Prerequisites

- Node.js 22.x with Corepack available.
- PowerShell on Windows.
- Docker Desktop running for Postgres-backed integration tests.
- Local ports available:
  - API: `http://127.0.0.1:4000`
  - Web: `http://127.0.0.1:3000`
  - Postgres: `localhost:5432`

## Setup

```powershell
corepack enable
corepack prepare pnpm@9.15.9 --activate
corepack pnpm install
Copy-Item infra/env/.env.example .env
```

Use local storage for evidence while developing:

```
DATABASE_URL=postgresql://repair_ops:repair_ops@localhost:5432/repair_ops
STORAGE_DRIVER=local
STORAGE_ROOT=./.data/caredesk-nas
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000
CAREDESK_SETUP_TOKEN=local-setup-token-minimum-16-characters
CAREDESK_WEB_ORIGIN=http://127.0.0.1:3000
```

## Run Locally

Start Postgres:

```powershell
docker compose -f infra/docker/docker-compose.yml up -d postgres
corepack pnpm db:generate
```

Start the API (includes cron scheduler for pickup reminders and data retention):

```powershell
$env:CAREDESK_SETUP_TOKEN="local-setup-token-minimum-16-characters"
$env:CAREDESK_WEB_ORIGIN="http://127.0.0.1:3000"
corepack pnpm --filter @repair-ops/api dev
```

Start the web app:

```powershell
$env:NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:4000"
corepack pnpm --filter @repair-ops/web dev
```

Open `http://127.0.0.1:3000/login` and sign in with one of the active CareDesk demo accounts.

## Database Commands

```powershell
# Development: Create new migration after schema changes
corepack pnpm db:migrate:dev --name add_customer_email_index

# Development: Generate Prisma Client (run after migrations)
corepack pnpm db:generate

# Development: Seed database with demo data
corepack pnpm db:seed

# Development: Open Prisma Studio (database GUI)
corepack pnpm db:studio

# Production: Deploy pending migrations (DO NOT use db push)
corepack pnpm db:migrate:deploy

# QA: Reset database (force reset + push schema)
corepack pnpm caredesk:auth-qa-db-push
```

## Validation Commands

```powershell
# Contract tests
corepack pnpm vitest run tests/contract/caredesk-v2.contract.test.ts tests/contract/openapi-validation.test.ts

# Integration tests (requires Docker Desktop + Postgres)
corepack pnpm vitest run tests/integration/caredesk-v2.integration.test.ts

# Frontend tests
corepack pnpm vitest run apps/web/src/features/caredesk/api/caredesk-api.test.ts
corepack pnpm vitest run apps/web/src/features/caredesk/domain/domain.test.ts

# Full suite
corepack pnpm vitest run --reporter=verbose

# Build verification
corepack pnpm --filter @repair-ops/api build
corepack pnpm --filter @repair-ops/web build
corepack pnpm --filter @repair-ops/domain build
corepack pnpm db:generate
```

## Active Scope

- Backend public API is `/caredesk/*` only.
- Active roles are `owner` and `technician`.
- Store Staff, quotation, payment, invoice, and customer approval link modules are removed from runtime.
- Frontend code lives in `apps/web/src/features/caredesk/` (migrated from `apps/web/src/prototype/`).

## Background Jobs

Cron jobs run inside the API process via `@nestjs/schedule`:

| Cron | Job | Location |
|------|-----|----------|
| `0 0 * * *` | Daily pickup reminders (Day 0, 7, 14, 30, 60, 90) | `apps/api/src/caredesk/caredesk-cron.service.ts` |
| `0 0 0 * * 0` | Weekly data retention purge | `apps/api/src/caredesk/caredesk-cron.service.ts` |

No separate worker process is needed for single-instance deployment.

## Troubleshooting

- If Docker is not running, the Prisma integration suite fails early with a Docker/Postgres requirement message.
- If Prisma generate fails with a Windows DLL rename error, stop local API/Node processes that are using Prisma Client, then rerun the command.
- If API is unavailable, the API-first web app shows a retry/error state instead of mock fallback data.
- If Chrome PDF tests fail with launch errors, ensure Chrome is installed at `C:\Program Files\Google\Chrome\Application\chrome.exe` and not running under heavy load.
- For production database migrations, see [Database Migration Guide](./database-migrations.md).
