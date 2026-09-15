# M1b and Admin Provisioning — Design

**Date:** 2026-09-14 · **Branch:** `claude/mifo-project-oq44tl` · Base: M1 at `8082757c`
**Planning and verification only. No migration file, no schema change, no production code,
no merge, no deploy, no production execution.**

Follows [`SELLER-ISOLATION-M1B-DESIGN.md`](./SELLER-ISOLATION-M1B-DESIGN.md) (`c9192032`).

---

## 1. Executive summary

M1b is small, provably safe, and **rehearsed in full**: all nine role/scope combinations
behave exactly as specified against a real database (§6).

**One correction carried in.** The approved decisions moved `readonly_admin` from
platform-scoped to **Seller-scoped with a mandatory `business_id`**. The scope CHECK
rehearsed in the previous document is therefore **wrong and is replaced** here. The
corrected version was re-rehearsed from scratch.

**One new blocker found by reading the code, not by inference:**

> ### 🔴 `isAdminRequest` would leak every Seller's data through the *public* API
>
> `GET /api/products` and `GET /api/products/:id` widen to the **full catalogue row** —
> including `business_id`, `supplier_id`, `cost_price`, `commission_rate` and
> `image_source_url` — for anyone `isAdminRequest` returns true for. That function returns
> true for **any** valid admin session.
>
> The moment a `seller_admin` exists, it inherits that, and reads **every Seller's
> internal pricing through a public endpoint** — bypassing any scoping added to the admin
> routes entirely.
>
> **This is not triggered today** (no `seller_admin` can exist). **M1b is what makes it
> reachable.** It must be fixed in the same release, or M1b must not ship.

---

## 2. Verified facts

Read from the code and the schema. Re-checked, not carried over.

### 2.1 Admin creation — three INSERT sites, no route among them beyond bootstrap

| Site | Role set | `business_id` | Validation | Audit |
|---|---|---|---|---|
| `index.js:615` `bootstrapAdmin` | **hardcoded `'admin'`** | none | requires `x-admin-api-key` via `secretsEqual`; 503 if unset | ❌ **none** |
| `provisionAdmin.js:64` (CLI) | `--role`, default `product_manager` | none | `isSupportedAdminRole(role)` at `:25` | ✅ writes `admin_audit_log` at `:83` |
| `scripts/seed-workbench.mjs:128` | dev seed | none | — | — |

> **Finding F-4: `bootstrapAdmin` writes no audit row.** The CLI does; the HTTP bootstrap
> route does not. Creating the first admin — the most privileged act in the system — leaves
> no trace.

### 2.2 Role and `business_id` mutation — **no route can do either**

Every `update public.admin_users` in the server:

| Site | Sets |
|---|---|
| `index.js:668` | `last_login_at`, `updated_at` |
| `index.js:705` | `password_hash`, `must_change_password`, `updated_at` |
| `provisionAdmin.js:48` (CLI) | `email`, `password_hash`, `display_name`, **`role`**, `is_active`, `must_change_password` |

> **No HTTP route changes `role`. No code anywhere writes `business_id`.** Role changes
> require shell access to run the CLI on the host.
>
> **Stop conditions "a way to change `business_id` without authorization" and "a route that
> creates an admin without validation" are NOT triggered.**

### 2.3 `request.admin` hydration — two branches

| Branch | `id` | `role` | DB row |
|---|---|---|---|
| API key (`index.js:509`) | `"api-key"` | `admin` | none |
| Session | uuid | from row | yes |

`serializeAdmin` exposes `id, email, display_name, role, permissions,
must_change_password, created_at, last_login_at`. **No `business_id`, `scope` or
`auth_method`.**

### 2.4 Permission and role checks

`hasAdminPermission` is called in **exactly one place**: `index.js:543`, inside
`requireAdminPermission`. There is no second authorisation path.

### 2.5 API key — four call sites, two meanings

| Line | Use |
|---|---|
| `509` | `requireAdmin` → full `admin` identity, **no DB row** |
| `533` | `isAdminRequest` → boolean "is an admin", used by **public** endpoints |
| `7788`, `7793` | bootstrap gate |

