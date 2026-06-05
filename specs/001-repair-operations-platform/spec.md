# Feature Specification: Repair Operations Platform

**Feature Branch**: `001-repair-operations-platform`

**Created**: 2026-05-17

**Status**: Draft

**Input**: User description: "Build the Autopilot Computer Shop System from the project PRD in Codex/PRD.md."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and Track a Repair Job (Priority: P1)

Store Staff registers a customer repair job, records customer and device details,
uploads the service note, and receives a Job ID that can be tracked by staff,
technicians, and the owner throughout the repair lifecycle.

**Why this priority**: Intake is the start of every repair workflow. Without a
reliable job record, diagnosis, quotation, approval, payment, and reporting
cannot be trusted.

**Independent Test**: A staff member can create a new job from customer arrival
through service-note capture, then locate the job by Job ID and see it in the
active repair queue without using chat messages as the system of record.

**Acceptance Scenarios**:

1. **Given** a customer arrives with a device, **When** Store Staff records
   customer details, device details, issue description, and service-note
   evidence, **Then** the system creates a unique Job ID, stores the job as
   `NEW JOB`, and shows it in the repair queue.
2. **Given** a job has been created, **When** the owner opens the dashboard,
   **Then** the owner can see the job status, customer summary, device summary,
   assigned handoff state, and available evidence.
3. **Given** required intake details are missing, **When** Store Staff attempts
   to submit the job, **Then** the system prevents submission and identifies the
   missing information.

---

### User Story 2 - Diagnose and Submit Evidence (Priority: P1)

Technicians review assigned jobs, add diagnosis notes, attach photos or
screenshots as evidence, update progress, and submit the job for owner review
when pricing or repair approval is needed.

**Why this priority**: Technician diagnosis is the evidence base for quotation,
customer trust, repair decisions, and future dispute resolution.

**Independent Test**: A technician can open a job, add a diagnosis with evidence,
submit it for owner review, and the owner can see the complete diagnosis context
from the job timeline.

**Acceptance Scenarios**:

1. **Given** a job is ready for diagnosis, **When** a technician adds diagnosis
   notes and evidence, **Then** the job timeline shows the diagnosis, evidence,
   technician identity, and submission time.
2. **Given** a technician submits a diagnosis for review, **When** the owner
   views the dashboard, **Then** the job appears as waiting for owner review.
3. **Given** a technician attempts to set a final repair price, **When** the
   action is submitted, **Then** the system blocks the action because pricing
   authority belongs to Owner/Manager.

---

### User Story 3 - Review, Quote, and Capture Customer Decision (Priority: P1)

The owner reviews technician diagnosis, sets the quotation, sends it to the
customer, and captures the customer's approval, rejection, or no-repair decision
through a structured confirmation path.

**Why this priority**: Pricing authority and customer confirmation are the main
handoff points where manual coordination can cause mistakes.

**Independent Test**: The owner can convert a diagnosis into a quotation, send it
to the customer, receive a structured decision, and automatically move the job to
the correct next status.

**Acceptance Scenarios**:

1. **Given** a job is waiting for owner review, **When** the owner creates and
   sends a quotation, **Then** the quotation is linked to the Job ID, the job
   moves to `WAITING CUSTOMER CONFIRMATION`, and the send event is logged.
2. **Given** a customer approves the quotation, **When** the decision is
   recorded, **Then** the job moves to `IN PROGRESS` and the repair team is
   notified.
3. **Given** a customer rejects the quotation or chooses no repair, **When** the
   decision is recorded, **Then** the job moves to `CANCELLED` or
   `CLOSED_NO_REPAIR` with the reason preserved.

---

### User Story 4 - Complete Repair, Pickup, and Payment (Priority: P2)

Technicians and Store Staff move approved jobs through repair progress, ready
pickup, payment capture, and completion while preserving payment proof and
completion history.

**Why this priority**: The shop needs a closed loop from approval to payment so
active jobs, ready pickups, and completed jobs are not mixed together.

**Independent Test**: An approved job can be marked in progress, moved to ready
pickup, paid, and completed with the owner able to review the full timeline.

