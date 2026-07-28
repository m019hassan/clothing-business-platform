# Backup Strategy

## Backup objectives
The architecture must support:
- Database backup copies
- File backup copies
- Recovery from local failure or cloud outage
- Long-term archival

## Backup frequency
- Database: daily full backups plus transaction log or point-in-time backups if supported
- Files and media: daily or near-daily backups
- Operational logs: retained according to policy

## Retention
- Short-term retention: 30 to 90 days
- Medium-term retention: 6 to 12 months
- Long-term archival: annual or project-specific retention

## Encryption
All backups should be encrypted at rest and during transfer.

## Storage split
- Production backup copies should live in a cloud backup location or managed backup service.
- A home server or NAS may hold local copies for additional resilience.

## Restore testing
Restore procedures should be tested periodically to ensure that backup integrity is real and not theoretical.
