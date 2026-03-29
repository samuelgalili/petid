# PetID Vercel + Supabase Migration Checklist

This repo is now targeting the `pet-id` Supabase project as the only backend.

## Current State

- [x] Vercel project exists and is serving the frontend
- [x] Target Supabase project created: `pet-id`
- [x] Target Supabase ref: `fvhheaynqfiumjdylddj`
- [x] Repo still points at the old Loveable-managed Supabase project in `.env`
- [x] New Supabase project is empty: no Edge Functions deployed, no function secrets set
- [x] New Supabase auth config is still default and not ready for production

## Immediate Risks To Fix

- [ ] Stop relying on tracked `.env` for builds
- [ ] Set Vercel frontend env vars for the new Supabase project
- [ ] Update Supabase `site_url` and redirect URLs away from `http://localhost:3000`
- [ ] Recreate required auth providers in the new project
- [ ] Deploy database schema and Edge Functions before switching the frontend
- [ ] Decide whether Lovable AI remains temporarily or is replaced now

## 1. Production Setup

- [ ] Production frontend domain
- [ ] Staging domain needed: yes / no
- [ ] Vercel account or team name
- [ ] Supabase account or team name
- [x] Use existing Supabase project: yes
- [x] Existing Supabase project ref: `fvhheaynqfiumjdylddj`
- [x] Existing Supabase project region: `eu-west-1`

## 2. Supabase Access

- [x] `SUPABASE_URL`
- [x] `SUPABASE_ANON_KEY` / publishable key
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Existing production data must be migrated: yes / no
- [ ] Existing auth users must be migrated: yes / no
- [ ] Existing storage files must be migrated: yes / no
- [ ] Old Loveable-managed Supabase project export access available: yes / no

## 3. Frontend Env Vars (Vercel)

- [ ] `VITE_APP_URL`
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] `VITE_GOOGLE_MAPS_API_KEY`
- [ ] `VITE_VAPID_PUBLIC_KEY`

## 4. Edge Function Secrets

- [ ] `APP_URL`
- [ ] `APP_PREVIEW_URLS` if preview deploys need Edge Function access
- [ ] `RESEND_API_KEY`
- [ ] `GOOGLE_API_KEY`
- [ ] `FIRECRAWL_API_KEY`
- [ ] `VAPID_PUBLIC_KEY`
- [ ] `VAPID_PRIVATE_KEY`
- [ ] `WHATSAPP_ACCESS_TOKEN`
- [ ] `WHATSAPP_PHONE_NUMBER_ID`
- [ ] `CARDCOM_USERNAME`
- [ ] `CARDCOM_API_PASSWORD`
- [ ] `CARDCOM_API_NAME`
- [ ] `CARDCOM_TERMINAL_NUMBER`
- [ ] `CARDCOM_WEBHOOK_SECRET`
- [ ] `GITHUB_PAT`
- [ ] `GITHUB_REPO_OWNER`
- [ ] `GITHUB_REPO_NAME`

## 5. Auth Providers

Current remote state in the new project:

- [x] Email auth enabled
- [ ] Google auth configured
- [ ] Phone auth configured
- [ ] `site_url` changed from `http://localhost:3000`
- [ ] Production redirect URLs added
- [ ] Preview redirect URLs added if preview deploys are needed

- [ ] Email/password login required
- [ ] Google login required
- [ ] Apple login required
- [ ] Facebook login required
- [ ] Phone OTP required
- [ ] WhatsApp OTP required
- [ ] OAuth credentials available for each required provider

## 6. Backend Deploy Steps

- [ ] Link Supabase CLI to `fvhheaynqfiumjdylddj`
- [ ] Push all SQL from `supabase/migrations`
- [ ] Deploy all functions from `supabase/functions`
- [ ] Set function secrets before invoking production flows
- [ ] Validate buckets and storage policies exist
- [ ] Validate RLS/policies after migration

## 7. AI Dependency Decision

- [ ] Keep Loveable AI temporarily, or replace now
- [ ] If replacing now: provider selected
- [ ] If replacing now: API key available
- [ ] If replacing now: preferred model(s) selected

## 8. DNS and Webhooks

- [ ] DNS access available
- [ ] Payment webhook URLs can be updated
- [ ] Shipping webhook URLs can be updated
- [ ] WhatsApp webhook URLs can be updated

## 9. Cutover Plan

- [ ] Staging-first rollout, or direct production cutover
- [ ] Brief downtime acceptable: yes / no
- [ ] Switch Vercel env vars to the new project only after Supabase is ready
- [ ] Remove the tracked `.env` from git history or at minimum untrack it going forward

## Notes

- Frontend uses the browser-facing Supabase keys only.
- Edge Functions need the server-side secrets listed above in Supabase.
- This repo still contains many Loveable AI calls. Moving to the new Supabase project does not remove that dependency by itself.
- Vercel currently has no project env vars configured, so future production builds should not rely on a committed `.env`.
