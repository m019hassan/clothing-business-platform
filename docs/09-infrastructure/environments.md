# Environments

## Development
- Local development environment for engineers
- Lightweight database and local secrets
- Optional Docker-based local stack

## Staging
- Pre-production environment for validation
- Mirrors production configuration as closely as practical
- Used for release testing and backup/restore drills

## Production
- Main business application environment
- Managed PostgreSQL or a secure self-hosted database service
- Controlled deployment process and monitoring

## Environment separation
Production data must never be used in development or staging without explicit approval and sanitization.
