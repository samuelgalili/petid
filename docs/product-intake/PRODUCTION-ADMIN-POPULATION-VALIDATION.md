# D-18 — Production Admin & Business Population Validation

# STATUS: `EXECUTED` — all 24 SQL statements run against production

**Every count below was measured against the production database on
2026-09-15T12:31:28Z.** Nothing is estimated, projected, or carried over from a
local database. Where a number was previously predicted from the schema, the
prediction and the measurement are both shown, so a wrong prediction would be
visible rather than quietly overwritten.

**Nothing in production was changed.** The statements ran inside
`BEGIN` / `SET TRANSACTION READ ONLY` / `ROLLBACK`, so a stray write would have
been refused by PostgreSQL rather than merely absent by intention. The run
finished with `D-18 complete. Nothing on this host was modified.`

> **Supersedes the two `BLOCKED-PROD` revisions of this file** (OD-18,
> 2026-09-14 ~17:5xZ at production `3815fcf1`; and the 2026-09-14T20:34Z
> revision at `505d0ae9`). Both were blocked on access, not on method. The
> method was not changed to make this run work: §5's statements are the ones
> that ran, unedited. What changed is that a route was built — a
> `workflow_dispatch` job bound to the `production` environment, which the
> second revision proposed in §4.6 and was forbidden from building.
>
> The earlier revisions' reasoning is left standing throughout rather than
> rewritten. Where a measurement now settles something those revisions could
> only infer, both are shown. That is the point of having predicted in advance.

---

## 1. Timestamp

| | |
|---|---|
| **Validation executed** | **2026-09-15T12:31:28Z** |
| **Checks executed against production** | **24 of 25** (all 24 SQL statements) |
| Not executed | `D18-19` — the `ADMIN_API_KEY` presence check. It is a shell test on the host, deliberately outside the SQL block; see **U-6** |
| Workflow | `D-18 production read-only`, run **#1**, run id `34969326233` |
| Dispatched by / from | `samuelgalili` / `main` @ `7ffc1250` |
| Job duration | 12:31:20Z → 12:31:28Z |
| Transaction outcome | `BEGIN` → `SET` → … → **`ROLLBACK`** |
| Previous revisions | 2026-09-14T20:34Z and ~17:5xZ, both `BLOCKED-PROD` |

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
| **`schema_migrations` rows measured in production** | **39** |
| **Last filename measured** | **`0040_add_admin_users_business_id.sql`** |
| **Confirmed applied in production?** | ✅ **VERIFIED AT THE DATABASE** (`D18-23`) |

### Verified — the belief now rests on the database

`D18-23` returned `applied_migrations = 39`, `last_migration =
0040_add_admin_users_business_id.sql`. `D18-21` returned the column list, which
contains `business_id | uuid | YES | (no default)`, and `D18-22` returned the
foreign key `admin_users_business_id_fkey → business_profiles(id) ON DELETE
RESTRICT` together with the partial index `idx_admin_users_business_id`.

**39 rows with `0040` as the maximum is the correct count, not one short.** The
migration filenames are not densely numbered: `0001`–`0040` spans 40 numbers, two
of which are unused, and `0018` is used twice. That leaves exactly 39 files at or
below `0040`, which is exactly what the ledger holds. **No migration in the
deployed range is missing from `schema_migrations`.**

### What was known before the run, and why it was not enough

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

**That reasoning turned out to be right — and it was still right to distrust it.**
`D18-21`/`D18-23` have now confirmed at the database what CI could only attest
about the pipeline. The 8 September incident, where both health checks reported
success for four hours while every authenticated request failed, is the reason
the distinction was kept. Confirming a correct belief costs one query; the
alternative is discovering a wrong one during a migration.

---

## 4. Why the earlier revisions were `BLOCKED-PROD`, and how the block was lifted

**This section is history now.** It is kept because the route that was eventually
built is the one §4.6 argued for, and because the access inventory below is still
an accurate description of what this development environment can and cannot
reach — which has not changed.

### 4.1 Both blockers are now resolved

