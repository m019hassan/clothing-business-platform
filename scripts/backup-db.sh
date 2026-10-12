#!/bin/bash
# Weekly backups for the clothing platform, two dumps per run:
#   1. the local development database (clothing_platform)
#   2. the production database on Supabase (via DATABASE_URL_SESSION in .data/deploy.env)
# Runs from launchd, so nothing here depends on any external service being up;
# the cloud copy retries a few times because home DNS can be moody, and a dump
# under 50 KB is treated as a failure instead of passing silently.
set -euo pipefail

REPO="/Users/mohammedhassan/My-Work/clothing-business-platform"
BACKUP_DIR="$REPO/.data/backups"
PG_DUMP="/opt/homebrew/opt/postgresql@17/bin/pg_dump"

cd "$REPO"
mkdir -p "$BACKUP_DIR"

STAMP=$(date +%Y%m%d-%H%M)

"$PG_DUMP" --no-owner --no-privileges clothing_platform > "$BACKUP_DIR/clothing_$STAMP.sql"
SIZE=$(stat -f%z "$BACKUP_DIR/clothing_$STAMP.sql")

if [ "$SIZE" -lt 51200 ]; then
  echo "local backup too small ($SIZE bytes) — check PostgreSQL" >&2
  exit 1
fi

echo "backup ok: clothing_$STAMP.sql ($SIZE bytes)"

if [ -f .data/deploy.env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.data/deploy.env
  set +a
fi

if [ -z "${DATABASE_URL_SESSION:-}" ]; then
  echo "cloud backup skipped: DATABASE_URL_SESSION is not configured" >&2
  exit 0
fi

for attempt in 1 2 3; do
  if "$PG_DUMP" --no-owner --no-privileges "$DATABASE_URL_SESSION" > "$BACKUP_DIR/cloud_$STAMP.sql" 2>&1; then
    CLOUD_SIZE=$(stat -f%z "$BACKUP_DIR/cloud_$STAMP.sql")

    if [ "$CLOUD_SIZE" -lt 51200 ]; then
      echo "cloud backup too small ($CLOUD_SIZE bytes)" >&2
      exit 1
    fi

    echo "backup ok: cloud_$STAMP.sql ($CLOUD_SIZE bytes)"
    exit 0
  fi

  echo "cloud backup attempt $attempt failed — retrying" >&2
  sleep 10
done

echo "cloud backup failed after 3 attempts" >&2
exit 1
