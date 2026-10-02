# Open work

Snapshot 2026-09-30 against `aws-migration` at `5d10b145` (merge of [#48](https://github.com/samuelgalili/petid/pull/48)). Each item is an open pull request, a branch tip that is not an ancestor of `aws-migration` (full history, not a shallow clone), or a `TODO` / `planned` marker in the tree. "Not verified" means it was not checked against the live host or GitHub settings.

GitHub's default branch is `aws-migration` as of this snapshot (`git ls-remote --symref origin HEAD`). When it changed from `main` is not verified. `main` still exists, is 316 commits away from `aws-migration`, and does not deploy. Do not merge a `main` branch into `aws-migration`; port the commits onto a branch cut from `aws-migration`.

## Merged into `aws-migration` since the 2026-09-27 snapshot (`e8583a02`)

This is git history, not confirmation that each deploy finished on the host.

| PR | Merged | What |
|---|---|---|
| [#26](https://github.com/samuelgalili/petid/pull/26) | 09-27 | Agent docs (`CONTEXT.md`, `CLAUDE.md`, `todo.md`). |
| [#33](https://github.com/samuelgalili/petid/pull/33) | 09-27 | New customers reach payment and finish onboarding. |
| [#35](https://github.com/samuelgalili/petid/pull/35) | 09-27 | Hide products with broken external images (`shop_hidden`, `0061_product_shop_visibility.sql`). |
| [#37](https://github.com/samuelgalili/petid/pull/37) | 09-27 | Checkout proceeds when the catalogue lookup is inconclusive. |
| [#31](https://github.com/samuelgalili/petid/pull/31) | 09-27 | An anonymous visit lands in the shop. |
| [#34](https://github.com/samuelgalili/petid/pull/34) | 09-27 | Pre-launch copy: phone, VAT, empty wait, commerce wording. |
| [#30](https://github.com/samuelgalili/petid/pull/30) | 09-27 | Owner WhatsApp notifications (`server/src/ownerNotify.js`, `site-health.yml`). Off without `OWNER_NOTIFICATIONS_ENABLED` and Twilio settings. |
| [#28](https://github.com/samuelgalili/petid/pull/28) | 09-27 | 3D pet avatar **proposal** (`docs/proposals/3d-pet-avatar.md`) and a dev-only `/dev/pet-avatar` route. No Tripo client in the server. |
| [#32](https://github.com/samuelgalili/petid/pull/32) | 09-27 | Admin two-factor, flag-gated (`ADMIN_2FA_ENABLED`), migration `0061_admin_two_factor.sql`. |
| [#36](https://github.com/samuelgalili/petid/pull/36) | 09-27 | www certificate, page meta, fresh builds. |
| [#38](https://github.com/samuelgalili/petid/pull/38) | 09-27 | Mobile add-to-cart bar stays on screen. |
| [#42](https://github.com/samuelgalili/petid/pull/42) | 09-30 | npm audit fixes, deterministic pet-age test. |
| [#43](https://github.com/samuelgalili/petid/pull/43) | 09-30 | Reversible hide of 42 irrelevant products (`production-hide-irrelevant-products.yml`). |
| [#46](https://github.com/samuelgalili/petid/pull/46) | 09-30 | Broken-image hide writes every allowlisted product. |
| [#41](https://github.com/samuelgalili/petid/pull/41) | 09-30 | One-off workflow to cancel seven unpaid test orders (squash-merged). |
| [#44](https://github.com/samuelgalili/petid/pull/44) | 09-30 | Cart resolves every line against the catalogue; unavailable items drop at checkout (squash-merged). |
| [#45](https://github.com/samuelgalili/petid/pull/45) | 09-30 | Hidden, imageless, and zero-price products are not sold. |
| [#47](https://github.com/samuelgalili/petid/pull/47) | 09-30 | Test-order cancel script: a created payment page is not a charge. |
| [#48](https://github.com/samuelgalili/petid/pull/48) | 09-30 | Manual workflow `set-email-env.yml` sets `PASSWORD_RESET_FROM_EMAIL` and `RESEND_API_KEY` in `/opt/mipo/.env`. Dry-run default; a write needs `SET-EMAIL-ENV`. It does not update SSM, so a later `sync-ssm-env.sh` overwrites both. |

Whether the hide, cancel and set-email workflows were run with a write mode on production: not verified.

## Open pull requests

### Base `aws-migration`

- [**#39**](https://github.com/samuelgalili/petid/pull/39) Show a living avatar on the pet dashboard. Draft. Head `cursor/pet-dashboard-avatar-c030`, one commit not in `aws-migration`. **Not in production.**
- [**#20**](https://github.com/samuelgalili/petid/pull/20) Q4 Gate2: QR uses `source_image_url`. Draft. Head `cursor/q4-gate2-source-qr-d82f`, three commits not in `aws-migration`. **Not in production.** Current onboarding refuses to write `source_image_url` (`src/pages/Onboarding.tsx`, `e2e/onboarding-persist.aws.spec.ts`).
- Drafts from the 2026-09-30 review, each one item: [#49](https://github.com/samuelgalili/petid/pull/49) (pin the production SSH host key; needs secret `MIPO_AWS_KNOWN_HOSTS` before merge), [#50](https://github.com/samuelgalili/petid/pull/50) (API image tagged by SHA, keep three, rollback doc), [#51](https://github.com/samuelgalili/petid/pull/51) (migration numbering in `CLAUDE.md`), and the PR that carries this file.

### Base `main` (will not deploy if merged there)

[#25](https://github.com/samuelgalili/petid/pull/25), [#18](https://github.com/samuelgalili/petid/pull/18), [#17](https://github.com/samuelgalili/petid/pull/17), [#16](https://github.com/samuelgalili/petid/pull/16), [#1](https://github.com/samuelgalili/petid/pull/1). Unchanged since the previous snapshot. The production versions of #16 and #17 are [#21](https://github.com/samuelgalili/petid/pull/21) and [#29](https://github.com/samuelgalili/petid/pull/29). Do not merge #17 into `aws-migration`.

## Branches with unique commits and no open pull request

Not ancestors of `aws-migration`. **Not in production.**

- [`claude/mifo-project-oq44tl`](https://github.com/samuelgalili/petid/tree/claude/mifo-project-oq44tl) (2026-09-28). Four commits (`c86ea47c`, `45417696`, merge `de38607e`, `b8852fb8`): admin orders and publishing to the shop, 29 files including `src/pages/admin/AdminOrders.tsx`.
- [`claude/admin-2fa`](https://github.com/samuelgalili/petid/tree/claude/admin-2fa). Superseded: two-factor landed through [#32](https://github.com/samuelgalili/petid/pull/32) as `0061_admin_two_factor.sql`. Do not port this branch's `0031`.
- [`claude/activity-audit`](https://github.com/samuelgalili/petid/tree/claude/activity-audit). Docs only.
- [`claude/mipo-import-engine`](https://github.com/samuelgalili/petid/tree/claude/mipo-import-engine). 19 commits, earlier intake work, not the current design.
- `claude/deploy-safety`, `claude/workbench`, `claude/product-page-spine`, `claude/category-filter`: their work landed through `claude/integration`. Not a missing feature.
- `cursor/cart-checkout-catalogue-d011` and `cursor/cancel-test-orders-5c9f`: heads of the squash-merged #44 and #41. Their content is in `aws-migration`.
- The `main`-line branches (`add-approve-step`, `measure-*`, `register-*`, `devops/ca060e-*`, `cursor/*` from 2026-09-15, `archive/main-supabase-2026-09-21`, `claude/petaidy-code-review-be1706`) are about 290–320 commits away and belong to the `main` history.

## TODO / FIXME in code

Searched `*.js`, `*.ts`, `*.tsx`, `*.mjs` under `src`, `server/src`, `server/scripts`. Still two, in [`src/hooks/useHomeAttention.ts`](https://github.com/samuelgalili/petid/blob/aws-migration/src/hooks/useHomeAttention.ts):

- Line 137: `TODO(api)`, reorder prediction / low-stock source is unwired.
- Line 140: `TODO(api)`, unread Mipo-answer source is unwired.

## Marked planned in the admin, and not built

Thirteen routes with `status: "planned"` in [`src/components/admin/adminNavigation.ts`](https://github.com/samuelgalili/petid/blob/aws-migration/src/components/admin/adminNavigation.ts), each rendering `AdminPlannedScreen`: `/admin/leads`, `/admin/communication`, `/admin/inventory`, `/admin/returns`, `/admin/transactions`, `/admin/documents`, `/admin/expenses`, `/admin/suppliers`, `/admin/purchase-orders`, `/admin/tasks`, `/admin/approvals`, `/admin/workflows`, `/admin/employees`.

## In the tree, not a ticket

- The shop still reads `business_products`. The cutover to `/api/catalog` has not been done.
- No remote `staging` branch and no staging host (`docs/STAGING.md`).
- Migration numbers used twice: `0018` and `0061`. `0030` and `0031` are unused. The next file is `0062`.
- `production-cancel-test-orders.yml` says a copy must exist on `main` to be dispatched; `production-hide-irrelevant-products.yml` says the default branch is `aws-migration` and no copy is needed. With the default branch now `aws-migration`, the second is the one that matches GitHub today.
