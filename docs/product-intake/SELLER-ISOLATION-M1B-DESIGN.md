# Seller Isolation and M1b — Design

**Date:** 2026-09-14 · **Branch:** `claude/mifo-project-oq44tl` · Base: M1 at `8082757c`
**Planning and verification only. No migration file, no production code, no schema change,
no merge, no deploy, no production execution.**

---

## 1. Executive summary

Every fact below was read from the code or the schema. Nothing was taken from an earlier
document without re-checking.

**The good news is structural.** Seller isolation can be added at one chokepoint:
permissions are checked in **exactly one function**, and `request.admin` is built in
**exactly two places**. There is no scattered authorisation logic to hunt down.

**The bad news is that three stop conditions are triggered** (§2.9). None is a surprise —
they are precisely what this design exists to fix — but they are reported as triggered
rather than softened:

| | Stop condition | Status |
|---|---|---|
| 3 | A route returns another Seller's information | 🔴 **TRIGGERED** — every admin route does, because no scoping exists at all |
| 5 | Platform admin cannot be distinguished from Seller admin | 🔴 **TRIGGERED** — both existing roles are platform roles; `seller_admin` cannot be inserted |
| 6 | No way to define an approved Seller without guessing | 🔴 **TRIGGERED** — neither `is_verified` nor `business_type` proves it |

**Recommendation, single and unambiguous:** M1b should add a **role CHECK replacement plus
a `(role, business_id)` scope CHECK**, and nothing else. Both were rehearsed on a scratch
database: no existing row breaks, and the scope check refuses a `seller_admin` without a
Seller *and* a platform role with one (§10).

**Seller identity (§5): add `business_profiles.commercial_status`.** It is the only option
that answers all eight required questions, and it deliberately does not conflate "we
verified this business exists" with "this business may sell".

---

## 2. Verified facts

### 2.1 Roles — two, and they agree in code and database

`server/src/adminPermissions.js`:

```js
ADMIN_ROLES = { ADMIN: "admin", PRODUCT_MANAGER: "product_manager" }
rolePermissions = { admin: ["*"], product_manager: [5 product permissions] }
```

Eight permission constants exist. `PRODUCTS_OWNERSHIP_REVIEW` is **deliberately absent**
from `product_manager` (added by G-6: editing a price must not confer deciding ownership).

Database: `admin_users_role_check CHECK (role = ANY (ARRAY['admin','product_manager']))` —
the same pair, enforced.

### 2.2 Permission checks — **one place**

```
server/src/index.js:543   if (!hasAdminPermission(request.admin.role, permission))
```

That is the **only** call to `hasAdminPermission` in the server. Every guarded route reaches
it through `requireAdminPermission`. **There is no second authorisation path.**

### 2.3 `request.admin` — built in exactly two branches

Both inside `requireAdmin`:

| Branch | `id` | `role` | DB row |
|---|---|---|---|
| `x-admin-api-key` (`index.js:513`) | `"api-key"` | `ADMIN_ROLES.ADMIN` | **none** |
| Session cookie | real uuid | from the row | yes |

`serializeAdmin` returns `id, email, display_name, role, permissions,
must_change_password, created_at, last_login_at`. **No `business_id`, no `scope`, no
`auth_method`.**

### 2.4 Session source

One: `admin_sessions` joined to `admin_users` on `admin_user_id`, keyed by a hashed cookie
token, filtered on `expires_at > now()` and `is_active = true`. The join selects the shared
explicit column list `adminUserSelect` (`index.js:333`) — **no `SELECT *` against
`admin_users` anywhere.**

### 2.5 `x-admin-api-key`

Compared with `secretsEqual` (constant-time). Used in two places: `requireAdmin` and
`/api/admin/bootstrap`. Yields full `admin` role with no database row.

### 2.6 Admin routes — 30 sites, all correctly guarded

26 call `requireAdmin`/`requireAdminPermission` immediately. The four that do not are
pre-authentication by design, and each was read and verified:

| Route | Protection |
|---|---|
| `POST /api/admin/bootstrap` | requires `x-admin-api-key` via `secretsEqual`; 503 if unconfigured |
| `POST /api/admin/login` | rate-limited; must be unauthenticated |
| `POST /api/admin/logout` | logout |
| `GET /api/admin/me` | resolves the session itself, 401 if absent |

