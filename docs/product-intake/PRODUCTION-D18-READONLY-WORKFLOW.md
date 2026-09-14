# D-18 read-only production workflow — design

**File:** `.github/workflows/production-d18-readonly.yml`
**Written:** 2026-09-14 · **Branch:** `claude/mifo-project-oq44tl`
**Status: prepared, verified, NOT COMMITTED, NOT RUN.**

Companion to [`PRODUCTION-ADMIN-POPULATION-VALIDATION.md`](./PRODUCTION-ADMIN-POPULATION-VALIDATION.md),
which is `BLOCKED-PROD` because no route from a development environment reaches
the production database. **This workflow is that route.** It does not grant new
access — it uses the one path that already exists.

---

## 1. Why a workflow, and why this one

D-18 needs to read five tables in production. Four routes were probed and all are
closed from a development session: no `DATABASE_URL`, AWS credentials rejected by
STS with `InvalidClientTokenId`, no SSH key and port 22 unreachable, and
`mipo.pet:443` denied by the egress policy.

A fifth route exists and is already trusted: **the `deploy` job reaches the host
every release.** Its `environment: production` holds `MIPO_AWS_SSH_PRIVATE_KEY`,
and that environment has a required reviewer. This workflow borrows exactly that
path.

| Alternative | Why not |
|---|---|
| Add D-18 to `db-integration.yml` | ⚠️ **That workflow runs against `postgres://mipo:mipo@127.0.0.1:5432/mipo_ci`** — a disposable CI database. It would produce real-looking numbers about nothing, which is the exact failure this document set exists to prevent |
| A new read-only database role + egress | Correct long-term, but needs a schema grant, a network change and a new credential. Three approvals instead of zero |
| New AWS/IAM credentials | Explicitly out of scope. No IAM permission is added, and no credential is created |
| An operator runs it by hand | Works, and is documented in §7 of the validation report. But it is unrepeatable and unlogged — nobody can later ask *"what did production look like on the day M1b was approved?"* |

**What this workflow adds over the manual runbook: an approval gate and a log.**
The measurement becomes an event with a reviewer, a timestamp and a run id.

## 2. What it does, in order

| Step | Action | Touches production? |
|---|---|---|
| 1 | **Confirm intent** — the `confirmation` input must be exactly `READ-ONLY` | no |
| 2 | **Checkout** | no |
| 3 | **Verify the embedded SQL is read-only** — statically checks the SQL block *before anything connects* | no |
| 4 | **Configure SSH** — writes the deploy key to the runner, `chmod 600`, `ssh-keyscan` | no |
| 5 | **Run D-18 against production** — SSH, read `DATABASE_URL`, run 25 `SELECT`s in one read-only transaction, `ROLLBACK` | **reads only** |
| 6 | **Remove the key** — `if: always()` | no |

**It never** rsyncs, builds, pulls, migrates, restarts, recreates a container,
publishes a frontend, writes a file on the host, changes a permission, or calls
any AWS API. Compare with `deploy-aws.yml`, which does most of those: the two
workflows share only the SSH configuration step.

## 3. The requirements, and where each is met

