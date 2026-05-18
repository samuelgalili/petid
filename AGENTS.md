# Repository Guidelines

## Project Structure & Module Organization

PetID is a Vite + React + TypeScript app deployed on Vercel with Supabase as the backend. Frontend code lives in `src/`: pages in `src/pages`, reusable UI in `src/components`, hooks in `src/hooks`, shared utilities in `src/lib` and `src/utils`, routes in `src/routes`, and Supabase client code in `src/integrations/supabase`. Assets are split between `public/` and `src/assets/`. End-to-end tests live in `e2e/`. Database migrations and Edge Functions live in `supabase/migrations` and `supabase/functions`.

## Build, Test, and Development Commands

- `npm run dev`: start the Vite dev server on port `8080`.
- `npm run build`: create the production frontend bundle.
- `npm run lint`: run ESLint across the repository.
- `npm run preview`: preview the built Vite app locally.
- `npx playwright install`: install browser binaries before first e2e run.
- `npx playwright test`: run Playwright tests; the config starts `npm run dev` automatically.
- `npx playwright test --ui`: debug e2e tests interactively.

CI uses Node 20, `npm ci`, `npm run build`, and `npx playwright test`.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Match the existing two-space indentation, double quotes in frontend TypeScript, and Tailwind utility classes for styling. Prefer the `@/` path alias for imports from `src`. Name React components and page files in `PascalCase` (`Shop.tsx`), hooks as `useSomething`, and e2e specs as `feature.spec.ts`. ESLint is configured in `eslint.config.js`.

## Testing Guidelines

Playwright is the active test framework. Add or update specs in `e2e/` for user-visible flows, especially auth, shop, checkout, profile, notifications, and navigation. Prefer accessible roles, labels, and stable text over implementation details. There is no committed unit-test runner yet, so use `npm run lint`, `npm run build`, and relevant `npx playwright test <file>` runs before opening a PR.

## Commit & Pull Request Guidelines

Recent history uses short, imperative, sentence-case commit messages such as `Update URLs to custom domain petid.co.il`. Keep commits focused on one change. PRs should include a concise summary, linked issue or task, screenshots for UI changes, Supabase migration/function notes, and verification commands run.

## Security & Configuration Tips

Do not commit real `.env` files. Use `.env.example` as the template for `VITE_APP_URL`, Supabase, Google Maps, and VAPID keys. Keep Vercel responsible for frontend env vars and Supabase responsible for migrations, auth, storage, function secrets, and Edge Function deployment.
