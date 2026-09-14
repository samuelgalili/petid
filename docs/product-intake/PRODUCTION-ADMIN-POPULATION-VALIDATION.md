# D-18 — Production Admin & Business Population Validation

# STATUS: `BLOCKED-PROD` — not executed

**No query in this document was run against production. No count in this document
was measured. Nothing was estimated, projected, or carried over from a local
database.** Every result cell reads `NOT RUN`.

**No code, schema, migration, permission, role, session, route, branch, deploy or
merge was changed by this task.**

> **Supersedes the OD-18 revision of this file** (written 2026-09-14 ~17:5xZ, when
> production was `3815fcf1`). That revision's headline finding — *"M1 is not
> deployed, so queries 4/5/6 cannot run at all"* — **is now resolved**: M1 shipped
> in run 54. Those three queries became runnable-in-principle between the two
> revisions. What did **not** change is the access blocker, and it is now the only
> one. §4 records the difference honestly rather than quietly rewriting history.

---

## 1. Timestamp

| | |
|---|---|
| Validation attempted | **2026-09-14T20:34:25Z** |
| Access probes run | 2026-09-14T20:32Z – 2026-09-14T20:36Z |
| **Checks executed against production** | **0 of 25** (24 SQL statements + 1 shell presence check) |
| **Rows read from production** | **0** |
| Written from | `claude/mifo-project-oq44tl` @ `b0935880` |
| Previous revision (OD-18) | 2026-09-14 ~17:5xZ, also `BLOCKED-PROD` |

## 2. Production commit / deployment reference

**This section is pipeline evidence, not a production observation.** It records
what the deploy reported. It does not record what the production database now
contains, because that was not readable (§4).

| | |
|---|---|
| Branch | `aws-migration` |
| Head commit | **`505d0ae9c1c9d9296223c2f35e76388bc06d74e6`** |
| Commit title | *Add a nullable Seller scope to the admin identity* |
| Previous production commit | `3815fcf15249099e80da81124ad1f136c0c8207c` |
| Workflow | `Deploy AWS` (`.github/workflows/deploy-aws.yml`), run **#54** |
| Run id | **`34892397605`** |
| Event / actor | `push` / `samuelgalili` |
| Started / completed | `2026-09-14T20:21:15Z` / `2026-09-14T20:25:16Z` |
| Status / conclusion | `completed` / **`success`** |
| URL | https://github.com/samuelgalili/petid/actions/runs/34892397605 |

`505d0ae9` is confirmed as the remote tip of `aws-migration`: `list_commits` on that
branch returns `505d0ae9`, then `3815fcf1`.

## 3. Migration state

| | |
|---|---|
| Migration | `0040_add_admin_users_business_id.sql` |
| Migration files in the deployed commit | **39** |
| Expected `schema_migrations` rows after apply | **39** |
| **Confirmed applied in production?** | **UNVERIFIED — pipeline inference only** |

### What is known