> **Stop condition 1 is NOT triggered.** No route bypasses the permission mechanism.

### 2.7 Ownership checks — **zero**

A repository-wide search for any ownership predicate found **no route that checks
`business_id` against the caller**. The only textual matches are comments in
`legacyExposureMeasurement.js` explaining that ownership is *not* inferred.

### 2.8 `body.business_id` and `defaultBusinessId`

**One** read of `body.business_id` exists — `index.js:4649`, inside `createProduct`:

```js
4644  assertLegacyProductCreationDisabled();   // Stage 0, unconditional
...
4649  const businessId = body.business_id || await ensureDefaultBusinessProfile();
```

Line 4649 is **unreachable**. And even when it was reachable it assigned *ownership*, never
authorisation.

> **Stop conditions 2 and 4 are NOT triggered.** `business_id` from a body was never used
> for an authorisation decision, and the `defaultBusinessId` ownership fallback is dead.

### 2.9 Stop conditions triggered

| # | Condition | Evidence |
|---|---|---|
| **3** | 🔴 A route returns another Seller's data | **Every** admin product route does. There is no scoping (§2.7), and `request.admin` has no Seller (§2.3). Any admin reads, edits and deletes every product |
| **5** | 🔴 Platform vs Seller admin indistinguishable | Only `admin` and `product_manager` exist, both platform. The DB CHECK refuses `seller_admin` |
| **6** | 🔴 Approved Seller undefinable without guessing | `is_verified` is **nullable** (three-valued); `business_type` is a category — `vet`, `groomer`, `shop` are structurally identical rows |

**Stop condition 7 is NOT triggered:** M1b needs no data change — verified in §10.

### 2.10 Audit

12 `recordAdminAudit` call sites, 12 distinct action types. `admin_audit_log` is
append-only (3 INSERT sites, zero UPDATE, zero DELETE, verified repository-wide).
**No audit row records an acting Seller scope** — `actor_admin_user_id`, `actor_email`,
`actor_role` only.

### 2.11 Frontend

8 admin screens use the admin API. **None filters by `business_id`**; every one assumes
platform-wide reach. The only `business_id` references pass it through on product
duplication (`ProductBulkActions.tsx:184-188`) — now dead, since creation returns 410.

---

## 3. What M1 solves, and what it does not

| | |
|---|---|
| **Solves** | The admin identity can *hold* a Seller. The FK guarantees the Seller is real; `ON DELETE RESTRICT` stops an unrelated deletion silently promoting a Seller admin to platform scope |
| **Does not solve** | Nothing reads the column. No role can use it. No route is scoped. No session exposes it. No audit records it |

**M1 is capacity, not capability.** Isolation begins working only after M1b **and** the
Stage 1A route work.

---

## 4. Role matrix

**Planned. No role is added by this document.**

| Capability | `admin` | `product_manager` | `seller_admin` | `readonly_admin` |
|---|:--:|:--:|:--:|:--:|
| `business_id` | **NULL** | **NULL** | **NOT NULL** | **NULL** |
| Scope | platform | platform | **one Seller** | platform |
| View products | ✅ all | ✅ all | ✅ own | ✅ all |
| Create Draft | ✅ | ✅ | ✅ own | ❌ |
| Edit product | ✅ | ✅ | ✅ own | ❌ |
| Manage variants | ✅ | ✅ | ✅ own | ❌ |
| Manage images | ✅ | ✅ | ✅ own (upload) | ❌ |
| **Approve images** | ✅ | ✅ | ❌ | ❌ |
| Manage inventory | ✅ | ✅ | ✅ own | ❌ |
| **Review (approve/reject drafts)** | ✅ | ✅ | ❌ | ❌ |
| Publish | ✅ | ✅ | ✅ own, gate permitting | ❌ |
| View orders | ✅ all | ✅ all | ✅ own Seller's lines | ✅ all |
| View customers | ✅ | ✅ | ❌ **never** | ✅ |
| Financial actions | ✅ | ❌ | ❌ | ❌ |
| **Approve a Seller** | ✅ | ❌ | ❌ | ❌ |
| **Change ownership** | ✅ | ❌ | ❌ | ❌ |
| General admin | ✅ | ❌ | ❌ | ❌ |

