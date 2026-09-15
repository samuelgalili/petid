# Legacy catalogue migration — measurement, product page, and plan

**Status:** measured, designed, **not built**. No migration has run and no schema
has changed. Every number below was read from production on 2026-09-15.

**Source:** the `C-0 catalogue measurement (read-only)` workflow
(`.github/workflows/production-catalogue-measure.yml`), runs **#2** (12
statements) and **#4** (20 statements), both against the production database
inside `BEGIN` / `SET TRANSACTION READ ONLY` / `ROLLBACK`. Nothing on the host
was modified; both runs ended `C-0 complete.`

The catalogue is **375 products, all owned by one business** — the
`ensureDefaultBusinessProfile()` fallback `cf941cc4…`, which has no owner user.
That is finding **F-1** of [`PRODUCTION-ADMIN-POPULATION-VALIDATION.md`](./PRODUCTION-ADMIN-POPULATION-VALIDATION.md),
and it is why nothing here trusts `business_id` as evidence of ownership.

---

## 1. Why this document measured first

The migration's design is a function of numbers nobody had. Three decisions
could not be made without them, and guessing at any of them would have produced
a catalogue that looks broken in a specific, predictable way:

* **Which attributes a category may declare required.** A product page showing
  `קלוריות לק״ג: לא צוין` on most of its products is not more consistent, only
  more absurd. That sentence was already written as a comment in
  `ProductDetailAws.tsx` before any of this; the measurement turns it into a
  number.
* **Whether an auto-approval rule is worth having.** If most products fail it,
  they all land in the manual queue anyway and the rule buys nothing.
* **How much image work there is.** An image still pointing at a supplier's
  server has never been through `normalizeProductImage`.

Two answers came back the opposite of what was expected. Both are recorded as
such rather than quietly folded into the plan — see §3 and §4.

---

## 2. What was measured

### 2.1 Shape of the catalogue

| | |
|---|---|
| Products | **375** |
| Owning businesses | **1** (the unowned fallback) |
| With `category_id` | **134** |
| **Without `category_id`** | **241** |
| Other import surfaces (`scraped_products`) | **0** — 375 is the whole story |

### 2.2 The universal band — what every product page can promise

| Field | Populated | Share |
|---|---|---|
| `name` | 375 | 100% |
| `description` (any) | 375 | 100% |
| `description` ≥ 80 chars | **178** | 47% |
| `sku` | 366 | 98% |
| `brand` | 312 | 83% |
| `price > 0` | **302** | 81% |

Name, description and SKU are safe to promise. Brand is nearly safe. **Price is
not**: 73 products carry a price of zero or less.

Half the descriptions are stubs under 80 characters, which matters for layout —
a page designed around a paragraph will look empty for half the catalogue.

### 2.3 The category band — per category, and the number that settles it

| Category | Products | ingredients | **kcal_per_kg** | life_stage | dog_size | special_diet | flavors | weight_unit |
|---|---|---|---|---|---|---|---|---|
| `dry-food` | 226 | 40 | **0** | 39 | 38 | 31 | 2 | 134 |
| חטיפים | 77 | 11 | **0** | 1 | 1 | 1 | 27 | 36 |
| אביזרים | 27 | 1 | **0** | 1 | 1 | 0 | 2 | 1 |
| `wet-food` | 15 | 0 | **0** | 0 | 0 | 0 | 0 | 0 |
| צעצועים | 8 | 1 | **0** | 2 | 1 | 0 | 5 | 2 |
| אחר | 7 | 0 | **0** | 0 | 0 | 0 | 0 | 0 |
| מזון | 5 | 2 | 2 | 2 | 1 | 0 | 2 | 4 |
| בריאות | 5 | 5 | 1 | 4 | 3 | 4 | 3 | 4 |
| אוכל יבש | 3 | 0 | **0** | 0 | 0 | 0 | 0 | 2 |
| טיפוח | 1 | 0 | **0** | 0 | 0 | 0 | 1 | 0 |
| מיטות | 1 | 1 | **0** | 1 | 1 | 0 | 0 | 0 |

**`kcal_per_kg` is populated on 3 products out of 375.** It must not be a
required attribute of any category. As a required field it would render
`לא צוין` on 99.2% of pages.

In the largest category, `dry-food` (226), the best-populated content field is
`weight_unit` at 59%; ingredients reach 18%, life stage 17%, `flavors` 1%.

### 2.4 Images

| | | |
|---|---|---|
| Normalized and hosted by us (`/uploads/`) | **220** | 59% |
| **Still pointing at a supplier's server** | **86** | 23% |
| **No image at all** (`/placeholder.svg`) | **69** | 18% |
| Products with a gallery | 184 | — |
| Gallery entries (167 local, 27 remote) | 194 | — |
| Flagged `needs_image_review` | 98 | — |