**Acceptance Scenarios**:

1. **Given** a job is approved and in progress, **When** the technician marks the
   job ready for pickup, **Then** the job moves to `READY PICKUP` and the
   customer can be notified.
2. **Given** a job is ready for pickup, **When** Store Staff records payment and
   payment proof, **Then** the payment is attached to the correct Job ID.
3. **Given** payment is recorded, **When** the owner or authorized staff closes
   the job, **Then** the job moves to `COMPLETE` and remains available in job
   history and reports.

---

### User Story 5 - Monitor Operations and Reports (Priority: P3)

The owner monitors active jobs, bottlenecks, payments, technician workload, and
completed repair history from a dashboard and reports module.

**Why this priority**: Remote monitoring is a primary business goal, but it
depends on accurate intake, diagnosis, quotation, payment, and completion data.

**Independent Test**: The owner can view active job counts by status, jobs
waiting for owner action, jobs waiting for customer confirmation, ready pickups,
payments recorded, and completed jobs for a selected period.

**Acceptance Scenarios**:

1. **Given** jobs exist in multiple lifecycle stages, **When** the owner opens
   the dashboard, **Then** the dashboard groups jobs by status and highlights
   work requiring owner action.
2. **Given** completed and paid jobs exist, **When** the owner opens reports,
   **Then** the owner can review job volume, payment totals, and completion
   history for a chosen period.

---

### Edge Cases

- A customer has multiple active jobs for different devices.
- A device returns for a follow-up repair after a previous completed job.
- A job is created but the service note or required customer contact is missing.
- A technician uploads the wrong evidence category or an unsupported file type.
- The owner revises a quotation before customer decision.
- A customer approval link expires or is opened after the job is already closed.
- A customer rejects a quote after partial diagnosis evidence has been recorded.
- Payment is recorded for the wrong job and must be corrected by an authorized
  role with an audit trail.
- A staff member tries to access a module or action outside their role.
- Customer notification consent is not available for the requested channel.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support role-based access for Owner/Manager,
  Technician, and Store Staff.
- **FR-002**: System MUST allow Store Staff to register customers, devices,
  issue descriptions, intake notes, and service-note evidence.
- **FR-003**: System MUST create a unique Job ID for every repair job.
- **FR-004**: System MUST track each job through `NEW JOB`,
  `WAITING FADHIL REVIEW`, `WAITING CUSTOMER CONFIRMATION`, `IN PROGRESS`,
  `READY PICKUP`, `COMPLETE`, `CANCELLED`, and `CLOSED_NO_REPAIR`.
- **FR-005**: System MUST preserve job status history with actor, timestamp,
  previous status, new status, and reason when applicable.
- **FR-006**: System MUST allow technicians to add diagnosis notes, progress
  updates, and evidence to assigned or accessible jobs.
- **FR-007**: System MUST prevent technicians and Store Staff from finalizing
  quotation pricing unless they have Owner/Manager authority.
- **FR-008**: System MUST allow Owner/Manager to review diagnoses, create
  quotations, revise quotations, and send quotations for customer confirmation.
- **FR-009**: System MUST capture customer approval, rejection, or no-repair
  decisions in a structured record linked to the Job ID.
- **FR-010**: System MUST move approved jobs into repair progress and rejected
  or no-repair jobs into the correct terminal state.
- **FR-011**: System MUST allow technicians to mark approved jobs ready for
  pickup when repair and testing are complete.
- **FR-012**: System MUST allow Store Staff to record payment amount, payment
  method, payment time, and payment proof for the correct Job ID.
- **FR-013**: System MUST allow authorized users to complete a job only after
  the required payment or closure reason is recorded.
- **FR-014**: System MUST attach service notes, diagnosis media, quotation
  records, customer approvals, repair updates, and payment proof to the relevant
  Job ID.
- **FR-015**: System MUST show a readable job timeline for operational history
  and maintain a protected audit log for sensitive business and security events.
