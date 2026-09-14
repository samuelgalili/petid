# M1 — `admin_users.business_id` · Implementation Plan and Rollback Procedure

**Date:** 2026-09-14 · **Branch:** `claude/mifo-project-oq44tl`
**Written before the migration file was created, per OQ-5.**

Validation: [`M1-ADMIN-BUSINESS-ID-VALIDATION.md`](./M1-ADMIN-BUSINESS-ID-VALIDATION.md)
(commit `439eb1c3`). Approved decisions: OQ-1 … OQ-5.

**Not applied to production. Not merged. Not deployed.**

---

## 1. What this migration does

Adds one nullable column to `admin_users` so an admin identity can carry a Seller scope.
**It changes no behaviour.** Nothing reads the column yet; that begins in Stage 1A.

```
business_id uuid NULL  →  business_profiles(id)  ON DELETE RESTRICT
```

`NULL` means **platform scope**, and that is the correct, permanent value for `admin` and
`product_manager`. It is not a placeholder awaiting a backfill.

---

## 2. Exact SQL

File: `server/sql/0040_add_admin_users_business_id.sql`

**Naming verified against the runner before the file was created:** the pattern is
`/^\d+_.+\.sql$/` with a lexicographic sort (`applyMigrations.js:30-32`);
`0040_add_admin_users_business_id.sql` matches and sorts after `0039_backfill_pet_weight.sql`.

```sql
-- M1 · Seller scope on the admin identity.
--
-- NULL means platform scope. That is the correct and permanent value for the
-- admin and product_manager roles, not a placeholder waiting to be filled: a
-- reviewer scoped to one Seller could not review anybody else's drafts.
--
-- Nothing is backfilled. There is no source of truth for which Seller an
-- existing admin belongs to, and inventing one would be the same mistake that
-- made legacy product ownership unrecoverable. A Seller is assigned only by an
-- explicit, audited action, which does not exist yet.
--
-- No default, for the same reason: a default would quietly give every future
-- admin a Seller nobody chose.
--
-- ON DELETE RESTRICT rather than SET NULL or CASCADE. SET NULL would silently
-- promote a Seller-scoped admin to platform scope when an unrelated business was
-- deleted - a privilege escalation triggered by somebody else's cleanup. CASCADE
-- would delete admin accounts. RESTRICT forces the detachment to be deliberate.

alter table public.admin_users
  add column business_id uuid
    references public.business_profiles(id)
    on delete restrict;

-- Partial: platform admins are NULL and will stay the majority, so they do not
-- belong in an index whose only purpose is finding a Seller's admins.
create index if not exists idx_admin_users_business_id
  on public.admin_users (business_id)
  where business_id is not null;

comment on column public.admin_users.business_id is
  'Seller scope for this admin. NULL = platform-wide. Never backfilled automatically; assigned only by an explicit audited action. Platform roles keep this NULL.';
```

---

## 3. Preconditions

| # | Condition | How to check |
|---|---|---|
| P-1 | `admin_users` exists with its current 10 columns | `\d public.admin_users` |
| P-2 | `business_profiles` exists with `id uuid` primary key | `\d public.business_profiles` |
| P-3 | `admin_users.business_id` does **not** already exist | migration fails loudly if it does — no `IF NOT EXISTS` on the column, deliberately |
| P-4 | Migrations `0001`–`0039` are applied | `select count(*) from schema_migrations` = 38 |
| P-5 | No other migration runner is mid-flight | the runner takes `pg_advisory_lock` itself |
| P-6 | A backup exists | the deploy runs `backup-before-migrate.sh` before applying |
| P-7 | The dry-run against a production dump passed | the deploy runs `dry-run-migrations.sh` first |

**P-3 has no `IF NOT EXISTS` on purpose.** If the column already exists, something is wrong
with the environment's history and the migration should stop rather than quietly succeed.
The index keeps `IF NOT EXISTS` because a half-applied migration is a real recovery case.

## 4. Postconditions

| # | Condition |
|---|---|
| Q-1 | `admin_users.business_id` exists, `uuid`, nullable, no default |
| Q-2 | FK `admin_users_business_id_fkey` → `business_profiles(id)`, `ON DELETE RESTRICT` |
| Q-3 | Partial index `idx_admin_users_business_id` exists |
| Q-4 | **Every pre-existing admin row has `business_id = NULL`** |
| Q-5 | **No pre-existing row was modified** — `updated_at` unchanged for all of them |
| Q-6 | `schema_migrations` contains `0040_add_admin_users_business_id.sql` with its checksum |
| Q-7 | Login, session and admin provisioning behave identically |

---

## 5. Impact on login and session — **none**

Every read of `admin_users` uses one shared explicit column list
(`index.js:333`, `adminUserSelect`), and there is **no `SELECT *` against the table
anywhere in the codebase**. Both INSERT paths (`index.js:615`,
`provisionAdmin.js:64`) name their columns too.

| Path | Effect |
|---|---|
| `POST /api/admin/login` | none — selects `adminUserSelect` |
| Session resolution (`getAdminFromSession`) | none — explicit join and column list |
| `serializeAdmin` → `request.admin` | none — the column is not selected, so it is not exposed |
| Admin provisioning (`provisionAdmin.js`) | none — new rows get `NULL` |
| `x-admin-api-key` identity | none — **platform-scoped, permanently (OQ-4)**. It has no `admin_users` row at all |

**A new nullable column is invisible to all of them.** Verified by execution (§7).

## 6. Impact on permissions — **none in M1**