The pipeline that fixes this already exists — `server/src/imagePipeline.js`
normalizes to a single square canvas (`IMAGE_PRESETS.product` is 1200×1200,
WebP, one quality) — and so does the script that applies it to the catalogue,
`server/scripts/adoptProductImages.mjs`, which is safe to re-run. **59% of the
catalogue has already been through it. 86 products have not.**

### 2.5 Species

`pet_type` is an enum of `('dog','cat','other','all')`, so the column cannot
express a rodent, a parrot or a horse.

| `pet_type` | Products |
|---|---|
| `dog` | 192 |
| **`other`** | **141** |
| `cat` | 37 |
| `all` | 5 |

### 2.6 Data quality

| | |
|---|---|
| Price ≤ 0 | **73** |
| Name missing | 0 |
| `sale_price > price` | 0 |
| `original_price < price` | 0 |
| Duplicate name groups | 2 |
| Barcodes present / distinct | 266 / 260 |
| **Duplicate barcode groups** | **6** |
| `needs_price_review` | 134 |

A shared barcode usually means one product listed twice. The 6 groups are worth
a human look before migration, not after.

---

## 3. The species question: answered, and the data is already there

`C-14` crosses `pet_type` against the `animal` attribute that 266 products
carry. The `other` bucket decomposes almost completely:

| `pet_type` | `animal` | Products |
|---|---|---|
| `other` | תוכים | 63 |
| `other` | מכרסם | 41 |
| `other` | עופות | 17 |
| `other` | צאן ובקר | 10 |
| `other` | סוסים | 6 |
| `other` | מטילות | 2 |
| `other` | *(absent)* | **2** |

**139 of the 141 `other` rows name a real species. Only 2 are genuinely
unknown.**

So replacing `pet_type` with a `pet_species` lookup table is a **data
migration**, not a research project. The vocabulary in use is: כלב · חתול ·
תוכים · מכרסם · עופות · צאן ובקר · סוסים · מטילות.

`dog` and `cat` agree with the attribute wherever both exist (94 and 32), and
103 dog/cat rows have no `animal` attribute but do have a usable `pet_type`. The
two sources are complementary, not contradictory: **take `animal` where present,
fall back to `pet_type`.**

### 3.1 A business fact that fell out of it

**צאן ובקר · סוסים · מטילות — 18 products — are farm animals, not pets.** MIPO
sells livestock and poultry feed alongside its pet catalogue.

**Decision taken: out of scope for phase 1, added later.** They still pass
through `raw_import_records` so the migration stays lossless and idempotent and
"add later" becomes an approval rather than a second migration run — but they
stop at draft and are never published until a farm branch exists in the category
tree.

---

## 4. `family_code` does **not** group variants — the hypothesis was wrong

The first pass read attribute key names only, and `family_code` on 266 products
looked like the variant grouping the new model needs: one `catalog_product` with
several `product_variants` for "the same food in 2 kg and 12 kg".

**It is not.** `C-16` and `C-17` refute it, and the refutation is unambiguous.

**12 families cover 266 products**, with sizes 61, 54, 35, 23, 21, 18, 18, 14,
10, 7, 4, 1. No product has 61 variants.

`C-17` then asks how the members of a family actually differ:

| Families with >1 product | differ by **weight** | differ by dog size | differ by **name** | differ by **price** |
|---|---|---|---|---|
| 11 | **0** | 0 | **11** | **11** |

**If these were variants of one product the name would be shared and the weight
would differ. The exact opposite is true in all 11 families.** `family_code` is
a merchandising family — the equivalent of "dog food" — not a variant group.

### 4.1 What that changes

**There is no variant-grouping signal anywhere in the legacy data.** So every
legacy product migrates as:

```
one catalog_product  →  one default product_variant  →  one seller_offer
```

This is not a failure. The model supports a single-variant product, and
inventing variant groupings from data that does not contain them would produce
confident nonsense — a 2 kg bag and a shampoo filed as two sizes of one thing.
Real variants get built later, by a human who recognises that two products are
one product in two sizes. The 6 duplicate-barcode groups are the natural place
to start looking.

---

## 5. The category problem is one hyphen wide

At first reading this is the worst result in the run:

| Uncategorised | Resolvable by an existing alias | Needs a new alias |
|---|---|---|
| 241 | **0** | **241** |

Zero of 241 resolve against the 57 aliases already defined. But `C-20` shows the
free text holds only **two distinct values**:

| Free-text `category` | Products |
|---|---|
| `dry-food` | 226 |
| `wet-food` | 15 |

