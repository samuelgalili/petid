#!/usr/bin/env bash
set -euo pipefail

AWS_PROFILE="${AWS_PROFILE:-mipo}"
AWS_REGION="${AWS_REGION:-eu-central-1}"
SSM_PREFIX="${MIPO_SSM_PREFIX:-/mipo/prod}"
REMOTE_HOST="${MIPO_REMOTE_HOST:-ubuntu@63.183.241.110}"
SSH_KEY="${MIPO_SSH_KEY:-$HOME/.ssh/mipo-prod-key.pem}"
REMOTE_PATH="${MIPO_REMOTE_PATH:-/opt/mipo}"
REMOTE_ENV="${MIPO_REMOTE_ENV:-${REMOTE_PATH}/.env}"
COMPOSE_FILE="${MIPO_COMPOSE_FILE:-${REMOTE_PATH}/deploy/aws/docker-compose.yml}"

RESTART_API=true
if [[ "${1:-}" == "--no-restart" ]]; then
  RESTART_API=false
fi

REQUIRED_KEYS=(
  ADMIN_API_KEY
  DATABASE_URL
  DEFAULT_BUSINESS_ID
  FIRECRAWL_API_KEY
  GEMINI_API_KEY
  RESEND_API_KEY
  PASSWORD_RESET_FROM_EMAIL
  PUBLIC_APP_URL
)

OPTIONAL_KEYS=(
  CARDCOM_TERMINAL_NUMBER
  CARDCOM_USERNAME
  CARDCOM_API_PASSWORD
  CARDCOM_WEBHOOK_SECRET
)

KEYS=("${REQUIRED_KEYS[@]}" "${OPTIONAL_KEYS[@]}")

tmp_json="$(mktemp)"
tmp_env="$(mktemp)"
trap 'rm -f "$tmp_json" "$tmp_env"' EXIT

aws ssm get-parameters-by-path \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --with-decryption \
  --path "$SSM_PREFIX" \
  --recursive \
  --output json > "$tmp_json"

node - "$tmp_json" "$tmp_env" "$SSM_PREFIX" "${#REQUIRED_KEYS[@]}" "${KEYS[@]}" <<'NODE'
const fs = require("node:fs");

const [jsonPath, envPath, prefix, requiredCountRaw, ...keys] = process.argv.slice(2);
const requiredCount = Number(requiredCountRaw);
const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const params = new Map(
  (payload.Parameters || []).map((param) => [
    param.Name.replace(`${prefix}/`, ""),
    param.Value,
  ]),
);

const missing = keys.slice(0, requiredCount).filter((key) => !params.has(key) || !params.get(key));
if (missing.length > 0) {
  console.error(`Missing SSM parameters: ${missing.join(", ")}`);
  process.exit(1);
}

const lines = keys.filter((key) => params.has(key) && params.get(key)).map((key) => {
  const value = params.get(key);
  if (/[\r\n\0]/.test(value)) {
    console.error(`Parameter ${key} contains a control character and cannot be written to Docker env_file safely.`);
    process.exit(1);
  }
  const escaped = value.replace(/'/g, "\\'");
  return `${key}='${escaped}'`;
});

fs.writeFileSync(envPath, `${lines.join("\n")}\n`, { mode: 0o600 });
NODE

remote_tmp="/tmp/mipo-env-$(date +%Y%m%d%H%M%S)-$$"
scp -q -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$tmp_env" "${REMOTE_HOST}:${remote_tmp}"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$REMOTE_HOST" \
  "set -euo pipefail
   backup=none
   if [ -f \"$REMOTE_ENV\" ]; then
     backup=\"${REMOTE_ENV}.backup-\$(date +%Y%m%d-%H%M%S)\"
     cp \"$REMOTE_ENV\" \"\$backup\"
     chmod 600 \"\$backup\"
   fi
   chmod 600 \"$remote_tmp\"
   mv \"$remote_tmp\" \"$REMOTE_ENV\"
   printf '%s\n' \"${REMOTE_ENV}.backup-\"* | sort -r | tail -n +4 | while IFS= read -r stale_backup; do
     if [ -f \"\$stale_backup\" ]; then rm -f -- \"\$stale_backup\"; fi
   done
   echo \"updated_env=true backup=\$backup\""

if [[ "$RESTART_API" == true ]]; then
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$REMOTE_HOST" \
    "sudo MIPO_REMOTE_PATH=\"$REMOTE_PATH\" bash \"$REMOTE_PATH/deploy/aws/prepare-host.sh\" && cd \"$REMOTE_PATH\" && MIPO_REMOTE_PATH=\"$REMOTE_PATH\" docker compose -f \"$COMPOSE_FILE\" up -d --build --wait --wait-timeout 60 mipo-api"
fi

echo "synced_ssm_env=true prefix=${SSM_PREFIX} restart=${RESTART_API}"
