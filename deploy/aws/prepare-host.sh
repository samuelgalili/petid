#!/usr/bin/env bash
set -euo pipefail

REMOTE_PATH="${MIPO_REMOTE_PATH:-/opt/mipo}"

install -d -o 1000 -g 1000 -m 0755 "$REMOTE_PATH/uploads"
install -d -o 1000 -g 1000 -m 0700 "$REMOTE_PATH/private-uploads"