And the existing aliases are spelled `dry food`, `wet food`, `food` — **with a
space**. The data uses a **hyphen**.

**All 241 products are blocked on two missing alias rows.** Adding
`dry-food` and `wet-food` to `product_category_aliases` categorises the entire
uncategorised remainder.

This matters beyond tidiness: `category_id is null` was the dominant blocker in
the auto-approval simulation (§7).

### 5.1 The food taxonomy is fragmented four ways

`dry-food` (226, free text) · `אוכל יבש` (3, a real category) · `wet-food` (15,
free text) · `מזון` (5, a real category). One concept, four labels, two
languages. The alias fix must also decide which of these survives as the
canonical category.

### 5.2 `product_type` is a better taxonomy than the one in use

266 products carry a `product_type` attribute whose vocabulary is Hebrew and
already species-aware:

| `product_type` | Products | Already categorised |
|---|---|---|
| מזון | 183 | 7 |
| *(absent)* | 110 | 64 |
| חטיפים לכלב | 25 | 25 |
| מזון רטוב | 15 | 0 |
| חומרי גלם | 11 | 7 |
| ציוד נלווה לעופות | 8 | 8 |
| ציוד נלווה למכרסם | 8 | 8 |
| חטיפים לתוכים | 6 | 6 |
| ציוד נלווה לתוכים | 5 | 5 |
| ציוד נלווה לחתולים | 4 | 4 |

"ציוד נלווה לתוכים" already encodes both category and species. This is a better
starting point for the category tree than the 10 categories currently defined.

---

## 6. The product page

Three bands. The first is a contract; the second and third vary.

```
BAND 1  UNIVERSAL       identical for every product, every category, every species
                        gallery (square) · name · brand · price · availability
                        · add to cart · SKU · category path · description
                        · "נמכר על ידי X"

BAND 2  CATEGORY        מזון     → ingredients, life stage, feeding guide, special diet
        × SPECIES       צעצוע    → material, size, durability
                        קולר     → neck circumference, material, colour

                        the same template, different values per species:
                        מזון לכלבים  → dog size
                        מזון לתוכים  → seed type
                        מזון למכרסמים → rodent type

BAND 3  ENRICHMENT      only where data exists
                        safety score · medical tags · reviews
```

**The rule that produces consistency:** a field renders `לא צוין` **only** if its
category declared it required. Otherwise it is omitted entirely. A chew toy
never shows a calorie row.

Band 1 is already guaranteed structurally by the new model — the publication
gate requires an active variant, a priced offer, availability and an approved
image before anything can publish.

### 6.1 The missing schema

`product_categories` holds `slug`, `name_he`, `icon`, `parent_id` — presentation
metadata with no field definitions — and `catalog_products.attributes` is
unvalidated `jsonb`. Nothing declares what a category's products are supposed to
have. Proposed:

```sql
create table product_category_attributes (
  category_id      uuid not null references product_categories(id),
  key              text not null,          -- 'life_stage'
  label_he         text not null,          -- 'שלב חיים'
  value_type       text not null,          -- text|number|enum|list|richtext
  unit             text,
  enum_values      text[],
  is_required      boolean not null default false,
  is_variant_axis  boolean not null default false,
  display_group    text,                   -- specs|nutrition|usage
  position         integer not null default 0,
  unique (category_id, key)
);
```

Attributes **inherit down the category tree** via `parent_id`: מזון declares
ingredients and life stage; מזון לכלבים adds dog size.

Enforcement reuses machinery that already exists: add *"every required attribute
for this category is present"* to the publication gate's `READINESS_SQL`. No new
mechanism.

**`is_required` must be set from §2.3, not from what seems natural.** On today's
data that means `kcal_per_kg` is required nowhere, and in `dry-food` nothing is
required beyond the universal band, because nothing there clears 59%.

---

## 7. The auto-approval rule

375 drafts reviewed one at a time is days of work. The rule lets a product
through automatically when it is named, priced, categorised, carries a real
image and was never flagged; everything else goes to a human.

`C-10`, simulated against the real rows:

| Products | flagged | needs_image_review | needs_price_review | **would auto-approve** |
|---|---|---|---|---|
| 375 | 0 | 98 | 134 | **73** |

**19% — the rule as written is not worth having.** But the dominant blocker is
`category_id is null`, which is 241 products, which is §5's two alias rows. The
rule should be re-simulated after the aliases exist, and the number will move a
long way.

**The rule is a labour saving, not a safety bypass.** The publication gate
independently blocks anything incomplete, so a product auto-approved in error
does not reach the shop — it simply fails to publish.

---

## 8. Decisions taken

