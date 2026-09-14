# OD-18 — Production Admin Population Validation

# STATUS: `BLOCKED-PROD` — not executed

**requested_at:** `2026-09-14T17:5x:00Z` (UTC, this environment)
**No query was run against production. No count is reported. Nothing was estimated.**
**No migration, no schema change, no production code, no merge, no deploy.**

---

## 1. Why it is blocked, and a second reason nobody has raised yet

**Two independent blockers. Either alone stops this.**

| | Blocker | Fixable by credentials? |
|---|---|---|
| **B-1** | No access path from this environment to the production database | ❌ not from here |
| **B-2** | **Three of the ten requested queries cannot run against production at all** — the column they read does not exist there | ❌ **No. It needs a deploy.** |

> ### B-2 is the finding that matters
>
> **M1 is not deployed.** Production runs `3815fcf1`, whose migration set ends at
> `0039_backfill_pet_weight.sql`. `0040_add_admin_users_business_id.sql` exists **only on
> the work branch**.
>
> So in production `admin_users` **has no `business_id` column**. Queries 4, 5 and 6 —
> `business_id IS NULL`, `IS NOT NULL`, and the `(role, business_id)` combinations —
> would fail with `column "business_id" does not exist`, not return zero.
>
> The requested query set assumes M1 is live. It is not. §6 splits the queries into the
> set that runs on production **today** and the set that must wait.

---

## 2. Environment identity — verified, no secrets

| Field | Value |
|---|---|
| Environment | production |
| Region | `eu-central-1` |
| Config store | AWS SSM, prefix `/mipo/prod` |
| Deploy host | `/opt/mipo` on the deploy host (address withheld; it is in the deploy script) |
| Database | external; `DATABASE_URL` supplied from SSM. The Postgres service in `docker-compose.yml` is `profiles: ["staging"]` and does not run in production |

**Recorded nowhere here:** `DATABASE_URL`, passwords, tokens, cookies, session values,
emails, connection strings. None was available to record.

## 3. Deployed commit and migration state — **verified**

This part of the task *was* completable, from the repository and the Actions API.

| Field | Value | Source |
|---|---|---|
| Deployed commit | **`3815fcf15249099e80da81124ad1f136c0c8207c`** | `git ls-remote origin refs/heads/aws-migration` |
| Last successful deploy | run **53**, `conclusion: success`, `2026-09-14T16:47:14Z` | Actions API |
| **Migration files in the deployed commit** | **38** | `git ls-tree` on that commit |
| Highest deployed migration | `0039_backfill_pet_weight.sql` | same |
| `0040_add_admin_users_business_id.sql` deployed? | **NO** | same |
| `seller_admin` / `readonly_admin` in deployed `adminPermissions.js` | **0 occurrences** | `git show 3815fcf1:server/src/adminPermissions.js` |

> **This is the file set, not the applied set.** How many rows `schema_migrations` actually
> holds in production is **UNKNOWN** — reading it needs database access. The deploy applies
> migrations on every release and run 53 succeeded, so 38 applied is the expectation, not a
> measurement.

## 4. Access verification — nine routes, all closed

| # | Route | Result |
|---|---|---|
| 1 | `DATABASE_URL` in environment | absent |
| 2 | `.env` file | absent (only `.env.example`) |
| 3 | AWS credentials | **placeholders** — literally `proxy-injected` |
| 4 | AWS CLI | not installed |
| 5 | SSH key | `~/.ssh` empty |
| 6 | Outbound TCP/5432 | blocked |
| 7 | Deploy host `:22` | unreachable |
| 8 | HTTPS to `mipo.pet` | **HTTP 000** — egress proxy denies CONNECT |
| 9 | Am I on the production host? | **No** — `hostname=vm`, `/opt/mipo` absent |

## 5. Results — all NOT RUN

| # | Question | Result |
|---|---|---|
| 1 | Row count in `admin_users` | **NOT RUN** |
| 2 | `role` distribution | **NOT RUN** |
| 3 | Roles outside the four known | **NOT RUN** |
| 4 | Rows with `business_id IS NULL` | **NOT RUN — and not runnable today (B-2)** |
| 5 | Rows with `business_id IS NOT NULL` | **NOT RUN — not runnable today (B-2)** |
| 6 | `(role, business_id)` combinations | **NOT RUN — not runnable today (B-2)** |
| 7 | Active admin sessions exist? | **NOT RUN** |
| 8 | Role distribution among active sessions | **NOT RUN** |
| 9 | Any future role already entered manually | **NOT RUN** |
| 10 | Businesses operationally identifiable as Sellers | **NOT RUN** |

**No substitute figure from any other source appears in this document.** Nothing measured
against a local scratch database is presented as a production number.

---

## 6. The queries, split by what production can answer today

Read-only throughout: wrapped in a read-only transaction, aggregates only, no emails, no
tokens, no session values, no `id` unless needed.

### 6.1 Runnable on production **now** (queries 1, 2, 3, 7, 8, 9, 10)

