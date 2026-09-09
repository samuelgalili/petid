# The work environment

All of MIPO, running on your own machine, at **http://localhost:8080**.

Nothing reaches production from here. The only database it knows about is the
one it starts itself, in a container, on your laptop.

## Why it exists

Until now every change was seen for the first time by customers. On 8 September
that cost four hours of downtime and a shop whose category filter quietly
returned nothing. From now on a change is looked at here first, and goes to
production only when you say so.

## Once, before the first run

Docker Desktop must be installed and running. Nothing else — the script builds
what it needs.

## Every day

```bash
bash scripts/workbench.sh up
```

That builds the frontend, starts Postgres, the API and Caddy, applies all the
migrations, and seeds the catalogue if it is empty. When it finishes it prints
the address and the two logins.

To look at a branch I have pushed:

```bash
git fetch origin
git checkout claude/<branch-name>
bash scripts/workbench.sh restart
```

`restart` rebuilds the frontend and the API and re-applies migrations, keeping
the data. Then open http://localhost:8080 and see for yourself.

| | |
|---|---|
| `workbench.sh up` | build, start, migrate, seed if empty |
| `workbench.sh restart` | rebuild for the current branch, keep the data |
| `workbench.sh seed` | re-seed the catalogue |
| `workbench.sh load <dump.sql.gz>` | restore a production dump over it |
| `workbench.sh logs` | follow the API log |
| `workbench.sh psql` | a shell on the database |
| `workbench.sh status` | what is running, and whether it is healthy |
| `workbench.sh down` | stop it, keep the data |
| `workbench.sh reset` | stop it and delete the data |

## The logins

```
admin      admin@mipo.local  /  workbench-admin-1234
customer   dana@mipo.local   /  workbench-user-1234
```

Both exist only here. Email is not sent: verification and password-reset codes
come back in the API response instead, so those flows can be walked through
without a mail provider. The server refuses to start that way when
`NODE_ENV=production`, which is the guard that should exist.

## What the seed deliberately gets wrong

A workbench full of tidy data would have shown none of the bugs that reached
customers, so the seed reproduces the ones production has:

- **Six duplicate SKUs.** This is what stopped a deploy halfway through on
  8 September, after a migration had already dropped four columns — which left
  the old API running against the new schema and nobody able to log in.
- **Products with no `category_id`,** filed only under a free-text category.
  These are the ones that disappear when a category is picked in the shop.
- **A category with 27 products,** so the row that previews ten and the "הכל"
  button that opens the rest can both be seen doing their job.
- **Products with no SKU and no weight,** which the warehouse label has to
  survive rather than print blanks for.

CI checks that the seed still produces all of this, so it cannot quietly become
tidy.

## Loading real production data

More faithful than any seed, and the only way to catch a problem that is in the
data rather than the code. It needs a dump, which today means someone with
access to the production host or to RDS.

```bash
bash scripts/workbench.sh load ~/Downloads/20260908T115208Z-deploy.sql.gz
```

Before you do: **a production dump is a complete copy of every customer
record** — names, email addresses, phone numbers, delivery addresses, order
history. On your own machine that is a reasonable thing to hold for an
afternoon; it is not something to leave in Downloads for a month or put on a
shared drive. Check that FileVault is on, and delete the file when you are done.
`.sql.gz` files are ignored by git, so one cannot be committed by accident.

## From here to production

1. I push a branch and tell you what to look at.
2. You run it here and look.
3. If it is right, you say so — and only then do I merge it to `aws-migration`.
4. The merge itself waits for your approval a second time, in GitHub, after the
   tests have run. See `docs/DEPLOY_APPROVAL.md`.

Nothing skips step 2.