**Three deliberate exclusions:**

* A `seller_admin` **never sees customers.** A Seller needs order lines to fulfil, not a
  customer list.
* A `seller_admin` cannot **review or approve images** — approving one's own content is not
  review.
* `readonly_admin` has **no mutation of any kind**, including publish.

---

## 5. Seller identity — recommendation

| Option | Verdict |
|---|---|
| 1 · `is_seller boolean` | Rejected — binary, no suspension, no history |
| 2 · **`commercial_status` enum** | ✅ **Recommended** |
| 3 · separate `sellers` table | Rejected for now — a 1:1 table adds a join and a lifecycle with no capability the column lacks. Revisit if Seller-specific commercial fields accumulate |
| 4 · `business_type` | **Rejected, and dangerous** — a category, not a status. `business_type='shop'` granting commerce is exactly the accident to prevent |
| 5 · `is_verified` | **Rejected as sufficient** — it means "a human confirmed this business exists". Nullable, so three-valued |

### Recommendation: `business_profiles.commercial_status`

```
commercial_status  text  NOT NULL  DEFAULT 'none'
    CHECK (commercial_status IN ('none','pending','approved','suspended'))
+ commercial_status_changed_at, commercial_status_changed_by, commercial_status_note
```

| Required question | Answer |
|---|---|
| Can a Seller be a shop, vet or groomer? | **Yes.** `commercial_status` is independent of `business_type`; a vet that sells food is approved the same way |
| Can Mipo Shop be a Seller? | **Yes** — an ordinary `business_profiles` row with `commercial_status='approved'`. No special case, no `defaultBusinessId` |
| Can a Seller be suspended? | **Yes** — `suspended`. Publication and checkout refuse it; existing orders are untouched |
| Can it return to approved? | **Yes** — `suspended → approved`, audited. The transition is reversible; the record of it is not |
| Who may approve a Seller? | **`admin` only.** Not `product_manager` — approving a commercial partner is not product work |
| Does approval require audit? | **Yes**, mandatory, with actor and note |
| Is `is_verified IS TRUE` a separate condition? | **Yes — both are required.** They mean different things: identity verified, and commerce authorised. Written `IS TRUE` because the column is nullable |
| How is accidental commerce from `business_type` prevented? | **`business_type` is never consulted** in any commercial predicate. The gate reads `commercial_status = 'approved' AND is_verified IS TRUE` and nothing else |

---

## 6. Session contract

**Design only — not implemented.**

```
request.admin.id           uuid | "api-key"
request.admin.role         'admin' | 'product_manager' | 'seller_admin' | 'readonly_admin'
request.admin.business_id  uuid | null      ← from the DB row ONLY
request.admin.scope        'platform' | 'seller'
request.admin.auth_method  'session' | 'api_key'
```

**Resolution rules:**

| Question | Rule |
|---|---|
| How is `business_id` resolved? | Selected from `admin_users` in the session query. It must be added to `adminUserSelect` and to `serializeAdmin` |
| Only from DB/session? | **Yes, always.** |
| May it come from a request body? | **Never for authorisation.** If a body supplies one, it must equal the session's or the request is refused **400** |
| API key? | `scope='platform'`, `business_id=null`, `auth_method='api_key'` — **permanently (OQ-4)** |
| Admin with no DB row? | Only the API key. Platform scope |
| Seller role with no `business_id`? | **Refuse 403.** A misconfiguration, never a promotion to platform. The M1b CHECK makes it unrepresentable |
| Platform role *with* a `business_id`? | **Refuse 403**, and alert. Also blocked by the CHECK |
| Invalid session? | **401**, no body detail |

```
API key         → platform scope only
Seller session  → exactly one business
Platform session→ platform scope
```

---

## 7. IDOR and ownership contract

**One rule, applied identically everywhere:**

```
scope = platform  → subject to permissions, may reach any Seller
scope = seller    → may reach only rows whose business_id = session business_id
```

| Rule | |
|---|---|
| Source of truth | **session only.** Never body, never query string, never header |
| Where enforced | **inside the transaction**, after the row lock, on writes — not only at the route |
| Cross-Seller access | **404, never 403.** A 403 confirms the row exists |
| Leakage | no existence, name, status, count or timestamp of another Seller's entity in any response or error |
| Listing endpoints | scoped by a `WHERE` the server adds; a `business_id` filter parameter is honoured only for platform scope and **ignored** for Seller scope |

