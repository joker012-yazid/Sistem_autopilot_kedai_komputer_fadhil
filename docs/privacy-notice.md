# Privacy Notice Draft

This draft reflects the active Fadhil CareDesk scope: repair operations only, with Owner/Fadhil and Technician roles.

## Data Collected

Fadhil CareDesk records customer contact details, device details, repair issue descriptions, service notes, technician diagnosis notes, evidence files, checklist report data, pickup reminders, notification logs, and operational audit events.

## Purpose

Data is used to register repair jobs, diagnose devices, document laptop/PC condition, record Owner review, record customer decision, track repair progress, manage pickup follow-up, and provide operational reports to Owner/Fadhil.

## Evidence Handling

Uploaded evidence and checklist images are linked to the correct job and report section. Staff should not upload unrelated personal files or evidence that is not required for the repair.

## Customer Consent Wording

Use this wording when collecting contact consent:

```text
I agree that Kedai Komputer Fadhil may contact me about this repair job using my selected contact channel for diagnosis updates, repair decisions, and pickup reminders.
```

If the customer does not consent to WhatsApp or email, staff should record direct phone or in-shop follow-up in the notification/contact history.

## Access Control

- Owner/Fadhil can view all repair jobs, reports, customers, settings, and operational audit records.
- Technicians can view and update only assigned or actionable repair work.
- Store Staff, quotation, payment, invoice, and customer approval link workflows are not active CareDesk runtime features.

## Retention and Deletion

Production retention rules should define how long customer records, device records, job evidence, checklist images, notification logs, and audit logs are kept. POS records remain in the POS system and are referenced only by optional POS reference strings.

## Incident Response

If customer data, evidence files, or report PDFs are exposed to the wrong party, preserve audit logs, rotate relevant secrets, restrict affected storage paths, and notify Owner/Fadhil for follow-up.
