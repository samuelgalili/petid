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
# The LAST definition, not the first: docker compose's env_file applies later
# definitions over earlier ones, so a corrected DATABASE_URL appended to the
# bottom of .env — a very ordinary way to fix a connection string — is the one
# the API and the migrations actually use. Taking the first would dump one
# database while the migrations ran against another, and the rehearsal that
# restores that dump would then vouch for the wrong data.
DATABASE_URL="$(grep -E '^[[:space:]]*(export[[:space:]]+)?DATABASE_URL=' "$ENV_FILE" | tail -1 | cut -d= -f2- || true)"

# Carriage returns and stray spaces have to go before anything looks at the
# value. A CR left on the end survives the -z test below, and pg_dump then
# reads the whole thing as a database name rather than a URI: it quietly falls
# back to a local unix socket, which does not exist in the container, and the
# error names a missing socket instead of the malformed variable that caused it.
DATABASE_URL="$(printf '%s' "$DATABASE_URL" | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
DATABASE_URL="${DATABASE_URL%\"}"
DATABASE_URL="${DATABASE_URL#\"}"
DATABASE_URL="${DATABASE_URL%\'}"
DATABASE_URL="${DATABASE_URL#\'}"
DATABASE_URL="$(printf '%s' "$DATABASE_URL" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

if [[ -z "$DATABASE_URL" ]]; then
  echo "backup: DATABASE_URL is not set in $ENV_FILE" >&2
  exit 1
fi

# Anything that is not a connection URI would send pg_dump to a local socket,
# so say so here rather than let it fail three lines later with an error about
# the socket. The value itself is never printed: it carries the password.
case "$DATABASE_URL" in
  postgres://*|postgresql://*) ;;
  *)
    echo "backup: DATABASE_URL in $ENV_FILE is not a postgres:// connection string" >&2
    echo "backup: it is ${#DATABASE_URL} characters and starts with '${DATABASE_URL%%:*}'" >&2
    exit 1
    ;;
esac

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

# Where the next step finds it. dry-run-migrations.sh restores this exact dump
# rather than guessing at the newest file in the directory.
printf '%s\n' "$target" > "${BACKUP_DIR}/.last-dump"
chmod 600 "${BACKUP_DIR}/.last-dump"

# Keep a bounded history: these are full copies of customer data, so an
# unbounded pile on a web server is a liability, not a safety net.
ls -1t "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | tail -n "+$((KEEP + 1))" | while read -r old; do
  echo "backup: pruning $(basename "$old")"
  rm -f "$old"
done

echo "backup: $(ls -1 "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | wc -l) dump(s) retained"
