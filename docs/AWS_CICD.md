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

An existing RDS database without a `schema_migrations` ledger must be explicitly baselined before its first ledger-aware deployment. Verify the schema against the release migrations, then run the migration container once with `MIGRATION_BASELINE_THROUGH` set to the last already-present migration and `MIGRATION_BASELINE_CONFIRM=existing-schema-reviewed`. Do not leave either variable in the production environment.
