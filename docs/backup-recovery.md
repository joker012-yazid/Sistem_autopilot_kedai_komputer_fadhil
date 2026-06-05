# Backup and Recovery Checklist

Use this checklist before production launch and during regular recovery drills.

## Backup Scope

- PostgreSQL CareDesk database.
- NAS evidence root for job evidence and checklist images.
- Runtime environment configuration and secret inventory.
- Deployment version or release artifact.

## PostgreSQL Backup

- [ ] Enable automated daily database backups.
- [ ] Enable point-in-time recovery if the hosting platform supports it.
- [ ] Store backups outside the primary server.
- [ ] Encrypt backups at rest.
- [ ] Record backup location and retention period.
- [ ] Test restore into a staging database at least monthly.

## NAS Evidence Backup

- [ ] Back up the application evidence root, including all job folders.
- [ ] Preserve folder paths and filenames exactly.
- [ ] Store NAS backups separately from the live NAS volume.
- [ ] Verify a sample service note, diagnosis photo, checklist image, and report evidence after restore.
- [ ] Confirm restored files are not exposed through a public web path.

## Recovery Drill

1. Restore PostgreSQL into a staging database.
2. Restore the NAS evidence root into a staging storage location.
3. Set staging environment variables to the restored database and evidence root.
4. Start CareDesk API and web services.
5. Open a completed job and confirm timeline, diagnosis, owner review, customer decision, pickup, notification, checklist report, and evidence metadata are visible.
6. Download representative Customer Report and Checklist Report PDFs.
7. Record recovery time, missing data if any, and corrective actions.

## Failure Response

- Keep the current audit log and failed backup artifacts for investigation.
- Do not overwrite the latest known-good backup during incident response.
- Prioritize restoring job metadata and evidence together so job timelines and reports remain reconstructable.