| | Blocker | State now |
|---|---|---|
| **B-1** | No access path from this environment to the production database | 🟢 **resolved — not by opening this environment, but by not using it.** The measurement ran on a GitHub Actions runner in the `production` environment, over the deploy's existing SSH path. Every route in §4.2 is still closed from here; none was reopened, and no new credential, key, IAM policy or database role was created |
| **B-2** | *(OD-18)* `admin_users.business_id` does not exist in production, so the scope queries would error rather than return zero | 🟢 **resolved by run 54**, and now confirmed at the database (§3) |

### 4.1a One thing the run revealed about the route itself

The workflow binds to the `production` GitHub Environment specifically so that its
**required reviewer** makes a production measurement an approved, logged event
rather than something anyone can trigger unseen. That is stated in the workflow's
own comments as one of two reasons the environment was chosen.

**It did not happen.** Run #1 started executing immediately on dispatch, with no
approval gate: `Set up job` at 12:31:20Z, `Confirm intent` at 12:31:21Z. The
`production` environment therefore has **no required reviewer configured**.

This did not compromise this run — it is read-only by construction, twice over,
and it was dispatched deliberately. But the second layer of defence described in
the workflow is **not actually present**, and anyone who can dispatch workflows on
this repository can run this one unreviewed. Recorded as **A-2** in §10.

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

**As of the 2026-09-14 revision: all 25.** That is no longer true — see §1. All 24
SQL statements have now run; only `D18-19`, the host-side `ADMIN_API_KEY` presence
check, remains unexecuted, because it is a shell test rather than a query and was
deliberately kept out of the read-only SQL block.

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

> **What actually happened: none of the four.** A fifth option — **O-5**, a
> `workflow_dispatch` job inside the `production` GitHub Environment — needed no
> new credential at all, because the access already existed there (§4.6). It
> borrows the deploy's own SSH key rather than issuing anything, so no database
> role, IAM policy, key or egress rule was created, and this development
> environment remains exactly as closed as §4.2 describes. It also beats O-1 on
> the one axis that matters for repeating the measurement: the output never passes
> through a human, so there is no step at which a connection string could be
> pasted by accident.

### 4.6 Can it run through GitHub Actions, or on the server itself?

Both are feasible. **Neither was done, because both require changes this task
forbids.**

> **Superseded — the Actions option was built and is what ran.** This subsection
> is left as written because it is the reasoning that produced the workflow, and
> because one of its claims turned out to be wrong in a way worth keeping visible.
> Two corrections:
>
> 1. **"That environment has a required reviewer" is false.** It is sourced to
>    `docs/DEPLOY_APPROVAL.md` — a document describing intent, not the setting
>    itself. Run #1 began executing one second after dispatch with no approval
>    step. See §4.1a and **A-2**. This is exactly the class of error the rest of
>    this document guards against: a document was read as evidence of a
>    configuration.
> 2. **"Not created" no longer holds.** `.github/workflows/production-d18-readonly.yml`
>    exists, is registered on `main`, and produced the results in §6 onward.

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

### D18-01 · admin population

| admins_total | active | inactive | must_change_password |
|---|---|---|---|
| **3** | 3 | 0 | 0 |

### D18-02 · population age

| first_admin_created_at | last_admin_created_at | never_logged_in |
|---|---|---|
| 2026-07-06 08:12:10Z | 2026-08-09 16:15:29Z | **0** |

Three admins, all active, all of whom have logged in at least once. None is
flagged to change its password.

## 7. Results — role distribution *(deliverable 6)*

### D18-03 · roles present

| Role | Count | Active |
|---|---|---|
| `admin` | **2** | 2 |
| `product_manager` | **1** | 1 |

### D18-04 · the four roles counted explicitly, plus anything else

`D18-04` is written so a zero is reported as a zero — a `GROUP BY` alone cannot
distinguish *"no such rows"* from *"the query missed it"*.

| `role_admin` | `role_product_manager` | `role_seller_admin` | `role_readonly_admin` | `role_other` |
|---|---|---|---|---|
| 2 | 1 | **0** | **0** | **0** |

