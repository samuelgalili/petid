# 19 — Store Integration

## The contract

```
   Pet Intelligence                Product Catalogue
   (facts, with provenance)        (business_products, PUBLISHED only)
            │                                │
            └──────────────┬─────────────────┘
                           │
                  productMatching.js          ← pure, server-side, versioned
                           │
              match_status · matched_rules · failed_rules
              warnings · missing_data · evidence
                           │
            ┌──────────────┼──────────────┐
            │              │              │
      Product page     Store home     AI explanation (20)
      (one product)   (many products)  (phrases it; never decides it)
```

**One evaluator, three consumers.** The product page, the shop grid and the
assistant must never disagree about whether a product suits a pet — which is
exactly the drift `petSafetyScore.ts` was extracted to prevent, in its own words:
*"Lifted out of ProductInfoDrawer so the drawer and the product page cannot drift
apart and show the same pet two different numbers for the same product."*

That principle, applied one level up.

---

## §48 — What the product page consumes

| Element | Source | Status |
|---|---|---|
| Name, price, images, brand, SKU | `business_products` | ✅ |
| Variants | `product_variations` — **only exists for `scraped_products`** | 🟡 |
| Availability | `in_stock` boolean; no quantity | 🟡 |
| Ingredients, nutrition, feeding guide | `ingredients`, `kcal_per_kg`, `feeding_guide` | ✅ already shipped |
| **Pet compatibility** | `productMatching.js` | ❌ → `18` |
| **Why it matches** | `matched_rules` + `evidence` | ❌ |
| **Warnings** | `warnings` | 🟡 `petSafetyScore` does a version of this, client-side |
| Alternatives | same category, `ELIGIBLE`+ | ❌ |
| Buy Again | `order_items.pet_id` | ❌ → `15` |
| Related | category | 🟡 |
| Sponsored | no model | ❌ |

Two of these need care:

- **Warnings must be server-computed.** Today `computePetAdjustedScore` runs in
  the browser. A health caution that the client computes is a health caution the
  client can drop.
- **`variants` is a real gap.** `product_variations` hangs off `scraped_products`
  only, and `business_products` is the catalogue that will be canonical (`15`).
  Size and flavour selection on a published product has no home. Flagged in `28`.

### Product-type differences

The page is not one layout. What matters differs by what the thing is:

| Type | Leads with | Gates that apply |
|---|---|---|
| **Food** | ingredients, kcal, feeding guide, life stage | species, life_stage, size, **allergens**, medical_tags |
| **Treats** | ingredients, calories per piece | allergens, food motivation, weight management |
| **Toys** | size fit, durability | species, size band, chewing behaviour |
| **Accessories** | **measurements** — collar, harness, coat | species, neck/chest/back (`13`) |
| **Grooming** | coat type, sensitivity | species, breed coat, skin conditions |
| **Health-related** | **vet caveat, always** | conditions, medications, species |
| **Bird** | species-specific pellets, cage dimensions | species (**blocked** — enum, `17`) |
| **Rodent / rabbit** | hay-first, species-specific pellets, enclosure size | species (**blocked** — enum) |

The last two rows are the honest limit: with `pet_type` limited to
dog/cat/other/all, a bird product and a rabbit product are indistinguishable in
the catalogue. Species-correct pages for them cannot be built until the enum is
widened.

---

## §49 — Store sections

| Section | Needs | Status |
|---|---|---|
| **For My Pet** | species, life stage, size, health facts | needs `01`, `03`, `09` |
| **Recommended** | full matching | needs `18` |
| **Buy Again** | `order_items.pet_id` | needs `15` |
| **Because Blue…** | facts **with provenance**, so the reason is real | needs `03`, `04` |
| **Recently viewed** | client event stream | needs `docs/system-workflows/26` |
| **Favourites** | server favourites, pet-scoped | needs `12` |
| **Alternatives** | matching over a category | needs `18` |

"Because Blue…" is the one worth getting right. The sentence has to be traceable:

```
"כי בלו רגיש לעוף"        →  health.sensitivity/chicken, VET_DOCUMENT doc_88
"כי בלו כלב בוגר גדול"     →  identity.life_stage + physical.size_band, derived
"כי קניתם את זה שלוש פעמים" →  preference.food, PURCHASE_DERIVED
```

Never a sentence the system cannot point at a fact for. That is what separates
personalisation from flattery, and it is enforced by the `evidence` block being
required in the match contract rather than optional.

---

## §50 — Activity → Store, carefully

```
Blue walked 7 km  →  a context signal  →  relevant products ranked higher
```

Permitted: surfacing hydration, paw care or recovery products after a long walk,
as **context**, phrased as context.

**Not permitted:** "Blue needs more calories today." That is a nutritional claim
derived from a phone's step count, and it is exactly the kind of confident
wrongness `31` of the brief exists to prevent. Activity ranks; it does not
prescribe.

Until `14` exists, activity contributes nothing and the Store must show no
"based on activity" section rather than an empty one.

---

## §51 — Purchase → Pet Intelligence

Covered in `12` and `15`. The rule restated because it belongs here too:
**a purchase is not a preference.** One purchase writes nothing. Repetition,
spaced over time, with no return, produces a `MEDIUM` confidence preference that
**ranks and never excludes**.

And prescription purchases are excluded from preference derivation entirely —
food bought because a vet said so is not a liking, and treating it as one leads
to recommending a therapeutic diet the animal may no longer need.

---

## §52 — Document → Store

The chain that has to preserve provenance end to end:

```
vet document (pet_documents, canonical evidence)
        │  extraction, with page + bbox                        (16)
        ▼
pet_document_extractions   status PROPOSED
        │  clinical ⇒ owner confirms                           (04, 16)
        ▼
pet_facts   health.allergy = chicken
            VET_DOCUMENT · doc_88 · HIGH · USER_CONFIRMED      (03, 04)
        │
        ▼
productMatching.js   step 3 excludes chicken-containing products
        │
        ▼
Store    the product is absent from recommendations, and where it is shown
         directly it carries: "מכיל רכיב שמופיע ברגישות המתועדת של בלו"
         with a link back to the document
```

Every arrow keeps `source_id`. The owner can tap the warning and land on page 2
of the actual PDF. **That is the whole point of the provenance model**, expressed
as one user-visible behaviour.

---

## Governance dependency

`18` step 0 is `sellable`. Today `/api/products` returns
`business_products ∪ scraped_products`, and unreviewed scraper rows are on sale
while the AI assistant deliberately refuses them. Matching cannot be introduced
on top of that without inheriting it: an engine that confidently recommends a
row nobody reviewed is worse than no engine.

**`15`'s publication state is a prerequisite for `18`, not a parallel task.**

---

## Migration of what exists

| Today | Target |
|---|---|
| `petSafetyScore.ts` client-side | move to the server; keep the `null`-not-zero rule, keep `explainAdjustment`, keep `DIET_SENSITIVE_CONDITIONS` |
| `SmartRecommendations.tsx` keyword scoring | replace the keyword maps with metadata gates; keep the "top row for this pet" placement and the reason string |
| `productRecommendations.ts` pet_type filter | absorbed into step 1 |
| `catalogRecommendations.js` | **unchanged.** It already resolves model output against the catalogue correctly. `18` runs *after* it to annotate the resolved rows. |

Note the direction of travel: nothing here is deleted. The client keeps
rendering; it stops deciding.
