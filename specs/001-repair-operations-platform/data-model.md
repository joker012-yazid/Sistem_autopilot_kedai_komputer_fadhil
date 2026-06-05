# Data Model: Repair Operations Platform

## Entity Overview

### Organization

Represents a business account.

Fields:
- `id`
- `name`
- `status`: `active`, `suspended`
- `created_at`
- `updated_at`

Relationships:
- Has many branches, users, customers, devices, jobs, notifications, audit logs.

### Branch

Represents a shop location.

Fields:
- `id`
- `organization_id`
- `name`
- `code`
- `address`
- `phone`
- `status`

Relationships:
- Belongs to organization.
- Has many jobs, users, and payments.

### User

Represents a staff account.

Fields:
- `id`
- `organization_id`
- `branch_id`
- `name`
- `email`
- `phone`
- `role`: `owner_manager`, `technician`, `store_staff`
- `status`: `active`, `disabled`
- `last_login_at`

Validation:
- Role is required.
- Disabled users cannot perform job actions.

### Customer

Represents a repair customer.

Fields:
- `id`
- `organization_id`
- `name`
- `phone`
- `email`
- `preferred_channel`: `whatsapp`, `email`, `phone`, `none`
- `whatsapp_consent`: boolean
- `email_consent`: boolean
- `privacy_notice_accepted_at`

Validation:
- At least one contact method is required for active repair jobs.
- Notification sends must respect consent fields.

### Device

Represents a customer device submitted for repair.

Fields:
- `id`
- `organization_id`
- `customer_id`
- `type`
- `brand`
- `model`
- `serial_number`
- `accessories_received`
- `condition_notes`

Relationships:
- Belongs to customer.
- Has many jobs.

### Job

Represents a repair case.

Fields:
- `id`
- `job_number`
- `organization_id`
- `branch_id`
- `customer_id`
- `device_id`
- `status`
- `issue_description`
- `intake_notes`
- `nas_folder_path`
- `assigned_technician_id`
- `created_by_user_id`
- `closed_by_user_id`
- `closed_at`
- `closure_reason`

Validation:
- `job_number` is unique within organization.
- `nas_folder_path` is created by the application.
- Terminal states require a reason or completion record.

State transitions:
- `NEW JOB` -> `WAITING FADHIL REVIEW`
- `WAITING FADHIL REVIEW` -> `WAITING CUSTOMER CONFIRMATION`
- `WAITING CUSTOMER CONFIRMATION` -> `IN PROGRESS`
- `WAITING CUSTOMER CONFIRMATION` -> `CANCELLED`
- `WAITING CUSTOMER CONFIRMATION` -> `CLOSED_NO_REPAIR`
- `IN PROGRESS` -> `READY PICKUP`
- `READY PICKUP` -> `COMPLETE`
- Any non-terminal status -> `CANCELLED` by authorized override with reason.

### JobStatusHistory

Tracks status changes.

Fields:
- `id`
- `job_id`
- `from_status`
- `to_status`
- `changed_by_user_id`
- `reason`
- `created_at`

Validation:
- Every job transition creates one history row.

### Diagnosis

Represents technician findings.

Fields:
- `id`
- `job_id`
- `technician_id`
- `summary`
- `details`
- `recommended_action`
- `submitted_for_review_at`
- `created_at`
- `updated_at`

Validation:
- Technician cannot set final price in diagnosis.
- Submission for owner review requires diagnosis summary.

### Quotation

Represents owner-approved pricing.

Fields:
- `id`
- `job_id`
- `created_by_user_id`
- `version`
- `line_items`
- `subtotal`
- `discount`
- `total`
- `status`: `draft`, `sent`, `accepted`, `rejected`, `superseded`, `expired`
- `sent_at`
- `expires_at`

Validation:
- Only Owner/Manager can finalize and send.
- New revisions supersede prior draft or sent quotes.

### CustomerApproval

Represents customer quote decision.

Fields:
- `id`
- `job_id`
- `quotation_id`
- `decision`: `approved`, `rejected`, `no_repair`
- `customer_name`
- `customer_contact`
- `decision_notes`
- `approval_token_hash`
- `decided_at`
- `expires_at`

Validation:
- Approval token cannot be reused after decision or expiry.
- Decision changes job status according to lifecycle rules.

### Attachment

Represents evidence metadata.

Fields:
- `id`
- `organization_id`
- `job_id`
- `uploaded_by_user_id`
- `category`: `service_note`, `diagnosis_photo`, `screenshot`, `quote`, `approval`, `payment_proof`, `other`
- `original_filename`
- `stored_filename`
- `storage_path`
- `mime_type`
- `size_bytes`
- `checksum`
- `status`: `pending_scan`, `available`, `rejected`, `deleted`
- `created_at`

Validation:
- Category allow-list is required.
- Stored filename is application-generated.
- Attachment path must be under the job NAS folder.

### Payment

Represents payment capture.

Fields:
- `id`
- `job_id`
- `recorded_by_user_id`
- `amount`
- `method`: `cash`, `card`, `bank_transfer`, `ewallet`, `other`
- `reference`
- `paid_at`
- `notes`

Validation:
- Payment amount must be positive.
- Completion requires payment or authorized closure reason.

### Notification

Represents customer or internal communication.

Fields:
- `id`
- `organization_id`
- `job_id`
- `recipient_type`: `customer`, `owner_manager`, `technician`, `store_staff`
- `channel`: `whatsapp`, `email`, `in_app`
- `template_key`
- `status`: `pending`, `sent`, `failed`, `skipped_no_consent`
- `sent_at`
- `failure_reason`

Validation:
- Customer notification checks consent before send.
- Notification links back to job, quote, or payment when applicable.

### AuditLog

Protected record of sensitive actions.

Fields:
- `id`
- `organization_id`
- `actor_user_id`
- `action`
- `entity_type`
- `entity_id`
- `before`
- `after`
- `ip_address`
- `user_agent`
- `created_at`

Validation:
- Audit logs are append-only.
- Sensitive actions must write an audit row before response completion.

## Role Permission Matrix

| Action | Owner/Manager | Technician | Store Staff |
|--------|---------------|------------|-------------|
| Register job | Yes | No | Yes |
| View all jobs | Yes | Assigned or permitted jobs | Branch jobs needed for intake/payment |
| Upload service note | Yes | No | Yes |
| Add diagnosis | Yes | Yes | No |
| Finalize quotation price | Yes | No | No |
| Send quotation | Yes | No | No |
| Record customer decision | Yes | No | Yes, from approved link or owner instruction |
| Update repair progress | Yes | Yes | No |
| Mark ready pickup | Yes | Yes | No |
| Record payment | Yes | No | Yes |
| Close complete job | Yes | No | Yes if payment recorded |
| Export reports | Yes | No | No |

## Reporting Views

- Active jobs by status.
- Jobs waiting owner review.
- Jobs waiting customer confirmation.
- Jobs ready pickup.
- Payments by date range.
- Completed jobs by date range.
- Technician workload by assigned active jobs.