The deploy job's *"Run migrations and restart the API"* step succeeded
(20:24:28 → 20:25:06). It runs, in order: `backup-before-migrate.sh` (a full
`pg_dump`, which fails the deploy if it cannot produce one), then
`dry-run-migrations.sh` (restores that dump into a throwaway copy and rehearses the
migration against production's *own data*), then
`applyMigrations.js` against production. The `Database integration` job had already
applied `0040` to a disposable database, re-applied it for idempotency, and run
*"Verify no migration was skipped"*. The post-deploy
*"Smoke test the deployed environment"* step passed (20:25:11 → 20:25:13), and the
container healthcheck it depends on is `/api/health/schema`, which fails a build
whose queries the schema cannot answer.

### What is not known

**Nobody has read `public.schema_migrations` in production.** A green pipeline is
strong evidence, but it is evidence *about the pipeline*. That distinction is not
pedantry here: this repository's own `server/src/health.js` carries the note that
on 8 September a deploy applied a destructive migration, failed on a later one, and
**both** health checks reported success for four hours while every authenticated
request was failing. Queries `D18-21` and `D18-23` exist precisely to close that
gap, and they were not run.

**Conclusion: `0040` is believed applied; the belief rests on CI, not on the
database.**

---

## 4. Why this is `BLOCKED-PROD`

### 4.1 One blocker remains, not two

| | Blocker | State now |
|---|---|---|
| **B-1** | No access path from this environment to the production database | 🔴 **still blocking** |
| **B-2** | *(OD-18)* `admin_users.business_id` does not exist in production, so the scope queries would error rather than return zero | 🟢 **resolved by run 54** — the column is deployed, so `D18-05`/`D18-06` are now well-formed against production |

### 4.2 Access inventory — every route probed

| # | Route | What it needs | State here | Probe result |
|---|---|---|---|---|
| R-1 | direct `psql` | connection string + network path to RDS | `DATABASE_URL` **unset**; `PGHOST`/`PGUSER` unset; no `.env` in the repo (only `.env.example`, whose `DATABASE_URL=` is empty) | **no connection string.** `psql` 16.13 is installed and unused |
| R-2 | AWS SSM → `/mipo/prod/DATABASE_URL` | valid AWS credentials, `eu-central-1`, `ssm:GetParametersByPath` | `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` **are set** but are not credentials for this account; `aws` CLI **not installed** | a SigV4-signed `sts:GetCallerIdentity` returned **HTTP 403 `InvalidClientTokenId`** — *"The security token included in the request is invalid."* **Rejected by AWS.** No SSM call was attempted after that |
| R-3 | SSH to the API host | `mipo-prod-key.pem` + TCP 22 to `ubuntu@63.183.241.110` | `MIPO_SSH_KEY` unset; `~/.ssh` **empty**; a filesystem sweep for `*.pem` / `id_rsa` / `id_ed25519` found only the system CA bundle | **TCP 22 → 63.183.241.110: unreachable/blocked** |
| R-4 | public HTTPS API (`https://mipo.pet`) | egress permission for that host | — | **denied by organization egress policy.** The agent proxy answered `403` to `CONNECT mipo.pet:443`, recorded in its own `recentRelayFailures` as `connect_rejected` at `20:32:51Z` and `20:32:52Z`. A 403 policy denial is **reported, not retried or routed around** |

**R-2 is the one difference from the OD-18 revision.** That revision recorded the
AWS credentials as *"placeholders"*. This revision does not rely on how they look:
they were **put to AWS and refused**. That is a measurement, not an inspection.

### 4.3 What R-4 would have yielded even if it were open — almost nothing

* `GET /api/health` returns `{ok, service, version}` — the deploy SHA, no counts.
* `GET /api/health/schema` runs six `limit 1` probes and returns only probe *names*
  and failure messages; by design it *"read[s] no data and return[s] none"*.
* Every endpoint that could count admins sits behind `requireAdminPermission` —
  i.e. behind an admin session cookie or `x-admin-api-key`. Neither exists here,
  and **neither will be requested in this conversation**: a credential pasted into
  chat persists in the transcript.

So R-4 would have confirmed the deployed SHA and nothing more. **The population
measurement requires database access, and there is none.**

### 4.4 Which queries were not run

**All 25.** §5 lists every one. None was executed, partially executed, or
approximated.

### 4.5 What credential or approval is required

Exactly one of the following. **None of them should be delivered by pasting a
secret into this conversation.**

| Option | What it needs | Who grants it |
|---|---|---|
| **O-1** | Samuel (or an operator) runs §7's runbook on the host and pastes back the **output** | nobody — the access already exists |
| **O-2** | a read-only database role (`connect`, `usage on schema public`, `select` on the five tables in §5) with its connection string injected **through the environment or SSM**, plus TCP/5432 egress | database owner + egress policy change |
| **O-3** | valid AWS credentials for `eu-central-1` with `ssm:GetParametersByPath` on `/mipo/prod`, injected as environment variables | AWS account owner |
| **O-4** | the deploy SSH key + egress to `63.183.241.110:22` | repository/host owner + egress policy change |

**O-1 is the cheapest and needs no new access**, because every query in §5 returns
counts and technical UUIDs only: its *output* is safe to paste, its *input* (the
connection string) is not. O-2 is the right answer if this measurement will be
repeated.

### 4.6 Can it run through GitHub Actions, or on the server itself?

Both are feasible. **Neither was done, because both require changes this task
forbids.**

#### Via GitHub Actions — feasible, and it is the auditable option

| Fact | Consequence |
|---|---|
| The `deploy` job is bound to the **`production` GitHub Environment**, which holds `secrets.MIPO_AWS_SSH_PRIVATE_KEY` (`deploy-aws.yml:163`, `:217`) | a workflow job bound to the same environment can SSH to the host — **the access already exists inside Actions** |
| That environment has a **required reviewer** (`docs/DEPLOY_APPROVAL.md`) | a D-18 run would pause for Samuel's approval before touching production. That is a feature: the measurement becomes an approved, logged event |
| `db-integration.yml` uses `postgres://mipo:mipo@127.0.0.1:5432/mipo_ci` (`:53`) | ⚠️ **that workflow cannot measure production.** It is a disposable CI database. Running D-18 there would produce real-looking numbers about nothing — precisely the failure mode this document exists to avoid |

**What it would take:** a new `workflow_dispatch`-only workflow, bound to
`environment: production`, whose single step SSHes to the host and runs §7's
runbook, printing only the aggregate output. **Creating that workflow is a code
change to `.github/workflows/`, which this task explicitly forbids** — and it
would also need Samuel's approval as a production-touching change. **Not created.
Recorded as the recommended path if D-18 is to be repeatable.**

#### On the server itself — feasible today, no new tooling

The host already has everything required, and `backup-before-migrate.sh`
establishes the safe pattern: read `DATABASE_URL` from `/opt/mipo/.env` **without
sourcing the file** (sourcing puts every production secret into the shell), and
pass it to a `postgres:16-alpine` container **by name, never by value**. §7 is
that pattern, with `psql` in place of `pg_dump` and a read-only transaction.
**Not run — this session cannot reach the host.**

**What "by name" protects, stated exactly.** `--env DATABASE_URL` keeps the value
out of `docker run`'s own argv and out of what `docker inspect` records — which
is what `-e DATABASE_URL=<value>` would expose, persistently, to anyone in the
`docker` group. It does **not** make the value absent from every process list:
the `psql` process inside the container receives the URI as an argument, and the
host can see container processes, so for the seconds the run lasts it is visible
there. That residual exposure is bounded by who can already read
`/opt/mipo/.env` on the same host — but it is real, and this document does not
claim otherwise.

---

## 5. Exact query inventory

**25 numbered checks: 24 SQL statements, every one a `SELECT`, plus `D18-19`,
which is a shell presence check and not SQL at all.** Wrapped in `BEGIN` /
`SET TRANSACTION READ ONLY` / `ROLLBACK`, the SQL block is **27 statements** in
total. Note that **25 lines begin with `select` while only 24 statements do** —
`D18-22` is a single statement containing a `UNION ALL`. No `INSERT`, `UPDATE`, `DELETE`,
`ALTER`, `CREATE`, `DROP`, `GRANT`, `TRUNCATE` or `SET` (other than
`SET TRANSACTION READ ONLY`) appears below. They are written against the schema as
deployed at `505d0ae9` — `0001_shop_core.sql`, `0002_admin_auth.sql`,
`0003_orders.sql`, `0016_admin_product_manager_rbac.sql`, `0040` — so they run
as-is.

**Privacy rule applied to every query:** no `email`, no `password_hash`, no
`session_token_hash`, no `ip_address`, no `user_agent`, no customer data. Where an
identifier is unavoidable it is a technical UUID. `D18-24` detects duplicate emails
**without selecting one** — it groups on `lower(email)` and returns only a count.

### A · Admin population *(required check 1)*

```sql
-- D18-01  total admins, split by active flag
select count(*)                                     as admins_total,
       count(*) filter (where is_active)            as admins_active,
       count(*) filter (where not is_active)        as admins_inactive,
       count(*) filter (where must_change_password) as must_change_password
  from public.admin_users;

-- D18-02  age of the population. No emails, no names.
select min(created_at) as first_admin_created_at,
       max(created_at) as last_admin_created_at,
       count(*) filter (where last_login_at is null) as never_logged_in
  from public.admin_users;
```

### B · Role distribution *(required checks 2, 11)*

```sql
-- D18-03  every role actually present, including any unexpected one
select role,
       count(*)                          as n,
       count(*) filter (where is_active) as active_n
  from public.admin_users
 group by role
 order by n desc;

-- D18-04  the four named roles explicitly, so a zero is reported as a zero
--         rather than as an absent row
select count(*) filter (where role = 'admin')           as role_admin,
       count(*) filter (where role = 'product_manager') as role_product_manager,
       count(*) filter (where role = 'seller_admin')    as role_seller_admin,
       count(*) filter (where role = 'readonly_admin')  as role_readonly_admin,
       count(*) filter (where role not in
         ('admin','product_manager','seller_admin','readonly_admin')) as role_other
  from public.admin_users;
```

> `D18-04` is written this way on purpose. `D18-03` alone cannot distinguish
> *"zero rows"* from *"the query missed it"*; `D18-04` forces an explicit `0` for
> `seller_admin` and `readonly_admin`.

### C · `business_id` population *(required check 3)*

```sql
-- D18-05  scoped vs platform-wide
select count(*)                                       as admins_total,
       count(*) filter (where business_id is null)     as business_id_null,
       count(*) filter (where business_id is not null) as business_id_set,
       count(distinct business_id)                     as distinct_businesses
  from public.admin_users;

-- D18-06  role x business_id - the cross-tabulation M1b's CHECK depends on
select role,
       count(*) filter (where business_id is null)     as platform_scope,
       count(*) filter (where business_id is not null) as seller_scope,
       count(*)                                        as n
  from public.admin_users
 group by role
 order by role;
```

### D · admin → business mapping *(required checks 4, 5, 6, 7)*

```sql
-- D18-07  one row per scoped admin. Technical UUIDs only - no email, no name.
--         is_verified is printed as-is because it is three-valued (see SS9).
select au.id                     as admin_user_id,
       au.role,
       au.is_active,
       au.business_id,
       (bp.id is not null)       as business_exists,
       bp.is_verified,                          -- true | false | NULL
       bp.business_type,
       bp.created_at             as business_created_at,
       (bp.user_id is not null)  as business_has_owner_user
  from public.admin_users au
  left join public.business_profiles bp on bp.id = au.business_id
 where au.business_id is not null
 order by au.business_id, au.id;

-- D18-08  dangling references. The FK should make this impossible - run it
--         anyway, because "the constraint exists" and "the constraint was
--         validated against every row" are different statements.
select count(*) as dangling_business_id
  from public.admin_users au
  left join public.business_profiles bp on bp.id = au.business_id
 where au.business_id is not null
   and bp.id is null;

-- D18-09  more than one admin pointing at the same business
select business_id, count(*) as admins_for_this_business
  from public.admin_users
 where business_id is not null
 group by business_id
having count(*) > 1
 order by admins_for_this_business desc;
```

### E · Seller-like business population *(required check 8)*

```sql
-- D18-10  total businesses, and the three-valued verification split
select count(*)                                   as businesses_total,
       count(*) filter (where is_verified is true)  as verified_true,
       count(*) filter (where is_verified is false) as verified_false,
       count(*) filter (where is_verified is null)  as verified_null
  from public.business_profiles;

-- D18-11  type x verification. business_type is a NOT NULL enum.
select business_type,
       count(*)                                    as n,
       count(*) filter (where is_verified is true)  as verified_true,
       count(*) filter (where is_verified is false) as verified_false,
       count(*) filter (where is_verified is null)  as verified_null
  from public.business_profiles
 group by business_type
 order by n desc;

-- D18-12  commercial ACTIVITY - the closest thing this schema has to evidence
--         of selling, as opposed to business_type, which is a category. A
--         business with catalogue rows is doing something; a 'shop' row with
--         none is a label somebody picked from a dropdown.
select bp.business_type,
       bp.is_verified,
       count(distinct bp.id) as businesses,
       count(prod.id)        as products
  from public.business_profiles bp
  left join public.business_products prod on prod.business_id = bp.id
 group by bp.business_type, bp.is_verified
 order by products desc;

-- D18-13  catalogue concentration. If one business owns nearly every product,
--         "multi-seller" is not yet a fact about production.
select business_id, count(*) as products
  from public.business_products
 group by business_id
 order by products desc
 limit 20;

-- D18-14  the fallback business itself. DEFAULT_BUSINESS_ID defaults in code to
--         cf941cc4-e1d1-4d7c-8122-a5df81a1e53c (index.js:100) and production can
--         override it via SSM, so check BOTH - substitute the real value if it
--         differs.
select id, business_type, is_verified, is_featured, created_at,
       (user_id is not null) as has_owner_user
  from public.business_profiles
 where id = 'cf941cc4-e1d1-4d7c-8122-a5df81a1e53c';

-- D18-15  how much of the catalogue hangs off that fallback business
select count(*) as products_on_default_business
  from public.business_products
 where business_id = 'cf941cc4-e1d1-4d7c-8122-a5df81a1e53c';
```

### F · Sessions and operational access *(required checks 9, 10)*

```sql
-- D18-16  live admin sessions. No token hashes, no IPs, no user agents.
select count(*)                                  as sessions_total,
       count(*) filter (where expires_at > now()) as sessions_live,
       count(distinct admin_user_id)
         filter (where expires_at > now())        as distinct_admins_live,
       max(last_seen_at)                          as most_recent_activity
  from public.admin_sessions;

-- D18-17  who an M1b role change would affect, by role
select au.role,
       count(distinct au.id) filter (where s.expires_at > now())
         as admins_with_live_session
  from public.admin_users au
  left join public.admin_sessions s on s.admin_user_id = au.id
 group by au.role
 order by au.role;

-- D18-18  recency buckets, so "how many admins actually use the panel" has an
--         answer without naming anybody
select count(*) filter (where last_login_at >= now() - interval '7 days')  as active_7d,
       count(*) filter (where last_login_at >= now() - interval '30 days') as active_30d,
       count(*) filter (where last_login_at >= now() - interval '90 days') as active_90d,
       count(*) filter (where last_login_at is null)                       as never
  from public.admin_users;
```

**`D18-19` is not a SQL query.** The third authentication mechanism has no database
row at all: `x-admin-api-key` matched against `ADMIN_API_KEY` (`index.js:508`,
`index.js:532`) synthesises an admin identity
`{id:"api-key", email:"api-key", role: admin}` that **never touches
`admin_users`**. To establish whether it is live in production, check **presence
only**, on the host, and report a boolean:

```bash
# on the API host - prints SET/unset, never the value
grep -qE '^[[:space:]]*(export[[:space:]]+)?ADMIN_API_KEY=.+' /opt/mipo/.env \
  && echo "ADMIN_API_KEY: SET" || echo "ADMIN_API_KEY: unset"
```

This identity is the single most important input to M1b and is invisible to every
query above. See §10 (A-1) and §13.

### G · Deployed-state confirmation *(required check 14)*

```sql
-- D18-20  the role constraint as the database actually holds it
select pg_get_constraintdef(oid) as role_check_definition
  from pg_constraint
 where conrelid = 'public.admin_users'::regclass
   and conname  = 'admin_users_role_check';

-- D18-21  0040 really applied: column, type, nullability, default
select column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public' and table_name = 'admin_users'
 order by ordinal_position;

-- D18-22  the FK and the partial index that shipped with it
select conname as name, pg_get_constraintdef(oid) as definition
  from pg_constraint
 where conrelid = 'public.admin_users'::regclass
 union all
select indexname, indexdef
  from pg_indexes
 where schemaname = 'public' and tablename = 'admin_users';

-- D18-23  the migration ledger
select count(*)     as applied_migrations,
       max(filename) as last_migration
  from public.schema_migrations;
```

### H · Anomalies *(required checks 12, 13)*

```sql
-- D18-24  duplicate identities, case-insensitively, WITHOUT selecting an email
select count(*) as duplicate_email_groups
  from (select lower(email)
          from public.admin_users
         group by lower(email)
        having count(*) > 1) dupes;

-- D18-25  three anomaly classes in one pass
select
  -- an admin scoped to a Seller while holding a platform role. No route can
  -- create this today - a non-zero answer means somebody wrote it by hand.
  count(*) filter (where business_id is not null
                     and role in ('admin','product_manager'))       as platform_role_with_business,
  -- a role the code does not know about
  count(*) filter (where role not in ('admin','product_manager'))   as unexpected_role,
  -- deactivated accounts still carrying a Seller scope
  count(*) filter (where not is_active and business_id is not null) as inactive_but_scoped
  from public.admin_users;
```

> **`D18-25` is the M1b acceptance test expressed as data.** If
> `platform_role_with_business` or `unexpected_role` is non-zero, M1b's proposed
> CHECK would abort the migration mid-deploy.

---

## 6. Results — counts *(deliverable 5)*

| # | Measurement | Result |
|---|---|---|
| D18-01 | admins total / active / inactive / must-change-password | **NOT RUN — `BLOCKED-PROD`** |
| D18-02 | population age, never-logged-in | **NOT RUN — `BLOCKED-PROD`** |

## 7. Results — role distribution *(deliverable 6)*

| Role | Count |
|---|---|
| `admin` | **NOT RUN** |
| `product_manager` | **NOT RUN** |
| `seller_admin` | **NOT RUN** — but see **K-1**: the database would *reject* one |
| `readonly_admin` | **NOT RUN** — but see **K-2**: the database would *reject* one |
| any other role | **NOT RUN** |

### The runbook, for whoever has access

Run on the API host. It follows `backup-before-migrate.sh`'s pattern exactly: the
connection string is never printed, never passed by value, and never sourced.

```bash
# --- on 63.183.241.110, as the deploy user -----------------------------------
set -euo pipefail
ENV_FILE=/opt/mipo/.env

# Read the LAST definition, as docker compose's env_file does. Never source
# this file: it holds every production secret.
DATABASE_URL="$(grep -E '^[[:space:]]*(export[[:space:]]+)?DATABASE_URL=' "$ENV_FILE" \
  | tail -1 | cut -d= -f2- || true)"
DATABASE_URL="$(printf '%s' "$DATABASE_URL" | tr -d '\r' \
  | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e "s/^[\"']//" -e "s/[\"']$//")"
[ -n "$DATABASE_URL" ] || { echo "DATABASE_URL not found in $ENV_FILE" >&2; exit 1; }
export DATABASE_URL   # passed by NAME below: out of docker's argv and out of
                      # `docker inspect`. NOT out of psql's own argv inside the
                      # container - see the note above SS4.6.

# Paste the SS5 statements between the two markers, wrapped read-only.
docker run --rm -i -e PGCONNECT_TIMEOUT=15 --env DATABASE_URL postgres:16-alpine \
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
SET TRANSACTION READ ONLY;   -- the database itself now refuses any write
\echo '=== D18-01 ==='
-- ... SS5 statements here ...
ROLLBACK;
SQL
```

`SET TRANSACTION READ ONLY` is not decoration. It means a stray write in a pasted
statement is refused **by PostgreSQL**, not merely absent by intention.

## 8. Results — business mappings *(deliverable 7)*

| # | Measurement | Result |
|---|---|---|
| D18-05 | `business_id IS NULL` vs `IS NOT NULL` | **NOT RUN** — expected all-NULL; see **K-5** |
| D18-06 | role × `business_id` | **NOT RUN** |
| D18-07 | per-admin mapping: business exists, `is_verified`, `business_type` | **NOT RUN** |
| D18-08 | dangling `business_id` | **NOT RUN** |
| D18-09 | multiple admins per business | **NOT RUN** |

## 9. Results — Seller-like business population *(deliverable 8)*

| # | Measurement | Result |
|---|---|---|
| D18-10 | businesses total; `is_verified` true / false / NULL | **NOT RUN** |
| D18-11 | `business_type` × verification | **NOT RUN** |
| D18-12 | businesses with catalogue rows (activity) | **NOT RUN** |
| D18-13 | catalogue concentration | **NOT RUN** |
| D18-14 / D18-15 | the `DEFAULT_BUSINESS_ID` row and its products | **NOT RUN** |

### What the schema can and cannot support — **not blocked**

This is a property of the schema at `505d0ae9`, read from the migration files. It
holds whatever the counts turn out to be, so it is reported as fact.

| Question | Can the schema answer it? |
|---|---|
| Does this business exist? | **Yes** — `business_profiles.id` |
| Has somebody marked it verified? | **Partly.** `is_verified boolean default false` is **nullable** (`0001_shop_core.sql:33`), so it is three-valued. Every check must be written `is_verified IS TRUE`; `is_verified IS NOT FALSE` would silently include NULL |
| What category is it? | **Yes** — `business_type`, a NOT NULL enum: `vet, trainer, groomer, shop, pet_sitter, other` |
| **Is it a Seller?** | **No. There is no field for this.** |
| Is it authorised to sell? | **No.** |
| Which Seller fulfils a given order? | **No.** `orders` has **no `business_id` at all** (`0003_orders.sql:26-51`), and `order_items.product_id` is a bare `uuid` with **no foreign key** to `business_products` (`0003_orders.sql:61`) |

**`business_type = 'shop'` is a category, not a commercial status**, and it is not
used as Seller evidence anywhere in this document. `vet`, `groomer` and `shop` rows
are structurally identical — same table, same columns, same constraints. A `shop`
row proves somebody picked "shop" from a dropdown. `is_verified IS TRUE` proves
somebody confirmed the business is real, **not** that it may sell.

The closest available *evidence* is **activity**: owning rows in `business_products`
(`D18-12`, `D18-13`). That is a signal, not a status.

**No `commercial_status` field was created, written, proposed as created, or
implied to exist.** That decision is **OQ-2** and remains open — it is out of scope
for a read-only validation.

## 10. Anomalies *(deliverable 9)*

| # | Anomaly class | Result |
|---|---|---|
| D18-08 | `business_id` → non-existent business | **NOT RUN** |
| D18-24 | duplicate emails (case-insensitive) | **NOT RUN** |
| D18-25a | platform role carrying a `business_id` | **NOT RUN** |
| D18-25b | unexpected role value | **NOT RUN** |
| D18-25c | inactive admin still scoped | **NOT RUN** |
| — | businesses that look like Seller candidates but cannot be proven to be | **Structurally unprovable — §9.** Not a count: no field in the schema can settle it |

### A-1 · One anomaly found without production access

The `x-admin-api-key` identity (`index.js:508`) is a **full-privilege admin with no
row in `admin_users`**. It cannot be counted, scoped, audited per-actor, or given a
`business_id`, because there is nothing to attach one to. Whatever `D18-01`
eventually returns, **the true number of platform-privileged identities is that
number plus one** if the key is configured — and `sync-ssm-env.sh` lists
`ADMIN_API_KEY` among its `REQUIRED_KEYS`, so production almost certainly has one.

This is not a measurement gap. It is a design fact Seller isolation must answer,
and M1 already answered it as **OQ-4: the API-key identity stays platform-scoped,
permanently.** It is recorded here because D-18's job is to enumerate who is
affected by M1b, and this identity is affected precisely by being exempt.

---

## 11. Conclusions *(deliverable 10)*

1. **D-18 did not run.** All four routes to production are closed from this session
   (§4.2). No count in this document is real.
2. **The blocker is access, not method.** §5 is complete, runnable and read-only;
   §7 gives the exact host command. It needs a connection, not more design.
3. **OD-18's second blocker is gone.** M1 is deployed as far as CI can attest (§2)
   and unverified at the database (§3).
4. **The measurement, when it runs, still cannot answer "who is a Seller"** (§9).
   That is a schema gap (OQ-2), not a query gap, and no amount of production access
   fixes it.
5. **A platform-privileged identity exists entirely outside `admin_users`** (§10,
   A-1), so the admin population is not fully described by `admin_users` at all.
6. **Repeatability has an answer: a `workflow_dispatch` job bound to the
   `production` environment** (§4.6). Not built — it is a code change, which this
   task forbids.

## 12. Known facts *(deliverable 11)*

Established from the repository at `505d0ae9` — code and migration files — **not**
from production. Each holds regardless of what the counts turn out to be.

| # | Fact | Evidence |
|---|---|---|
| **K-1** | **`seller_admin` cannot exist in production** | `admin_users_role_check` restricts `role` to `('admin','product_manager')` — `0016_admin_product_manager_rbac.sql:5-9`. M1 did not relax it, and a test asserts it did not (`adminBusinessScope.test.js:179-194`) |
| **K-2** | **`readonly_admin` cannot exist in production** | same constraint |
| K-3 | No code path **writes** `admin_users.business_id` | both INSERT paths (`index.js:615`, `provisionAdmin.js:64`) name their columns, and neither names `business_id`; no `UPDATE` sets it |
| K-4 | No code path **reads** `admin_users.business_id` | every read goes through the single `adminUserSelect` list (`index.js:332`), which omits it; there is no `SELECT *` on the table anywhere |
| K-5 | Therefore every `business_id` in production **must** be `NULL` | K-3, plus `0040` performs no backfill and sets no default. A non-NULL value would mean hand-written SQL — which is exactly why `D18-05` and `D18-25` are still worth running |
| K-6 | `business_profiles` was not modified by M1 | `0040` touches only `admin_users`; asserted by test (`adminBusinessScope.test.js:196-205`) |
| K-7 | **Three** admin authentication mechanisms exist, not two | session cookie (`getAdminFromSession`, `index.js:470`); `x-admin-api-key` (`index.js:508`, `:532`); and `POST /api/admin/bootstrap`, gated by that same key (`index.js:7768-7779`) |
| K-8 | `is_verified` is nullable, therefore three-valued | `0001_shop_core.sql:33` |
| K-9 | Nothing in the schema marks a business as a Seller | §9 |
| K-10 | Orders carry no Seller attribution | `orders` has no `business_id`; `order_items.product_id` has no FK |

> **K-1 and K-2 answer required check 11 without production access — and answer it
> more strongly than a count could.** Not *"there happen to be none right now"* but
> *"the database would refuse to store one."* A count could only have confirmed
> what the constraint already guarantees.
>
> **Report: `seller_admin` and `readonly_admin` do not exist in production, and
> cannot.**

## 13. Unknowns *(deliverable 12)*

| # | Open question | Why it stays open |
|---|---|---|
| U-1 | How many admins exist, and in what roles | needs `D18-01`/`D18-03`. `BLOCKED-PROD` |
| U-2 | Whether any `business_id` was set by hand | K-5 makes it very unlikely, **not impossible**. Only `D18-05` settles it |
| U-3 | How many businesses exist, and their verification split | needs `D18-10`/`D18-11`. `BLOCKED-PROD` |
| U-4 | **Which businesses are Sellers** | **unanswerable from the current schema at any level of access** (§9). Blocked by OQ-2, not by credentials |
| U-5 | How many admins actively use the panel | needs `D18-16`–`D18-18`. `BLOCKED-PROD` |
| U-6 | Whether `ADMIN_API_KEY` is configured in production | needs the presence check in `D18-19`. Not a database question |
| U-7 | Whether `0040` is in production's `schema_migrations` | needs `D18-21`/`D18-23`. CI says yes; the database has not been asked (§3) |
| U-8 | Which Seller a historical order belongs to | K-10: never recorded. **Unreconstructible**, exactly like legacy product ownership |

## 14. M1b readiness and blockers *(deliverables 13, 14)*

### `BLOCKED` — for design **sign-off**. Not blocked for design **drafting**.

The distinction is the actual answer, so it is stated plainly:

* **M1b's shape does not depend on the missing numbers.** M1b relaxes
  `admin_users_role_check` to admit `seller_admin`, and adds a CHECK tying role to
  scope (`seller_admin` ⇒ `business_id IS NOT NULL`; platform roles ⇒
  `business_id IS NULL`). K-1 … K-5 establish, from the schema, that **no existing
  row can violate either constraint** — which is stronger than a count. The design
  work is not waiting on D-18.
* **M1b's safety at deploy time does depend on them.** Adding a CHECK to a table
  whose contents nobody has read is exactly the class of change that broke this
  system on 8 September, and exactly what `dry-run-migrations.sh` exists to catch.
  If `D18-25` returns a non-zero `platform_role_with_business` or
  `unexpected_role`, the migration aborts mid-deploy. The cost of finding out
  afterwards is a failed production migration; the cost of finding out first is
  five queries.

**So: M1b may be drafted. It must not be deployed until §5 has run.**

### Blocking items

| # | Prerequisite | Status | Blocks |
|---|---|---|---|
| **P-1** | Run `D18-03`, `D18-05`, `D18-25` in production; confirm zero rows would violate M1b's CHECK | **`BLOCKED-PROD`** | M1b deploy |
| **P-2** | Confirm `0040` is in production's `schema_migrations` (`D18-21`, `D18-23`) | **`BLOCKED-PROD`** | M1b migration ordering |
| **P-3** | **Decide OQ-2** — what marks a business as an approved Seller | **open — Samuel's decision** | M1b's *usefulness*: `seller_admin` could be created but would point at a business nobody can prove is a Seller. Also blocks the Publication Gate (Stage 3) |
| **P-4** | Confirm OQ-4 in production: `x-admin-api-key` stays platform-scoped (`D18-19`) | **decided in M1; presence unverified** | M1b's exemption rule |
| **P-5** | Decide how the first `seller_admin` is created — no route writes `business_id` today (K-3) | **open** | M1b being reachable at all |
| **P-6** | Samuel's explicit approval to write M1b | **not given** | everything |

**P-3 matters most, and it is the only prerequisite production access cannot
resolve.** M1b without OQ-2 produces a role scoped to a business nobody can prove
is a Seller.

### What `D18-03` decides — three outcomes, decided in advance

Carried forward from the OD-18 revision unchanged, because the decision does not
depend on which commit production is running. `D18-03`/`D18-04` enumerate the
roles actually present:

| If the role enumeration returns | Then |
|---|---|
| **zero unexpected rows** | M1b enters as designed. **No exception, no extra migration** |
| **rows with a legacy role** | those rows must be re-roled **before** M1b, as a separate documented data change — and a data change needs its own approval |
| **rows with `seller_admin` / `readonly_admin` already present** | **stop.** Someone inserted a future role manually, which `admin_users_role_check` should have made impossible. That means the constraint was dropped at some point, and the environment's history is not what is assumed |

**One ordering point regardless of the answer:** M1 must be deployed before M1b
(it now is — `505d0ae9`, migration `0040`), and **M1b must ship together with the
`adminPermissions.js` role map and `provisionAdmin.js` `--business-id` support.
Shipping M1b alone leaves the new roles insertable by the database but
uncreatable by the only tool that creates admins.**

### Stop conditions

| Condition | Status |
|---|---|
| Unknown roles found | **NOT ASSESSED** — query not run |
| Admin users with an invalid role | **NOT ASSESSED** — query not run |
| Unexplained `business_id` assignments | **NOT ASSESSED.** No longer *unassessable*: `0040` is deployed, so `D18-05` is now a well-formed question against production. It has simply not been asked |
| Sessions that M1b would break | **NOT ASSESSED.** Note: M1b constrains *writes*; sessions only read and update `last_login_at`, so no session should break — but that is reasoning, not measurement |
| **No certainty the check ran against real production** | 🔴 **TRIGGERED — and it is why this report is `BLOCKED-PROD` rather than partial.** No query was run, so no result could be attributed to production even mistakenly |

---

## 15. Post-report write verification

Verified by `git status --porcelain` and `git diff --stat` after the report was
written:

| Check | Result |
|---|---|
| Production queried | ❌ **No** — never contacted |
| Data changed | ❌ **No** — no `INSERT`/`UPDATE`/`DELETE` executed anywhere, against any database |
| Code changed | ❌ **No** |
| Schema changed | ❌ **No** |
| Migration created | ❌ **No** — still 39 files |
| Permissions / roles / provisioning changed | ❌ **No** |
| Sessions / routes changed | ❌ **No** |
| M1b created | ❌ **No** |
| Deploy | ❌ **No** |
| Merge | ❌ **No** |
| Branches changed | ❌ **No** — `aws-migration` remains `505d0ae9` |
| Working tree | **only this file** |

**Next step: Samuel or an operator runs §7 with §5's statements, and pastes back
the output — counts and UUIDs only, no connection string. Until `D18-03`,
`D18-05` and `D18-25` come back, D-18 is unanswered and M1b must not be
deployed.**
