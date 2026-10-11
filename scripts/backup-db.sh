#!/bin/bash
# A weekly local backup of the platform database. Runs from launchd, so it never
# depends on any external service being available.
set -euo pipefail

REPO="/Users/mohammedhassan/My-Work/clothing-business-platform"
BACKUP_DIR="$REPO/.data/backups"
PG_DUMP="/opt/homebrew/opt/postgresql@16/bin/pg_dump"

cd "$REPO"
mkdir -p "$BACKUP_DIR"

STAMP=$(date +%Y%m%d-%H%M)
"$PG_DUMP" clothing_platform > "$BACKUP_DIR/clothing_$STAMP.sql"

# Guard against a silently empty dump.
SIZE=$(stat -f%z "$BACKUP_DIR/clothing_$STAMP.sql")
if [ "$SIZE" -lt 51200 ]; then
  echo "backup too small ($SIZE bytes) — check PostgreSQL" >&2
  exit 1
fi

echo "backup ok: clothing_$STAMP.sql ($SIZE bytes)"
