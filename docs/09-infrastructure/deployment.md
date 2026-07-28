# Deployment

## Initial deployment strategy
Use a cloud-hosted production deployment for the application and a managed or secure self-hosted PostgreSQL service. The application should be containerized or otherwise deployable in a consistent environment.

## Hosting approach
- Production: cloud server or cloud app platform
- Backup: home server or NAS for encrypted copies
- Development: local or containerized environment

## Deployment principles
- Keep configuration externalized.
- Keep secrets in a secure secret store.
- Avoid coupling deployment to a single cloud vendor where practical.
