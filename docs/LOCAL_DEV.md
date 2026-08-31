# Running MIPO locally

The whole stack on your own machine: PostgreSQL, the Node API, and the Vite
frontend, with nothing touching AWS. This is where you look at a change before
it goes anywhere near production.

Every command below was run end to end before it was written down.

## What you end up with

| | |
|---|---|
| `http://localhost:8080` | the app — this is the one you open |
| `http://127.0.0.1:3000` | the API. Vite proxies `/api` to it, so you rarely call it directly |
| `127.0.0.1:5432` | PostgreSQL in a container |

## Prerequisites

- Node.js 20.19 or newer
- PostgreSQL 16. Docker is the portable option and is what the commands below
  assume. On a Mac without Docker, `brew install postgresql@16` works just as
  well — only the connection string changes.

## One-time setup

```bash
git clone https://github.com/samuelgalili/petid.git
cd petid
git checkout aws-migration
npm ci
npm ci --prefix server
```

**Check out `aws-migration` before installing anything.** A fresh clone lands on
`main`, which is the pre-AWS branch and is not the running system. Its
`package-lock.json` is also out of step with its `package.json`, so `npm ci`
there fails with a wall of `Missing: ... from lock file` — that is the wrong
branch talking, not a broken machine.

Start the database, either way round.

With Docker:

```bash
docker run -d --name mipo-db -p 5432:5432 \
  -e POSTGRES_USER=mipo -e POSTGRES_PASSWORD=mipo -e POSTGRES_DB=mipo \
  postgres:16-alpine
```

Or with Homebrew on a Mac:

```bash
brew install postgresql@16
brew services start postgresql@16
createdb mipo
```

Homebrew's PostgreSQL trusts your own macOS account, so the connection string
becomes `postgres://$(whoami)@127.0.0.1:5432/mipo` — no password.

Create `.env` in the repository root. This is the minimum that boots the stack —
only `DATABASE_URL` is genuinely required, the rest saves you flags:

```bash
DATABASE_URL=postgres://mipo:mipo@127.0.0.1:5432/mipo
DB_SSL=false
PORT=3000
VITE_API_URL=/api
VITE_API_PROXY_TARGET=http://127.0.0.1:3000
UPLOAD_DIR=./uploads
PRIVATE_UPLOAD_DIR=./private-uploads
```

`.env` is ignored by git, and CI fails the build if one is ever committed.

## Choosing what to run

To review work that lives on a branch, remember that a branch cut before the
current `aws-migration` head does not contain what landed after it. Checking one
out alone shows you that branch's work without everyone else's.

To see the combined result — what production would actually look like after the
merge — build it locally:

```bash
git fetch origin
git checkout -B review origin/aws-migration
git merge --no-edit origin/claude/some-branch origin/claude/another-branch
```

`review` is a scratch branch. Delete and rebuild it whenever you want.

## Running

```bash
npm run db:migrate
```

It prints how many migrations it applied. A second run reports
`applied_migrations=0` — that is the ledger doing its job, not a failure.

Then two terminals:

```bash
npm run dev:api     # terminal 1 — API on 3000
npm run dev         # terminal 2 — Vite on 8080
```

Open <http://localhost:8080>.

## Getting in the first time

**The database is empty.** No accounts, no orders — a production login will not
work here. Sign up rather than log in; they are two different screens:

| | |
|---|---|
| `/signup` | create an account — this is the one you want |
| `/auth` | log in with an account that already exists locally |

The signup form needs **five** fields, and the submit button stays disabled
until all of them are filled: full name, **date of birth**, email, password (8
characters minimum), and password confirmation. The date of birth is the one
people miss — leave it blank and the form simply never becomes submittable.

**There is no email verification.** Signing up logs you straight in; no message
is sent and none is expected. (`requireEmailVerification` appears in the admin
settings screen, but that toggle is not wired to anything.)

To skip the form entirely and know exactly what credentials you have:

```bash
curl -s -X POST http://localhost:8080/api/auth/signup \
  -H 'content-type: application/json' \
  -d '{"email":"me@local.test","password":"local-password-123","full_name":"Local User"}'
```