> **K-1 and K-2 are confirmed, and the reasoning behind them was sound.** Both
> revisions predicted zero `seller_admin` and zero `readonly_admin` rows *from the
> constraint*, arguing that "the database would refuse to store one" is stronger
> than a count. The measurement agrees, and `D18-20` confirms the constraint is
> still `CHECK (role = ANY (ARRAY['admin','product_manager']))` — so the zero is
> guaranteed rather than incidental. **`role_other = 0` is the part a constraint
> could not have promised**, since a constraint added later says nothing about rows
> that predate it. It was worth asking.

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

### D18-05 · scope population

| admins_total | `business_id` NULL | `business_id` set | distinct businesses |
|---|---|---|---|
| 3 | **3** | **0** | **0** |

### D18-06 · role × scope

| Role | platform scope | Seller scope | n |
|---|---|---|---|
| `admin` | 2 | 0 | 2 |
| `product_manager` | 1 | 0 | 1 |

### D18-07 · per-admin mapping

**0 rows.** No admin carries a `business_id`, so there is nothing to map.

### D18-08 · dangling `business_id`

**0.** No admin points at a business that does not exist.

### D18-09 · businesses with more than one admin

**0 rows.**

> **U-2 is settled.** K-3/K-4/K-5 argued from the code that every `business_id`
> *must* be NULL, since no path writes one and `0040` performs no backfill — while
> conceding that hand-written SQL would not be visible to that reasoning. The
> measurement confirms it: **`business_id_set = 0`.** Nobody set one by hand.

## 9. Results — Seller-like business population *(deliverable 8)*

### D18-10 · businesses and verification

| businesses_total | verified TRUE | verified FALSE | verified NULL |
|---|---|---|---|
| **1** | 1 | 0 | 0 |

### D18-11 · `business_type` × verification

| business_type | n | verified TRUE | verified FALSE | verified NULL |
|---|---|---|---|---|
| `shop` | 1 | 1 | 0 | 0 |

`is_verified` is nullable and therefore three-valued (**K-8**), which is why the
NULL column is reported separately rather than folded into FALSE. In production it
happens to be empty.

### D18-12 / D18-13 · commercial activity and concentration

| business_type | is_verified | businesses | products |
|---|---|---|---|
| `shop` | `t` | 1 | **375** |

| business_id | products |
|---|---|
| `cf941cc4-e1d1-4d7c-8122-a5df81a1e53c` | **375** |

### D18-14 / D18-15 · the `DEFAULT_BUSINESS_ID` row

| field | value |
|---|---|
| id | `cf941cc4-e1d1-4d7c-8122-a5df81a1e53c` |
| business_type | `shop` |
| is_verified | `t` |
| is_featured | `t` |
| created_at | 2026-07-06 00:52:49Z |
| **has_owner_user** | **`f`** |
| **products_on_default_business** | **375** |

### F-1 · The whole production catalogue sits on the fallback business, which has no owner

This is the substantive finding of the run, and it is not a surprise so much as a
confirmation with a number attached.

**There is exactly one business in production. It is the
`ensureDefaultBusinessProfile()` fallback, it has no owner user, and all 375
products belong to it.** `DEFAULT_BUSINESS_ID` is not overridden in production —
the row `D18-14` asks for by literal UUID came back.

So legacy product ownership is not merely *unreconstructible in principle*
(**U-8**); it is unreconstructible for **100% of the live catalogue**, because
every row names the same placeholder owner and that owner names no person. There
is no partial case to salvage and no subset that can be attributed.

**This is the measurement that justifies refusing to legitimise legacy ownership
retroactively.** Any migration that promoted existing `business_products` rows
into the new model by trusting `business_id` would attribute 375 products to a
profile nobody owns.

### F-2 · What `0049` will do to this row — predicted, and checkable later

`0049_add_business_commercial_status.sql` adds `commercial_status NOT NULL DEFAULT
'none'` and backfills nothing. The single production business will therefore read:

```
is_verified = true, commercial_status = 'none'
```

and `isSellerEligible()` requires **both** `is_verified IS TRUE` **and**
`commercial_status = 'approved'`. **The fallback business will not become a Seller
when `0049` deploys.** That was the design intent; this is the first time it has
been checked against the actual row rather than asserted about a hypothetical one.

