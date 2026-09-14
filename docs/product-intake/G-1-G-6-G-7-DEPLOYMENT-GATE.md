# Deployment Gate — G-1 · G-6 · G-7

# STATUS: `READY-FOR-EXPLICIT-MERGE-APPROVAL`

**Date:** 2026-09-14
**No production action occurred.** Nothing was merged, pushed to a protected branch,
deployed, or migrated. The candidate exists only in the local working copy.

---

## 1. Source, target, and the candidate

| | |
|---|---|
| **Source branch** | `claude/mifo-project-oq44tl` |
| **Source commit** | `d4cdb13637bdc35bed0c5b5e8306d194d5d46e51` |
| **Target branch** | `aws-migration` *(merging into this **is** deploying to production)* |
| **Target commit** | `1a5246ea323d8050fec380ce4071e0d3a0e2536e` |
| **Merge base** | `a9264a4b95674af22f1dd72b6de21203bdf90f59` — *"Collect every open decision into one list"* |
| **Candidate branch** | `validation/g1-g6-g7-candidate` — **local only, never pushed** |
| **Candidate commit** | `fe13d83c9ba97bc9bdc33fe129d00c591d8fb7b4` |
| `main` | `d20899641e8e331a20f29582fb21757ef262c434` — untouched, not a target |

The candidate is reproducible exactly:

```bash
git checkout -B validation/g1-g6-g7-candidate origin/aws-migration
git merge --no-ff claude/mifo-project-oq44tl
```

---

## 2. Merge graph — the branches have diverged

```
ahead  (branch, not in production):  16 commits
behind (production, not on branch):   7 commits
production is an ancestor of HEAD:   NO — diverged
```

**This was checked rather than assumed**, and the answer is reassuring for a specific
reason:

```
git diff HEAD...origin/aws-migration   →  empty
```

All 7 production-only commits are **merge commits from earlier deployments of this same
branch**. They introduce **no content the branch lacks**. The divergence is purely
topological, so the merge is clean:

* no conflicts;
* the merged tree is **byte-identical to the work branch** (`git diff` between them is
  empty), so the merge introduced no surprise content.

### Checkpoint ancestry — verified

| Checkpoint | Commit | Ancestor of source? | Already in production? |
|---|---|---|---|
| G-1 Legacy Intake Freeze | `8e04e022` | ✅ yes | ❌ no |
| G-6 Ownership Review Queue | `27d594db` | ✅ yes | ❌ no |
| G-7 Legacy Exposure Measurement | `37807570` | ✅ yes | ❌ no |
| G-7P production validation report | `d4cdb136` | ✅ yes | ❌ no |

### ⚠️ The candidate carries more than the three checkpoints

Five commits in the candidate touch application code, not three. Two are the **image-fetch
security work**, approved and pushed earlier in this session but never deployed:

| Commit | What it is |
|---|---|
| `67bdae58` | Route image downloads through the SSRF guard the scraper already uses |
| `987a9b4f` | Bound the image download deadline to the body, not just the headers |

These are the only changes in the candidate that modify **existing** behaviour
(`imagePipeline.js`, `urlSafety.js`). They close a real SSRF hole and a stalled-download
hang. **They are in scope for the merge but were not part of this task's brief**, so they
are called out here rather than travelling silently.

Everything else in the 16 commits is documentation.

---

## 3. Fresh test results — run from the candidate, `fe13d83c`

Every result below was produced **on the candidate branch after the merge**, against a
freshly created local database with all 38 migrations applied. No earlier result is reused.

| Suite | Command | Result |
|---|---|---|
| G-1 freeze | `node --test test/legacyIntakeFreeze.test.js` | ✅ **13/13** |
| G-6 ownership review | `node --test test/ownershipReview.test.js` | ✅ **26/26** |
| G-7 exposure measurement | `node --test test/legacyExposureMeasurement.test.js` | ✅ **17/17** |
| Image-fetch security | `node --test test/imageFetchSafety.test.js` | ✅ **26/26** |
| Full server suite | `npm test` (with database) | ✅ **339/339**, 0 skipped |
| Database smoke | `node scripts/db-smoke.mjs` (clean DB) | ✅ **27/27** |
| Pet-facts integration | `npm run test:integration:pet-facts` | ✅ all pass |
| Typecheck | `npm run typecheck` | ✅ |
| Lint | `npm run lint` | ✅ |
| Import checks | `npm run check:imports` | ✅ (60 known gaps, unchanged) |
| Build | `npm run build` | ✅ 191 precache entries |
| Migrations | — | **not run against production**; local scratch only |

---

## 4. Changed files

| Scope | Files | Added | Removed |
|---|---|---|---|
| Everything | 25 | +7,948 | −41 |
| Application code only | 12 | +3,054 | −41 |

**All 41 removed lines are in `server/src/imagePipeline.js`** — the image-fetch security
rewrite. Every other changed file in the candidate is **purely additive**.

`server/src/index.js`: **+238, −0**. Four hunks, all additions:

