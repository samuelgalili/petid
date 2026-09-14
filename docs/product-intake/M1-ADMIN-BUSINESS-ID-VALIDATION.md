# M1 — `admin_users.business_id` · Validation Report

**Date:** 2026-09-14 · **Branch:** `claude/mifo-project-oq44tl`
**No migration file created. No schema changed in any tracked environment. No production
contact. No merge, no deploy.**

Design: [`PRODUCT-INTAKE-FOUNDATION-DESIGN.md`](./PRODUCT-INTAKE-FOUNDATION-DESIGN.md)
(commit `191fd297`). OD-1 … OD-7 approved.

**Verdict: M1 is safe to execute — with two findings that must be read first (§15, §16).**

---

## 1. Structures verified

Every claim below was read from a live PostgreSQL 16 with all 38 migrations applied, or
executed against a scratch database. Nothing is asserted from the design document.

| # | Structure | Method |
|---|---|---|
| 1 | `admin_users` | `information_schema` + `pg_constraint` + `pg_indexes` |
| 2 | `business_profiles` | `information_schema` + enum labels |
| 3 | Authentication / session | read `getAdminFromSession`, login and provisioning paths |
| 4 | `request.admin` | read `requireAdmin`, `serializeAdmin` |
| 5 | Admin roles | `adminPermissions.js` + the database CHECK constraint |
| 6 | Product routes | all admin product routes enumerated |
| 7 | Audit | `admin_audit_log` + `recordAdminAudit` |
| 8 | Migration runner | read `applyMigrations.js`; deploy path read from the workflow |

---

## 2. `admin_users`

```
id                   uuid        NOT NULL  default gen_random_uuid()
email                text        NOT NULL
password_hash        text        NOT NULL
display_name         text        nullable
role                 text        NOT NULL  default 'admin'
is_active            boolean     NOT NULL  default true
created_at           timestamptz NOT NULL  default now()
updated_at           timestamptz NOT NULL  default now()
last_login_at        timestamptz nullable
must_change_password boolean     NOT NULL  default false
```

**Constraints**

```
admin_users_pkey        PRIMARY KEY (id)
admin_users_email_key   UNIQUE (email)
admin_users_role_check  CHECK (role = ANY (ARRAY['admin','product_manager']))
```

**Indexes:** `admin_users_pkey`, `admin_users_email_key`, `idx_admin_users_email_lower`.

**No `business_id`. No foreign key to `business_profiles`. No Seller concept at all.**

> ### 🔴 Finding F-1 — the role CHECK constraint blocks the new roles
>
> `role` is constrained to exactly `'admin'` and `'product_manager'`. The design's
> `seller_admin` and `readonly_admin` **cannot be inserted** until that CHECK is replaced.
>
> **This is not in M1's approved scope**, and M1 does not need it: adding the column is
> independent of using it. But it means **M1 alone cannot create a Seller Admin** — a
> follow-on migration (M1b) must relax the CHECK before Stage 1A can assign anyone a
> Seller scope. Flagged rather than silently bundled in.

---

## 3. `business_profiles`

| Field | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `user_id` | uuid | nullable | — |
| `business_name` | text | NOT NULL | — |
| `business_type` | enum | NOT NULL | — |
| `is_verified` | boolean | **nullable** | `false` |
| `verified_by` | uuid | nullable | — |
| `verification_requested_at` | timestamptz | nullable | — |
| `verification_notes` | text | nullable | — |

`business_type` values: `vet, trainer, groomer, shop, pet_sitter, other`.

> ### 🟠 Finding F-2 — "approved Seller" is not reliably determinable
>
> Two problems, both verified:
>
> 1. **`is_verified` is nullable**, so it is three-valued: `true`, `false`, `NULL`. Any
>    check must be written `is_verified IS TRUE`. Writing `NOT is_verified` or
>    `is_verified = false` silently drops the NULL rows.
> 2. **Nothing marks a profile as a Seller.** A `vet`, a `groomer` and a `shop` are
>    structurally identical rows. `business_type = 'shop'` is a *category*, not a
>    commercial status, and the seeded MIPO Shop is the only verified row in a fresh
>    database.
>
> So "is this business an approved Seller?" can today be approximated only as
> `is_verified IS TRUE`, which really means "a human verified this business exists" — not
> "this business is authorised to sell". **The publication gate depends on this
> distinction** (§8 of the design, condition 1).
>
> **This does not block M1.** It blocks Stage 3. Recorded as open question OQ-2.

