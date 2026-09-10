# 20 — AI Integration

## The position of AI in the stack

```
Canonical Data      pets · pet_facts · pet_observations · records · catalogue
        │
Pet Knowledge       current facts, with provenance                    (03, 04)
        │
Deterministic       productMatching.js · life-stage rules ·
Rules               conflict resolution                           (18, 01, 06)
        │
AI Reasoning        summarise · explain · extract · pattern-spot        ← here
        │
Insight / Explanation / Recommendation
```

**AI sits after the rules, never before them.** It phrases a match; it does not
compute one. It reads a document; it does not decide what is clinically true.

---

## Use the gateway that exists

`server/src/aiGateway.js` states its own contract:

> "Every AI call in Mipo goes through `runAiRequest`. Features ask for a feature
> slug and a capability; they do not name a provider, hold a key, or touch the
> ledgers."

Accounting is idempotent on the caller's `request_id`, written in one transaction
after the provider call, across `ai_requests` → `usage_events` → `cost_events`,
with the pricing version pinned. `aiAccounting.js` keeps tokens, credits and
money as three quantities and refuses to collapse them in one step.

Seeded feature slugs already include `document_analysis`, `health_analysis`,
`pet_character`, `ingredient_analysis`, `product_enrichment`, `agent_task`.

**No second gateway.** Every AI call in this design uses a feature slug. The two
existing bypasses (pet character art, background removal) are documented escapes
via `recordExternalUsage`, and nothing here adds a third.

The ledgers already carry `pet_id` **and** `organization_id`, so a pet-scoped AI
call is attributable and costable today, with no schema change.

---

## Where AI is used in Pet Intelligence

| Use | Feature slug | Writes facts? | Provenance |
|---|---|---|---|
| Document extraction | `document_analysis` | ✅ as `VET_DOCUMENT` proposals | `source_id` = document, `ai_request_id` = the call |
| Ingredient normalization suggestions | `ingredient_analysis` | ❌ — admin approves terms | |
| Insight generation | `health_analysis` | ❌ — insights are projections | `derived_from` |
| Match explanation phrasing | `ai_chat` | ❌ | |
| Chat assistant | `ai_chat` | ❌ | |
| Breed inference from a photo | — | ⚠️ `AI_INFERRED`, confirmable | `pets.breed_confidence` exists; `detectBreed()` is a **stub** |

### The extraction case, precisely

Extraction is the one place AI touches facts, and the boundary is sharp:

```
model output  ──►  pet_document_extractions   (PROPOSED)
                            │
              non-clinical & high confidence ──► pet_facts, source VET_DOCUMENT
                            │
              clinical ──► owner confirms ──► pet_facts, source VET_DOCUMENT
                                              verification USER_CONFIRMED
```

The fact's `source_type` is **`VET_DOCUMENT`, not `AI_INFERRED`** — because the
document is the source; the model is the reader. `ai_request_id` records which
model read it. If the extraction is wrong, the provenance points at both the
document *and* the call that misread it.

An `AI_INFERRED` fact is something the model concluded with no document behind
it — a breed guess from a photo, a preference read out of chat. Those are LOW
confidence, decay in 60 days (`12`), and are **never** clinical (`04`).

---

## What AI may never do

1. **Never write a clinical fact from inference.** Enforced by
   `pet_fact_definitions.is_clinical`, checked at write time — not by review.
2. **Never override a deterministic gate.** If `18` returns `NOT_RECOMMENDED`,
   the model explains that. It does not argue with it, soften it, or offer the
   product anyway.
3. **Never invent a product.** Already enforced —
   `server/src/catalogRecommendations.js` treats model output as a **search**,
   and when nothing matches the reply carries no products at all, which the file
   calls *"the correct outcome, not a failure to recover from."*
4. **Never promote its own output.** An `AI_INFERRED` fact becomes confirmed only
   by a recorded human act (`04`).
5. **Never diagnose.** The chat prompt already sets this and it applies to every
   AI surface: *"You are not a veterinarian… Do not diagnose with certainty."*
6. **Never see clinical facts without consent.** `profiles.ai_consent_given`
   exists and — as far as I can find — is **checked nowhere before an AI call**.
   That gap is listed in `22`.

---

## Insights and predictions

Both are **projections**, never facts. Recomputable, disposable, and always
carrying what produced them.

```
pet_insights
  id, pet_id, insight_type, severity
  title_key, payload            -- numbers and ids, not prose
  derived_from  jsonb[]         -- the fact/observation/event ids
  rule_version                  -- or ai_request_id when AI-phrased
  computed_at, valid_until
  status  ACTIVE | STALE | DISMISSED
```

| Insight | Derived from | Detection |
|---|---|---|
| "Weight down 1.2 kg over 6 weeks" | weight observations | **deterministic** |
| "Vaccination expires in 3 weeks" | `pet_vaccinations.expires_at` | deterministic |
| "Activity down 30% for 3 weeks" | walk aggregates (`14`) | deterministic |
| "Food likely to run out in ~9 days" | pack size ÷ daily amount | deterministic |
| "This looks like a pattern worth mentioning to your vet" | multiple signals | AI phrasing over deterministic detection |

**Detection is deterministic. AI phrases the result.** That ordering is the whole
of this document in one line. A model asked to "find patterns" in health data
will find them whether or not they exist; a rule that fires on a 15% weight
change in 60 days either fires or does not, and can be tested.

`valid_until` matters: an insight about last week's activity is wrong next
month. Predictions expire and are recomputed rather than lingering.

### Severity, and what it may not become
Insights are `INFO` or `ATTENTION`. There is no `URGENT` tier, because an urgent
health finding produced by pattern-matching over a phone's data is the single
most dangerous thing this system could emit. The escalation path for genuine
urgency is the one the chat prompt already names: tell the owner to contact an
emergency veterinarian.

---

## Prompt context

What a pet-scoped AI call is allowed to be given:

| Include | Why |
|---|---|
| Species, breed, life stage, sex, neuter status | shapes every answer |
| Current facts **with their source and confidence** | so the model can say "according to your vet document" instead of asserting it |
| Recent relevant records | context |
| The matching result, when explaining one | it is explaining, not deciding |

| Exclude | Why |
|---|---|
| Owner's address, phone, ID number | not needed to answer anything |
| Payment and order detail beyond product identity | |
| Other pets' facts | `39` — no cross-pet leakage |
| Superseded and disputed facts | they invite the model to reason from retracted data |
| Raw documents when a fact will do | minimise what leaves the boundary |

And the model is always told which values are uncertain. The existing chat prompt
already does this — *"If OCR/vision is uncertain, explicitly say what is
uncertain"* — and the fact model makes it mechanical rather than hopeful: a
`MEDIUM`-confidence fact is passed as one.

---

## Cost

Every pet-intelligence AI call is metered by construction, and the ledgers carry
`pet_id`, so per-pet AI cost is a query — not a new system. Document extraction
is the expensive one: it is per-upload, not per-view, and the `content_hash`
duplicate check (`16`) is as much a cost control as a correctness one.

`getTopCostUsers` exists in `aiEconomics.js` and its comment notes it is
*"exposed as data only… not wired to any"* enforcement. If per-pet or per-user AI
budgets are ever wanted, that is where they go — an `OPEN DECISION`, not a
requirement.
