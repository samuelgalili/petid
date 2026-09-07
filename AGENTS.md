# Repository Guidelines

## Project Structure & Module Organization

MIPO is a Vite + React + TypeScript app served by Caddy on AWS Lightsail, with a Node API in `server/src` and PostgreSQL on AWS RDS. Frontend code lives in `src/`: pages in `src/pages`, reusable UI in `src/components`, hooks in `src/hooks`, shared utilities in `src/lib` and `src/utils`, and routes in `src/routes`. Assets are split between `public/` and `src/assets/`. End-to-end tests live in `e2e/`, database migrations live in `server/sql`, and deployment configuration lives in `deploy/aws`. Supabase and Vercel are legacy systems and are not part of the active runtime.

## Build, Test, and Development Commands

- `npm run dev`: start the Vite dev server on port `8080`.
- `npm run dev:api`: start the Node API with values from the local `.env` file.
- `npm run db:migrate`: apply pending `server/sql` migrations with the migration ledger.
- `npm run build`: create the production frontend bundle.
- `npm run lint`: run blocking ESLint checks across the repository.
- `npm run typecheck`: type-check the active application graph.
- `npm test --prefix server`: run the Node API security tests.
- `npm run preview`: preview the built Vite app locally.
- `npx playwright install`: install browser binaries before first e2e run.
- `npx playwright test`: run the current Playwright suite against the configured local web server.
- `npx playwright test --ui`: debug e2e tests interactively.
- `node --check server/src/index.js`: syntax-check the AWS API.

CI uses Node 20.19 and must pass dependency audits, server checks/tests, active lint/typecheck, the production build, and Playwright before the AWS deployment job runs.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Match the existing two-space indentation, double quotes in frontend TypeScript, and Tailwind utility classes for styling. Prefer the `@/` path alias for imports from `src`. Name React components and page files in `PascalCase` (`Shop.tsx`), hooks as `useSomething`, and e2e specs as `feature.spec.ts`. ESLint is configured in `eslint.config.js`.

## Testing Guidelines

Playwright is the active frontend test framework. Add or update `*.aws.spec.ts` files in `e2e/` for user-visible AWS-backed flows, especially auth, shop, checkout, profile, notifications, and navigation. Prefer accessible roles, labels, and stable text over implementation details. Server helper tests use the built-in `node:test` runner in `server/test`. Run `npm run lint`, `npm run typecheck`, `npm run build`, `npm test --prefix server`, and relevant Playwright specs before opening a PR.

## Commit & Pull Request Guidelines

Recent history uses short, imperative, sentence-case commit messages such as `Fix admin navigation contracts`. Keep commits focused on one change. PRs should include a concise summary, linked issue or task, screenshots for UI changes, AWS API/database migration notes, and verification commands run.

## Security & Configuration Tips

Do not commit real `.env` files. Use `.env.example` as the template for frontend, AWS API, AI, email, and payment settings. Store production secrets in AWS SSM, keep the runtime file at `/opt/mipo/.env` with mode `0600`, and treat any remaining Supabase project or function as legacy infrastructure that must stay disabled.