| Requirement | Where | How |
|---|---|---|
| `workflow_dispatch` only | `on:` | the only trigger. No `push`, no `schedule`, no `pull_request`, no `workflow_call` |
| GitHub Environment `production` | `jobs.measure.environment` | same environment as the deploy job — so the same required reviewer gates it |
| Existing deployment SSH mechanism | *Configure SSH* | `secrets.MIPO_AWS_SSH_PRIVATE_KEY`, same key path, same `ssh-keyscan`, same flags as `deploy-aws.yml:217-228` |
| Production host only | job `env` | `MIPO_AWS_HOST` from the **production environment's** variables. The environment scopes the target; there is no branch- or input-driven host selection to get wrong |
| Read `DATABASE_URL` from `/opt/mipo/.env` **without `source`** | remote script | `grep … \| tail -1 \| cut -d= -f2-`, then CR/quote/whitespace stripping — the `backup-before-migrate.sh` pattern verbatim. **`tail -1`, not `head -1`**: docker compose's `env_file` lets a later definition win, so the last one is what the API actually uses |
| Never print the connection string | remote script | only its **length** and **scheme** are echoed, and only on a malformed value. No `set -x` anywhere — tracing would echo the expansion |
| Never pass it as a visible argument | `docker run` | `--env DATABASE_URL` passes it **by name**, so `docker run`'s argv and what `docker inspect` records hold the literal text, never the value — which is what `-e DATABASE_URL=<value>` would expose persistently. **This is not full protection from process-list exposure:** `psql` inside the container receives the URI as an argument and the host can see container processes, so it is visible there while the run lasts. See §5.1 |
| Never in an artifact, output or log | whole file | no `actions/upload-artifact`, no `$GITHUB_OUTPUT`, no `$GITHUB_ENV`, no `echo` of the value |
| `postgres:16-alpine`, by name | remote script | `PG_IMAGE="${MIPO_PG_IMAGE:-postgres:16-alpine}"`, the same default and override name the backup script uses |
| `BEGIN; SET TRANSACTION READ ONLY;` | SQL block | first two statements; `ROLLBACK;` last. Verified present by step 3 |
| `SELECT` only | SQL block + step 3 | **24 `SELECT` statements**, plus `BEGIN`, `SET TRANSACTION READ ONLY` and `ROLLBACK` — **27 statements in total**. (25 *lines* begin with `select`; `D18-22` is one statement containing a `UNION ALL`. `D18-19` is a shell presence check, not SQL, and is not in this workflow.) Enforced, not just intended — see §4 |
| No INSERT/UPDATE/DELETE/ALTER/migration/restart/deploy | whole file | none present; step 3 fails the job if one appears later |
| No file change on the server | remote script | **no temp file is written.** The SQL travels in an environment variable (`--env D18_SQL`), not a file. See §5 |
| No permission change | remote script | no `chmod`, no `chown`, no `sudo`. The deploy uses `sudo` for `prepare-host.sh`; this workflow uses none |
| Never collides with a deploy | `concurrency` | shares the deploy's production group — see §3.1 |

### 3.1 Concurrency: the deploy's own production group

`deploy-aws.yml:12-14` declares:

```yaml
concurrency:
  group: aws-${{ github.ref_name == 'aws-migration' && 'production' || 'staging' }}
  cancel-in-progress: false
```

For `aws-migration` — the production branch — that expression resolves to the
literal **`aws-production`**, and that is the group this workflow uses.

**Why the literal and not the expression.** The deploy's expression selects a group
by *branch*. This workflow targets the production host **whichever branch it is
dispatched from**, so copying the expression would drop a run dispatched from any
other branch into `aws-staging` and silently defeat the serialisation. No name is
invented here: `aws-production` is exactly the value the deploy's own expression
produces for a production release.

**Why it matters.** Every statement in the SQL block takes an `ACCESS SHARE` lock,
held for the transaction's duration. A deploy migration takes `ACCESS EXCLUSIVE`.
Overlapping them would let a read-only measurement block a production migration —
and then queue every subsequent query behind that migration. Sharing the group
makes the two mutually exclusive at the GitHub level, before either reaches the
database.

## 4. The SQL is checked before it runs, and the check was falsified

Step 3 extracts the SQL block and fails the job if any line **begins** with a
write verb — `insert`, `update`, `delete`, `alter`, `drop`, `create`, `grant`,
`revoke`, `truncate`, `copy`, `call`, `do`, `vacuum`, `reindex`, `refresh`,
`comment`, `lock`, `analyze`, `cluster`, `security`. It also asserts `BEGIN;`,
`SET TRANSACTION READ ONLY;` and `ROLLBACK;` are present, and that **exactly
three** statements are non-`SELECT` and are precisely those three.

Anchoring at line start is deliberate: the word *update* inside a comment or a
column alias does not trip the check, while a real statement cannot hide behind
leading whitespace.

### The extraction is anchored, and the first version was not

The markers are matched **whole-line**:

```bash
sql="$(sed -n '/^[[:space:]]*-- D18-SQL-BEGIN$/,/^[[:space:]]*-- D18-SQL-END$/p' "$workflow")"
```

