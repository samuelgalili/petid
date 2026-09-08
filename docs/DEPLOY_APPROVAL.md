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

Two clicks and one variable. Nothing has to be created, and no key has to be
moved — the approval goes on the `production` environment that already exists
and already holds the SSH key.

That last point is the whole reason the setup looks like this. A GitHub secret
cannot be read back after it is saved. An earlier version of this gate used a
second environment, `production-apply`, which would have needed its own copy of
`MIPO_AWS_SSH_PRIVATE_KEY` — and nobody can copy a value they cannot read, so it
would have meant generating a new SSH key and installing it on the server. The
gate now needs neither.

### 1. Put the reviewer on the existing environment

**Settings → Environments → `production`**

- **Required reviewers** — add yourself. Optionally also Shahar.
  Leave "Prevent self-review" off, or nobody can approve their own merge.

Leave its secret and variables exactly as they are.

This is safe to do only because the quality gate is no longer bound to an
environment: it uses no secrets, so it does not need one. If you ever bind it
again, the approval prompt will fire before the tests run and the gate becomes
theatre.

### 2. Add one repository variable

**Settings → Secrets and variables → Actions → Variables → New repository
variable**

| Name | Value |
|------|-------|
| `MIPO_PUBLIC_BASE_URL` | `https://mipo.pet` |

This is what the frontend is built against. It is a variable, not a secret —
it is a public URL. Strictly speaking the workflow already falls back to this
exact value, so the build works without it; set it anyway, so the address the
bundle is built with is written down somewhere you can change it.

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
