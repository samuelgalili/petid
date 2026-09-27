# Open work

Snapshot 2026-09-27 against `aws-migration` at `e8583a02` (merge of [#29](https://github.com/samuelgalili/petid/pull/29)). Nothing here is a guess: each item is an open pull request, a branch tip that is not an ancestor of `aws-migration`, or a `TODO` / `planned` marker in the tree. Items say when they are **not in production**.

GitHub's default branch is `main`. A pull request into `main` does not deploy. Do not merge a `main` branch into `aws-migration`; port the commits onto a branch cut from `aws-migration`.

## Merged into `aws-migration` since the previous snapshot

These are on `e8583a02`. They are no longer open work. A push to `aws-migration` starts Deploy AWS; this list is the git history, not a confirmation that the live host has finished that deploy.

- [**#27** Fix Cardcom indicator 502s so captures mark paid and declines stop alerting](https://github.com/samuelgalili/petid/pull/27) — merged 2026-09-27 by samuelgalili. Merge commit [`454631d9`](https://github.com/samuelgalili/petid/commit/454631d98260075ba9b42092ae980ae2c54b09ad). Head was [`cursor/cardcom-webhook-502-806f`](https://github.com/samuelgalili/petid/tree/cursor/cardcom-webhook-502-806f). A decline is answered 200 and is not marked paid. A verified capture whose amount matches can be marked paid. Adds the read-only workflow `production-cardcom-missed-payments-readonly.yml`. Merging does not replay old Cardcom callbacks.
- [**#29** Fix the shopper path up to the payment page](https://github.com/samuelgalili/petid/pull/29) — merged 2026-09-27 by samuelgalili. Merge commit [`e8583a02`](https://github.com/samuelgalili/petid/commit/e8583a02). Head was [`cursor/sales-funnel-fixes-768e`](https://github.com/samuelgalili/petid/tree/cursor/sales-funnel-fixes-768e). Login and signup link to the shop. Phone and zip digits are normalized in `src/lib/checkoutContact.ts` before validation. Import-only product columns are hidden. Stops before creating an order. This is the production fix for the dashed-phone checkout stall. The still-open [#17](https://github.com/samuelgalili/petid/pull/17) is the older `main` attempt and is not what landed here.

## Open pull requests

### Pointed at `aws-migration` (the production base)

- [**#30** Notify the owner on WhatsApp for orders, payments, signups, and outages](https://github.com/samuelgalili/petid/pull/30) — draft, opened 2026-09-27. Head [`cursor/owner-whatsapp-notifications-ee38`](https://github.com/samuelgalili/petid/tree/cursor/owner-whatsapp-notifications-ee38) at `bf8e921b` (two commits: `4ef65955`, `bf8e921b`). Those commits sit on `29fec3ab`, so the branch does not contain #27 or #29 and is 6 commits behind `aws-migration`. **Not in production.** Its write-up says to merge #27 first, because both edit the Cardcom webhook. Twilio transport is `server/src/ownerNotify.js`. The second commit builds a page link from `SITE_URL`. Env names only: `OWNER_NOTIFICATIONS_ENABLED`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `OWNER_WHATSAPP_TO`, `OWNER_NOTIFY_QA_SECRET`, `TWILIO_WHATSAPP_CONTENT_SIDS`, `OWNER_NOTIFY_THROTTLE_MS`, `OWNER_NOTIFY_TIMEOUT_MS`, `SITE_URL`.
- Public shop entry for anonymous visitors — **no pull request was open** at this snapshot (rechecked 2026-09-27 00:23 UTC). A cloud agent with that name was still running and had not pushed a branch: [agent](https://cursor.com/agents/bc-09467937-d381-5896-90a2-6d59be17f153). Do not treat this line as a merged or reviewed change. `/shop` is already public on `aws-migration`; `/` still requires an account ([#29](https://github.com/samuelgalili/petid/pull/29)).
- [**#28** Propose a living 3D pet for the home centre](https://github.com/samuelgalili/petid/pull/28) — open, not draft. Head [`cursor/3d-pet-avatar-proposal-423c`](https://github.com/samuelgalili/petid/tree/cursor/3d-pet-avatar-proposal-423c). Four commits are not in `aws-migration`; the branch is 6 behind and its base is still `29fec3ab`. **Not in production.** A proposal plus a dev-only `/dev/pet-avatar` route. It does not change the home centre customers see.
- [**#20** Q4 Gate2: QR uses source_image_url, never Master](https://github.com/samuelgalili/petid/pull/20) — draft. Head [`cursor/q4-gate2-source-qr-d82f`](https://github.com/samuelgalili/petid/tree/cursor/q4-gate2-source-qr-d82f). Three commits are not in `aws-migration` (`a2896497`, `306762d6`, `0bb02437`), and the branch is 98 commits behind. **Not in production.** It adds `pets.source_image_url` and a QR spec. Current onboarding refuses to write `source_image_url` (`src/pages/Onboarding.tsx`, `e2e/onboarding-persist.aws.spec.ts`).

### Pointed at `main` (will not deploy if merged there)

- [**#25** ci: trim + casefold CA060E confirmation before MARK-FAILED check](https://github.com/samuelgalili/petid/pull/25) — draft, opened 2026-09-15. Head [`devops/ca060e-confirm-casefold`](https://github.com/samuelgalili/petid/tree/devops/ca060e-confirm-casefold). One commit is on neither `main` nor `aws-migration`: [`c270bc3d`](https://github.com/samuelgalili/petid/commit/c270bc3d883457585121806b765e45710ab2ca68). **Not in production.**
- [**#18** Land #15 living idle on main (PetHeroVisual)](https://github.com/samuelgalili/petid/pull/18) — open, base `main`. Head [`cursor/pethero-living-motion-main-acc5`](https://github.com/samuelgalili/petid/tree/cursor/pethero-living-motion-main-acc5). **Not what production runs.** Related production ports that are already merged: [#19](https://github.com/samuelgalili/petid/pull/19) (Master avatar) and [#23](https://github.com/samuelgalili/petid/pull/23) (Aurora glow). Sibling branches still not ancestors of `aws-migration`: [`cursor/pethero-living-motion-06e6`](https://github.com/samuelgalili/petid/tree/cursor/pethero-living-motion-06e6), [`cursor/mipo-presence-living-hero-06e6`](https://github.com/samuelgalili/petid/tree/cursor/mipo-presence-living-hero-06e6), [`cursor/pethero-visual-master-avatar-9447`](https://github.com/samuelgalili/petid/tree/cursor/pethero-visual-master-avatar-9447).
- [**#17** Fix S4 checkout address validation](https://github.com/samuelgalili/petid/pull/17) — draft, base `main`. Head [`cursor/s4-checkout-address-validation-9809`](https://github.com/samuelgalili/petid/tree/cursor/s4-checkout-address-validation-9809). Three commits are on neither line (`45542c55`, `51d3db2b`, `78f8ca84`). **Do not merge this into `aws-migration`.** The dashed-phone stall on production was fixed by [#29](https://github.com/samuelgalili/petid/pull/29) in `src/lib/checkoutContact.ts`. This branch is the older `main` tree, including Supabase-era files, and `src/lib/checkoutShipping.ts` is not the file production uses.
- [**#16** Persist Mipo onboarding pet to DB (AC-ONB-1)](https://github.com/samuelgalili/petid/pull/16) — open, base `main`. Head [`cursor/persist-mipo-onboarding-pet-3f33`](https://github.com/samuelgalili/petid/tree/cursor/persist-mipo-onboarding-pet-3f33). The production port is already merged: [#21](https://github.com/samuelgalili/petid/pull/21) on [`cursor/persist-mipo-onboarding-pet-aws-30c2`](https://github.com/samuelgalili/petid/tree/cursor/persist-mipo-onboarding-pet-aws-30c2). Do not re-implement it on `aws-migration`. Merging #16 only moves `main`.
- [**#1** [codex] fix pet tab flows and OCR intake](https://github.com/samuelgalili/petid/pull/1) — draft, base `main`, opened 2026-05-18, author ShaharBDH. Head [`codex/fix-pet-tab-flows`](https://github.com/samuelgalili/petid/tree/codex/fix-pet-tab-flows) **is** an ancestor of `aws-migration`. The pull request against `main` is still open.

## Branches with unique commits, no open pull request

Not ancestors of `aws-migration`. **Not in production.**

- [`claude/admin-2fa`](https://github.com/samuelgalili/petid/tree/claude/admin-2fa) (2026-09-06). Two commits on neither line: [`7b4d8ffd`](https://github.com/samuelgalili/petid/commit/7b4d8ffd) (TOTP on admin sign-in, `server/sql/0031_admin_two_factor.sql`) and [`c04cc75e`](https://github.com/samuelgalili/petid/commit/c04cc75e) (deployment note). Current `aws-migration` has no admin TOTP. Migration numbers `0030` and `0031` are unused here; `0031` is this branch's filename.
- [`claude/activity-audit`](https://github.com/samuelgalili/petid/tree/claude/activity-audit) (2026-09-08). One commit, docs only: [`23128f31`](https://github.com/samuelgalili/petid/commit/23128f31) adds `docs/mipo-activity-network/`. No code on that branch is in production.
- [`claude/mipo-import-engine`](https://github.com/samuelgalili/petid/tree/claude/mipo-import-engine) (2026-08-19). 19 commits on neither line, ending at [`91733650`](https://github.com/samuelgalili/petid/commit/91733650) ("Give the last four engines a screen"). Product intake tables landed later on `aws-migration` (2026-09-15, `server/sql/0042_create_raw_import_records.sql` at `2ff9f9ef`). Treat this branch as earlier work, not as the current intake design.

These tips are also not ancestors, and their unique commits are the approval-gate work that later landed on `aws-migration` via [`claude/integration`](https://github.com/samuelgalili/petid/tree/claude/integration) ("Put the approval where the key already is"). They are not a missing feature:

- [`claude/deploy-safety`](https://github.com/samuelgalili/petid/tree/claude/deploy-safety)
- [`claude/workbench`](https://github.com/samuelgalili/petid/tree/claude/workbench)
- [`claude/product-page-spine`](https://github.com/samuelgalili/petid/tree/claude/product-page-spine)
- [`claude/category-filter`](https://github.com/samuelgalili/petid/tree/claude/category-filter)

No unique commits outside both `main` and `aws-migration` (do not reopen them as product work): [`devops/ca060e-trim-confirmation`](https://github.com/samuelgalili/petid/tree/devops/ca060e-trim-confirmation), [`devops/cardcom-failed-mark-ca060e-oneshot`](https://github.com/samuelgalili/petid/tree/devops/cardcom-failed-mark-ca060e-oneshot), [`cursor/e2e-ci-hang-fix-5796`](https://github.com/samuelgalili/petid/tree/cursor/e2e-ci-hang-fix-5796), [`claude/register-d18-workflow`](https://github.com/samuelgalili/petid/tree/claude/register-d18-workflow). D-18 already exists on `aws-migration` as `.github/workflows/production-d18-readonly.yml`.

Older review branch, 30 commits on neither line, tip 2026-08-17, not current work: [`claude/petaidy-code-review-be1706`](https://github.com/samuelgalili/petid/tree/claude/petaidy-code-review-be1706).

## TODO / FIXME in code

Searched `*.js`, `*.ts`, `*.tsx`, `*.mjs` on `aws-migration`. Two hits, both in [`src/hooks/useHomeAttention.ts`](https://github.com/samuelgalili/petid/blob/aws-migration/src/hooks/useHomeAttention.ts):

- [Line 137](https://github.com/samuelgalili/petid/blob/aws-migration/src/hooks/useHomeAttention.ts#L137) — `TODO(api)`: reorder prediction / low-stock source is unwired.
- [Line 140](https://github.com/samuelgalili/petid/blob/aws-migration/src/hooks/useHomeAttention.ts#L140) — `TODO(api)`: unread Mipo-answer source is unwired.

## Marked planned in the admin, and not built

`status: "planned"` in [`src/components/admin/adminNavigation.ts`](https://github.com/samuelgalili/petid/blob/aws-migration/src/components/admin/adminNavigation.ts). Each route renders `AdminPlannedScreen`. The `needs` list in that file is the gap the screen itself states.

| Path | Label |
|---|---|
| `/admin/leads` | לידים |
| `/admin/communication` | תקשורת |
| `/admin/inventory` | מלאי |
| `/admin/returns` | החזרות |
| `/admin/transactions` | תנועות |
| `/admin/documents` | מסמכים (finance documents, not the pet vault) |
| `/admin/expenses` | הוצאות |
| `/admin/suppliers` | ספקים |
| `/admin/purchase-orders` | הזמנות רכש |
| `/admin/tasks` | משימות |
| `/admin/approvals` | אישורים |
| `/admin/workflows` | תהליכים |
| `/admin/employees` | עובדים |

## In the tree, not a ticket

- Shop cutover from `business_products` to `/api/catalog` has not been done. `server/src/publicCatalog.js` says a cutover now would empty the shop. Tracked as the legacy-catalogue workflow, not as a code path the shop already uses.
- No remote `staging` branch. `docs/STAGING.md` says the staging Lightsail host is still for a human to create.
- Migration files: two files share the `0018` prefix (`0018_external_refs.sql`, `0018_snapshot_profile_identity.sql`). `0030` and `0031` are absent. `0031` collides with `claude/admin-2fa` if that branch is ported.