The first version used an unanchored `awk /-- D18-SQL-BEGIN/`, which **matched the
extraction command's own line** — the marker name appears in it. Capture therefore
began at the guard step itself and ran to the real end marker: **294 lines instead
of 203**, swallowing the rest of the guard, the SSH step and the `DATABASE_URL`
prelude. It was over-inclusive rather than permissive, so it never missed a write
— but it would have false-positived on innocent shell, and its reported count was
of the wrong region. Anchoring fixes it: the command's own line is not a line
consisting solely of the marker.

### Counting statements, not lines

The count is now derived by dropping comments and psql meta-commands, splitting on
`;`, and classifying each fragment by its first word. Counting lines that begin
with `select` overcounts, because `D18-22` is one statement containing a
`UNION ALL`.

**A check that has only ever passed proves nothing**, so it was falsified:

| Test | Result |
|---|---|
| Guard against the real file | ✅ **PASS** — *"24 SELECT statements plus BEGIN, SET TRANSACTION READ ONLY and ROLLBACK (27 statements in total). No write statements."* |
| Extraction boundaries | ✅ 203 lines, first line `-- D18-SQL-BEGIN`, last `-- D18-SQL-END`; **zero** lines from the SSH step, the `DATABASE_URL` prelude, or the guard itself |
| Copy with `update public.admin_users set is_active = true;` injected | ✅ **correctly FAILED**, naming the line |
| Copy with `insert into public.admin_users (…) values (…);` injected | ✅ **correctly FAILED**, naming the line |
| Copy with `SET TRANSACTION READ ONLY;` removed | ✅ **correctly FAILED** — *"The SQL block is missing: SET TRANSACTION READ ONLY;"* |
| Untouched control copy | ✅ **PASS** |

The guard exists for the version of this file that somebody edits in six months,
not for the version reviewed today.

### Two independent defences, not one

1. **Static** — step 3, above. Runs before any connection is made.
2. **Enforced by PostgreSQL** — `SET TRANSACTION READ ONLY` means the server
   itself refuses a write. Also falsified rather than assumed:

```
BEGIN; SET TRANSACTION READ ONLY;
insert into public.admin_users (email, password_hash, role) values (…);
→ ERROR:  cannot execute INSERT in a read-only transaction
   (admin_users afterwards: 0 rows)
```

The static check can be edited around by a determined author. The server-side one
cannot.

## 5. Why no temporary file, and why `stdin` is `/dev/null`

The obvious implementation writes the SQL to `/tmp/d18.sql` on the host and runs
`psql -f`. It was rejected for two reasons.

**It would be a file change on the production host**, which this task forbids —
and a temp file that a failed run leaves behind is a file nobody owns.

**Nested heredocs over `ssh … bash -s` are a real hazard.** The remote script
arrives on bash's *stdin*, so a heredoc inside it is read from that same stream.
Any command that also consumes stdin — `docker run -i` in particular — will
swallow the rest of the script. `deploy-aws.yml` already guards against this with
`</dev/null` on its compose commands (`:282`, `:284`).

So the SQL is captured into a shell variable via `D18_SQL="$(cat <<'SQL' … SQL)"`,
passed to the container with `--env D18_SQL`, and piped inside:

```sh
set +e
docker run --rm -e PGCONNECT_TIMEOUT=15 --env DATABASE_URL --env D18_SQL \
  "$PG_IMAGE" \
  sh -c 'printf "%s\n" "$D18_SQL" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -X' </dev/null 2>&1 | redact
psql_status="${PIPESTATUS[0]}"
set -e
```

* no file is written anywhere;
* `docker`'s stdin is `/dev/null`, so it cannot eat the remaining script;
* both values cross the docker boundary **by name** — see §5.1 for exactly what
  that does and does not protect;
* `-X` skips any `.psqlrc`; `ON_ERROR_STOP=1` means a failed statement stops the
  run rather than scrolling past;
* `errexit` is lifted for the pipeline only, so the true exit code survives the
  `redact` pipe and can be turned into a specific message. `pipefail` stays on.

### 5.1 What "by name" protects — and what it does not

