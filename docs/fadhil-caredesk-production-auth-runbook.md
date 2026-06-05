# Fadhil CareDesk Production Auth Runbook

This runbook is for local deployment QA of the production auth flow: first Owner setup, cookie login/logout, user management, locked rules enforcement, report export, and API-first frontend behavior.

## Local Runtime

1. Start Postgres:

   \\\powershell
   docker compose -f infra/docker/docker-compose.yml up -d postgres
   \\\

2. Apply the CareDesk schema:

   \\\powershell
   corepack pnpm --filter @repair-ops/database prisma db push --skip-generate
   \\\

3. Start the API with auth environment:

   \\\powershell
   ="local-setup-token-minimum-16-characters"
   ="http://127.0.0.1:3000"
   corepack pnpm --filter @repair-ops/api dev
   \\\

4. Start the web app:

   \\\powershell
   ="http://127.0.0.1:4000"
   corepack pnpm --filter @repair-ops/web dev
   \\\

## First Setup QA

- Open \http://127.0.0.1:3000/login\.
- If there is no active Owner, the setup form should appear.
- Use setup token with at least 16 characters, Owner name, email, and a password with at least 8 characters including a letter and number.
- Successful setup creates the first Owner, sets \caredesk_session\, and redirects to \/dashboard\.
- Logout returns to \/login\.
- Login with the Owner email/password should restore the session.

## User Management QA

- Owner opens \/settings\.
- Create a Technician account with a compliant temporary password.
- Reset the Technician password manually from Users & Roles.
- Disable the Technician and confirm the old session cannot access \/caredesk/auth/me\.
- Reactivate the Technician and confirm login redirects to \/scan\.
- Technician must not see Customers, Reports, or Settings.
- The last active Owner must not be disabled or demoted.

## Locked Rules Enforcement QA

- Owner opens \/settings\.
- In Flow Rules, the \lockedRules\ section must be read-only.
- Attempting to remove a locked rule via API returns \403 Forbidden\.
- Attempting to set invalid \eminderDays\ (e.g. \[0, 7, 99]\) returns \403 Forbidden\.
- Valid updates to editable fields (\stuckThresholds\, \equiredEvidence\, \
otProceedReasons\, \eleaseReasons\) should save successfully.

## Reports & Export QA

- Owner opens \/reports\.
- Verify dashboard shows: total jobs, active jobs, completed, not proceed, ready pickup, unclaimed.
- Verify status breakdown, technician workload, pickup metrics, not proceed rows, and completed history are populated.
- Click \"Export CSV\" — file should download with correct headers and job data.
- Click \"Export PDF\" — file should download as PDF with summary, status breakdown, and job list.
- Technician can view reports dashboard but cannot see Export CSV/PDF buttons.
- Technician attempting export via API returns \403 Forbidden\.

## Health Check QA

- \GET /health\ returns JSON with \status\, \database\, \uptime\, \memory\, and \environment\.

## Reset Local QA Data

Use this only for development QA. It clears CareDesk tables so first setup can be tested again.

\\\powershell
corepack pnpm caredesk:auth-qa-reset
\\\

If a full schema reset is needed:

\\\powershell
corepack pnpm caredesk:auth-qa-db-push
\\\

## Failure Checks

- API stopped: frontend should show a clear API unavailable/retry state, not mock jobs.
- Wrong setup token: setup returns \403\.
- Setup token shorter than 16 characters: setup returns \403\.
- Weak password: setup/create/reset returns \400\.
- Disallowed browser origin on mutating requests: API returns \403\.
- Expired, revoked, or disabled-user sessions: API returns \401\.
- Too many auth attempts: API returns \429\ (rate limited).

## Out of Scope

This runbook does not add email password reset, OTP, SSO, WhatsApp API, payment, quotation, invoice, Store Staff, or customer approval links.