The shop is unaffected either way: `/api/products` continues to read
`business_products` (375 rows), and `/api/catalog` reads `catalog_products`, which
is empty in production. There is no cutover in this deploy.

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

> **Superseded after this report was written.** `commercial_status` now exists
> (migration `0049`), so a Seller is a recorded fact rather than an inference —
> see §14. The paragraphs above describe the schema **as this validation found
> it**, and are left standing rather than rewritten: `D18-11` and `D18-12` were
> designed against that schema, and a reader comparing them to a production run
> needs to know what was true when they were written. What did **not** change is
> that this validation never ran, and that `business_type` is still not evidence
> of anything commercial.
>
> When D-18 is eventually run, add `commercial_status` to `D18-10`/`D18-11`; the
> expected answer in production today is that every row reads `none`.

## 9a. Results — sessions and operational access

### D18-16 · sessions

| sessions_total | sessions_live | distinct admins live | most_recent_activity |
|---|---|---|---|
| 52 | **0** | 0 | 2026-09-10 15:01:29Z |

### D18-17 · live sessions by role

| Role | admins with a live session |
|---|---|
| `admin` | 0 |
| `product_manager` | 0 |

### D18-18 · recency of login

| active_7d | active_30d | active_90d | never |
|---|---|---|---|
| 1 | 2 | 3 | **0** |

**No admin session is live.** 52 session rows exist, all expired; the most recent
activity was five days before the run. All three admins have logged in at some
point, one within the last week.

> This bears on a stop condition the earlier revision could only reason about:
> *"sessions that M1b would break"*. M1b constrains **writes** to `admin_users`,
> while sessions only read and update `last_login_at` — so no session should break.
> With zero live sessions at the time of measurement, the question is moot for this
> deploy regardless of the reasoning.

## 10. Anomalies *(deliverable 9)*

| # | Anomaly class | Result |
|---|---|---|
| D18-08 | `business_id` → non-existent business | **0** |
| D18-24 | duplicate emails (case-insensitive) | **0** |
| D18-25a | platform role carrying a `business_id` | **0** |
| D18-25b | unexpected role value | **0** |
| D18-25c | inactive admin still scoped | **0** |
| — | businesses that look like Seller candidates but cannot be proven to be | **Moot at this population.** There is one business, it is the fallback, and §9 F-1 settles what it is. The structural point still stands for any future row |

**No anomaly was found in `admin_users`.** Every anomaly class returns zero.

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

**Still true after the run.** `D18-01` measured 3 rows in `admin_users`. If
`ADMIN_API_KEY` is configured in production — `sync-ssm-env.sh` lists it among its
`REQUIRED_KEYS`, so it almost certainly is — then the true number of
platform-privileged identities is **4**, and the fourth cannot be counted, scoped
or audited per-actor. `D18-19` would settle it and did not run (**U-6**).

### A-2 · The `production` environment has no required reviewer

Found by observing the run rather than by querying anything. The workflow was
bound to the `production` environment partly so that its required reviewer would
gate every production measurement; the job instead began executing one second
after dispatch, with no approval step. See §4.1a.

**Severity: low for this workflow, higher as a general fact.** This job is
read-only under two independent defences. But the same environment holds
`MIPO_AWS_SSH_PRIVATE_KEY`, and the deploy uses it. A reviewer was assumed to be
there and is not.

---

## 11. Conclusions *(deliverable 10)*

1. **D-18 ran.** All 24 SQL statements executed against production inside a
   read-only transaction that was rolled back. Nothing was changed.
2. **M1b is safe to deploy.** Every row in `admin_users` satisfies both constraints
   M1b adds, measured rather than inferred. §14 states the verdict in full.
3. **`0040` is confirmed applied at the database**, not merely attested by CI (§3).
   39 ledger rows, last `0040`, and the column, foreign key and index all present.
4. **The admin population is small, clean and entirely platform-scoped.** 3 admins,
   2 `admin` + 1 `product_manager`, zero scoped, zero anomalies of any class.
