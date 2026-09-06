# MIPO AWS Migration Checklist

This branch targets AWS Lightsail + RDS. Supabase/Vercel are no longer part of the active deployment path.

## Current State

- [x] Frontend is built by GitHub Actions and served by Caddy on Lightsail.
- [x] Backend is a Node API container on Lightsail.
- [x] Database target is AWS RDS PostgreSQL.
- [x] Runtime secrets are loaded from AWS SSM into `/opt/mipo/.env`.
- [x] Supabase client code, Edge Functions, and Supabase migrations were removed from this branch.
- [x] The local `.env` file is ignored and removed from branch tracking.
- [x] DNS and TLS serve production from `https://mipo.pet`.
- [x] The migration ledger baselines `0001`-`0012` and records security migration `0013`.
- [x] Required production configuration, including CardCom, is stored in SSM.
- [x] Production smoke tests pass on desktop Chromium and Pixel 5.

## Remaining Cutover Work

- [ ] **Blocks `claude/admin-2fa`:** store `SECRET_ENCRYPTION_KEY` in SSM and sync it to `/opt/mipo/.env` before that branch is deployed, then confirm the container decodes it to 32 bytes. Without it the API refuses to boot in production and the deploy leaves migration `0031` applied with the API down. Steps and verification: `docs/ADMIN_2FA_DEPLOYMENT.md`.
- [ ] Complete a low-value CardCom payment and verify the authenticated callback and final order status.
- [ ] Verify Resend email delivery, Gemini with user consent, and Firecrawl product import in production.
- [ ] Complete the legacy Supabase incident-response checklist in `docs/SECURITY_RESPONSE.md`.
- [ ] Pause or delete the legacy Supabase project after exporting any legally required records.
- [ ] Revoke legacy service-role/JWT credentials and rotate every third-party credential used by an Edge Function.
- [ ] Remove the historical `.env` blob from shared Git history after coordinating a repository-wide history rewrite.
- [ ] Classify the two legacy public upload files and remove or assign ownership to the unreferenced file.

## Verification

- `npm ci && npm ci --prefix server`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm test --prefix server`
- `npm run test:e2e`
- `find server/src server/test -type f -name '*.js' -print0 | xargs -0 -n 1 node --check`
- GitHub Actions workflow: `.github/workflows/deploy-aws.yml`
- Production: `PLAYWRIGHT_BASE_URL=https://mipo.pet npx playwright test e2e/critical.aws.spec.ts --retries=0`
- Confirm the legacy Supabase project and every Edge Function return an unavailable/not-found response.