This deserves stating precisely, because the convenient version of the sentence is
false and an earlier draft of this document asserted it.

| | Carries the value? |
|---|---|
| `docker run`'s own argv | **No** — verified: the literal text `printf "%s\n" "$D18_SQL" \| psql "$DATABASE_URL" …` is what appears |
| What `docker inspect` records | **No** — this is the persistent exposure `-e DATABASE_URL=<value>` would create |
| **`psql`'s argv inside the container** | ⚠️ **Yes.** Verified with `ps -eo args`: `psql postgresql://…` is visible. The host sees container processes, so the URI is in the host's process list for the seconds the run lasts |

So the correct claim is: **passing by name keeps the value out of docker's argv and
out of docker's persisted metadata.** It does not make the value absent from every
process list. The residual exposure is bounded by who can already read
`/opt/mipo/.env` on the same host — anyone able to run `ps` there can read the file
directly — which is why it is accepted rather than engineered around. It is not,
however, glossed over.

### 5.2 Connection errors are redacted; SQL errors are not

libpq never prints the password, but its connection errors do name the **host**,
**port**, **user** and **database**, and that output lands in a GitHub Actions log.
Two `sed` rules run over the combined output:

```sh
redact() {
  sed -E \
    -e 's#postgres(ql)?://[^[:space:]"]*#<redacted-connection-string>#g' \
    -e 's#^psql: error:.*#psql: error: <connection details redacted>#'
}
```

Every connection-time detail arrives on a line libpq prefixes with `psql: error:`,
so collapsing that whole line closes the class rather than chasing message formats.
Server-side SQL errors arrive as `ERROR: …` lines, carry no connection details, and
are left **unredacted** — they are the diagnostic the run exists to produce.

Verified against a real `psql` with a fabricated connection string
`postgresql://secretuser:hunter2@db-prod-SECRET.internal:5432/mipo_prod`:

```
before:  psql: error: could not translate host name "db-prod-SECRET.internal" to address: …
after:   psql: error: <connection details redacted>
```

A token scan of the redacted output found **none** of `db-prod-SECRET`,
`secretuser`, `hunter2`, `5432`, `mipo_prod`, or `postgresql://`. A SQL error in the
same test survived intact: `ERROR: relation "no_such_table" does not exist`.

**The two failures stay distinguishable after redaction** because psql's exit codes
are read from `PIPESTATUS` and reported separately — **2** is a connection failure
(reported as `BLOCKED-PROD`), **3** is a statement rejected by the server. Both
verified.

## 6. Query order, and what a missing `0040` looks like

The deployed-state block (`D18-20` … `D18-23`) runs **first**, before the
population queries. This matters for one specific failure.

If `0040` were not applied in production, `D18-05` would fail with
`column "business_id" does not exist` and `ON_ERROR_STOP` would end the run. Had
the schema queries run last, the log would show only that error. Running them
first means the log **already contains** the `admin_users` column list and the
`schema_migrations` count when the failure happens — so the error is a finding
with its own evidence attached, not a puzzle.

This is the OD-18 revision's blocker B-2, which run 54 resolved. The ordering
keeps the diagnosis cheap if it ever returns.

## 7. What the output contains

Counts, aggregates, `business_type`, `is_verified`, timestamps, and technical
UUIDs (`admin_users.id`, `business_id`). **Nothing else.**

Explicitly absent from every statement: `email`, `display_name`, `password_hash`,
`session_token_hash`, `ip_address`, `user_agent`, coupon codes, customer names,
order contents. `D18-24` detects duplicate emails **without selecting one** — it
groups on `lower(email)` and returns only the number of colliding groups.

`D18-19` — whether `ADMIN_API_KEY` is configured — is **not in this workflow.**
It is not a database question, and the only honest way to answer it is a presence
check on the host that prints `SET`/`unset` and never the value. It stays in §5 of
the validation report as a manual step.

## 8. Verified before commit

Run on this branch, against a local PostgreSQL 16 with **all 39 migrations
applied** (`applied_migrations=39`, last `0040_add_admin_users_business_id.sql`) —
the same state production is believed to be in.

