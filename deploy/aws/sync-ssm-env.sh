#!/usr/bin/env bash
set -euo pipefail

AWS_PROFILE="${AWS_PROFILE:-mipo}"
AWS_REGION="${AWS_REGION:-eu-central-1}"
SSM_PREFIX="${MIPO_SSM_PREFIX:-/mipo/prod}"
REMOTE_HOST="${MIPO_REMOTE_HOST:-ubuntu@63.183.241.110}"
SSH_KEY="${MIPO_SSH_KEY:-$HOME/.ssh/mipo-prod-key.pem}"
REMOTE_ENV="${MIPO_REMOTE_ENV:-/opt/mipo/.env}"
COMPOSE_FILE="${MIPO_COMPOSE_FILE:-/opt/mipo/deploy/aws/docker-compose.yml}"

RESTART_API=true
if [[ "${1:-}" == "--no-restart" ]]; then
  RESTART_API=false
fi

KEYS=(
  ADMIN_API_KEY
  DATABASE_URL
  DEFAULT_BUSINESS_ID
  FIRECRAWL_API_KEY
  GEMINI_API_KEY
)

parameter_names=()
for key in "${KEYS[@]}"; do
  parameter_names+=("${SSM_PREFIX}/${key}")
done

tmp_json="$(mktemp)"
tmp_env="$(mktemp)"
trap 'rm -f "$tmp_json" "$tmp_env"' EXIT

aws ssm get-parameters \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --with-decryption \
  --names "${parameter_names[@]}" \
  --output json > "$tmp_json"

node - "$tmp_json" "$tmp_env" "$SSM_PREFIX" "${KEYS[@]}" <<'NODE'
const fs = require("node:fs");

const [jsonPath, envPath, prefix, ...keys] = process.argv.slice(2);
const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const params = new Map(
  (payload.Parameters || []).map((param) => [
    param.Name.replace(`${prefix}/`, ""),
    param.Value,
  ]),
);

const missing = keys.filter((key) => !params.has(key) || !params.get(key));
if (missing.length > 0) {
  console.error(`Missing SSM parameters: ${missing.join(", ")}`);
  process.exit(1);
}

const lines = keys.map((key) => {
  const value = params.get(key);
  if (/[\r\n]/.test(value)) {
    console.error(`Parameter ${key} contains a newline and cannot be written to Docker env_file safely.`);
    process.exit(1);
  }
  return `${key}=${value}`;
});

fs.writeFileSync(envPath, `${lines.join("\n")}\n`, { mode: 0o600 });
NODE

remote_tmp="/tmp/mipo-env-$(date +%Y%m%d%H%M%S)-$$"
scp -q -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$tmp_env" "${REMOTE_HOST}:${remote_tmp}"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$REMOTE_HOST" \
  "set -euo pipefail
   backup=\"${REMOTE_ENV}.backup-\$(date +%Y%m%d-%H%M%S)\"
   cp \"$REMOTE_ENV\" \"\$backup\"
   chmod 600 \"$remote_tmp\"
   mv \"$remote_tmp\" \"$REMOTE_ENV\"
   echo \"updated_env=true backup=\$backup\""

if [[ "$RESTART_API" == true ]]; then
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$REMOTE_HOST" \
    "cd /opt/mipo && docker compose -f \"$COMPOSE_FILE\" up -d --build mipo-api"
fi

echo "synced_ssm_env=true prefix=${SSM_PREFIX} restart=${RESTART_API}"
