#!/usr/bin/env bash
#
# Take a database dump before migrations run.
#
# The deploy applies migrations automatically on every push to aws-migration,
# and some of them are destructive - 0019 drops four columns from profiles.
# Until now there was nothing to restore from: no snapshot, no dump, no step of
# any kind between "push" and "drop column".
#
# This runs on the production host, where DATABASE_URL already lives, and it
# fails the deploy if it cannot produce a dump. That is deliberate. A migration
# you cannot undo should not run just because the safety net was unavailable.
#
# The dump holds every customer record, so it is written to a 0700 directory
# owned by the deploy user and the old ones are pruned. It is not encrypted and
# it does not leave the host - treat the host accordingly.
#
# Usage: backup-before-migrate.sh <remote-path> [<label>]

set -euo pipefail

REMOTE_PATH="${1:-/opt/mipo}"
LABEL="${2:-manual}"
BACKUP_DIR="${MIPO_BACKUP_DIR:-${REMOTE_PATH}/backups}"
KEEP="${MIPO_BACKUP_KEEP:-7}"
PG_IMAGE="${MIPO_PG_IMAGE:-postgres:16-alpine}"
ENV_FILE="${REMOTE_PATH}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "backup: no env file at $ENV_FILE" >&2
  exit 1
fi

# Read DATABASE_URL without sourcing the file: .env holds every production
# secret and sourcing it would put all of them in this shell.
# `|| true` because grep exits 1 when the key is absent, and `set -e` would
# kill the script before the explanatory error below could be printed.
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- || true)"
DATABASE_URL="${DATABASE_URL%\"}"
DATABASE_URL="${DATABASE_URL#\"}"

if [[ -z "$DATABASE_URL" ]]; then
  echo "backup: DATABASE_URL is not set in $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="${BACKUP_DIR}/${stamp}-${LABEL}.sql.gz"

echo "backup: dumping to ${target}"

# Runs in a container so the host needs no postgres-client of its own, and the
# version matches the server. --no-owner keeps the dump restorable into a
# database owned by a different role.
#
# `--env DATABASE_URL` passes the name only, so docker inherits the value from
# this script's environment. Writing `-e DATABASE_URL=<value>` would put the
# production connection string, password included, into the host's process list
# for anyone running ps.
export DATABASE_URL
if ! docker run --rm \
  -e PGCONNECT_TIMEOUT=15 \
  --env DATABASE_URL \
  "$PG_IMAGE" \
  sh -c 'pg_dump --no-owner --no-privileges --format=plain "$DATABASE_URL"' \
  | gzip -9 > "$target"; then
  echo "backup: pg_dump failed - refusing to continue to migrations" >&2
  rm -f "$target"
  exit 1
fi

chmod 600 "$target"

# A dump that is suspiciously small usually means pg_dump wrote an error and
# exited 0 through the pipe. Refuse it rather than record a false safety net.
size="$(stat -c %s "$target" 2>/dev/null || echo 0)"
if [[ "$size" -lt 1024 ]]; then
  echo "backup: dump is only ${size} bytes - refusing to continue to migrations" >&2
  rm -f "$target"
  exit 1
fi

echo "backup: wrote $(du -h "$target" | cut -f1) to ${target}"

# Keep a bounded history: these are full copies of customer data, so an
# unbounded pile on a web server is a liability, not a safety net.
ls -1t "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | tail -n "+$((KEEP + 1))" | while read -r old; do
  echo "backup: pruning $(basename "$old")"
  rm -f "$old"
done

echo "backup: $(ls -1 "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | wc -l) dump(s) retained"
