# M1 — Merge Readiness

**Date:** 2026-09-14 · **Status: ready for explicit merge approval. Not merged, not deployed.**

---

## 1. Source and target

| | |
|---|---|
| **Source commit** | `8082757c578a9f647f0aa5b9c04d2f36f597a17e` |
| **Target branch** | `aws-migration` @ `3815fcf15249099e80da81124ad1f136c0c8207c` |
| **Candidate** | `validation/m1-only-candidate` @ `e937c2cf` — **local only, never pushed** |
| `main` | `d20899641e8e331a20f29582fb21757ef262c434` — untouched, not a target |

Reproducible exactly:

```bash
git checkout -B validation/m1-only-candidate origin/aws-migration
git cherry-pick 8082757c
```

## 2. ⚠️ A branch merge would **not** be an M1-only merge

The work branch is 9 commits ahead of `aws-migration`. **Two of them touch code, not one:**

| Commit | Contents | In this merge? |
|---|---|---|
| `8082757c` | **M1** — migration, test, plan | ✅ **yes** |
| `f65d2bcd` | **Stage 0** — `POST /api/products` → 410 Gone, plus the 500→400 validation fix | ❌ **no — deliberately excluded** |

The other seven commits are documentation only.

> **Merging the branch would therefore also deploy Stage 0**, which closes product creation
> for every admin screen — a visible behaviour change that has not been approved for this
> merge.
>
> **This is why the candidate is a cherry-pick of `8082757c` rather than a branch merge.**
> A merge of `claude/mifo-project-oq44tl` into `aws-migration` is *not* what was asked for
> and should not be used.

## 3. Files included — exactly three

```
docs/product-intake/M1-ADMIN-BUSINESS-ID-IMPLEMENTATION-PLAN.md   +246
server/sql/0040_add_admin_users_business_id.sql                    +38
server/test/adminBusinessScope.test.js                            +205
3 files changed, 489 insertions(+), 0 deletions(-)
```

**Zero deletions. Zero production source files.** No change to `adminPermissions.js`,
`provisionAdmin.js`, `isAdminRequest`, sessions, permissions, routes, cart, checkout,
catalogue or orders.

Cherry-pick applied with **zero conflicts**.

## 4. Verification

| # | Check | Result |
|---|---|---|
| 1 | `8082757c` contains only the three expected files | ✅ verified |
| 2 | No additional migrations | ✅ exactly one new file vs `aws-migration`: `0040_add_admin_users_business_id.sql` |
| 3 | `main` unchanged | ✅ `d2089964` |
| 4 | `aws-migration` unchanged | ✅ `3815fcf1` |
| 6 | Runner sees `0040` as the next file | ✅ `applied 0039…` → `applied 0040…`, `applied_migrations=39` |

## 5. Tests — run **on the candidate**, from `e937c2cf`

Against a freshly created database migrated by the candidate itself.

| Gate | Result |
|---|---|
| M1 tests (`adminBusinessScope.test.js`) | ✅ **11/11** |
| Full server suite | ✅ **350/350**, 0 skipped |
| DB smoke | ✅ **27/27** |
| typecheck | ✅ |
| lint | ✅ |
| imports | ✅ (60 known gaps, unchanged) |
| build | ✅ |

> **Why these numbers differ from the work branch** (355 tests, 32 smoke checks): the
> candidate is built on `aws-migration`, which does not contain Stage 0. Its 5 unit tests
> and 5 smoke checks are correctly absent. **350 = 339 on `aws-migration` + 11 from M1**;
> **27 = the pre-Stage-0 smoke set.** Nothing is missing — the difference is exactly the
> code this merge excludes.

## 6. Migration order

| | |
|---|---|
| Deployed today | 38 files, highest `0039_backfill_pet_weight.sql` |
| After this merge | 39 files, highest `0040_add_admin_users_business_id.sql` |
| Runner discovery | `/^\d+_.+\.sql$/`, lexicographic sort — `0040` sorts last |
| Applied in one transaction | yes, with a recorded sha256 checksum |
| Dependencies | none. M1 depends on no other migration |

## 7. Rollback

Full procedure, including the production-specific steps, is in
[`M1-ADMIN-BUSINESS-ID-IMPLEMENTATION-PLAN.md`](./M1-ADMIN-BUSINESS-ID-IMPLEMENTATION-PLAN.md) §8.

In short: drop the index, drop the column, delete the `schema_migrations` row — operator
SQL, because the runner is forward-only. **In production, count
`business_id IS NOT NULL` first**; anything non-zero means the rollback destroys
assignments that exist nowhere else. Rehearsed on a populated database: row count
unchanged, and the migration re-applies cleanly afterwards.

## 8. M1b is excluded — explicitly

**This merge contains no part of M1b.** Not the role CHECK, not the scope CHECK, not
`seller_admin`, not `readonly_admin`, no change to `adminPermissions.js` or
`provisionAdmin.js`.

**Consequence, stated plainly:** after this merge `admin_users.business_id` exists and is
usable by nothing. `admin_users_role_check` still permits only `admin` and
`product_manager`, so **no Seller-scoped account can be created and no isolation begins
working.** M1 is capacity, not capability — which is precisely why it is safe to merge on
its own.

## 9. Outstanding items this merge does not resolve

| | |
|---|---|
| **OD-18** | Production admin population is still **unmeasured**. It does not gate M1 — every row gets NULL by construction, and nothing reads the column — but it **does** gate M1b |
| **`isAdminRequest`** | The public-endpoint widening (🔴 critical) is untouched. It is not reachable without Seller roles, so M1 does not expose it. **M1b must not ship before it is fixed** |
| Stage 0 | Remains unmerged and undeployed |

## 10. No production action occurred

* **Not merged** — `aws-migration` is still `3815fcf1`
* **Not pushed** — the candidate is local; `git ls-remote` shows no such remote ref
* **Not deployed** — no workflow triggered
* **No migration run against production** — only local throwaway databases
* **No production data touched** — production was never contacted
* **`main` untouched**

---

# Status: `READY-FOR-EXPLICIT-MERGE-APPROVAL`

Merging into `aws-migration` **is** deploying to production. On approval, the deploy would
apply `0040` and add one nullable column. No behaviour changes.

**Use the cherry-pick candidate, not a branch merge** (§2).
