#!/bin/sh
# Decide the www site before Caddy reads the Caddyfile.
#
# Production leaves MIPO_WWW_ADDRESS empty. An empty value, and the old
# localhost placeholder, used to mean "do not request a certificate", which is
# why https://www.mipo.pet had no certificate at all. When the site is the
# public apex, the safe default is www.mipo.pet: obtain a certificate and
# redirect to the apex. Any other site (staging) keeps the placeholder so this
# host does not ask Let's Encrypt for the public www name.
#
# DNS still has to point www.mipo.pet at this host or the certificate request
# cannot succeed. Deploy AWS recreates this container, which is what applies
# the change; Caddy then requests the certificate on its own.

set -eu

site="${MIPO_SITE_ADDRESS:-mipo.pet}"
www="${MIPO_WWW_ADDRESS:-}"

case "$www" in
  ""|http://localhost:8081)
    if [ "$site" = "mipo.pet" ]; then
      www="www.mipo.pet"
    else
      www="http://localhost:8081"
    fi
    ;;
esac

robots="${MIPO_ROBOTS_POLICY:-all}"
if [ -z "$robots" ]; then
  robots="all"
fi

export MIPO_SITE_ADDRESS="$site"
export MIPO_WWW_ADDRESS="$www"
export MIPO_ROBOTS_POLICY="$robots"

if [ "${1:-}" = "--print" ]; then
  printf '%s\n' "$MIPO_WWW_ADDRESS"
  printf '%s\n' "$MIPO_ROBOTS_POLICY"
  exit 0
fi

if [ "$#" -eq 0 ]; then
  set -- caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
fi

exec "$@"
