# Cloud Strategy

## Production environment
Cloud infrastructure should host the primary application and database. The goal is reliability, backup support, and maintainability.

## Recommended services
- Application hosting: a managed app platform or container service
- Database: managed PostgreSQL
- Object storage: for images and attachments
- Monitoring: logs, metrics, and alerting
- Secrets: managed secret storage

## Why this matters
A cloud production environment is safer and more operationally reliable than relying on a home server as the main runtime.

## Vendor-neutral guidance
The architecture should remain portable enough to move between providers if necessary, but the initial implementation can use a practical managed provider.