Also `1207` and `1257`: `ADMIN_API_KEY` doubles as the HMAC secret for password-reset and
email-verification OTPs. Unrelated to scope, but it means **rotating the key invalidates
in-flight OTPs** — recorded, out of scope here.

### 2.6 🔴 The `isAdminRequest` widening path

```
index.js:8845   const asAdmin = await isAdminRequest(request);
index.js:8846   sendJson(response, 200, { products: asAdmin ? products : products.map(toPublicProduct) });
index.js:9000   const asAdmin = await isAdminRequest(request);
index.js:9001   sendJson(response, 200, { product: asAdmin ? product : toPublicProduct(product) });
```

`isAdminRequest` returns true for **any** valid admin session, with no role or scope test.
See §1.

### 2.7 A CHECK cannot enforce "approved Seller"

Verified by execution: a `seller_admin` was successfully attached to an **unverified**
business. The FK proves the business *exists*; nothing more.

> A CHECK constraint cannot reference another table, and triggers are excluded by decision.
> **"`business_id` must be an approved Seller" is therefore necessarily application-level
> validation** — which is exactly why the approved decisions require it in addition to the
> CHECK.
>
> `business_profiles.commercial_status` **does not exist yet** (0 columns found). Until M2,
> there is nothing to validate against.

---

## 3. Approved decisions (carried in, not re-litigated)

Seller identity is `commercial_status` (`none`/`pending`/`approved`/`suspended`); an
approved Seller requires `commercial_status='approved'` **and** `is_verified IS TRUE`;
`business_type` is never a commerce permission; `admin_users` serves Seller Admins too;
the API key stays platform-scoped; `admin` and `product_manager` are platform;
`seller_admin` and `readonly_admin` are Seller-scoped and require `business_id`;
`readonly_admin` is read-only; `product_manager` may not approve a Seller; M1b carries a
role CHECK and a scope CHECK; **no trigger**; application validation is required in
addition.

---

## 4. Admin provisioning design

| Role | `business_id` | Scope | May approve a Seller | Notes |
|---|---|---|---|---|
| `admin` | **NULL** (enforced) | platform | ✅ **only this role** | platform administration |
| `product_manager` | **NULL** (enforced) | platform | ❌ | platform product work per the future permission matrix |
| `seller_admin` | **NOT NULL** (enforced) | one Seller | ❌ | must point at an existing business |
| `readonly_admin` | **NOT NULL** (enforced) | one Seller | ❌ | read-only, no mutation of any kind |

### 4.1 May a `seller_admin` be created before the Seller is approved? — **decision required**

The approved decisions say this must be documented and decided. **Recommendation: yes,
allow creation against a `pending` Seller, but the account cannot act commercially.**

| | |
|---|---|
| **Why allow it** | Onboarding has an order: someone must be able to prepare a Seller's catalogue before approval, and forbidding it creates a chicken-and-egg where nobody can set anything up |
| **What constrains it** | The **publication gate** already requires `commercial_status='approved' AND is_verified IS TRUE`, so a pending Seller's admin can draft and configure but **nothing reaches customers** |
| **What is refused** | Attaching to `commercial_status='suspended'` or `'none'`. `pending` and `approved` only |
| **Enforced where** | Application validation at creation, plus the gate at publication. **Not in the CHECK** — it cannot cross tables (§2.7) |

**This is OD-14 and it needs your confirmation**, because the alternative (approval first,
always) is equally defensible and changes the onboarding sequence.

---

## 5. Validation design

Every failure is a **400** unless stated. None reveals another Seller's data.

| # | Condition | Status | Code |
|---|---|---|---|
| V-1 | Unknown role | 400 | `UNKNOWN_ADMIN_ROLE` |
| V-2 | Seller role without `business_id` | 400 | `SELLER_ROLE_REQUIRES_BUSINESS` |
| V-3 | Platform role with `business_id` | 400 | `PLATFORM_ROLE_FORBIDS_BUSINESS` |
| V-4 | `business_id` does not exist | 400 | `BUSINESS_NOT_FOUND` — same code whether it is absent or merely invisible |
| V-5 | `business_id` is not an approved/pending Seller | 409 | `BUSINESS_NOT_SELLER` |
| V-6 | Creating a `seller_admin` via API key | **403** | `API_KEY_CANNOT_CREATE_SELLER_ADMIN` |
| V-7 | `business_id` supplied in a body to change scope | **403** | `SCOPE_NOT_ASSIGNABLE_BY_REQUEST` |
| V-8 | Scope widened via query string | ignored silently for Seller scope; honoured only for platform |
| V-9 | Role change without permission | **403** | `FORBIDDEN` |
| V-10 | `business_id` change without permission | **403** | `FORBIDDEN` |