| Hunk | What |
|---|---|
| `@@ +18` | imports for the three modules |
| `@@ +4446` | G-6 queue and G-7 service functions |
| `@@ +4622` | the G-1 guard, as the first statement of `createProduct` |
| `@@ +8868` | the three new admin routes |

**Zero lines removed from `index.js` means no existing route, handler or behaviour was
altered there.**

New modules: `legacyIntakeFreeze.js`, `ownershipReview.js`, `legacyExposureMeasurement.js`.
New tests: four files. `adminPermissions.js`: +4 (one permission constant).

---

## 5. Migration summary

**No migration is added, changed or removed.**

```
git diff --name-only origin/aws-migration HEAD -- server/sql/ '*.sql'   →  empty
```

None of the three checkpoints requires one. G-6 stores review state as append-only rows in
the existing `admin_audit_log`; G-1 uses an environment flag; G-7 reads columns that
already exist. No schema change, and none pending.

---

## 6. Safety review — verified on the candidate by inspection

### G-1 Legacy Intake Freeze

| Claim | Evidence |
|---|---|
| Blocks only legacy scraped intake | one call site: `index.js:4626`, the first statement of `createProduct` |
| Does not block CSV/Excel import | discriminator is `Boolean(String(body?.source_url ?? "").trim())`; the spreadsheet parser sets no source column, so those rows are not scraped-backed |
| Does not change PATCH or DELETE | `assertLegacyIntakeAllowed` occurs **0 times** inside `updateProduct`, and 0 times in any delete path |
| Fails safe | frozen unless the flag is exactly `"false"` |

### G-6 Ownership Review Queue

| Claim | Evidence |
|---|---|
| Read-only except append-only audit rows | `ownershipReview.js` contains **1 `insert into`** (the audit row) and **1 `select`** — no `update`, `delete`, `truncate`, `alter` or `drop` |
| Does not change `business_id` or `supplier_id` | no `update` against `business_products` or `scraped_products` in any of the three modules |
| Does not change publication or visibility | no such column exists to change |
| Does not reassign ownership | a verified decision records a human's conclusion; the product row is read, never written |

### G-7 Legacy Exposure Measurement

| Claim | Evidence |
|---|---|
| SELECT-only | **27 `select` statements and no other SQL verb.** The one `alter` match is prose inside a `reason` string at line 308 |
| Writes no audit row | no `insert into public.admin_audit_log` anywhere in the module |
| No injection surface | no `SELECT *`, no interpolation of request input into SQL |

### Order, cart, checkout, price

**Unchanged.** The only order-related line anywhere in the candidate's `index.js` diff is a
read inside the G-6 queue:

```sql
exists (select 1 from public.order_items oi where oi.product_id = c.id) as has_order_exposure
```

No line touching `resolveCatalogOrderItem`, `createOrder`, `calculateOrderAmounts`,
`normalizeRequestedOrderItems`, cart handling or price resolution is added or removed.

---

## 7. Known limitations

1. **The candidate is local and unpushed.** It lives only in this working copy and will not
   survive the container. The recreate command in §1 reproduces it exactly from two
   published commits.
2. **No production validation.** Every result here is from a local scratch database. No
   figure in this report describes production, and none is implied to.
3. **Deploying does not answer the measurement question by itself.** It makes the G-7
   endpoint exist; somebody must then run it and bring back the JSON.
4. **G-1 takes effect immediately on deploy.** Scraped-backed creation through the admin
   screens begins returning `409 LEGACY_INTAKE_FROZEN`. That is the intended behaviour and
   it is reversible by an environment variable, but it is a **visible change for admins on
   the first deploy** — not a silent one.
5. **The image-fetch security commits ride along** (§2). They change existing behaviour;
   everything else is additive.
6. **No enforcement decision is made or implied here**, per the decision gate. Nothing in
   this candidate hides a product, blocks a checkout, migrates anything or reassigns a
   seller.

---

## 8. Explicit statement of no production action

* **Not merged.** `aws-migration` is still `1a5246ea`.
* **Not pushed.** The candidate branch exists only locally; `git ls-remote` shows no such
  remote ref.
* **Not deployed.** No workflow was triggered. The deploy workflow fires on pushes to
  `aws-migration` and `staging`; neither was pushed.
* **No migration run against production.** Only a local throwaway database was migrated.
* **No production data touched.** Production was never contacted in this task.
* **`main` untouched**, and it is not a target.

---

## 9. Approval status

# `READY-FOR-EXPLICIT-MERGE-APPROVAL`

The candidate merges cleanly, every gate passes from the candidate state, no migration is
involved, and the safety boundaries are verified by inspection rather than recalled.

**What approval would mean, stated plainly:** merging `claude/mifo-project-oq44tl` into
`aws-migration` **is** deploying to production. It would, in one step:

1. put the legacy intake freeze into effect (admins can no longer create scraped-backed
   products);
2. make the ownership review queue exist;
3. make the G-7 measurement endpoint exist, so `G-7P` becomes runnable;
4. ship the two image-fetch security fixes.

**This gate does not grant that approval and does not ask for it implicitly. Samuel
decides.**