---

## 4. Authentication and session — **the decisive finding**

`getAdminFromSession` joins `admin_sessions` to `admin_users` and selects an **explicit
column list**. So does login. So does the update-on-login. All three share one constant:

```js
// server/src/index.js:333
const adminUserSelect = `
  id, email, display_name, role, is_active,
  must_change_password, created_at, updated_at, last_login_at
`;
```

**There is no `SELECT *` against `admin_users` anywhere in the codebase** — verified by
search across `index.js` and `provisionAdmin.js`.

Both INSERT paths (`index.js:615`, `provisionAdmin.js:64`) name their columns explicitly
and would simply leave a new nullable column as NULL.

> ### ✅ Adding `business_id` cannot break login
>
> Not "is unlikely to" — **cannot**. Every read names its columns, so a new column is
> invisible to all of them, and every write names its columns, so a new nullable column
> needs no value. Proven by execution in §11.

---

## 5. `request.admin`

Built by `requireAdmin` in two shapes:

| Path | `id` | `role` | Notes |
|---|---|---|---|
| Admin API key | `"api-key"` | `ADMIN_ROLES.ADMIN` | a synthetic identity with **no row in `admin_users`** |
| Session cookie | real uuid | from the row | via `serializeAdmin` |

`serializeAdmin` returns `id, email, display_name, role, permissions, must_change_password,
created_at, last_login_at`. **No `business_id`** — it would have to be added there for the
value to reach a route.

> ### 🟠 Finding F-3 — the API-key identity has no Seller and no user row
>
> `x-admin-api-key` yields `id: "api-key"` with the full `admin` role and no
> `admin_users` row. Under the design's rules it resolves to **platform scope**, which is
> correct for a system key — but it means **the API key bypasses Seller scoping entirely
> and always will**. That is a deliberate property of a system credential, and it should be
> stated in the isolation tests rather than discovered later.

---

## 6. Roles

**Code** (`adminPermissions.js`): `ADMIN_ROLES = { ADMIN: "admin", PRODUCT_MANAGER:
"product_manager" }`, with `admin → ["*"]` and `product_manager → 5 product permissions`
(notably **not** `PRODUCTS_OWNERSHIP_REVIEW`, added in G-6 and deliberately admin-only).

**Database:** the same two values, enforced by `admin_users_role_check` (F-1).

**Should `product_manager` have no Seller?** **Yes — `business_id` must be NULL for it.**
OD-5 approved `product_manager` as a platform role, and the design gives it
`intake.review`. A reviewer scoped to one Seller could not review another's drafts, and a
reviewer *with* a Seller who could still review platform-wide would be able to approve its
own submissions through a side door. **Recommendation: a later CHECK constraint enforcing
`business_id IS NULL` for platform roles — not in M1.**

**Is an extra field needed to distinguish Platform Admin from Seller Admin?** **No.** The
pair `(role, business_id)` is sufficient and has no ambiguous combination once the roles
exist:

| role | `business_id` | Scope |
|---|---|---|
| `admin` / `system_admin` | NULL | platform |
| `product_manager` | NULL | platform |
| `readonly_admin` | NULL | platform, read-only |
| `seller_admin` | **NOT NULL** | that Seller |
| `seller_admin` | NULL | **misconfiguration → refuse with 403** (design §7.3) |

A separate `scope` column would be derivable from those two and could disagree with them.
Not added.

---

## 7. Audit

`admin_audit_log`: `id, action_type, entity_type, entity_id (text), old_values jsonb,
new_values jsonb, metadata jsonb, created_at, actor_admin_user_id, actor_email,
actor_role`.

**Append-only** — verified repository-wide: three INSERT sites, zero UPDATE, zero DELETE.
`actor_admin_user_id` is written NULL for the API-key identity, with `actor_email` =
`"api-key"`.

**Sufficient for M1 and for Stage 1A.** No new audit table is needed. When Seller scope
exists, the acting `business_id` should be added to `metadata` — a code change, not a
schema change.

---

## 8. FK decision — **yes, with `ON DELETE RESTRICT`**

**Add the foreign key.** Verified by execution (§11): without it an admin row could point
at a business that does not exist, and the entire isolation model rests on that pointer
being real. A dangling `business_id` would mean an admin scoped to nothing, which the
design treats as a misconfiguration to refuse — better to make it unrepresentable.

