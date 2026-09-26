# Open work

Snapshot 2026-09-26 against `aws-migration` at `29fec3ab`. Nothing here is a guess: each item is an open pull request, a branch tip that is not an ancestor of `aws-migration`, or a `TODO` / `planned` marker in the tree. Items say when they are **not in production**.

GitHub's default branch is `main`. A pull request into `main` does not deploy. Do not merge a `main` branch into `aws-migration`; port the commits onto a branch cut from `aws-migration`.

## Open pull requests

### Pointed at `aws-migration` (the production base)

- [**#20** Q4 Gate2: QR uses source_image_url, never Master](https://github.com/samuelgalili/petid/pull/20) — draft. Head [`cursor/q4-gate2-source-qr-d82f`](https://github.com/samuelgalili/petid/tree/cursor/q4-gate2-source-qr-d82f). Three commits are not in `aws-migration` (`a2896497`, `306762d6`, `0bb02437`), and the branch is 92 commits behind. **Not in production.** It adds `pets.source_image_url` and a QR spec. Current onboarding refuses to write `source_image_url` (`src/pages/Onboarding.tsx`, `e2e/onboarding-persist.aws.spec.ts`).

### Pointed at `main` (will not deploy if merged there)

- [**#25** ci: trim + casefold CA060E confirmation before MARK-FAILED check](https://github.com/samuelgalili/petid/pull/25) — draft, opened 2026-09-15. Head [`devops/ca060e-confirm-casefold`](https://github.com/samuelgalili/petid/tree/devops/ca060e-confirm-casefold). One commit is on neither `main` nor `aws-migration`: [`c270bc3d`](https://github.com/samuelgalili/petid/commit/c270bc3d883457585121806b765e45710ab2ca68). **Not in production.**
- [**#18** Land #15 living idle on main (PetHeroVisual)](https://github.com/samuelgalili/petid/pull/18) — open, base `main`. Head [`cursor/pethero-living-motion-main-acc5`](https://github.com/samuelgalili/petid/tree/cursor/pethero-living-motion-main-acc5). **Not what production runs.** Related production ports that are already merged: [#19](https://github.com/samuelgalili/petid/pull/19) (Master avatar) and [#23](https://github.com/samuelgalili/petid/pull/23) (Aurora glow). Sibling branches still not ancestors of `aws-migration`: [`cursor/pethero-living-motion-06e6`](https://github.com/samuelgalili/petid/tree/cursor/pethero-living-motion-06e6), [`cursor/mipo-presence-living-hero-06e6`](https://github.com/samuelgalili/petid/tree/cursor/mipo-presence-living-hero-06e6), [`cursor/pethero-visual-master-avatar-9447`](https://github.com/samuelgalili/petid/tree/cursor/pethero-visual-master-avatar-9447).
- [**#17** Fix S4 checkout address validation](https://github.com/samuelgalili/petid/pull/17) — draft, base `main`. Head [`cursor/s4-checkout-address-validation-9809`](https://github.com/samuelgalili/petid/tree/cursor/s4-checkout-address-validation-9809). Three commits are on neither line (`45542c55`, `51d3db2b`, `78f8ca84`). `src/lib/checkoutShipping.ts` does not exist on `aws-migration`. **Not in production.** The branch is based on `main`, so it also contains the Supabase-era tree.
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
