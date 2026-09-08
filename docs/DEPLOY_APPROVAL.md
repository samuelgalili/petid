# The production approval gate

Merging into `aws-migration` starts a deploy. Until now that deploy ran all the
way to the live host with nothing in between — no pause, no rollback. This adds
one pause, in the one place where it helps.

## What the pipeline does now

```
push to aws-migration
   │
   ├─ Quality gate ─────────  audits, server tests, lint, typecheck, build,
   │                          60 browser tests. No approval needed: it touches
   │                          nothing outside the runner.
   │
   ├─ ⏸  WAITING FOR YOU      only if the quality gate went green
   │
   └─ Deploy tested build ──  rsync → build image → dump the database →
                              rehearse the migrations on a copy of that dump →
                              apply them for real → restart API → restart Caddy
                              → smoke test
```

You are asked to approve **after** the tests have run, so what you are approving
is a build whose result you can already see. A red quality gate never reaches
you.

## One-time setup in GitHub

This needs an environment that does not exist yet. Without it the deploy job
fails at "Configure SSH" — before it has touched the host — so a half-finished
setup cannot hurt production.

**Settings → Environments → New environment**, named exactly:

```
production-apply
```

Then, inside it:

1. **Required reviewers** — add yourself. Optionally also Shahar.
   Leave "Prevent self-review" off, or nobody can approve their own merge.

2. **Environment secrets** — add:

   | Name | Value |
   |------|-------|
   | `MIPO_AWS_SSH_PRIVATE_KEY` | the same key as in the existing `production` environment |

   Secrets are per-environment; the new environment cannot see the old one's.

3. **Environment variables** — copy these across from `production`:

   | Name | Value today |
   |------|-------------|
   | `MIPO_AWS_HOST` | `63.183.241.110` |
   | `MIPO_AWS_USER` | `ubuntu` |
   | `MIPO_REMOTE_PATH` | `/opt/mipo` |
   | `MIPO_PUBLIC_BASE_URL` | `https://mipo.pet` |

The existing `production` environment stays as it is — the quality gate still
reads its variables, and it must **not** get a required reviewer, or you would
be asked to approve before the tests have run.

## Approving a deploy

GitHub emails you and shows a **Review deployments** button on the run. Open the
run first: the quality gate's result is right there. Approve, and the deploy
continues. Do nothing, and nothing happens — the deploy waits, and production
stays as it is.

## The rehearsal, and what a failure means

Before the migrations touch production, the deploy restores the dump it has just
taken into a disposable postgres container and runs the same migrations against
that copy. If they fail there, the deploy stops with production untouched.

This is not theoretical. On 8 September, `0021_entity_identifiers.sql` refused to
run because six SKUs were duplicated in the catalogue. It refused *after*
`0019_profile_identity_dedup.sql` had already dropped four columns from
`profiles`, and because migrations had failed the API was never replaced — so the
previous API kept querying columns that no longer existed. Customers could not
log in for four hours. A rehearsal would have caught it before anything moved.

If you see:

```
dry-run: the migrations failed against a copy of production.
dry-run: production has NOT been touched.
```

then the deploy did the right thing. Read the error above it, fix the cause —
usually data, not code — and deploy again.

If instead you see:

```
dry-run: the dump could not be restored - the backup is not usable
```

that is worth stopping for on its own. It means the backup taken moments earlier
could not be restored, which means it was never a safety net.
