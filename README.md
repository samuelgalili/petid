# MIPO

MIPO is a Vite + React frontend backed by the MIPO AWS API on Lightsail/RDS.

The active customer experience uses the Mipo deck design system across onboarding, Mood Mirror home, community feed, AI chat, pet profiles, account management, documents, and commerce.

## Runtime Split

- Frontend hosting: Caddy on the AWS Lightsail instance
- Backend: Node API on AWS Lightsail
- Database: AWS RDS PostgreSQL

The repo contains both frontend and backend code. The AWS deploy workflow builds the frontend, deploys the API container, and runs database migrations.

## Local Development

Node.js 20.19 or newer is required.

1. Install frontend and API dependencies with `npm ci` and `npm ci --prefix server`.
2. Copy `.env.example` to a local `.env` file. The file is ignored and must not be committed.
3. Set the required frontend values:
   - `VITE_APP_URL`
   - `VITE_API_URL`
4. Set `DATABASE_URL` and the server-side provider credentials needed by the flow you are testing.
5. Apply pending migrations with `npm run db:migrate`. The migration ledger verifies previously applied checksums and serializes concurrent runs.
6. Start the API with `npm run dev:api`.
7. In a second terminal, start Vite with `npm run dev`. Requests to `/api` are proxied to `VITE_API_PROXY_TARGET`, which defaults to `http://127.0.0.1:3000`.

For a pre-existing database that predates `schema_migrations`, the runner refuses to replay historical migrations. After auditing the existing schema, baseline it exactly once with `MIGRATION_BASELINE_THROUGH=<last-existing-file>` and `MIGRATION_BASELINE_CONFIRM=existing-schema-reviewed`; later runs must omit both variables.

Uploaded pet media is stored under `UPLOAD_DIR`. Identity and medical documents are stored under `PRIVATE_UPLOAD_DIR` and are served only by authenticated API routes. Do not expose the private directory through Caddy or another static file server.

Community photos and videos are stored under `UPLOAD_DIR` with ownership recorded in `user_uploads`; posts, reactions, saves, comments, and polls are stored in PostgreSQL. `MAX_SOCIAL_UPLOAD_BYTES` controls the separate community upload limit and defaults to 25 MB.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm test --prefix server`
- `npm run test:e2e`

The active browser suite uses mocked API responses for deterministic UI smoke coverage. Server tests cover the security helpers directly; a live PostgreSQL/provider integration suite is still a separate deployment concern.

## Deployment

### AWS

- Push to `aws-migration` to trigger `.github/workflows/deploy-aws.yml`
- Keep runtime secrets in AWS SSM and sync them to `/opt/mipo/.env`
- Run app database migrations from `server/sql`

## Admin Access

Admin authorization is role-based and enforced by both the Node API and the admin UI. The `admin` role has full access. The `product_manager` role can list, create, and update products, upload product images, and use product import/AI tools; it cannot delete products or access orders, coupons, analytics, notifications, categories, or settings.

Provision an account only after the latest database migrations and API version are deployed. Run the command in an environment where `DATABASE_URL` and the database TLS variables are already loaded:

```bash
npm --prefix server run admin:provision -- \
  --email izak7781@gmail.com \
  --role product_manager \
  --display-name "Product manager"
```

The command creates or updates the account, revokes existing admin sessions, and prints a one-time temporary password. Deliver that password through a secure channel; the account must choose a new password of at least 12 characters before any admin operation is allowed.

## Migration Notes

- Legacy Supabase source code was removed from the AWS branch after the RDS migration. Historical files remain available in older commits if needed for audit/reference.
- The cutover checklist lives in `docs/MIGRATION_CHECKLIST.md`.
- Real `.env` files should stay out of git. `.env.example` is the committed template.
