# PetID

PetID is a Vite + React frontend backed by the MIPO AWS API on Lightsail/RDS.

## Runtime Split

- Frontend hosting: Caddy on the AWS Lightsail instance
- Backend: Node API on AWS Lightsail
- Database: AWS RDS PostgreSQL

The repo contains both frontend and backend code. The AWS deploy workflow builds the frontend, deploys the API container, and runs database migrations.

## Local Development

1. Install dependencies with `npm install`
2. Copy `.env.example` to a local env file that is not committed
3. Set the required frontend vars:
   - `VITE_APP_URL`
   - `VITE_API_URL`
   - `VITE_GOOGLE_MAPS_API_KEY`
   - `VITE_VAPID_PUBLIC_KEY`
4. Start the app with `npm run dev`

## Deployment

### AWS

- Push to `aws-migration` to trigger `.github/workflows/deploy-aws.yml`
- Keep runtime secrets in AWS SSM and sync them to `/opt/mipo/.env`
- Run app database migrations from `server/sql`

## Migration Notes

- Legacy Supabase source code was removed from the AWS branch after the RDS migration. Historical files remain available in older commits if needed for audit/reference.
- The cutover checklist lives in `docs/MIGRATION_CHECKLIST.md`.
- Real `.env` files should stay out of git. `.env.example` is the committed template.
