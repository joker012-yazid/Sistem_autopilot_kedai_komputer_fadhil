# Deployment Notes

These notes describe production expectations for the active Fadhil CareDesk runtime. The backend public surface is `/caredesk/*`; legacy Store Staff, quotation, payment, invoice, and approval-link modules are not deployed.

## Runtime Services

- **Web app**: Next.js CareDesk application served behind HTTPS.
- **Display app**: Next.js read-only display board served at `/display` on the same domain or an internal-only listener.
- **API**: NestJS CareDesk API behind HTTPS with trusted reverse proxy headers configured.
- **Database**: PostgreSQL via Prisma for customers, devices, jobs, checklist reports, evidence metadata, notifications, settings, reports audit, timeline, and audit logs.
- **Evidence storage**: NAS through the CareDesk storage adapter, with application-owned folder paths and generated filenames.
- **Daily cron**: Pickup reminder scheduler at midnight via `@nestjs/schedule`.

## Required Environment

Set secrets outside source control:

```
DATABASE_URL=postgresql://...
CAREDESK_SETUP_TOKEN=minimum-16-characters-strong-token
SESSION_SECRET=...
STORAGE_DRIVER=nas
STORAGE_ROOT=/caredesk-evidence
APP_BASE_URL=https://app.example.com
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
PORT=4000
NODE_ENV=production
CAREDESK_WEB_ORIGIN=https://app.example.com
CAREDESK_DISPLAY_ALLOWED_CIDRS=127.0.0.1/32,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
CAREDESK_PDF_RENDER_TIMEOUT_MS=30000
```

For NAS access, configure credentials in the runtime secret manager, not in committed `.env` files.

## Database Deployment

**Important**: Production uses Prisma migrations, not `db push`.

```powershell
# Deploy pending migrations to production database
corepack pnpm db:migrate:deploy

# Generate Prisma Client with production schema
corepack pnpm db:generate

# Verify database connectivity
curl http://localhost:4000/health
```

See [Database Migration Guide](./database-migrations.md) for detailed migration workflows, rollback strategies, and troubleshooting.

### Database Requirements

- Run Prisma migrations before first production use.
- Use a dedicated database user with least-privilege application access.
- Enable automated daily backups and point-in-time recovery where available.
- Test restore into a staging database before declaring deployment ready.

## NAS Evidence

- Store evidence outside the public web root.
- Restrict NAS access to the application service account and authorized administrators.
- Back up the evidence root on the same cadence as the database.
- Preserve deterministic job folders such as `/caredesk/NO.0009/checklist/drive`.

## Security

- Require HTTPS for all staff traffic and report downloads.
- Keep `/display` and `/caredesk/display/*` available to local network only through firewall and reverse proxy rules.
- Replace demo session with production auth before live use.
- Keep Customers, Reports, and Settings Owner-only.
- Keep Technician access limited to assigned/actionable jobs.
- Review audit logs for evidence, notification, report export, settings, pickup, and permission events.
- Rate limiting is active: 100 requests / 15 minutes globally, 5 requests / 15 minutes on auth endpoints (`/caredesk/auth/setup`, `/caredesk/auth/login`).
- Helmet security headers are applied (CSP, X-Frame-Options, XSS protection).
- Production error messages are sanitized (500-level errors return generic "Internal server error" without stack traces).
- `CAREDESK_SETUP_TOKEN` must be at least 16 characters long and configured before first Owner setup.

## Health Check

- `GET /health` returns API status, database connectivity, uptime, memory usage, and environment flag.
- Use this endpoint for load balancer health checks and monitoring.

## Notifications

CareDesk currently records notification results and WhatsApp message copy actions. Real WhatsApp or email delivery should be added only after provider credentials, customer consent handling, template rules, delivery failure handling, and audit logging are production-ready.