**`ON DELETE RESTRICT`, not `CASCADE`, not `SET NULL`:**

| Behaviour | Why not |
|---|---|
| `CASCADE` | deleting a business would **delete admin accounts**. Catastrophic and absurd |
| `SET NULL` | deleting a business would **silently promote a Seller Admin to platform scope**. A privilege escalation triggered by an unrelated deletion |
| **`RESTRICT`** ✅ | deleting a business with admins attached is refused. The operator must detach them deliberately — which is exactly the decision that should be explicit |

`RESTRICT` matches the cascade policy already stated for the whole intake chain.

---

## 9. Nullable decision — **yes, nullable, and it must stay nullable**

**`business_id uuid NULL`, no default.** Three independent reasons:

1. **Platform roles require NULL.** `admin`, `product_manager` and `readonly_admin` have no
   Seller. NULL is not a placeholder here — it is the correct value, meaning "platform
   scope".
2. **NOT NULL would require a backfill**, and there is no source of truth for which Seller
   any existing admin belongs to. Inventing one is explicitly forbidden.
3. **A nullable column with no default is a catalogue-only change** in PostgreSQL 16 — no
   table rewrite, no long lock. Measured at **1.233 ms** (§11).

**No default value.** A default would quietly assign a Seller to every future admin.

---

## 10. Delete behaviour — summarised

| Direction | Behaviour |
|---|---|
| Delete a `business_profiles` row with admins attached | **refused** by `RESTRICT` — verified |
| Delete an `admin_users` row | unaffected; no dependents |
| Set `business_id` to a non-existent business | **refused** by the FK — verified |
| Set `business_id` to NULL | allowed — this is how an admin is returned to platform scope |

---

## 11. Is M1 safe? — **Yes. Proven by execution, not by reading.**

Applied the proposed SQL to a scratch database with all 38 migrations, then exercised it:

| Check | Result |
|---|---|
| `ALTER TABLE` duration | **1.233 ms** — no table rewrite |
| `CREATE INDEX` duration | 1.443 ms |
| `adminUserSelect` column list still valid | ✅ |
| Existing-shape INSERT still works | ✅ `inserted, business_id=NULL` |
| FK rejects a non-existent business | ✅ `violates foreign key constraint "admin_users_business_id_fkey"` |
| `ON DELETE RESTRICT` blocks deleting a linked business | ✅ refused |
| **Full server suite against the altered schema** | ✅ **344/344** |
| **DB smoke against the altered schema** | ✅ **32/32** |
| **Rollback on a populated table** | ✅ column dropped, **admin rows before 1 → after 1** |
| **Full suite after rollback** | ✅ **344/344** |

**Existing admin users without a Seller:** in a freshly migrated database there are
**zero** `admin_users` rows — admins are provisioned at runtime by `provisionAdmin.js`,
not seeded. **How many exist in production is `UNKNOWN`** (no production access). It does
not matter for M1: every existing row gets NULL, which is the correct value for a platform
admin, and no row is modified.

---

## 12. Proposed migration — **SQL only, file not created**

Would be `server/sql/0040_admin_business_scope.sql` (next free number; the runner requires
`^\d+_.+\.sql$` and sorts lexicographically).

```sql
-- M1 · Seller scope on the admin identity.
--
-- NULL means platform scope, and that is the correct value for admin,
-- product_manager and readonly_admin - not a placeholder awaiting a backfill.
-- There is no source of truth for which Seller an existing admin belongs to, so
-- nothing is backfilled and no default is set: a Seller is assigned only by an
-- explicit, audited action.
--
-- ON DELETE RESTRICT rather than SET NULL: nulling this column on an unrelated
-- business deletion would silently promote a Seller Admin to platform scope.

alter table public.admin_users
  add column business_id uuid
    references public.business_profiles(id)
    on delete restrict;

create index if not exists idx_admin_users_business_id
  on public.admin_users (business_id)
  where business_id is not null;

comment on column public.admin_users.business_id is
  'Seller scope for this admin. NULL = platform-wide. Never backfilled automatically; '
  'assigned only by an explicit audited action. Platform roles must keep this NULL.';
```

**Properties:** additive only · no row touched · no type changed · no column dropped · no
backfill · no `defaultBusinessId` · no default value · reversible · no downtime · **depends
on nothing**.