```sql
BEGIN;
SET TRANSACTION READ ONLY;

-- 1 · population
select 'Q1 admin_users total' as q, count(*) from admin_users;

-- 2 + 3 · role distribution, and anything outside the four known roles
select 'Q2 role distribution' as q, role, count(*)
  from admin_users group by role order by role;

select 'Q3 unknown roles' as q, role, count(*)
  from admin_users
 where role not in ('admin','product_manager','seller_admin','readonly_admin')
 group by role;

-- 9 · a future role already entered by hand
select 'Q9 future roles present' as q, role, count(*)
  from admin_users
 where role in ('seller_admin','readonly_admin')
 group by role;

-- 7 + 8 · active sessions, and the roles behind them
select 'Q7 active sessions' as q, count(*)
  from admin_sessions where expires_at > now();

select 'Q8 sessions by role' as q, au.role, count(*)
  from admin_sessions s
  join admin_users au on au.id = s.admin_user_id
 where s.expires_at > now()
 group by au.role order by au.role;

-- 10 · businesses that look operationally like Sellers.
--     Counts only. business_type is NOT a commerce permission - it is shown
--     here to size the population, never to confer anything.
select 'Q10 businesses' as q,
       count(*) as total,
       count(*) filter (where is_verified is true)  as verified_true,
       count(*) filter (where is_verified is false) as verified_false,
       count(*) filter (where is_verified is null)  as verified_null
  from business_profiles;

select 'Q10b by type' as q, business_type, count(*),
       count(*) filter (where is_verified is true) as verified
  from business_profiles group by business_type order by business_type;

-- Which businesses have actually sold anything - the only operational signal
-- that exists today. Counts only, no names.
select 'Q10c businesses with catalogue rows' as q,
       count(distinct business_id) from business_products;

ROLLBACK;
```

### 6.2 Requires M1 deployed first (queries 4, 5, 6)

**Do not run these until `0040` is applied in production — they will error, not return zero.**

```sql
BEGIN;
SET TRANSACTION READ ONLY;

select 'Q4/Q5 scope split' as q,
       count(*) filter (where business_id is null)     as business_id_null,
       count(*) filter (where business_id is not null) as business_id_not_null
  from admin_users;

select 'Q6 role x scope' as q, role,
       (business_id is null) as business_id_is_null, count(*)
  from admin_users group by role, (business_id is null) order by role;

-- The M1b acceptance test, expressed as data: any row that the proposed
-- scope CHECK would reject.
select 'Q6b rows M1b would reject' as q, count(*)
  from admin_users
 where not ((role in ('admin','product_manager') and business_id is null)
         or (role in ('seller_admin','readonly_admin') and business_id is not null));

ROLLBACK;
```

### 6.3 What unblocks this

Any **one** of these:

1. **An operator runs §6.1 and pastes the output back** — needs no new access, and is the
   fastest path. The credential never leaves the host.
2. A read-only `DATABASE_URL` reachable from this environment (needs TCP/5432 egress,
   currently blocked).
3. SSH to the deploy host with the deploy key.
4. Real AWS credentials plus an AWS CLI and network reachability.

> ⚠️ **Do not send `DATABASE_URL`, a token, a cookie or `.env` to the conversation.**
> Option 1 avoids the question entirely: only aggregate counts come back.

---

## 7. Can M1b enter without a backfill?

**`UNKNOWN` — and it cannot be answered from here.** M1b's safety rests on one property:

> every existing `admin_users` row satisfies
> `(role in ('admin','product_manager') and business_id is null)`

| Half | Status |
|---|---|
| `business_id is null` for every row | ✅ **Guaranteed, not assumed** — the column does not exist in production, so after M1 every row is NULL by construction. No backfill possible or needed |
| `role in ('admin','product_manager')` | ⚠️ **UNKNOWN.** The database CHECK has enforced exactly that pair since `0016`, so a violating row would have to predate the constraint or have been inserted with it disabled. Q2 and Q3 settle it in one query |

**So the honest answer is:** M1b is *almost certainly* safe with no backfill, and the one
remaining doubt is cheap to remove. **Do not approve M1b on "almost certainly".** Run Q2
and Q3.

## 8. Is an exception or an extra migration needed?

**Unknown until §6.1 runs.** Three outcomes:

| If Q3 returns | Then |
|---|---|
| zero rows | M1b enters as designed. **No exception, no extra migration** |
| rows with a legacy role | those rows must be re-roled **before** M1b, as a separate documented data change — and a data change needs its own approval |
| rows with `seller_admin`/`readonly_admin` already present | **stop.** Someone inserted a future role manually, which the current CHECK should have prevented. That means the constraint was dropped at some point, and the environment's history is not what is assumed |

**One ordering point regardless of the answer:** M1 must be deployed before M1b, and
M1b must ship together with the `adminPermissions.js` role map and the
`provisionAdmin.js` `--business-id` support. Shipping M1b alone leaves the new roles
insertable by the database but uncreatable by the only tool that creates admins.

---

## 9. Stop conditions

| Condition | Status |
|---|---|
| Unknown roles found | **NOT ASSESSED** — query not run |
| Admin users with an invalid role | **NOT ASSESSED** |
| Unexplained `business_id` assignments | **NOT ASSESSABLE** — the column does not exist in production |
| Sessions that M1b would break | **NOT ASSESSED.** Note: M1b constrains *writes*; sessions only read and update `last_login_at`, so no session should break — but that is reasoning, not measurement |
| **No certainty the check ran against real production** | 🔴 **TRIGGERED — and it is why this report is `BLOCKED` rather than partial.** No query was run, so no result could be attributed to production even mistakenly |

---

## 10. Confirmation

| | |
|---|---|
| Production queried | ❌ **No** — never contacted |
| Data changed | ❌ **No** |
| Migration created | ❌ **No** — still 39 files on the branch, 38 deployed |
| Schema changed | ❌ **No** |
| Production code changed | ❌ **No** |
| Merge | ❌ **No** — `aws-migration` remains `3815fcf1` |
| Deploy | ❌ **No** |

**Next step:** have an operator run §6.1 and return the output. Until Q2 and Q3 come back,
**OD-18 is unanswered and M1b should not be approved.**
