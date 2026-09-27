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
# The www site is prepended here, not stored in the Caddyfile. Its certificate
# is requested on demand, so a failed issuance does not stop Caddy from
# starting. If that block itself will not load, it is omitted and the apex
# site still starts. DNS still has to point www.mipo.pet at this host or the
# certificate request cannot succeed.

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

# A hostname asks for a certificate when the first handshake arrives. An
# http:// address is the staging placeholder and must not ask for one.
case "$www" in
  http://*)
    www_site="${www} {
	redir https://${site}{uri} 308
}"
    ;;
  *)
    www_site="${www} {
	tls {
		on_demand
	}
	redir https://${site}{uri} 308
}"
    ;;
esac

source_file="${MIPO_CADDYFILE:-/etc/caddy/Caddyfile}"
runtime_file="${MIPO_CADDYFILE_OUT:-/tmp/Caddyfile}"

assemble() {
  include_www="$1"
  {
    if [ "$include_www" = "yes" ]; then
      printf '%s\n' "$www_site"
      printf '\n'
    fi
    if [ -f "$source_file" ]; then
      cat "$source_file"
    fi
  } > "$runtime_file"
}

if [ "${1:-}" = "--print" ]; then
  printf '%s\n' "$MIPO_WWW_ADDRESS"
  printf '%s\n' "$MIPO_ROBOTS_POLICY"
  exit 0
fi

if [ "${1:-}" = "--render" ]; then
  assemble yes
  cat "$runtime_file"
  exit 0
fi

assemble yes
if command -v caddy >/dev/null 2>&1; then
  if ! caddy validate --config "$runtime_file" --adapter caddyfile >/tmp/caddy-validate.txt 2>&1; then
    # omit the www site so the apex can start
    echo "www site left out so the apex can start" >&2
    cat /tmp/caddy-validate.txt >&2
    assemble no
    caddy validate --config "$runtime_file" --adapter caddyfile
  fi
fi

exec caddy run --config "$runtime_file" --adapter caddyfile
