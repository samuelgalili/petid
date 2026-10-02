#!/usr/bin/env bash
#
# Keep the last few API images on the production host, and put one of them
# back without a rebuild.
#
# Every deploy builds mipo-api:<first 12 of the commit SHA> (docker-compose.yml
# reads MIPO_IMAGE_TAG). Once that container is healthy the deploy calls
# `promote`, which points mipo-api:latest at it — the tag the one-shot
# workflows and a manual `docker compose run` use — and removes all but the
# newest KEEP SHA tags. The tag the running container uses is never removed.
#
#   api-images.sh promote  <remote-path> <tag>
#   api-images.sh list     <remote-path>
#   api-images.sh rollback <remote-path> <tag>
#
# rollback recreates only the API from an image that is already on the host.
# It does NOT undo migrations (they are forward-only) and does NOT change the
# frontend in dist/. See docs/ROLLBACK.md before using it.

set -euo pipefail

ACTION="${1:-}"
REMOTE_PATH="${2:-/opt/mipo}"
TAG="${3:-}"
KEEP="${MIPO_API_IMAGES_KEEP:-3}"
REPO="mipo-api"
COMPOSE_FILE="${REMOTE_PATH}/deploy/aws/docker-compose.yml"

usage() {
  echo "usage: api-images.sh promote|list|rollback <remote-path> [<tag>]" >&2
  exit 2
}

valid_tag() {
  [[ "$1" =~ ^[0-9a-f]{7,40}$ ]]
}

running_tag() {
  local id
  id="$(MIPO_REMOTE_PATH="$REMOTE_PATH" docker compose -f "$COMPOSE_FILE" ps -q mipo-api 2>/dev/null || true)"
  [[ -n "$id" ]] || return 0
  docker inspect --format '{{.Config.Image}}' "$id" 2>/dev/null | sed -n "s/^${REPO}://p"
}

# SHA tags, newest first. latest, dryrun-* and <none> are not deploy images.
sha_tags() {
  docker image ls "$REPO" --format '{{.CreatedAt}}|{{.Tag}}' \
    | sort -r \
    | cut -d'|' -f2 \
    | while read -r tag; do
        if valid_tag "$tag"; then echo "$tag"; fi
      done
}

case "$ACTION" in
  promote)
    valid_tag "$TAG" || { echo "api-images: refusing tag '$TAG'" >&2; exit 1; }
    docker tag "${REPO}:${TAG}" "${REPO}:latest"
    running="$(running_tag)"
    count=0
    while read -r tag; do
      [[ -n "$tag" ]] || continue
      count=$((count + 1))
      if (( count <= KEEP )) || [[ "$tag" == "$TAG" ]] || [[ "$tag" == "$running" ]]; then
        continue
      fi
      echo "api-images: removing ${REPO}:${tag}"
      docker image rm "${REPO}:${tag}" >/dev/null || echo "api-images: could not remove ${REPO}:${tag}" >&2
    done < <(sha_tags)
    echo "api-images: kept"
    mapfile -t kept < <(sha_tags)
    for tag in "${kept[@]:0:KEEP}"; do echo "  ${REPO}:${tag}"; done
    ;;
  list)
    echo "running: ${REPO}:$(running_tag)"
    sha_tags | sed "s/^/  ${REPO}:/"
    ;;
  rollback)
    valid_tag "$TAG" || { echo "api-images: refusing tag '$TAG'" >&2; exit 1; }
    if ! docker image inspect "${REPO}:${TAG}" >/dev/null 2>&1; then
      echo "api-images: ${REPO}:${TAG} is not on this host. Available:" >&2
      sha_tags | sed "s/^/  ${REPO}:/" >&2
      exit 1
    fi
    MIPO_REMOTE_PATH="$REMOTE_PATH" MIPO_IMAGE_TAG="$TAG" MIPO_DEPLOY_SHA="$TAG" \
      docker compose -f "$COMPOSE_FILE" up -d --no-build --force-recreate --no-deps --wait --wait-timeout 60 mipo-api
    docker tag "${REPO}:${TAG}" "${REPO}:latest"
    echo "api-images: mipo-api is now ${REPO}:${TAG}"
    ;;
  *)
    usage
    ;;
esac
