# PetID

PetID is a Vite + React frontend deployed on Vercel with Supabase as the backend for database, auth, storage, realtime, and Edge Functions.

## Runtime Split

- Frontend hosting: Vercel
- Backend: Supabase
- Current Supabase target project: `pet-id` (`fvhheaynqfiumjdylddj`)

The repo contains both frontend and backend code. Vercel should only build and serve the frontend bundle. Supabase should own migrations, auth config, storage, and function deployment.

## Local Development

1. Install dependencies with `npm install`
2. Copy `.env.example` to a local env file that is not committed
3. Set the required frontend vars:
   - `VITE_APP_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_GOOGLE_MAPS_API_KEY`
   - `VITE_VAPID_PUBLIC_KEY`
4. Start the app with `npm run dev`

## Deployment

### Vercel

- Set the frontend env vars in the Vercel project
- Keep Vercel responsible only for the Vite frontend
- Use `vercel.json` for SPA route fallback

### Supabase

- Push SQL from `supabase/migrations`
- Deploy functions from `supabase/functions`
- Set required function secrets in Supabase
- Configure auth `site_url`, redirect URLs, and provider credentials

## Migration Notes

- The repo previously pointed at a Loveable-managed Supabase project and still contains AI-related Loveable dependencies in several Edge Functions.
- The cutover checklist lives in `docs/MIGRATION_CHECKLIST.md`.
- Real `.env` files should stay out of git. `.env.example` is the committed template.