**V-6 deserves its own line.** The API key is a platform credential with no human behind
it. Letting it mint Seller-scoped accounts would let anyone holding the key create a
foothold inside any Seller. **Seller Admin creation must require a real `admin` session.**

**Layering:** the CHECKs make V-2 and V-3 unrepresentable in the database; application
validation gives them a readable error before the database is reached. V-4, V-5, V-6 are
**application-only** — a CHECK cannot express them.

---

## 6. M1b — proposed migration (not created)

```sql
-- M1b · the role model the Seller scope needs.
--
-- The scope invariant lives in the database rather than only in the application:
-- a Seller-scoped role must have a Seller, and a platform role must not. That
-- makes "a seller_admin with no Seller" unrepresentable rather than merely
-- rejected, which matters because such a row would otherwise be a silent
-- promotion to platform scope.
--
-- What a CHECK cannot do is reach into business_profiles, so "the business must
-- be an approved Seller" stays application-level by necessity, not by choice.

alter table public.admin_users drop constraint admin_users_role_check;

alter table public.admin_users add constraint admin_users_role_check
  check (role in ('admin','product_manager','seller_admin','readonly_admin'));

alter table public.admin_users add constraint admin_users_scope_check
  check ((role in ('admin','product_manager') and business_id is null)
      or (role in ('seller_admin','readonly_admin') and business_id is not null));
```

> **Corrected from the previous document**, which placed `readonly_admin` among the
> platform roles. The approved decisions make it Seller-scoped.

### 6.1 Rehearsed — all nine combinations

Applied to a fresh database with all 39 migrations:

| Combination | Result |
|---|---|
| `admin` + NULL | ✅ accepted |
| `product_manager` + NULL | ✅ accepted |
| `seller_admin` + business | ✅ accepted |
| `readonly_admin` + business | ✅ accepted |
| `admin` + business | ❌ refused — `admin_users_scope_check` |
| `product_manager` + business | ❌ refused — `admin_users_scope_check` |
| `seller_admin` + NULL | ❌ refused — `admin_users_scope_check` |
| `readonly_admin` + NULL | ❌ refused — `admin_users_scope_check` |
| `super_admin` (unknown) | ❌ refused — `admin_users_role_check` |

### 6.2 Properties

| | |
|---|---|
| **Preconditions** | M1 applied · every existing row's role ∈ {`admin`,`product_manager`} · every existing row has `business_id IS NULL` |
| **Postconditions** | both CHECKs present · no row modified · four roles insertable · the four illegal pairs unrepresentable |
| **Backfill** | **none.** Existing roles stay valid and existing `business_id` values are all NULL, which satisfies the platform branch |
| **Any user broken?** | **No** — but see §10 S-3: this is proven for a fresh database, **not for production** |
| **Login impact** | **none** — the CHECK constrains writes, and login only reads and updates `last_login_at` |
| **Session impact** | **none from the migration.** Carrying `business_id` into `request.admin` is a code change, not M1b |
| **Provisioning impact** | **Yes, and it is a hard dependency** — §7 |
| **API key impact** | **none.** It has no `admin_users` row, so no CHECK applies to it. It stays platform-scoped |
| **Reversible** | yes — drop both constraints, restore the original CHECK |
| **Downtime** | none. A CHECK addition validates existing rows once; the table is tiny |

---

## 7. Impact on provisioning — the dependency that must ship together

`provisionAdmin.js:25` validates with `isSupportedAdminRole(role)`, which reads
`rolePermissions` in **`adminPermissions.js`** — the code map, not the database.

That produces two failure modes, in opposite directions:

| If | Then |
|---|---|
| M1b ships **without** updating `adminPermissions.js` | `isSupportedAdminRole('seller_admin')` is false → the CLI refuses. **The new roles are insertable by the database but unreachable through the only tool that creates admins** |
| `adminPermissions.js` ships **without** M1b | the CLI accepts the role, then the INSERT fails on `admin_users_role_check`. **A confusing database error instead of a validation message** |