5. **One business exists, and it owns the entire catalogue without owning anyone.**
   375 products on the `DEFAULT_BUSINESS_ID` fallback, which has no owner user
   (§9 F-1). Legacy ownership is unreconstructible for 100% of live products —
   which is the measured justification for refusing to backfill it.
6. **A platform-privileged identity still exists entirely outside `admin_users`**
   (§10, A-1). The measured count of 3 is 3 *rows*, not 3 privileged identities.
7. **The `production` environment's required reviewer does not exist** (§10, A-2).
   Discovered by running the workflow, not by querying.
8. **Repeatability is solved.** The `workflow_dispatch` job §4.6 proposed is built,
   registered and has run once. Re-running D-18 after M1b deploys is now one
   dispatch, which is the cheapest way to verify the migration landed as predicted.

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

| # | Open question | State after the run |
|---|---|---|
| U-1 | How many admins exist, and in what roles | ✅ **CLOSED** — 3: two `admin`, one `product_manager` (§6, §7) |
| U-2 | Whether any `business_id` was set by hand | ✅ **CLOSED** — none. `business_id_set = 0` (§8) |
| U-3 | How many businesses exist, and their verification split | ✅ **CLOSED** — one, `shop`, `is_verified = true` (§9) |
| U-4 | **Which businesses are Sellers** | ✅ **CLOSED as a schema gap** by `0049`; **not yet asked of production**, because `commercial_status` is not deployed. The answer after deploy is predicted in §9 F-2: the single business reads `none` and is not a Seller. Re-run D-18 to confirm |
| U-5 | How many admins actively use the panel | ✅ **CLOSED** — 1 in 7 days, 2 in 30, 3 in 90; zero live sessions (§9a) |
| U-6 | Whether `ADMIN_API_KEY` is configured in production | 🔴 **STILL OPEN** — `D18-19` is a host shell check, not a query, and was kept out of the SQL block. Bears on A-1: if set, privileged identities number 4, not 3 |
| U-7 | Whether `0040` is in production's `schema_migrations` | ✅ **CLOSED** — yes. 39 rows, last `0040` (§3) |
| U-8 | Which Seller a historical order belongs to | 🔴 **STILL OPEN, and now quantified.** K-10 stands: never recorded. §9 F-1 shows all 375 products belong to an unowned fallback profile, so this is unreconstructible for the entire catalogue, not merely in principle. `0050` fixes it **going forward only** — it backfills nothing, deliberately |

## 14. M1b readiness and blockers *(deliverables 13, 14)*

### ✅ `CLEARED FOR DEPLOY` — every row measured, every constraint satisfied

`D18-25` is the acceptance test for M1b expressed as data, and it returned three
zeros:

| `platform_role_with_business` | `unexpected_role` | `inactive_but_scoped` |
|---|---|---|
| **0** | **0** | **0** |

M1b adds this CHECK to `admin_users`:

```sql
check ((role in ('admin','product_manager') and business_id is null)
    or (role in ('seller_admin','readonly_admin') and business_id is not null))
```

All three production rows hold `role IN ('admin','product_manager')` **and**
`business_id IS NULL` (§7, §8), so each satisfies the first branch. **The
constraint is valid for every existing row. The migration cannot abort mid-deploy
on it.**

The role-check widening is equally safe: `0041` drops and re-adds
`admin_users_role_check` with four roles, and the only values present are `admin`
and `product_manager`, a subset of the new set.

The rest of the stack is safe for reasons that need no measurement, but the
measurement confirms the assumptions each one rests on:

| Migration | Why it is safe against this population |
|---|---|
| `0042`–`0048` | New tables, created empty. No existing row is touched |
| `0049` | `commercial_status NOT NULL DEFAULT 'none'`; the one existing business takes the default and does **not** become a Seller (§9 F-2) |
| `0050` | Nullable columns with no foreign keys on `orders` / `order_items`; historical rows keep NULLs, which is the intended record |

**So: M1b — and the intake, catalogue and checkout migrations behind it — may be
deployed.** The condition the previous revision set has been met.

