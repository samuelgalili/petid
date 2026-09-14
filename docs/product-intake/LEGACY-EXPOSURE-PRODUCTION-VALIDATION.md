# G-7P — Production Measurement Validation

# STATUS: `BLOCKED-PROD`

**Date:** 2026-09-14 · **Branch:** `claude/mifo-project-oq44tl`
**The request was not executed. No metric is reported. Nothing was estimated.**

---

## 1. Validation status

**`BLOCKED-PROD`** — on **two independent blockers**, either of which alone is sufficient.

| | Blocker | Can credentials fix it? |
|---|---|---|
| **B-1** | **The endpoint does not exist in production.** Production serves `1a5246ea`, which contains no route, no permission and no module for this measurement. | ❌ **No.** |
| **B-2** | No network path, credential or session reaches production from this environment. | ❌ Not from here. |

> ### The finding that matters most
>
> **B-1 is decisive and is not an access problem.** Even a fully authorised operator,
> sitting on the production host right now with every credential, **cannot run this
> endpoint** — there is nothing at that path to run. `GET /api/admin/products/legacy-exposure`
> would return `404 Not found`.
>
> The task framing assumed the endpoint exists in production and only access was missing.
> It does not exist. **The next step is a deployment decision, not an access decision.**

---

## 2. Preflight checks — 4 of 7 failed

| # | Check | Result |
|---|---|---|
| 1 | Target database is Production | ❌ **NOT ESTABLISHED.** No connection was made. Per instruction, a hostname was never treated as proof. |
| 2 | Application instance is the intended Production instance | ❌ **NOT ESTABLISHED.** Not reachable. |
| 3 | Serving version contains `37807570` or an approved descendant | ❌ **FAILED — verified.** See §3. |
| 4 | Authenticated account holds `PRODUCTS_OWNERSHIP_REVIEW` | ❌ **IMPOSSIBLE.** That permission does not exist in the deployed build. |
| 5 | Endpoint is reachable | ❌ **FAILED.** Both absent from the build and unreachable from here. |
| 6 | No migration pending or triggered by the request | ✅ **Verified by code** — the route runs `SELECT`s only and no migration path. Moot, since the request did not run. |
| 7 | Connection is read-only | ⛔ **`NOT_VERIFIABLE`.** No connection exists to characterise. |

---

## 3. Preflight 3 — the version check, verified three ways

**Production branch tip:** `aws-migration` = `1a5246ea323d8050fec380ce4071e0d3a0e2536e`

```
git merge-base --is-ancestor 37807570 1a5246ea  →  DOES NOT CONTAIN 37807570
```

Against the deployed tree at `1a5246ea`:

| Artefact | Occurrences in the deployed source |
|---|---|
| route `legacy-exposure` in `server/src/index.js` | **0** |
| `PRODUCTS_OWNERSHIP_REVIEW` in `server/src/adminPermissions.js` | **0** |
| `server/src/legacyExposureMeasurement.js` | **file absent** |

### Related fact the report would be incomplete without

**None of the three approved checkpoints is running in production.**

| Checkpoint | Commit | In production? |
|---|---|---|
| G-1 Legacy Intake Freeze | `8e04e022` | ❌ **No** |
| G-6 Ownership Review Queue | `27d594db` | ❌ **No** |
| G-7 Exposure Measurement | `37807570` | ❌ **No** |

`assertLegacyIntakeAllowed` appears **0 times** in the deployed `index.js`.

> **The legacy intake freeze is not protecting production.** It is approved at code level
> and sitting on the work branch, 15 commits ahead of production. Scraped-backed products
> can still be created in production exactly as before. This is stated because "approved"
> and "in effect" are easy to conflate, and here they are not the same thing.

---

## 4. Environment metadata (no secrets)

| Field | Value |
|---|---|
| Environment label | *not established* — no connection made |
| Deployment identifier | *not obtained* |
| Production branch tip | `1a5246ea323d8050fec380ce4071e0d3a0e2536e` |
| Commit under validation | `37807570` (work branch only) |
| Work branch | `claude/mifo-project-oq44tl`, 15 commits ahead of production |
| Intended route | `GET /api/admin/products/legacy-exposure` |
| HTTP status | **none — request not executed against production** |
| Timestamp of attempt | `2026-09-14T16:27:46Z` |
| Database target label | *not established* |

**Recorded nowhere in this report:** `DATABASE_URL`, passwords, tokens, cookies,
authorization headers, connection strings, customer data. None was available to record.

---

## 5. Access verification — nine routes, all closed

| # | Route | Result |
|---|---|---|
| 1 | `DATABASE_URL` in environment | absent |
| 2 | `.env` file in repository | absent (only `.env.example`) |
| 3 | AWS credentials | **placeholders** — both literally the string `proxy-injected` |
| 4 | AWS CLI | not installed |
| 5 | SSH key for the deploy host | `~/.ssh` empty |
| 6 | Outbound TCP/5432 | blocked (HTTPS-through-proxy only) |
| 7 | Deploy host `:22` | unreachable |
| 8 | HTTPS to `mipo.pet` | **denied by egress policy** — `CONNECT tunnel failed, response 403`; the proxy refused the connection, so no request reached the application |
| 9 | Authenticated admin session or API key | none available |

