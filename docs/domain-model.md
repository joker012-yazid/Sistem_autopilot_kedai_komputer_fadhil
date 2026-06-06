# Domain Model

This document preserves the important domain concepts from the original specification in a public-repo-friendly format.

## Core Entities

### Organization

Represents the business owner context for the system.

Typical responsibilities:

- owns branches, users, customers, devices, jobs, notifications, and audit logs
- provides a future-friendly structure even when the current deployment is single-shop

### Branch

Represents a shop location.

Typical responsibilities:

- groups jobs and users by operating location
- supports future multi-branch expansion

### User

Represents a staff account.

Important concepts:

- role-based access
- active or disabled account state
- auditability of actions and last login context

### Customer

Represents a repair customer.

Important concepts:

- contact details
- preferred communication channel
- communication consent
- privacy acknowledgement

### Device

Represents the item sent for repair.

Important concepts:

- device type, brand, model, serial number
- accessories received
- condition notes

### Job

Represents a repair case and is the main operational record.

Important concepts:

- unique job number
- current lifecycle status
- linked customer and device
- assigned technician
- issue description and intake notes
- closure details when the job ends

### Job Status History

Represents the timeline of lifecycle changes.

Important concepts:

- previous status
- new status
- actor
- timestamp
- reason when relevant

### Diagnosis

Represents technician findings and supporting notes.

Important concepts:

- diagnosis summary
- detailed notes
- recommended action
- submission time for owner review

### Attachment

Represents evidence metadata linked to a job.

Common categories include:

- service note
- diagnosis photo
- screenshot
- quote or approval attachment
- payment proof
- other supporting evidence

### Notification

Represents a communication event related to a job.

Important concepts:

- channel used
- consent status
- delivery or recording result
- related job or reminder stage

### Audit Log

Represents a protected record of sensitive actions.

Important concepts:

- actor
- action
- target object
- timestamp
- security or business context

## Lifecycle Summary

The original planned transitions were:

- `NEW JOB` -> `WAITING FADHIL REVIEW`
- `WAITING FADHIL REVIEW` -> `WAITING CUSTOMER CONFIRMATION`
- `WAITING CUSTOMER CONFIRMATION` -> `IN PROGRESS`
- `WAITING CUSTOMER CONFIRMATION` -> `CANCELLED`
- `WAITING CUSTOMER CONFIRMATION` -> `CLOSED_NO_REPAIR`
- `IN PROGRESS` -> `READY PICKUP`
- `READY PICKUP` -> `COMPLETE`

Authorized overrides may move a non-terminal job to a cancelled or equivalent terminal state with a recorded reason.

## Validation Principles

- Every status transition should create history.
- Evidence must be validated by category, size, and permission.
- Terminal states should record closure context.
- Restricted actions must respect role boundaries.
- Customer communication should respect consent settings.

## Notes

This document is intentionally concise. For code-level reality, use the runtime implementation, Prisma schema, and API contracts in the active codebase as the final source of truth.