`adminPermissions.js` is untouched. `ADMIN_ROLES` still has exactly `admin` and
`product_manager`; `rolePermissions` is unchanged; no route reads `business_id`.

> ### The column cannot yet be used
>
> `admin_users_role_check` restricts `role` to `('admin','product_manager')`, so
> **`seller_admin` cannot be inserted**. Per OQ-1, M1b is deliberately not being written
> now. **M1 therefore adds capacity, not capability** — it is the reversible first slice,
> and Seller isolation does not begin working until M1b plus the Stage 1A route work.

---

## 7. Tests

All run against a local PostgreSQL 16 with all migrations applied. **No production.**

| # | Test | Asserts |
|---|---|---|
| T-1 | column exists, `uuid`, nullable, no default | Q-1 |
| T-2 | FK exists and targets `business_profiles(id)` with `ON DELETE RESTRICT` | Q-2 |
| T-3 | partial index exists | Q-3 |
| T-4 | an existing-shape INSERT yields `business_id IS NULL` | Q-4 |
| T-5 | a non-existent `business_id` is rejected by the FK | FK is live |
| T-6 | deleting a business with an admin attached is **refused** | `ON DELETE RESTRICT` |
| T-7 | setting `business_id` back to NULL is allowed | the way back to platform scope |
| T-8 | the exact `adminUserSelect` column list still resolves | login unaffected |
| T-9 | rollback drops the column on a populated table with **no row loss** | §8 |
| T-10 | full server suite + DB smoke against the migrated schema | nothing else broke |

---

## 8. Rollback procedure

> ### ⚠️ The runner is forward-only
>
> `applyMigrations.js` has **no down-migration mechanism** — `rollback` appears in it only
> as a transaction abort. Reversing M1 is therefore a manual, operator-run procedure, and
> **`schema_migrations` is never modified by production code**. The steps below are run by
> a human with database access, not by the application.

### 8.1 Development / staging

```sql
begin;

drop index if exists public.idx_admin_users_business_id;
alter table public.admin_users drop column if exists business_id;

-- Required, or the next runner pass believes 0040 is still applied and will not
-- re-apply it after the file is restored.
delete from public.schema_migrations
 where filename = '0040_add_admin_users_business_id.sql';

commit;
```

Then remove or revert `server/sql/0040_add_admin_users_business_id.sql` so the runner and
the database agree again.

### 8.2 Production — **different, and deliberately more cautious**

| Step | Action |
|---|---|
| 1 | **Take a backup first.** `deploy/aws/backup-before-migrate.sh` already runs before migrations; take a fresh one before reversing |
| 2 | **Establish whether any `business_id` has been assigned:** `select count(*) from admin_users where business_id is not null;` |
| 3 | **If that count is greater than zero, stop and escalate.** Dropping the column destroys those assignments and there is no other record of them. Rolling back is then a decision, not a repair |
| 4 | Run the SQL from §8.1 inside a single transaction, on the production database, by an operator |
| 5 | Revert the code commit so the migration file no longer exists |
| 6 | Verify: column absent, admin row count unchanged, login works |

**The difference in one line:** in development the column is always empty, so rollback is
free. **In production it may hold assignments that exist nowhere else**, so step 2 is
mandatory and step 3 can stop the rollback entirely.

### 8.3 What rollback cannot lose

Nothing that existed before M1. The migration modifies no existing row, so reversing it
returns the table to its exact prior shape. The only data at risk is `business_id` values
written *after* M1 — which, until M1b and Stage 1A exist, is none.

---

## 9. Explicitly not included

* No `seller_admin`, no `readonly_admin`, no change to `admin_users_role_check` (OQ-1 → M1b)
* No change to `business_profiles` (OQ-2)
* No CHECK on `role`/`business_id` (OQ-3 → M1b)
* No backfill, no default, no `defaultBusinessId`
* No additional columns
* No change to login, session, `request.admin`, `serializeAdmin` or `adminPermissions.js`
* No change to routes, permissions, cart, checkout, catalogue, orders or products
* No new tables — `raw_import_records` and the rest remain unwritten
* No `down` mechanism added to the runner
* No production code touching `schema_migrations`

## 10. Conditions that require stopping

Stop and escalate rather than working around any of these:

| # | Condition |
|---|---|
| S-1 | `business_id` already exists on `admin_users` — the environment's history is not what is assumed |
| S-2 | `schema_migrations` does not contain exactly 39 rows after applying (38 + M1) |
| S-3 | The dry-run against a production dump fails |
| S-4 | Any pre-existing admin row's `updated_at` changes |
| S-5 | Login or session behaviour changes in any way |
| S-6 | The full suite or DB smoke regresses |
| S-7 | On rollback: `business_id IS NOT NULL` for any row (§8.2 step 3) |
| S-8 | The migration takes long enough to suggest a table rewrite — it should be single-digit milliseconds |

---

## 11. Blocker recorded for the Publication Gate (OQ-2)

`business_profiles` is deliberately unchanged, which leaves condition 1 of the publication
gate — *"Seller approved"* — **unimplementable as specified**:

* `is_verified` is **nullable**, so it is three-valued and any check must be written
  `is_verified IS TRUE`;
* **nothing marks a profile as a Seller.** `vet`, `groomer` and `shop` are structurally
  identical rows, and `business_type = 'shop'` is a category, not a commercial status.

**Neither field is proof of an approved Seller.** Until OQ-2 is decided, the gate cannot
distinguish "a business we verified exists" from "a business authorised to sell".

**This blocks Stage 3, not M1.**
