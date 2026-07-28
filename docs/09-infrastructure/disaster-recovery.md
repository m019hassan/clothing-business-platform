# Disaster Recovery

## Definitions
- High availability: systems keep operating despite a component failure.
- Backup: a copy of data for recovery.
- Disaster recovery: the process of restoring services after a serious outage or data loss event.

## Recovery approach
- Production services should be recoverable from backups and deployment artifacts.
- The home server should support backup copies and safe restore testing, not replace production.
- The recovery plan should specify restore order for database, application, secrets, and media files.

## Recovery procedure
1. Validate the incident and scope.
2. Restore the latest verified backup copy.
3. Reconcile application configuration and secrets.
4. Bring the application back online.
5. Verify inventory, orders, and payments after recovery.

## Recovery testing
A recovery drill should be run periodically to confirm the documented steps work in practice.
