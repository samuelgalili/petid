#!/bin/sh
# Classify MIPO_WWW_ADDRESS without printing an unexpected value.
#
# Accepted values exit 0 and print one line:
#   unset
#   placeholder          (exactly http://localhost:8081)
#   www.mipo.pet
# Anything else exits 1 and prints only:
#   other
#   length=<character count>
#   contains_mipo_pet=yes|no
#
# Usage:
#   www-address.sh classify [value]
#   www-address.sh classify-file <path>
# A missing file, a missing key, and an empty value are all unset.
# The last definition in the file wins, which is what Docker Compose applies.

set -eu

normalize() {
  value=$(printf '%s' "$1" | tr -d '\r')
  value=$(printf '%s' "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
  case "$value" in
    \"*\")
      value=${value#\"}
      value=${value%\"}
      ;;
    \'*\')
      value=${value#\'}
      value=${value%\'}
      ;;
  esac
  value=$(printf '%s' "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
  printf '%s' "$value"
}

classify_value() {
  value=$(normalize "$1")
  case "$value" in
    "")
      printf 'unset\n'
      return 0
      ;;
    http://localhost:8081)
      printf 'placeholder\n'
      return 0
      ;;
    www.mipo.pet)
      printf 'www.mipo.pet\n'
      return 0
      ;;
  esac
  contains=no
  case "$value" in
    *mipo.pet*) contains=yes ;;
  esac
  printf 'other\n'
  printf 'length=%s\n' "${#value}"
  printf 'contains_mipo_pet=%s\n' "$contains"
  return 1
}

read_raw() {
  file=$1
  if [ ! -f "$file" ]; then
    printf ''
    return 0
  fi
  line=$(grep -E '^[[:space:]]*(export[[:space:]]+)?MIPO_WWW_ADDRESS=' "$file" | tail -1 || true)
  printf '%s' "${line#*=}"
}

case "${1:-}" in
  classify)
    classify_value "${2:-}"
    ;;
  classify-file)
    classify_value "$(read_raw "${2:-}")"
    ;;
  *)
    echo "usage: www-address.sh classify [value] | classify-file <path>" >&2
    exit 2
    ;;
esac