**Proposed service, design level only:**

```
resolveScope(request.admin) → { scope, businessId }
assertCanAccess(entity, scope)  → throws NotFound (404) on mismatch, never Forbidden
scopedWhere(scope, column)      → SQL fragment + params, empty for platform scope
```

Every new route calls `assertCanAccess` **inside** its transaction. A route that forgets is
the failure mode, so the test plan (§13) asserts scoping per route rather than per helper.

---

## 8. M1b — proposed migration (not created)

**Minimum to enable the approved role model. Nothing else.**

```sql
-- M1b · the role model the Seller scope needs.
alter table public.admin_users drop constraint admin_users_role_check;

alter table public.admin_users add constraint admin_users_role_check
  check (role in ('admin','product_manager','seller_admin','readonly_admin'));

-- The scope invariant, in the database rather than only in the application:
-- a Seller admin must have a Seller, and a platform role must not.
alter table public.admin_users add constraint admin_users_scope_check
  check ((role in ('admin','product_manager','readonly_admin') and business_id is null)
      or (role = 'seller_admin' and business_id is not null));
```

| Question | Answer, verified |
|---|---|
| Which roles become insertable? | `seller_admin`, `readonly_admin` |
| Backfill needed? | **No.** Existing roles remain valid |
| Any user broken? | **No** — verified: 0 rows fall outside the new set |
| Unique constraint needed? | **No.** Several admins may share one Seller; `email` is already unique |
| `(role, business_id)` constraint needed? | **Yes — recommended**, and it works: rehearsed, it refused a `seller_admin` without a Seller *and* a `product_manager` with one |
| Trigger needed? | **No.** A CHECK is sufficient and cheaper. This answers OQ-3: enforce in the database |
| Admin creation flow change? | **Yes** — `provisionAdmin.js` and `bootstrapAdmin` must accept and validate a role plus optional `business_id`. **Not part of M1b** |
| Session hydration change? | **Yes** — `adminUserSelect` and `serializeAdmin` must carry `business_id`. **Not part of M1b** |

> **Scope warning.** M1b is *schema only*. Adding the CHECK does not make isolation work;
> it makes the model representable. The route work is Stage 1A.

---

## 9. Migration order

| # | Migration | Depends on | Risk | Touches existing data | Rollback | Needs production validation |
|---|---|---|---|---|---|---|
| **M1** ✅ | `admin_users.business_id` | — | low | **no** | drop column (documented) | no |
| **M1b** | role + scope CHECK | M1 | **medium** — a wrong CHECK blocks admin creation | **no** rows changed; constraint only | restore the old CHECK | **yes — confirm no production admin has an unexpected role** |
| **M2** | Seller identity (`commercial_status`) | — | low | adds a column defaulting to `'none'` | drop columns | **yes — decide which businesses start approved** |
| **M3** | Catalog foundation (`raw_import_records`, `product_drafts`, `catalog_products`) | M1b | low | no | drop tables | no |
| **M4** | `product_variants` | M3 | low | no | drop table | no |
| **M5** | `seller_offers` | M4, M2 | low | no | drop table | no |
| **M6** | `inventory` | M5 | low | no | drop table | no |
| **M7** | `product_media` | M3, M4 | low | no | drop table | no |
| **M8** | Publication gate support | M3–M7 | low | no | drop columns | no |
| **M9** | Cart/checkout compatibility | M5, M6 | **medium** — touches the purchase path | no schema change to orders | code revert | **yes** |
| **M10** | `order_items` snapshots | M9 | **medium** | adds nullable columns, **no FK**; historical rows keep NULLs | drop columns | **yes** |

**Two need a production answer before they are written:** M1b (existing admin roles) and
M2 (which businesses begin as approved Sellers). Both are questions no query in this
environment can answer.

---

## 10. Rollback strategy

**The runner is forward-only** — no `down` mechanism exists, and none is being added.
Reversal is a new forward migration or operator SQL, plus deleting the `schema_migrations`
row. Production code never touches that table.

