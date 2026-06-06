# Technical Decisions

This document keeps the durable architecture decisions from the original project research without exposing the full planning workspace in the public repository.

## TypeScript Monorepo

The project uses a TypeScript monorepo so frontend, backend, shared validation, and tests can evolve together with shared domain rules and types.

Why it matters:

- shared lifecycle rules are easier to keep consistent
- frontend and backend can be tested independently
- shared schemas reduce drift

## Separate Web and API Apps

The platform keeps the browser app and backend API as separate apps.

Why it matters:

- the frontend can focus on operator workflows
- the backend can own RBAC, lifecycle rules, uploads, audit logging, and reporting
- deployment and verification are easier to reason about

## Next.js for Frontend

Next.js was chosen for the app-style interface, route structure, and responsive operational screens.

Why it matters:

- good fit for dashboard and workflow pages
- clear route-level organization
- works well with typed API calls

## NestJS for Backend

NestJS was chosen for the backend because the project has many workflow-heavy business rules.

Why it matters:

- modular service structure
- clearer separation between controllers, services, guards, and infrastructure
- good fit for RBAC, audit, cron jobs, and domain-oriented modules

## PostgreSQL and Prisma

PostgreSQL with Prisma was chosen for operational data and typed persistence.

Why it matters:

- strong fit for relational workflow data
- useful for status history, reporting, and audit queries
- Prisma supports typed access patterns and migration workflows

## Adapter-Based Evidence Storage

Evidence storage is treated as an application-owned storage concern, with metadata in the database and files stored through an adapter.

Why it matters:

- business logic does not depend on a single storage implementation detail
- evidence paths and filenames stay controlled by the application
- storage rules stay compatible with local and NAS-backed deployments

## OpenAPI-First Contracts

The project planning emphasized API contracts before or alongside implementation.

Why it matters:

- improves frontend-backend coordination
- supports contract testing
- keeps the public API surface explicit

## Workflow-Driven Testing

Testing was prioritized around business-risk flows, not only isolated units.

Why it matters:

- catches lifecycle regressions
- verifies role boundaries
- validates evidence handling, reporting, and state changes end to end