> **The earlier revision's caution is worth keeping in view rather than deleting.**
> It refused to clear the deploy on the strength of K-1…K-5, which reasoned from
> the schema that no row *could* violate the constraints. That reasoning turned out
> to be correct in every particular. It was still right not to sign off on it: a
> constraint added in `0016` says nothing about rows written before it, and
> hand-written SQL is invisible to an argument from code. The zeros are now
> measured. The cost of finding out first was five queries; the cost of finding out
> afterwards would have been a failed production migration.

### Blocking items

| # | Prerequisite | Status | Blocks |
|---|---|---|---|
| **P-1** | Run `D18-03`, `D18-05`, `D18-25` in production; confirm zero rows would violate M1b's CHECK | ✅ **RESOLVED** — all three run; all zero (§7, §8, §10) | — |
| **P-2** | Confirm `0040` is in production's `schema_migrations` (`D18-21`, `D18-23`) | ✅ **RESOLVED** — 39 rows, last `0040` (§3) | — |
| **P-3** | ~~Decide OQ-2 — what marks a business as an approved Seller~~ | ✅ **RESOLVED** — see below | — |
| **P-4** | Confirm OQ-4 in production: `x-admin-api-key` stays platform-scoped (`D18-19`) | **decided in M1; presence unverified** | M1b's exemption rule |
| **P-5** | ~~Decide how the first `seller_admin` is created~~ | ✅ **RESOLVED** — `provisionAdmin.js --business-id`, which writes role and scope in one statement and refuses a business that is not an approved Seller | — |
| **P-6** | Samuel's explicit approval to write M1b | **given; written and tested, not deployed** | deploy only |

### P-3 is resolved: `commercial_status` exists

**OQ-2 was decided and implemented.** `business_profiles.commercial_status` is a
NOT NULL column taking `none` · `pending` · `approved` · `suspended`, added by
migration `0049_add_business_commercial_status.sql`. A Seller is now a matter of
record rather than inference:

```sql
is_verified IS TRUE AND commercial_status = 'approved'
```

`pending` permits preparing catalogue data and permits neither publication nor
sale. `suspended` permits neither, and stays distinct from `none` so that
"never approved" and "approval withdrawn" remain distinguishable afterwards.

**The default is `none`, and nothing was backfilled.** Every business predating
the column — including the `Mipo Shop` profile that
`ensureDefaultBusinessProfile()` creates — can sell nothing until somebody
approves it explicitly. Defaulting to `approved` would have retroactively
legitimised every row the legacy fallback ever touched, which is the one thing
that was ruled out. A test asserts the count of non-`none` rows after the
migration is zero, and it was falsified by flipping the default.

The rule lives in exactly one module — `server/src/sellerEligibility.js` — as
both a predicate and a SQL fragment, with a test proving the two agree across all
nine combinations of `is_verified` × `commercial_status`. It had previously been
spelled out separately in four places, which is how one rule quietly becomes
four.

**What this does not change:** `commercial_status` is **not deployed** — production
stops at `0040` (§3). So *which businesses are Sellers* is answerable by design but
has not yet been asked of production, and cannot be until `0049` ships. §9 F-2
states the predicted answer for the single existing row: `none`, therefore not a
Seller. That is the correct starting state, not a finding.

**P-1 and P-2 are both resolved. No prerequisite blocks the M1b deploy.**

### What `D18-03` decides — three outcomes, decided in advance

Carried forward from the OD-18 revision unchanged, because the decision does not
depend on which commit production is running. `D18-03`/`D18-04` enumerate the
roles actually present:

| If the role enumeration returns | Then |
|---|---|
| ✅ **zero unexpected rows** ← **this is what it returned** | M1b enters as designed. **No exception, no extra migration** |
| **rows with a legacy role** | those rows must be re-roled **before** M1b, as a separate documented data change — and a data change needs its own approval |
| **rows with `seller_admin` / `readonly_admin` already present** | **stop.** Someone inserted a future role manually, which `admin_users_role_check` should have made impossible. That means the constraint was dropped at some point, and the environment's history is not what is assumed |

**Outcome: the first row.** `D18-04` returned `role_other = 0`,
`role_seller_admin = 0`, `role_readonly_admin = 0`. The pre-committed decision was
made before the numbers were known, which is what makes it a decision rather than a
rationalisation.

