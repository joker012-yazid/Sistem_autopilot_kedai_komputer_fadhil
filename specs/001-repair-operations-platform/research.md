# Research: Repair Operations Platform

## Decision: TypeScript Monorepo With Separate Web and API Apps

**Rationale**: The PRD calls for a responsive browser experience, backend API,
relational database, NAS-backed evidence layer, and notification service. A
TypeScript monorepo keeps domain rules, lifecycle states, permissions, and
validation schemas shared while allowing the frontend and backend to be deployed
and tested independently.

**Alternatives considered**:
- Single full-stack app only: simpler initially, but mixes NAS upload handling,
  audit logging, notification jobs, and UI concerns too tightly.
- Python backend with separate frontend: viable, but adds language split before
  the project has a team need for it.

## Decision: Next.js for Frontend

**Rationale**: The product requires dashboard, repair queues, job detail,
technician-friendly responsive screens, forms, and customer approval pages.
Next.js supports application-style routing, server-rendered pages where useful,
and integration with typed API clients.

**Alternatives considered**:
- Vite SPA: lighter, but needs more manual decisions for routing, page loading,
  and customer approval pages.
- Desktop application: contradicts the PRD's web-based remote monitoring goal.

## Decision: NestJS Backend API

**Rationale**: The backend owns business workflows: RBAC, job transitions,
quotation authority, payment closure rules, upload validation, audit logging,
and notifications. NestJS gives a modular service structure that maps cleanly to
Jobs, Diagnoses, Quotations, Payments, Attachments, Notifications, Reports, and
Users.

**Alternatives considered**:
- Minimal Express/Fastify app: less structure, higher risk of scattered business
  rules as modules grow.
- Backend inside frontend only: weak separation for NAS and background jobs.

## Decision: PostgreSQL and Prisma

**Rationale**: The PRD has relational entities and many audit/history
relationships. PostgreSQL is a strong fit for job state, quotes, payments,
users, and reports. Prisma provides typed migrations and query models for the
TypeScript stack.

**Alternatives considered**:
- Document database: less natural for lifecycle, payments, approvals, and audit
  queries.
- Local file storage database: not appropriate for multi-user shop operations.

## Decision: NAS Adapter for Evidence Storage

**Rationale**: The PRD requires Synology NAS as the binary evidence layer.
Application code should own deterministic paths and store only metadata in the
database. An adapter lets deployment choose SMB or WebDAV without exposing
storage details to business modules.

**Alternatives considered**:
- Browser direct upload to NAS: bypasses RBAC, validation, audit logging, and
  application-controlled filenames.
- Store evidence in database: poor fit for photos, scans, screenshots, and
  backup workflows.

## Decision: OpenAPI Contracts for Backend Interfaces

**Rationale**: The platform exposes a backend API to the web app and possibly
future mobile or customer-facing surfaces. OpenAPI gives a contract for jobs,
attachments, quotes, approvals, payments, notifications, and reports before
implementation begins.

**Alternatives considered**:
- Informal endpoint list: too weak for contract tests and downstream task
  generation.
- GraphQL first: flexible, but unnecessary for the MVP's workflow-driven API.

## Decision: Secure Customer Approval Links in MVP

**Rationale**: The PRD explicitly prefers secure approval links over customer
accounts in v1. This reduces customer friction and keeps the first release
focused on structured quote confirmation.

**Alternatives considered**:
- Customer portal accounts: stronger long-term, but heavier for MVP.
- Manual WhatsApp replies: fails the requirement that the system is the source
  of truth.

## Decision: Test Priority by Workflow Risk

**Rationale**: Tests must cover lifecycle transitions, authorization boundaries,
upload validation, quotation approval, payment completion, and audit logging.
These are the product's highest-risk business rules.

**Alternatives considered**:
- UI-only smoke tests: insufficient for pricing and audit guarantees.
- Unit tests only: misses cross-module workflow regressions.