A response containing `"user"` means the account exists; log in at `/auth`.

For the admin screens, which need a separate account:

```bash
npm --prefix server run admin:provision -- \
  --email admin@local.test --role admin --display-name "Local admin"
```

It prints a one-time temporary password that must be changed on first use.

## What works without secrets, and what does not

The catalogue seed gives you ten products, so the shop is not empty.

| Works | Disabled without a key |
|---|---|
| Signup, login, sessions | Payments — CardCom is off when its four values are empty, which is deliberate |
| Profile, pets, health records | Outbound email — no `RESEND_API_KEY`, so password-reset codes are not sent |
| Shop, cart, order creation | AI features — no `GEMINI_API_KEY` for breed detection or pet characters |
| Community feed, comments, polls | |
| Admin screens | |

Never point a local environment at CardCom's live terminal. If you need to
exercise checkout, ask CardCom for test credentials.

## Seeding a case you need to see

A local database starts empty, so anything whose behaviour depends on data that
only exists in production cannot be checked by looking. A fix to how a cancelled
order is displayed shows nothing until a cancelled order exists locally.

Seed the case rather than hunting for it. This creates three orders in different
states against your local account:

```bash
export PATH="$(brew --prefix postgresql@16)/bin:$PATH"   # Homebrew only
psql "postgres://$(whoami)@127.0.0.1:5432/mipo" <<'SQL'
insert into public.orders (order_number, user_id, customer_email, customer_name, status, payment_status, total, order_date)
select
  'LOCAL-' || upper(s.status) || '-' || lpad(floor(random()*9999)::text, 4, '0'),
  au.id, au.email, au.full_name, s.status, 'paid', s.total, now() - (s.days || ' days')::interval
from public.app_users au
cross join (values ('cancelled', 25.00, 1), ('delivered', 38.90, 3), ('shipped', 7.99, 5)) as s(status, total, days)
where lower(au.email) = lower('me@local.test');
SQL
```

Change the email to whichever account you signed up with. `/profile` and
`/order-history` then show all three.

The same approach covers any state that is awkward to reach through the UI — a
failed payment, an archived pet, a reported post. Writing SQL against a
disposable local database is the fast path here, not a workaround.

## Checking a schema change

Anything that touches `server/sql` deserves more than a glance at the UI. With
the API stopped, run the same smoke test CI runs:

```bash
DATABASE_URL=postgres://mipo:mipo@127.0.0.1:5432/mipo node server/scripts/db-smoke.mjs
```

It boots the API, exercises signup, session read, profile update, pets, feed,
notifications, orders, documents and the public QR view, and treats any 5xx as a
failure — that being the signature of a query still selecting a column a
migration removed.

The paths worth clicking through by hand after an identity or profile change:
**sign up → open the profile → change the name and phone → save → reload.** If
those persist and display correctly, the schema and the API agree.

## Resetting

The database is disposable. To start clean:

```bash
docker rm -f mipo-db
# then run the docker run command again, and npm run db:migrate
```

Uploaded files live in `./uploads` and `./private-uploads`; delete them too if
you want a genuinely empty slate.

## When something does not start

**`DATABASE_URL is required`** — the API cannot see your `.env`. Run
`npm run dev:api` from the repository root, not from `server/`.

**Connection refused on 5432** — the container is not up. `docker ps` to check,
`docker start mipo-db` to resume it after a reboot.

**`self-signed certificate` or a TLS error** — `DB_SSL=false` is missing.
A local PostgreSQL has no TLS; RDS does, which is why the default assumes it.

**Port already in use** — something else holds 3000 or 8080. Change `PORT`, or
pass `--port` to Vite.

**Migrations refuse to run on a database that already has tables** — that guard
is for a schema predating the ledger. On a local database the fix is to delete
the container and start over, not to force a baseline.

**`npm ci` reports dozens of `Missing: ... from lock file`** — you are on
`main`. Run `git checkout aws-migration` and install again. Do not reach for
`npm install` to "fix" the lock file: on the right branch it is already correct,
and rewriting it on the wrong one produces a diff nobody wants to review.
