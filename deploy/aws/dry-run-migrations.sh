#!/usr/bin/env bash
#
# Run the pending migrations against a throwaway copy of production before
# running them against production.
#
# On 8 September a migration refused to run because production held six
# duplicate SKUs. It refused *after* an earlier migration in the same run had
# already dropped four columns, and the API container is only replaced once
# migrations succeed - so the old API was left querying columns that no longer
# existed and customers could not log in for four hours.
#
# Nothing in the deploy had ever seen production's data before touching it. The
# dump taken moments earlier is exactly that data, so this restores it into a
# disposable postgres container, runs the same migration runner against it, and
# fails the deploy if anything goes wrong. A failure here costs a red build; the
# same failure ten seconds later costs an outage.
#
# The copy is destroyed on the way out, whatever happened, including on Ctrl-C.
#
# Usage: dry-run-migrations.sh <remote-path> [<dump.sql.gz>]
#        The dump defaults to the one backup-before-migrate.sh just wrote.

set -euo pipefail

REMOTE_PATH="${1:-/opt/mipo}"
BACKUP_DIR="${MIPO_BACKUP_DIR:-${REMOTE_PATH}/backups}"
DUMP="${2:-}"
PG_IMAGE="${MIPO_PG_IMAGE:-postgres:16-alpine}"

# Namespaced by pid so a second run cannot collide with, or clean up after, a
# first one.
SUFFIX="$$"
DB_NAME="mipo_dryrun"
DB_USER="mipo"
DB_CONTAINER="mipo-dryrun-db-${SUFFIX}"
NETWORK="mipo-dryrun-net-${SUFFIX}"
API_TAG="mipo-api:dryrun-${SUFFIX}"
ENV_FILE="$(mktemp)"
chmod 600 "$ENV_FILE"

cleanup() {
  local status=$?
  rm -f "$ENV_FILE"
  docker rm -f "$DB_CONTAINER" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
  docker image rm -f "$API_TAG" >/dev/null 2>&1 || true
  return $status
}
trap cleanup EXIT INT TERM

if [[ -z "$DUMP" ]]; then
  if [[ -f "${BACKUP_DIR}/.last-dump" ]]; then
    DUMP="$(cat "${BACKUP_DIR}/.last-dump")"
  else
    echo "dry-run: no dump given and ${BACKUP_DIR}/.last-dump does not exist" >&2
    exit 1
  fi
fi

if [[ ! -s "$DUMP" ]]; then
  echo "dry-run: dump ${DUMP} is missing or empty" >&2
  exit 1
fi

echo "dry-run: rehearsing the migrations against $(basename "$DUMP")"

# A password nobody needs to know: the container is not published to the host,
# lives on its own network, and is destroyed at the end of this script.
DRYRUN_PASSWORD="$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')"
printf 'DATABASE_URL=postgres://%s:%s@%s:5432/%s\nDB_SSL=false\n' \
  "$DB_USER" "$DRYRUN_PASSWORD" "$DB_CONTAINER" "$DB_NAME" > "$ENV_FILE"

docker network create "$NETWORK" >/dev/null

docker run -d --name "$DB_CONTAINER" --network "$NETWORK" \
  -e POSTGRES_DB="$DB_NAME" \
  -e POSTGRES_USER="$DB_USER" \
  -e POSTGRES_PASSWORD="$DRYRUN_PASSWORD" \
  "$PG_IMAGE" >/dev/null

# The image is ready before postgres is. Wait for it to answer rather than
# sleeping a guessed number of seconds.
ready=""
for _ in $(seq 1 60); do
  if docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    ready="yes"
    break
  fi
  sleep 1
done
if [[ -z "$ready" ]]; then
  echo "dry-run: the throwaway database never became ready" >&2
  docker logs --tail 20 "$DB_CONTAINER" >&2 || true
  exit 1
fi

# ON_ERROR_STOP makes a restore that half-worked fail here. That matters beyond
# this rehearsal: a dump that cannot be restored is not a backup, and finding
# that out now is the point.
echo "dry-run: restoring the dump"
# DATABASE_URL is expanded by the shell inside the container, not this one, so
# the connection string - password included - never reaches the host's process
# list.
if ! gunzip -c "$DUMP" | docker run --rm -i --network "$NETWORK" \
  --env-file "$ENV_FILE" \
  "$PG_IMAGE" \
  sh -c 'psql --quiet --no-psqlrc -v ON_ERROR_STOP=1 -d "$DATABASE_URL"' >/dev/null; then
  echo "dry-run: the dump could not be restored - the backup is not usable" >&2
  exit 1
fi

# Built from the same context compose uses, so this is the code that is about to
# be deployed, not whatever image happens to be lying around. The layer cache
# makes it near-instant right after the compose build in the same deploy.
echo "dry-run: building the API image for the rehearsal"
docker build --quiet -t "$API_TAG" "${REMOTE_PATH}/server" >/dev/null

echo "dry-run: applying the migrations to the copy"
if ! docker run --rm --network "$NETWORK" --env-file "$ENV_FILE" \
  "$API_TAG" node src/applyMigrations.js </dev/null; then
  echo "" >&2
  echo "dry-run: the migrations failed against a copy of production." >&2
  echo "dry-run: production has NOT been touched. Fix the cause above and deploy again." >&2
  exit 1
fi

echo "dry-run: the migrations apply cleanly to production's data"
