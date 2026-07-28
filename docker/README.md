# Docker Development Environment

## Purpose
This Docker setup provides a simple local development environment for the clothing business platform. It is intentionally lightweight and keeps the focus on local app development, hot reloads, and a placeholder PostgreSQL service for future data work.

## Folder structure
- Dockerfile: development-focused image for the Next.js app.
- docker-compose.yml: local services for the app and PostgreSQL.
- docker/: documentation and local infrastructure notes.

## Start development
1. Copy the example environment file if needed:
   - `copy .env.example .env` on Windows
2. Start the stack:
   - `docker compose up --build`
3. Open the app at `http://localhost:3000`.

## Stop services
- `docker compose down`
- To remove persisted volumes as well, use `docker compose down -v`.

## Rebuild
- Rebuild the app image after dependency or Dockerfile changes:
  - `docker compose build app`

## Future services
The compose file currently includes placeholders for future additions such as Redis, MinIO, and a background worker. These sections are intentionally commented out so the local setup stays simple today.

## Common troubleshooting
- If the app container cannot start, confirm Docker Desktop is running.
- If the app cannot reach PostgreSQL, wait for the Postgres health check to become healthy before retrying.
- If changes are not reflected immediately, rebuild the image or restart the app service.
- If you need a clean local state, remove the volumes with `docker compose down -v`.