| # | Check | Result |
|---|---|---|
| V-1 | YAML parses | ✅ triggers `['workflow_dispatch']`, `permissions {contents: read}`, `environment: production`, 6 steps |
| V-2 | Every `run:` block is valid shell after YAML dedent (`bash -n`) | ✅ 5/5 — including the nested heredoc, the highest-risk part of the file |
| V-3 | The workflow's own read-only guard, against the real file | ✅ PASS — **24 `SELECT` statements + `BEGIN`/`SET TRANSACTION READ ONLY`/`ROLLBACK` = 27**, 0 write statements |
| V-3b | Guard extraction boundaries | ✅ 203 lines, marker to marker; **0** lines from the SSH step, the `DATABASE_URL` prelude or the guard itself |
| V-4 | The same guard against copies with `UPDATE` / `INSERT` injected, and with `SET TRANSACTION READ ONLY` deleted | ✅ **all three correctly FAILED**; untouched control PASSED |
| V-5 | **The SQL actually executes** against the migrated schema | ✅ `psql` exit **0**, every statement returned, ended in `ROLLBACK` |
| V-6 | `SET TRANSACTION READ ONLY` refuses a write | ✅ `ERROR: cannot execute INSERT in a read-only transaction`; table unchanged at 0 rows |
| V-7 | No secret or credential literal in the file | ✅ only `secrets.MIPO_AWS_SSH_PRIVATE_KEY`, a reference |
| V-8 | Not triggered automatically | ✅ `workflow_dispatch` is the only key under `on:` |
| V-9 | No deploy / migration / restart | ✅ no `rsync`, `docker compose up`, `applyMigrations`, `prepare-host.sh`, `sudo` |
| V-10 | `npm run lint`, `npm run typecheck`, `npm run check:imports` | ✅ unchanged — no application file was touched |
| V-11 | Connection-error redaction, against a real `psql` failure with a fabricated host | ✅ hostname, user, password, port and database name all **absent** from the redacted output; SQL errors survive intact |
| V-12 | Exit codes distinguish the two failures | ✅ connection failure → **2** (`BLOCKED-PROD`), SQL failure → **3**; both surface from `PIPESTATUS` through the `redact` pipe |
| V-13 | `docker` cannot swallow the SSH-streamed script | ✅ a deliberately stdin-greedy `docker` stub reported **0 bytes swallowed**; the script continued to its final line |
| V-14 | `BLOCKED-PROD` paths | ✅ missing `.env` → exit 1; `.env` without `DATABASE_URL` → exit 1 |
| V-15 | No value derived from `DATABASE_URL` on the success path | ✅ the only line is *"Connection string located in /opt/mipo/.env. Not printed."* — no URI, length, host, user, port or database name |

**V-5 is the one that matters most.** A workflow whose SQL is syntactically
read-only but references a column that does not exist would fail *in production,
after* the reviewer approved it. Running it against the real migrated schema moves
that discovery to here.

## 9. Not done, deliberately

* **Not committed.** The files are on disk, uncommitted, on `claude/mifo-project-oq44tl`.
* **Not pushed, not merged.** `aws-migration` remains `505d0ae9`; `main` remains `d2089964`.
* **Not run.** No workflow was dispatched. Production has not been contacted.
* **No deploy.** Nothing was released.
* **No credential created, no IAM permission added, no fallback attempted.** The
  blocked endpoints from the validation report were not retried.
* **M1b not created.**

## 10. To use it, later

1. Merge the workflow to a branch GitHub will list it from (workflows are
   dispatchable from the default branch, or from the branch selected in the Run
   workflow dialog once the file exists there).
2. **Actions → D-18 production read-only → Run workflow**, type `READ-ONLY`.
3. Approve the `production` environment prompt.
4. Copy the step log into §6–§10 of `PRODUCTION-ADMIN-POPULATION-VALIDATION.md`
   and change its status from `BLOCKED-PROD` to `PASS`.
5. Read `D18-25` first. A non-zero `platform_role_with_business` or
   `unexpected_role` is a **stop condition for M1b**, not a note — it means M1b's
   CHECK would abort the migration mid-deploy.
