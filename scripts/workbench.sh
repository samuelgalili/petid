#!/usr/bin/env bash
#
# The work environment: all of MIPO on your own machine, at http://localhost:8080
#
#   bash scripts/workbench.sh up       build, start, migrate, seed if empty
#   bash scripts/workbench.sh restart  rebuild the frontend and the API, keep the data
#   bash scripts/workbench.sh seed     re-seed the catalogue
#   bash scripts/workbench.sh load F   restore a production dump (.sql.gz) over it
#   bash scripts/workbench.sh logs     follow the API log
#   bash scripts/workbench.sh psql     a shell on the database
#   bash scripts/workbench.sh status   what is running, and whether it is healthy
#   bash scripts/workbench.sh down     stop it, keep the data
#   bash scripts/workbench.sh reset    stop it and delete the data
#
# Nothing here can reach production: the only database it knows about is the one
# it starts itself.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/deploy/local/docker-compose.yml"
APP_URL="http://localhost:8080"
DB_URL="postgres://mipo:mipo@127.0.0.1:55432/mipo"

compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
note() { printf '  %s\n' "$*"; }
die()  { printf '\n\033[31m%s\033[0m\n\n' "$*" >&2; exit 1; }

require_docker() {
  command -v docker >/dev/null 2>&1 || die "Docker is not installed. Docker Desktop: https://docker.com/products/docker-desktop"
  docker info >/dev/null 2>&1 || die "Docker is installed but not running. Start Docker Desktop and try again."
}

build_frontend() {
  say "Building the frontend"
  [ -d "${REPO_ROOT}/node_modules" ] || (cd "$REPO_ROOT" && npm ci)
  # Same variables the production build uses, pointed at this machine.
  (cd "$REPO_ROOT" && VITE_APP_URL="$APP_URL" VITE_API_URL=/api npm run build >/dev/null)
  note "dist/ built"
}

wait_for_api() {
  # The API's own healthcheck asks /api/health/schema, so waiting for healthy
  # means waiting for a schema this build can actually use.
  say "Waiting for the API"
  for _ in $(seq 1 60); do
    if curl --fail --silent --max-time 5 "${APP_URL}/api/health/schema" >/dev/null 2>&1; then
      note "healthy"
      return 0
    fi
    sleep 2
  done
  printf '\n'
  compose logs --tail 40 mipo-api || true
  die "The API did not come up. Its last 40 log lines are above."
}

migrate() {
  say "Applying migrations"
  compose run --rm --no-deps -T mipo-api node src/applyMigrations.js </dev/null
}

seed() {
  say "Seeding"
  # Run from the host so the output is readable, against the published port.
  (cd "$REPO_ROOT/server" && DATABASE_URL="$DB_URL" node scripts/seed-workbench.mjs)
}

catalogue_is_empty() {
  local count
  count="$(compose exec -T postgres psql -U mipo -d mipo -tAc \
    "select count(*) from public.business_products" 2>/dev/null || echo 0)"
  [ "${count//[^0-9]/}" = "0" ]
}

case "${1:-up}" in
  up)
    require_docker
    build_frontend
    say "Starting Postgres, the API and Caddy"
    compose up -d --build --wait postgres
    migrate
    compose up -d --build caddy mipo-api
    wait_for_api
    if catalogue_is_empty; then
      seed
    else
      note "the catalogue already has products — 'workbench.sh seed' to redo it"
    fi
    say "Ready"
    note "$APP_URL"
    note "database: $DB_URL"
    note ""
    note "This is your machine. Nothing here touches production."
    ;;

  restart)
    require_docker
    build_frontend
    compose up -d --build --wait postgres
    migrate
    compose up -d --build --force-recreate mipo-api caddy
    wait_for_api
    say "Ready"; note "$APP_URL"
    ;;

  seed)
    require_docker
    seed
    ;;

  load)
    require_docker
    dump="${2:-}"
    [ -n "$dump" ] || die "Usage: workbench.sh load <dump.sql.gz>"
    [ -s "$dump" ] || die "No such dump: $dump"
    say "Restoring $(basename "$dump") over the workbench database"
    note "This replaces everything currently in it."
    compose exec -T postgres psql -U mipo -d postgres -v ON_ERROR_STOP=1 \
      -c "drop database if exists mipo with (force)" -c "create database mipo owner mipo"
    gunzip -c "$dump" | compose exec -T postgres psql -U mipo -d mipo -v ON_ERROR_STOP=1 --quiet
    migrate
    compose up -d --force-recreate mipo-api
    wait_for_api
    say "Loaded"
    note "A real dump holds real customer data. Keep it off shared drives, and"
    note "delete it when you are done: it is ignored by git, never committed."
    ;;

  logs)    require_docker; compose logs -f --tail 100 mipo-api ;;
  psql)    require_docker; compose exec postgres psql -U mipo -d mipo ;;
  status)
    require_docker
    compose ps
    printf '\n'
    curl --silent --max-time 5 "${APP_URL}/api/health/schema" || printf 'the API is not answering\n'
    printf '\n'
    ;;
  down)    require_docker; compose down ;;
  reset)
    require_docker
    say "Deleting the workbench database and uploads"
    compose down -v
    note "gone — 'workbench.sh up' builds it again from nothing"
    ;;
  *) die "Unknown command: $1. Run with no arguments for the list." ;;
esac