One unauthenticated `GET` to the intended route was attempted, carrying **no credential**;
it was rejected by the egress proxy before leaving this environment and never reached
production. A control request to `GET /api/health` was refused identically, confirming the
block is at the proxy and is not specific to the route.

---

## 6. Execution record

**No request was executed against production.** Consequently:

| Required capture | Value |
|---|---|
| HTTP status | **not obtained** |
| Complete JSON response | **not obtained** |
| Request / response timestamps | request attempted `2026-09-14T16:27:46Z`; rejected at the proxy |
| Elapsed time | 0.30s to proxy rejection |
| Sanitised application logs | **not obtained** — no production log access |

**No metric from any other source has been substituted.** In particular, nothing measured
against a local scratch database appears anywhere in this report. Production measurements
and local fixture measurements are not merged here, and the local figures remain unrecorded
in every document in this repository.

---

## 7. Read-only proof

**`NOT_VERIFIABLE`** — and trivially so: no request ran, so there is nothing to prove
read-only. No artificial write was created to test anything.

For the record, the properties that *would* have applied, established by code inspection
and by tests in `server/test/legacyExposureMeasurement.test.js`:

* the module issues **27 `SELECT` statements and no other SQL verb** — no `INSERT`,
  `UPDATE`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE` or `DROP`;
* no `SELECT *`, and no interpolation of request input into SQL;
* the route writes **no audit row** for being read;
* a test snapshots row counts **and an `md5` digest of every row** across six tables, runs
  the measurement twice, and requires byte-identical results.

These are **code-derived facts**, not production observations.

---

## 8. Data, migrations, deployment

| Question | Answer |
|---|---|
| Did any migration run? | **No.** None was run anywhere. |
| Did production data change? | **No.** Production was never contacted. |
| Was anything written to `admin_audit_log`? | **No.** |
| Were products, `business_id`, `supplier_id`, ownership state, orders, carts, prices or images changed? | **No** — none of them, anywhere. |
| Was anything deployed? | **No.** |
| Was anything merged? | **No.** `aws-migration` and `main` are unchanged. |
| Was application code changed for this task? | **No.** Only this report was added. |

---

## 9. Blocked, unmeasurable and unreconstructible dimensions

Unchanged from G-7, and still unanswered because no measurement ran:

| Class | Dimensions |
|---|---|
| **Blocked on production** | population · public exposure · purchase exposure · order exposure · ownership-review counts · content provenance · all breakdowns |
| **Unreconstructible** | legacy creation path · fallback `business_id` · ownership · publication state (no such column exists) |
| **Unmeasurable server-side** | cart exposure — `localStorage` only, no cart table, no telemetry |
| **Client-side only** | what a visitor sees after in-browser filtering |

---

## 10. Limitations

1. This environment has **no production access by design**, and this task could not create
   any. That is an infrastructure boundary, not a defect.
2. **Preflight 1 was never satisfiable from here.** Confirming a database is production
   requires connecting to it; a hostname is not proof, per instruction.
3. Even granted full access, **B-1 would still block the run.** Access and deployment are
   independent prerequisites, and only one of them is about credentials.
4. Read-only proof is `NOT_VERIFIABLE` rather than negative: absence of a connection is not
   evidence of good behaviour, only absence of behaviour.

---

## 11. Next decision required

**No enforcement decision is made or implied here.** Per the decision gate, this report
produces a measurement result — and the result is that no measurement exists.

The choice now belongs to you, and it is a **deployment** question, not a measurement one:

| Option | What it means |
|---|---|
| **A · Deploy the three checkpoints to production, then run G-7P** | Merging the work branch into `aws-migration` **is** deploying to production. It would put the freeze into effect and make the endpoint exist. It needs your explicit approval, and I would verify every gate first and ask before pushing. |
| **B · Have an operator run the equivalent read-only SQL directly** | No deployment required. The aggregate queries can be extracted from the measurement module into a single read-only block and run by someone with database access; they return the same figures without the endpoint existing. The credential never leaves the host. |
| **C · Neither yet** | The catalogue stays as it is, the freeze stays inactive, and no enforcement decision can be made — because none of its inputs exist. |

**The five enforcement options you listed remain closed.** Each one needs numbers, and
there are none. Choosing between blocking checkout, staged hiding, migrating verified
products or treating only commercially-exposed products cannot be done responsibly on an
empty measurement — which is precisely what G-7 was built to prevent.

> **Do not send a `DATABASE_URL`, token, cookie or `.env` to this conversation** under any
> of these options. Option B avoids the question entirely: the credential stays on the
> host and only aggregate counts come back.
