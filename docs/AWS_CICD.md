# AWS CI/CD

The `Deploy AWS` GitHub Actions workflow deploys the `aws-migration` branch to the Lightsail host.

## Required GitHub Secret

- `MIPO_AWS_SSH_PRIVATE_KEY`: private SSH key for the deploy user on the Lightsail instance.

## Optional GitHub Variables

- `MIPO_AWS_HOST`: target host or IP. Defaults to `63.183.241.110`.
- `MIPO_AWS_USER`: SSH user. Defaults to `ubuntu`.
- `MIPO_REMOTE_PATH`: remote app root. Defaults to `/opt/mipo`.
- `MIPO_PUBLIC_BASE_URL`: public base URL used during frontend build and smoke tests. Defaults to `http://<MIPO_AWS_HOST>`.

## Deployment Steps

On push to `aws-migration`, the workflow:

1. Installs frontend dependencies.
2. Checks server JavaScript syntax.
3. Builds the frontend with `VITE_APP_URL` and `VITE_API_URL=/api`.
4. Syncs `server/`, `deploy/aws/`, and `dist/` to the Lightsail instance.
5. Builds the API Docker image.
6. Runs `server/sql/*.sql` migrations through `node src/applyMigrations.js`.
7. Restarts the API and Caddy services.
8. Smoke-tests `/api/health` and `/`.

Runtime secrets are still sourced from `/opt/mipo/.env`, which is populated from AWS SSM by `deploy/aws/sync-ssm-env.sh`.

`/mipo/prod/DATABASE_URL` must use the dedicated `mipo_app` PostgreSQL role. Do not copy the RDS master credential into this parameter: RDS manages and rotates the master secret independently in Secrets Manager. The application role owns the MIPO database objects so the same connection can run the checksum-ledger migrations without depending on the rotating master credential.

`/api/health` verifies PostgreSQL connectivity. A database authentication or availability failure returns `503`, fails the Docker healthcheck, and stops the deployment smoke test instead of reporting a false healthy state.

If PostgreSQL reports `28P01` for the application role, compare the SSM connection user with the container environment without printing either secret, restore the dedicated role credential, run `deploy/aws/sync-ssm-env.sh`, and require both a direct database query and `/api/health` to pass. A reset of the RDS-managed master secret should not require an application change.

An existing RDS database without a `schema_migrations` ledger must be explicitly baselined before its first ledger-aware deployment. Verify the schema against the release migrations, then run the migration container once with `MIGRATION_BASELINE_THROUGH` set to the last already-present migration and `MIGRATION_BASELINE_CONFIRM=existing-schema-reviewed`. Do not leave either variable in the production environment.

## Owner WhatsApp

The API reads owner-notification settings from its process environment. In production that is `/opt/mipo/.env`, written by `deploy/aws/sync-ssm-env.sh` from SSM Parameter Store prefix `/mipo/prod/`. Deploy AWS does not refresh that file. After the parameters exist, run the sync script so the container picks them up.

The deploy job and the `Site health` workflow do not use that file. They read GitHub Actions repository secrets of the same names. Put those secrets on the repository, not only on the `production` environment: the health workflow is not bound to an environment and would not see environment secrets. The server does not receive the GitHub copies.

Server and Actions:

- `OWNER_NOTIFICATIONS_ENABLED` (`true` or `1`)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`
- `OWNER_WHATSAPP_TO`

Server only:

- `OWNER_NOTIFY_QA_SECRET` — `POST /api/internal/owner-notify/qa`

Optional, either place:

- `TWILIO_WHATSAPP_CONTENT_SIDS` — JSON object of event type to Content SID, left empty until templates are approved
- `OWNER_NOTIFY_THROTTLE_MS` — default 600000
- `OWNER_NOTIFY_TIMEOUT_MS` — default 4000

A QA agent calls the running site:

```
curl -sS -X POST "$PUBLIC_BASE_URL/api/internal/owner-notify/qa" \
  -H "Authorization: Bearer $OWNER_NOTIFY_QA_SECRET" \
  -H "content-type: application/json" \
  -d '{"ok":false,"summary":"העגלה לא נפתחה"}'
```

`ok` is a JSON boolean. The response is 202 when the secret matches. The WhatsApp send still requires the Twilio settings above. Until `OWNER_NOTIFY_QA_SECRET` is set, the route answers 404.
