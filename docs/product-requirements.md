# Product Requirements

This document preserves the important product requirements behind Fadhil CareDesk without keeping the original planning workspace in the public repository.

## Product Goal

Fadhil CareDesk is a repair operations platform for a computer service shop. The system is meant to replace scattered chat-based tracking with a single operational record for intake, diagnosis, owner review, customer decision, repair progress, pickup follow-up, reporting, and evidence storage.

## Core User Roles

- **Owner / Fadhil**: reviews diagnosis, approves next action, monitors jobs, handles reports, and manages shop-level settings.
- **Technician**: scans service notes, creates jobs, takes or releases jobs, records diagnosis, uploads evidence, progresses repair work, and completes pickup actions.
- **Store Staff**: appears in the original MVP requirements as the intake and payment role. Where the active runtime differs, treat this as historical product context rather than a guarantee of the current deployed flow.

## Core Workflow

The original product scope centered on a tracked repair lifecycle:

1. Register a new repair job with customer, device, issue description, and service-note evidence.
2. Let a technician diagnose the job and upload evidence.
3. Move the job to owner review when technician work needs approval.
4. Record customer confirmation or no-proceed decisions in a structured way.
5. Continue repair progress, pickup reminders, and completion.
6. Preserve reports, history, and evidence for later review.

## Key Lifecycle States

The original requirements defined these lifecycle states:

- `NEW JOB`
- `WAITING FADHIL REVIEW`
- `WAITING CUSTOMER CONFIRMATION`
- `IN PROGRESS`
- `READY PICKUP`
- `COMPLETE`
- `CANCELLED`
- `CLOSED_NO_REPAIR`

Additional operational states such as reminder and unclaimed handling may exist in the current implementation and are documented in the workflow and runtime docs.

## Enduring Business Rules

- Every repair case must have a unique job identifier.
- Repair actions must be traceable through status history and audit logging.
- Evidence must stay linked to the correct job record.
- Unauthorized users must not access customer-sensitive data or restricted actions.
- The system record is the source of truth, not chat history.
- Repair records and evidence should stay reviewable after completion according to retention policy.

## Product Scope Principles

The original MVP planning emphasized:

- single-shop first, with future-friendly structure for broader expansion
- role-based access control
- evidence-centered job tracking
- auditable lifecycle transitions
- reporting for operational visibility

The original MVP explicitly excluded inventory, full accounting, public customer self-registration, AI diagnosis, and broad white-label/franchise concerns unless approved later.

## Success Criteria

The original measurable outcomes focused on:

- fast job registration at the counter
- quick owner visibility into jobs needing action
- reliable lifecycle tracking across active jobs
- structured decisions tied to the correct job
- completion records that remain auditable

## Where to Look Next

- See [repair-workflow.md](./repair-workflow.md) for the operational flow used by the project.
- See [domain-model.md](./domain-model.md) for key entities and relationships.
- See [architecture.md](./architecture.md) for the runtime structure.
