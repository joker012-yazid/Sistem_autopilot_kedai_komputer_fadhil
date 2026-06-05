# Production Database Migration Guide

This guide covers creating and applying Prisma migrations for production deployment of Fadhil CareDesk.

## Current State

Development currently uses `prisma db push` which syncs the database schema directly without creating migration files. This is **not suitable for production** because:

- No version history tracking
- No rollback capability
- No audit trail of schema changes
- Cannot apply incremental migrations to existing production data

## Migration Commands Overview

| Command | Purpose | Environment |
|---------|---------|-------------|
| `prisma db push` | Direct schema sync (no migrations) | Development only |
| `prisma migrate dev` | Create + apply migration, reset on schema change | Development |
| `prisma migrate deploy` | Apply pending migrations only | Production |
| `prisma generate` | Generate Prisma Client | Both (after migrations) |

## Step 1: Create Initial Migration from Current Schema

Run these commands locally to create the first migration file from your current `schema.prisma`:

```powershell
# Navigate to database package
cd my-project\packages\database

# Create initial migration (requires Docker + Postgres running)
pnpm prisma migrate dev --name init

# This will:
# 1. Create migrations/20260528000000_init/ directory
# 2. Generate migration.sql with CREATE TABLE statements
# 3. Apply migration to local database
# 4. Generate Prisma Client
```

## Step 2: Verify Migration Files

After creating the migration, verify the structure:

```
packages/database/prisma/
├── migrations/
│   └── 20260528000000_init/
│       ├── migration.sql      # Raw SQL migration
│       └── migration_lock.toml # Lock file (committed to git)
├── schema.prisma
└── seed.ts
```

Commit these files to version control:

```powershell
git add packages/database/prisma/migrations
git commit -m "feat(database): add initial Prisma migration for CareDesk v2 schema"
```

## Step 3: Production Deployment Script

Create or update your deployment script to use `migrate deploy`:

```powershell
# scripts/deploy-database.ps1

param(
    [string]$DatabaseUrl
)

if (-not $DatabaseUrl) {
    Write-Error "DATABASE_URL environment variable is required"
    exit 1
}

Write-Host "=== Fadhil CareDesk Database Deployment ===" -ForegroundColor Cyan

# Navigate to database package
Set-Location $PSScriptRoot\..\packages\database

# Generate Prisma Client with production schema
Write-Host "`n[1/3] Generating Prisma Client..." -ForegroundColor Yellow
pnpm prisma generate

# Deploy pending migrations
Write-Host "`n[2/3] Deploying migrations to production database..." -ForegroundColor Yellow
$env:DATABASE_URL = $DatabaseUrl
pnpm prisma migrate deploy

# Seed database (optional, skip if production has data)
Write-Host "`n[3/3] Seeding database (if seed data configured)..." -ForegroundColor Yellow
pnpm prisma db seed

Write-Host "`n=== Database deployment complete ===" -ForegroundColor Green
```

## Step 4: Update Root Package Scripts

Add production-safe database scripts to `my-project/package.json`:

```json
{
  "scripts": {
    "db:migrate:dev": "corepack pnpm --filter @repair-ops/database prisma migrate dev",
    "db:migrate:deploy": "corepack pnpm --filter @repair-ops/database prisma migrate deploy",
    "db:generate": "corepack pnpm --filter @repair-ops/database prisma generate",
    "db:seed": "corepack pnpm --filter @repair-ops/database prisma db seed",
    "db:studio": "corepack pnpm --filter @repair-ops/database prisma studio"
  }
}
```

## Step 5: Production Deployment Checklist

Before deploying to production:

- [ ] Migration files created and committed to git
- [ ] Migration tested on staging database
- [ ] Database backup taken before migration
- [ ] Downtime window scheduled (if schema changes are breaking)
- [ ] Rollback plan prepared (restore from backup)
- [ ] Prisma Client regenerated after migration
- [ ] Application restarted with new Prisma Client

## Step 6: Apply Migration in Production

```powershell
# From project root
cd my-project

# Deploy migrations
corepack pnpm db:migrate:deploy

# Generate Prisma Client
corepack pnpm db:generate

# Restart API service to use new Prisma Client
```

## Future Schema Changes

When you need to modify the schema:

1. **Edit `schema.prisma`** with your changes
2. **Create new migration**: `pnpm prisma migrate dev --name add_customer_email_index`
3. **Test locally** with your development database
4. **Commit migration files** to git
5. **Deploy to production**: `pnpm prisma migrate deploy`

## Important Notes

### Never Use `db push` in Production

```powershell
# ❌ WRONG - Do not use in production
prisma db push

# ✅ CORRECT - Use migrate deploy
prisma migrate deploy
```

### Migration Naming

Use descriptive names that explain the change:

```powershell
prisma migrate dev --name add_customer_email_index
prisma migrate dev --name add_job_status_history
prisma migrate dev --name add_notification_templates
```

### Handling Migration Failures

If a migration fails in production:

1. **Do not retry** without understanding the error
2. **Check Prisma MRP table** (`_prisma_migrations`) for status
3. **Restore from backup** if data corruption occurred
4. **Fix migration script** and test on staging first
5. **Re-deploy** after fixing

## Rollback Strategy

Prisma migrations are forward-only by default. For rollback:

1. **Database backup restore** - Most reliable method
2. **Manual rollback migration** - Create new migration with reverse SQL
3. **Point-in-time recovery** - If your database supports it

Always test rollback procedures before production deployment.

## Monitoring

After deployment, verify:

```sql
-- Check migration history
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC;

-- Verify table structure
\d caredesk_job
\d caredesk_customer

-- Check record counts
SELECT 
  (SELECT COUNT(*) FROM caredesk_job) as jobs,
  (SELECT COUNT(*) FROM caredesk_customer) as customers,
  (SELECT COUNT(*) FROM caredesk_user) as users;
```
