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

Two small changes, and neither involves a secret. This matters: GitHub will not
show you a secret once it is saved, and the SSH key for the production host
exists nowhere else we could find — so any plan that needed a second copy of it
was a plan that could not be carried out.

**1. Add yourself as a reviewer on the environment that already exists.**

Settings → Environments → **production** → tick **Required reviewers** → add
yourself → **Save protection rules**. Leave "Prevent self-review" off, or you
cannot approve your own merge.

Nothing else about that environment changes. The SSH key already stored in it
stays where it is.

**2. Add one repository variable.**

Settings → Secrets and variables → Actions → **Variables** tab →
**New repository variable**:

| Name | Value |
|------|-------|
| `MIPO_PUBLIC_BASE_URL` | `https://mipo.pet` |

This is what the quality gate reads now that it no longer targets an
environment — which is the whole point of the change: a protected environment
asks for its approval when the *first* job targeting it starts, so leaving the
quality gate on it would have asked you to approve before a single test had run.
A repository variable is visible and editable, and it is not a secret.

The code carries `https://mipo.pet` as a fallback, so a forgotten variable
degrades to the right value rather than to an empty one.

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