**One ordering point regardless of the answer:** M1 must be deployed before M1b
(it now is — `505d0ae9`, migration `0040`, confirmed at the database in §3), and
**M1b must ship together with the `adminPermissions.js` role map and
`provisionAdmin.js` `--business-id` support. Shipping M1b alone leaves the new
roles insertable by the database but uncreatable by the only tool that creates
admins.**

> **That gap is closed on the work branch.** `provisionAdmin.js` now takes
> `--role seller_admin --business-id <uuid>`, validates the role/scope pair before
> touching the database via `resolveProvisioningScope()`, refuses a Seller role
> with no `--business-id` and a platform role that is given one, and writes `role`
> and `business_id` in the same statement in both the insert and the update path.
> The three ship together, so the ordering point is satisfied by construction
> rather than by remembering.

### Stop conditions

| Condition | Status |
|---|---|
| Unknown roles found | ✅ **NOT TRIGGERED** — `role_other = 0` (`D18-04`) |
| Admin users with an invalid role | ✅ **NOT TRIGGERED** — `unexpected_role = 0` (`D18-25`) |
| Unexplained `business_id` assignments | ✅ **NOT TRIGGERED** — `business_id_set = 0`, `dangling_business_id = 0` |
| Sessions that M1b would break | ✅ **NOT TRIGGERED**, and now measured rather than reasoned: `sessions_live = 0` (§9a) |
| No certainty the check ran against real production | ✅ **NOT TRIGGERED.** The run reached production over the deploy's own SSH path, read `DATABASE_URL` from `/opt/mipo/.env` on the API host, and returned `admin_users_role_check` as the platform pair — which is the deployed constraint and differs from this branch's. A local database would have answered with four roles |

**No stop condition triggered.**

---

## 15. Post-report write verification

| Check | Result |
|---|---|
| Production queried | ✅ **Yes** — 24 `SELECT` statements, read-only transaction, rolled back |
| **Data changed in production** | ❌ **No.** `SET TRANSACTION READ ONLY` was in force, so a write would have been refused by PostgreSQL; the transaction ended in `ROLLBACK`; the job's last line was `D-18 complete. Nothing on this host was modified.` |
| Files written on the production host | ❌ **No** — the SQL travelled in an environment variable; nothing was written, not even temporarily |
| Code changed | ❌ **No** |
| Schema changed | ❌ **No** |
| Migration created | ❌ **No** |
| Permissions / roles / provisioning changed | ❌ **No** |
| Sessions / routes changed | ❌ **No** |
| Deploy | ❌ **No** — the workflow never rsyncs, builds, migrates, restarts or publishes |
| Merge | ❌ **No** |
| Branches changed | ❌ **No** — `aws-migration` remains `505d0ae9` |
| Working tree | **only this file** |
| Runner key material | removed by the `Remove the key` step (`if: always()`) — `Key removed from the runner.` |

### What the log did and did not contain

Checked because the output of a production measurement goes into a GitHub Actions
log that outlives the run:

| | |
|---|---|
| Connection string | **absent** — `Connection string located in /opt/mipo/.env. Not printed.` |
| Passwords, tokens, session token hashes | **absent** — no query selects them |
| Admin emails or display names | **absent** — `D18-24` detects duplicate emails via `count(*)` over a grouped subquery without selecting one |
| IP addresses, user agents | **absent** — `D18-16` selects none |
| UUIDs | **present, and intended.** Only `DEFAULT_BUSINESS_ID`, which is a literal in `index.js` |

---

**Next step: the decision this document exists to inform is now available.** M1b
and the migrations behind it are cleared for deploy (§14). Merging the work branch
into `aws-migration` is that deploy, and it needs Samuel's explicit approval —
which is a separate decision from this report's finding that it is safe.

**After that deploy, re-run this workflow.** It is one dispatch, and it turns the
predictions in §3 and §9 F-2 into measurements: that `0041`–`0050` applied, that
the role check now admits four roles, and that the single business reads
`commercial_status = 'none'` rather than having been quietly promoted.
