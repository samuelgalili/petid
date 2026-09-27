לפני שמתחילים, לקרוא את HANDOFF.md

# CLAUDE.md

Rules for Claude Code and Cursor agents in this repo. The map of the system is `CONTEXT.md`. Open work, with links, is `todo.md`. If a doc under `docs/` disagrees with `server/sql` or `server/src`, the code wins.

## Ship to production, not to `main`

- Production is branch `aws-migration`, site [https://mipo.pet](https://mipo.pet). A push there runs **Deploy AWS** and can change the live site.
- `main` is GitHub's default branch and is not what production runs. It diverged from `aws-migration` on 2026-04-29. Do not open pull requests against `main`. Do not merge a `main`-based branch into `aws-migration`.
- Start from an up-to-date `aws-migration`. Open a PR whose base is `aws-migration`.
- Never push to `aws-migration`. Never merge. Never force-push. The owner approves and merges.
- Never commit secrets or real credential values. Environment variable names are fine. `.env.example` is the only env file that belongs in git.

## Product text

- UI copy is Hebrew, right-to-left (`lang="he"`, `dir="rtl"` in `index.html`). New screens need `dir="rtl"` unless they are the English locale.
- The word טמגוצ׳י, and the word Tamagotchi, must never appear in Mipo text: UI, tests, alt text, commits, or docs. This bullet is the only place they are named.

## Do not "fix" these by accident

- The shop reads `GET /api/products` (`business_products`). `/api/catalog` is the new model and is not what the shop page uses. Pointing the shop at it empties the shelf.
- `src/lib/catalogSearch.ts` is a paste of `server/src/catalogSearch.js`. Change the server file, then paste. A test diffs them.
- Legacy routes in `src/routes/index.tsx` that `Navigate` away are retired. A leftover component is not a request to wire it back up.
- `LEGACY_INTAKE_FROZEN` is on unless the value is exactly `false`.
- Migrations are append-only. Next file is the next number after `0060`. Leave `0030` and `0031` unused (`0031` is the filename on unmerged `claude/admin-2fa`). Do not edit a file that production has already applied.
- Server admin permissions are `server/src/adminPermissions.js`. There is no `*` wildcard. The TypeScript list is a subset.
- Playwright runs `e2e/*.aws.spec.ts` only. In CI the browser loads `dist/`, not the working tree.
- `server/scripts/` is not in the API image. A production one-shot bind-mounts the script. Do not `COPY` scripts into `server/Dockerfile` just to run one.

## Verify

From a clean tree: `npm test --prefix server`, `npm run lint`, `npm run typecheck`, `npm run check:imports`, `npm run build`. For a UI change, the relevant `*.aws.spec.ts`. Local app: `npm run dev:api` and `npm run dev` (port 8080), or `bash scripts/workbench.sh up`.

## Production workflows

Read-only measurements (D-18, C-0, S-0) and the legacy-catalogue migration are manual `workflow_dispatch` jobs. They share concurrency group `aws-production` with the deploy. Do not add a workflow that SSHes to production, prints `DATABASE_URL`, or writes without a dry-run default and a typed confirmation. Details are in `CONTEXT.md`.
