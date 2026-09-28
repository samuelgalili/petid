#!/bin/sh
# Build the API image the way production does (context: server/) and prove
# the process reaches /api/health. A missing module inside that image used to
# pass unit tests, which run from the repo root, and then crash on deploy.
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
image="${MIPO_IMAGE_TAG:-mipo-api-ci:local}"
name="mipo-api-image-check-$$"

cleanup() {
  docker rm -f "$name" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker build -t "$image" "$root/server"
docker run -d --name "$name" \
  -e DATABASE_URL=postgres://mipo:mipo@127.0.0.1:1/mipo \
  -e NODE_ENV=development \
  "$image" >/dev/null

# No published port: ask the container itself, so this works without mapping.
i=0
while [ "$i" -lt 30 ]; do
  body=$(docker exec "$name" wget -q --content-on-error -O - http://127.0.0.1:3000/api/health 2>/dev/null || true)
  if printf '%s' "$body" | grep -q '"service":"mipo-api"'; then
    printf '%s\n' "$body"
    exit 0
  fi
  if ! docker inspect -f '{{.State.Running}}' "$name" | grep -q true; then
    echo "API container exited before /api/health answered" >&2
    docker logs "$name" >&2 || true
    exit 1
  fi
  i=$((i + 1))
  sleep 1
done

echo "API image did not answer /api/health" >&2
docker logs "$name" >&2 || true
exit 1