**Neither is dangerous, both are broken.** M1b and the `adminPermissions.js` role map must
ship in the same release, and `provisionAdmin.js` must additionally learn to accept and
validate `--business-id`. Without that, **no `seller_admin` can be created at all** — the
CLI has no way to supply one, and the scope CHECK will refuse the insert.

---

## 8. Session contract

```
request.admin.id           uuid | "api-key"
request.admin.role         'admin' | 'product_manager' | 'seller_admin' | 'readonly_admin'
request.admin.business_id  uuid | null          ← DB row only
request.admin.scope        'platform' | 'seller'
request.admin.auth_method  'session' | 'api_key'
```

| Question | Answer |
|---|---|
| Loaded from the DB | `id`, `role`, `business_id`, `is_active`, `must_change_password` — requires adding `business_id` to `adminUserSelect` **and** to `serializeAdmin` |
| From the session | only the token; it identifies the row and carries no claims |
| Inactive user | the session query already filters `is_active = true` → no session → **401** |
| Role and `business_id` disagree | **refuse the session, 403**, and log. The CHECK makes it unrepresentable, so its occurrence means the database was edited outside the application |
| `seller_admin` without `business_id` | **403** — never a promotion to platform |
| `readonly_admin` without `business_id` | **403** — same rule |
| Platform role with `business_id` | **403**, and alert |
| API key | `scope='platform'`, `business_id=null`, `auth_method='api_key'` — permanently |

```
API key          → platform scope only
Seller session   → exactly one business
Platform session → platform scope
```

---

## 9. Audit design

`admin_audit_log` is reused — append-only, verified. Every event records **actor
(id, email, role), auth_method, scope, target, previous value, new value, reason,
timestamp**.

| Event | `action_type` | Target | Previous → new |
|---|---|---|---|
| Admin created | `admin.created` | admin id | — → role, scope |
| Role changed | `admin.role_changed` | admin id | old role → new role |
| Scope changed | `admin.business_scope_changed` | admin id | old business → new business |
| Seller admin created | `admin.seller_admin_created` | admin id + business | — → business |
| Seller admin disabled | `admin.disabled` | admin id | active → inactive |
| Seller approval | `business.commercial_approved` | business id | old status → `approved` |
| Seller suspension | `business.commercial_suspended` | business id | `approved` → `suspended`, **reason required** |
| Seller rejection | `business.commercial_rejected` | business id | `pending` → `none`, **reason required** |
| Seller reopening | `business.commercial_reinstated` | business id | `suspended` → `approved`, **reason required** |

**Three required changes:**

1. **`bootstrapAdmin` must write an audit row** (F-4). Creating the first admin is
   currently untraceable.
2. Every audit row should carry the acting `business_id` and `auth_method` in `metadata`
   — today none does.
3. **Never logged:** password hashes, session tokens, the API key, full URLs, customer data.

---

## 10. Stop conditions

| Condition | Status |
|---|---|
| A route creates an admin without validation | ✅ **not triggered** — bootstrap requires the API key and hardcodes `role='admin'`; the CLI validates |
| A way to bypass the role CHECK | ✅ **not triggered** — all three INSERT sites go through the database; no raw path around it |
| A way to change `business_id` without authorization | ✅ **not triggered** — **no code writes `business_id` at all**, and no route changes `role` |
| A session that takes `business_id` from the client | ✅ **not triggered** — `business_id` is not read from any body or query anywhere |
| An API key that gets Seller scope | ✅ **not triggered** — it has no DB row and is hardcoded to `admin` |
| **An existing admin broken by M1b** | ⚠️ **S-3 — UNPROVEN for production.** Verified only on a fresh database, where the roles are `admin`/`product_manager` and `business_id` is NULL everywhere. **No production access** |
| A backfill that cannot be proven | ✅ **not triggered** — no backfill is needed |

> ### 🔴 The real blocker is not in this list
>
> **`isAdminRequest` (§1, §2.6).** M1b is safe in itself, but it makes reachable a path
> where a `seller_admin` reads every Seller's `cost_price`, `commission_rate`,
> `supplier_id` and `business_id` through the **public** product endpoints. **M1b must not
> ship before that is fixed.**

