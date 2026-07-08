# MIPO AWS Migration Checklist

This branch targets AWS Lightsail + RDS. Supabase/Vercel are no longer part of the active deployment path.

## Current State

- [x] Frontend is built by GitHub Actions and served by Caddy on Lightsail.
- [x] Backend is a Node API container on Lightsail.
- [x] Database target is AWS RDS PostgreSQL.
- [x] Runtime secrets are loaded from AWS SSM into `/opt/mipo/.env`.
- [x] Supabase client code, Edge Functions, and Supabase migrations were removed from this branch.

## Remaining Cutover Work

- [ ] Confirm every required production secret exists in SSM.
- [ ] Verify email, payment, shipping, WhatsApp, maps, and AI provider keys in the Lightsail runtime.
- [ ] Run smoke tests against the temporary AWS address.
- [ ] Point DNS to the AWS instance after the temporary-address deployment is stable.
- [ ] Rotate or delete any old Supabase/Vercel secrets after final cutover.

## Verification

- `npm run build`
- `node --check server/src/index.js`
- `node --check server/src/applyMigrations.js`
- GitHub Actions workflow: `.github/workflows/deploy-aws.yml`