The runner wraps each migration in its own transaction and records a checksum, so this
commits atomically and cannot later be edited in place.

## 13. Proposed rollback

```sql
drop index if exists public.idx_admin_users_business_id;
alter table public.admin_users drop column if exists business_id;
```

**Verified on a populated table:** column removed, row count unchanged, suite green.

> ⚠️ **The migration runner is forward-only.** It has no down-migration mechanism —
> `rollback` appears in `applyMigrations.js` only as a transaction abort. A rollback is
> therefore either a **new forward migration** that drops the column, or manual SQL run by
> an operator. The applied row in `schema_migrations` must be deleted too, or the runner
> will consider `0040` applied. **This should be written down before M1 is applied, not
> discovered during an incident.**

**Data loss on rollback:** only `business_id` assignments made after M1. Nothing that
existed before M1 can be lost, because nothing existing is touched.

---

## 14. Tests required for M1

| Test | Asserts |
|---|---|
| Migration applies on a fully migrated database | no error, no rewrite |
| Migration is idempotent under re-run | the runner's checksum path is exercised by the existing deploy rehearsal |
| Rollback drops cleanly on a populated table | row count unchanged |
| Login succeeds with the column present | session path untouched |
| Admin provisioning succeeds with the column present | `business_id` is NULL |
| FK rejects a non-existent business | constraint name in the error |
| `ON DELETE RESTRICT` refuses deleting a linked business | |
| No existing row was modified | `updated_at` unchanged for every pre-existing admin |
| Full server suite | 344/344 |
| DB smoke | 32/32 |
| Deploy dry-run against a production dump | the existing `dry-run-migrations.sh` step covers this |

All except the last two rows were executed during this validation (§11).

---

## 15. Risks

| # | Risk | Severity | Note |
|---|---|---|---|
| **F-1** | **Role CHECK blocks `seller_admin` / `readonly_admin`** | 🔴 high | M1 is still safe, but **M1 alone cannot create a Seller Admin.** Needs M1b before Stage 1A can use the column |
| **F-2** | "Approved Seller" not reliably determinable | 🟠 medium | `is_verified` is nullable and nothing marks a profile as a Seller. Blocks the publication gate, not M1 |
| **F-3** | API-key identity bypasses Seller scoping | 🟠 medium | Correct for a system credential; must be explicit in the isolation tests |
| R-4 | Forward-only runner — rollback needs a new migration or manual SQL | 🟠 medium | Write the rollback procedure down before applying |
| R-5 | Production admin count is `UNKNOWN` | 🟡 low | Every existing row gets NULL; nothing is modified |
| R-6 | A future `NOT NULL` would need a backfill with no source of truth | 🟡 low | It must stay nullable — §9 |

---

## 16. Open questions

| # | Question | Blocks |
|---|---|---|
| **OQ-1** | **Shall M1b (relax the role CHECK to add `seller_admin` and `readonly_admin`) be approved now, or after M1 lands?** They are independent migrations; M1 is safe either way, but Stage 1A needs both | Stage 1A |
| **OQ-2** | **How is "approved Seller" to be determined?** Options: (a) `is_verified IS TRUE` alone; (b) add `is_seller boolean` / `seller_status` to `business_profiles`; (c) a separate `sellers` table. Publication gate condition 1 depends on the answer | Stage 3 |
| **OQ-3** | Should a CHECK enforce `business_id IS NULL` for platform roles, or is that an application rule? | Stage 1A |
| **OQ-4** | Confirm the API-key identity remains platform-scoped forever (F-3) | Stage 1A tests |
| **OQ-5** | Does the rollback procedure need to be written as a runnable script before M1 is applied? | before M1 deploy |

---

## Summary

**M1 is safe to execute.** The migration is additive, touches no row, needs no backfill,
adds no default, rewrites no table (1.2 ms measured), and drops cleanly. The full suite and
smoke pass against the altered schema and again after rollback.

**Adding the column cannot break login** — every read and write against `admin_users` names
its columns explicitly, with no `SELECT *` anywhere.

**But M1 on its own does not enable Seller isolation.** The database CHECK on `role`
(F-1) means no Seller Admin can exist until it is relaxed. That is the next decision,
OQ-1.

**Stopping here.** No migration file created, no schema changed outside a throwaway scratch
database, no production code, no merge, no deploy. Awaiting explicit approval to create M1.