| Migration | Rollback | Data at risk |
|---|---|---|
| M1 | drop index, drop column, delete the migration row | `business_id` assignments made after M1 |
| **M1b** | drop both constraints, restore the original CHECK | **Any `seller_admin` or `readonly_admin` row created meanwhile violates the restored CHECK and blocks the rollback.** They must be re-roled or removed first — the same "count before you drop" step as M1 |
| M2 | drop the columns | approval decisions — **the ones with no other record.** Audit rows survive, so the history can be reconstructed |
| M3–M8 | drop tables | all intake data; nothing public reads it before Stage 3 |
| M9–M10 | revert code; drop nullable columns | nothing — snapshots with no FK |

**Rehearsed on a scratch database:** M1b applied cleanly with 0 rows outside the new role
set, and the scope CHECK refused both invalid combinations.

---

## 11. Test strategy

| Class | Coverage |
|---|---|
| **Schema** | both CHECKs enforced by the database · every legal `(role, business_id)` pair accepted · every illegal pair refused |
| **Session** | `business_id` reaches `request.admin` only from the DB · API key is always platform · invalid session → 401 · seller role without a Seller → 403 |
| **Permissions** | 4 roles × every route · `readonly_admin` cannot mutate anything · `seller_admin` cannot review, approve images, see customers, or approve a Seller |
| **Isolation** | Seller A cannot read, edit, publish, archive or offer against any entity of Seller B |
| **IDOR** | every `:id` route with another Seller's id → **404, not 403** · body/query `business_id` cannot override the session · error bodies leak no name, status or existence |
| **Concurrency** | ownership re-checked inside the transaction; a scope change mid-request cannot be exploited |
| **Audit** | every scoped mutation records the acting Seller |
| **Regression** | the existing 355 unit tests, 32 smoke checks and pet-facts must stay green |

---

## 12. Admin UI impact

| Screen | Change |
|---|---|
| All 8 admin screens | currently assume platform reach. Under a Seller session the server returns only that Seller's rows — **no frontend filter is to be added**; the server is the boundary |
| `AdminProducts` list | gains a Seller column for platform roles; hidden for Seller scope |
| Login / `GET /api/admin/me` | must surface `scope` and `business_id` so the UI can present the right context |
| Review queue | platform-only; invisible to a Seller |
| Seller approval | `admin`-only, and **does not exist yet** |
| `ProductBulkActions` duplicate | already dead (410) |

**No external Seller UI is opened.**

---

## 13. Open decisions

| # | Decision |
|---|---|
| **OD-8** | Approve `commercial_status` as the Seller identity mechanism (§5)? |
| **OD-9** | Approve M1b as scoped — role CHECK **plus** scope CHECK — or role CHECK alone? |
| **OD-10** | **Which existing businesses start as `approved`?** No query here can answer it; it is a business decision and it blocks M2 |
| **OD-11** | Does `readonly_admin` see customers and financial data, or only catalogue? Matrix §4 assumes platform-wide read including orders |
| **OD-12** | Do `seller_admin` users authenticate through the same `admin_users` table and login route, or a separate surface later? |
| **OD-13** | Is `product_manager` allowed to approve a Seller? §5 says **no**; confirm |

---

## 14. Risks

| # | Risk | Severity |
|---|---|---|
| R-1 | **No isolation exists today.** Any admin reaches every Seller's data | 🔴 critical |
| R-2 | M1b's scope CHECK could block admin creation if `provisionAdmin` is not updated in the same release | 🔴 high |
| R-3 | A new route that forgets `assertCanAccess` silently leaks | 🔴 high — per-route tests, not per-helper |
| R-4 | `is_verified` is nullable; a check written `= true` or `NOT is_verified` silently drops NULL rows | 🟠 medium |
| R-5 | Rolling back M1b is blocked by any Seller admin created meanwhile | 🟠 medium |
| R-6 | The API key bypasses scoping permanently by design | 🟠 medium — must be explicit in tests |
| R-7 | Production admin roles are **UNKNOWN** — no production access | 🟠 medium |

---

## 15. Explicit non-goals

No role is added · no migration file created · no schema changed · no production code
touched · `business_profiles` unchanged · no external Seller UI · no Seller onboarding
flow · no change to login, session, routes, permissions, cart, checkout, catalogue, orders
or products · no legacy repair · no `defaultBusinessId` revival · no `down` mechanism added
to the runner.