| # | Decision | Consequence |
|---|---|---|
| **D-1** | **MIPO owns the migrated catalogue.** A real MIPO business profile is created, verified, and `commercial_status = 'approved'` | The unowned fallback `cf941cc4…` stays at `commercial_status = 'none'` permanently. It does not become a Seller through a side door |
| **D-2** | **69 products with no image migrate as UNPUBLISHED**, into an admin queue | The publication gate already requires an approved image, so this is the model's own behaviour rather than a special case |
| **D-3** | **73 products with price ≤ 0 migrate and wait for an admin to price them** | Same: a product with no priced offer cannot publish |
| **D-4** | **Farm-animal products (18) are out of scope for phase 1** | They pass through `raw_import_records` but stop at draft, so adding them later is an approval, not a second migration |
| **D-5** | **Each legacy product becomes one product with one default variant** | Forced by §4: the data carries no variant grouping |
| **D-6** | **The cart stays in the browser** (decided earlier, M9) | Checkout already resolves price server-side; a server cart would add no price safety |

---

## 9. The plan

### Phase 1 · Two alias rows
`dry-food` and `wet-food` into `product_category_aliases`, and a decision on
which of the four food labels (§5.1) is canonical. **Unblocks 241 products** and
re-opens the auto-approval question.

### Phase 2 · `pet_species`
Replace the `pet_type` enum with a lookup table. Source: `animal` where present,
`pet_type` as fallback (§3). Two rows are genuinely unknown and stay unknown.

**Cost, stated honestly:** `pet_type` appears in 65 frontend files and several
tables. This is its own piece of work, not something absorbed into the migration.
The enum route (`ALTER TYPE … ADD VALUE`) is cheaper but PostgreSQL forbids
*using* a new enum value in the transaction that added it, and the migration
runner wraps each file in one transaction — so it would need splitting across
two migrations, and every future species would need another one.

### Phase 3 · Images
Run `adoptProductImages.mjs` (dry-run first) for the 86 foreign images. The 69
with no image are D-2's queue.

### Phase 4 · Category attribute schema
Build §6.1 and populate `is_required` from §2.3's fill rates.

### Phase 5 · Migrate through the real intake chain

Not a direct `INSERT`. This is the point of the model:

```
business_products (375)
  → raw_import_records   source_system   = 'legacy_business_products'
                         source_record_id = business_products.id
                         payload          = the whole legacy row, immutable
  → product_drafts       mapped fields
  → review (auto or manual, §7)
  → catalog_products + product_variants + seller_offers + inventory + product_media
```

Two properties come free:

* `unique (business_id, source_system, source_record_id)` makes the migration
  **idempotent** — a re-run cannot duplicate.
* The immutable payload preserves the original row forever, so a mapping error
  is **correctable by re-running**, not a permanent loss.

Columns that must **not** migrate to anything customer-facing: `cost_price`,
`commission_rate`, `supplier_id`, `supplier_link`, `auto_restock`,
`api_sync_enabled`, `suggested_price`, `price_suggestion_reason`, and the import
envelope's `price_before_vat`, `supplier_name`, `source_row`,
`image_research_notes`. `supplier_id` in particular is **not** Seller identity.

### Phase 6 · Cutover
`/api/products` switches to the new model only when every product has a
published equivalent or a documented reason not to, verified by count.

---

## 10. What is still unknown

| # | Open question |
|---|---|
| U-1 | Which of the four food labels is canonical (§5.1) |
| U-2 | Whether the 6 duplicate-barcode groups are duplicates or unrecognised variants |
| U-3 | What the 2 species-less `other` products actually are |
| U-4 | Whether `product_type` should replace the current category tree or map into it (§5.2) |
| U-5 | Legacy product ownership before the fallback. **Unreconstructible** — every one of the 375 names the same unowned profile (F-1) |

---

## 11. Verification of this document

Every number cites a statement in `C-0`. Nothing is estimated or carried over
from a local database.

Both runs were read-only under two independent defences, each falsified rather
than assumed: a static guard that fails the job on any non-`SELECT` statement
(verified to catch an injected `UPDATE` and a deleted `SET TRANSACTION READ
ONLY`), and PostgreSQL itself, which answers a write in that transaction with
`cannot execute UPDATE in a read-only transaction`.

The statements were also executed against a real migrated schema before running
in production, and — after the first local pass returned zero rows for every new
statement because the seed carried none of the relevant keys — re-run against
seeded data with known properties, so that each answer could be checked against
what the construction implies rather than merely observed not to error.

**No product name, description, supplier URL or barcode value was ever
selected.** Duplicate names and barcodes are counted by grouping, never listed.