---

## 11. Rollback

```sql
begin;
alter table public.admin_users drop constraint admin_users_scope_check;
alter table public.admin_users drop constraint admin_users_role_check;
alter table public.admin_users add constraint admin_users_role_check
  check (role = any (array['admin','product_manager']));
delete from public.schema_migrations where filename = '<M1b filename>';
commit;
```

> ⚠️ **Rollback is blocked by any `seller_admin` or `readonly_admin` created meanwhile** —
> the restored CHECK would reject those rows and the `ALTER` fails. **Count first:**
>
> ```sql
> select role, count(*) from admin_users
>  where role in ('seller_admin','readonly_admin') group by role;
> ```
>
> If that returns anything, those accounts must be re-roled or deactivated before the
> rollback. In development the count is always zero; **in production it may not be**, and
> that is the whole difference.

The runner is forward-only; reversal is operator SQL, and production code never touches
`schema_migrations`.

---

## 12. Test strategy

| Class | Coverage |
|---|---|
| **Schema** | the nine combinations of §6.1, each asserted by constraint name |
| **Provisioning** | CLI creates each role · refuses unknown roles · refuses a Seller role without `--business-id` · refuses a platform role with one · refuses a non-existent business · refuses a suspended Seller |
| **Validation** | V-1 … V-10, each with its own code and status |
| **API key** | cannot create a `seller_admin` (V-6) · always resolves to platform scope |
| **Session** | `business_id` reaches `request.admin` only from the DB · inactive user → 401 · mismatched role/scope → 403 |
| **Audit** | every event in §9 written with actor, scope, auth method, previous and new values · `bootstrapAdmin` writes one |
| **Leakage** | **`isAdminRequest` does not widen public responses for a Seller-scoped session** |
| **Rollback** | restoring the old CHECK on a database containing a `seller_admin` **fails**, and the failure is the documented signal |
| **Regression** | 355 unit, 32 smoke, pet-facts stay green |

---

## 13. Open decisions

| # | Decision |
|---|---|
| **OD-14** | **May a `seller_admin` be created against a `pending` Seller?** §4.1 recommends yes, constrained by the publication gate. The alternative is approval-first |
| **OD-15** | **Is `isAdminRequest` fixed in the same release as M1b, or does M1b wait?** Recommendation: same release — M1b is what makes the hole reachable |
| **OD-16** | Should `bootstrapAdmin` write an audit row now, as an isolated fix (F-4)? |
| **OD-17** | May a `seller_admin` create another `seller_admin` for its own Seller, or is that `admin`-only? Recommendation: `admin`-only for now |
| **OD-18** | **What roles do production admins actually have?** Unanswerable from here; S-3 depends on it |

---

## 14. Risks

| # | Risk | Severity |
|---|---|---|
| R-1 | **`isAdminRequest` leaks every Seller's internal fields via the public API** once a Seller admin exists | 🔴 **critical** |
| R-2 | M1b without the `adminPermissions.js` update makes the new roles uncreatable; the reverse gives a raw database error | 🔴 high |
| R-3 | `provisionAdmin.js` cannot supply `--business-id`, so **no `seller_admin` can be created** until it is updated | 🔴 high |
| R-4 | Production admin roles unknown (S-3) | 🟠 medium |
| R-5 | Rollback blocked by Seller admins created meanwhile | 🟠 medium |
| R-6 | `bootstrapAdmin` unaudited (F-4) | 🟠 medium |
| R-7 | "Approved Seller" unenforceable in schema; application-only | 🟠 medium — and `commercial_status` does not exist yet |
| R-8 | `ADMIN_API_KEY` doubles as the OTP HMAC secret; rotating it invalidates in-flight OTPs | 🟡 low — unrelated to scope, recorded |

---

## 15. Non-goals

No migration file · no schema change · no production code · no role added · no
`business_profiles` change (M2 is separate) · no Seller onboarding flow · no external
Seller UI · no change to login, session, routes, permissions, cart, checkout, catalogue or
orders · no trigger · no `down` mechanism added to the runner · no legacy repair.