- **FR-016**: System MUST log job creation, status changes, diagnosis
  submissions, quotation sends, customer decisions, payment records, exports,
  role changes, and administrative overrides.
- **FR-017**: System MUST validate file evidence by allowed category, size, and
  user permission before accepting it.
- **FR-018**: System MUST provide owner dashboard views for active jobs, jobs
  awaiting owner review, jobs awaiting customer confirmation, jobs ready for
  pickup, payment activity, and completion history.
- **FR-019**: System MUST provide modules for Dashboard, Jobs/Repair, Customers,
  Technicians, Quotation, Payment, Notifications, Reports, and Settings.
- **FR-020**: System MUST support customer communication records, including
  notification channel, consent status, send result, and related job or quote.
- **FR-021**: System MUST support secure customer approval links for quotation
  decisions without requiring a full customer account in the first release.
- **FR-022**: System MUST prevent unauthorized users from viewing customer
  personal data, payment records, or job evidence outside their role.
- **FR-023**: System MUST keep repair records and evidence available for owner
  review after job completion according to the shop's retention policy.
- **FR-024**: System MUST support a single-shop launch while keeping records
  organized by organization and branch for future reuse.
- **FR-025**: System MUST exclude spare-parts inventory, full accounting, public
  customer self-registration, AI diagnosis, and franchise-grade white labeling
  from the MVP unless approved as a later scope change.

### Key Entities *(include if feature involves data)*

- **Organization**: Business account that owns branches, users, customers, and
  repair operations.
- **Branch**: Shop location where jobs are created and handled.
- **User**: Staff account with a role such as Owner/Manager, Technician, or
  Store Staff.
- **Customer**: Person who owns or submits a device for repair, with contact and
  consent details.
- **Device**: Computer, laptop, or related item submitted for diagnosis or
  repair.
- **Job**: Repair case with Job ID, customer, device, status, assigned handoffs,
  evidence links, and timeline.
- **Job Status History**: Ordered record of lifecycle changes for a job.
- **Diagnosis**: Technician assessment, notes, evidence, and submission state.
- **Quotation**: Owner-approved pricing proposal sent to the customer.
- **Customer Approval**: Structured approval, rejection, or no-repair decision.
- **Attachment**: Service note, photo, screenshot, payment proof, or supporting
  evidence linked to a job.
- **Payment**: Payment record linked to a job and supporting proof.
- **Notification**: Customer or internal communication event with consent and
  delivery state.
- **Audit Log**: Protected record of sensitive operational and permission
  changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Store Staff can register a complete new repair job with required
  evidence in under 3 minutes during normal counter intake.
- **SC-002**: The owner can identify all jobs waiting for owner action from the
  dashboard in under 30 seconds.
- **SC-003**: At least 95% of active jobs have a current lifecycle status,
  assigned next action, and visible timeline entry.
- **SC-004**: 100% of sent quotations are linked to a Job ID and have a recorded
  customer decision or pending state.
- **SC-005**: 100% of completed jobs have either a payment record or an explicit
  authorized closure reason.
- **SC-006**: 100% of diagnosis, quotation, approval, payment, and status-change
  actions are visible in job history to authorized users.
- **SC-007**: Unauthorized role attempts for pricing, payment, evidence, or
  customer data actions are blocked and recorded.
- **SC-008**: The owner can review job volume, completed jobs, and payment totals
  for a selected period without reconstructing records from chat history.

## Assumptions

- The first release supports one shop operation led by Fadhil, while keeping
  organization and branch concepts for future expansion.
- Store Staff handles counter intake and payment capture.
- Technicians handle diagnosis, evidence upload, repair progress, and ready
  pickup updates.
- Owner/Manager is the pricing and closure authority for quotations and final
  job review.
- Customer confirmation in the first release uses a secure approval link and
  does not require a customer account.
- Customer notifications may use WhatsApp, email, or both, depending on consent
  and shop configuration.
- The operational record inside the system is the source of truth, not WhatsApp
  chat history.
- The MVP focuses on the end-to-end repair workflow and excludes inventory,
  accounting, AI diagnosis, public self-registration, and white labeling.
