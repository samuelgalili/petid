# 28 — Source of Truth

## Canonical store per entity

| Entity | Canonical today | Status |
|---|---|---|
| Customer identity | `app_users` + `profiles` (1:1, `profiles.id` FK) | ✅ clear |
| Staff identity | `admin_users` | ✅ clear, deliberately separate |
| Resolved person (account ∪ guest) | `customer_identities` | ✅ clear, with a documented precedence rule |
| Organization / tenant | **none** | ❌ `MISSING` |
| Pet | `pets` | ✅ clear |
| Pet facts | **none** | ❌ `MISSING` (`05`) |
| Product | `business_products` **and** `scraped_products` | ⚠️ `DUPLICATED` |
| Category | `product_categories` (+ `product_category_aliases`) | ✅ clear |
| Inventory | `business_products.in_stock` boolean | 🟡 insufficient |
| Order | `orders` + `order_items` | ✅ clear |
| Payment | `orders.payment_*` + `cardcom_events` | ✅ clear (events are the audit trail) |
| Document | `pet_documents` + private disk | ✅ clear |
| Document content | **none** | ❌ `MISSING` |
| Health fact | `pet_vet_visits` / `pet_vaccinations` / `pets.medical_conditions` | ⚠️ three places for one concept |
| Activity | **none** | ❌ `MISSING` |
| Social content | `social_posts` (+ satellites) | ✅ clear |
| Media | `user_uploads` + disk; `product_images` + disk | 🟡 two systems, one per domain |
| Event | `outbox_events` | ✅ clear |
| AI usage | `ai_requests` → `usage_events` → `cost_events` | ✅ clear, with pinned pricing versions |
| Address | `shipping_profiles` (reusable) + `orders.shipping_address` (snapshot) | ✅ correct by design — see below |
| Cart | browser `localStorage` | ⚠️ not a source of truth at all |
| Favourites | browser `localStorage` | ⚠️ same |

---

## The duplications, examined

### 1. `business_products` vs `scraped_products` — `DUPLICATED` and `CONFLICTING`

`listProducts` merges both; `catalogRecommendations` uses only
`business_products` and explains that scraped rows "have no publication state
yet". Two consumers of the same concept apply different trust rules.

**Recommendation:** `business_products` is canonical. `scraped_products`
becomes explicitly a **staging** table with a publication step. The review
machinery is already there — `needs_image_review`, `needs_price_review`,
`is_flagged`, `flagged_reason`, plus `/admin/quick-import` and
`/admin/smart-editor`. What is missing is a state column and a shop query that
respects it.

Do not merge the tables. They have different lifecycles: one is a curated
catalogue, the other is import output.

### 2. `pets.age` vs `pets.birth_date` — `DUPLICATED`
One stored fact and one derivable fact for the same thing. `age` is wrong the
day after it is written. Canonical: `birth_date`. `age` becomes derived.

### 3. Vet contact across six columns
`pets.vet_clinic`, `vet_clinic_name`, `vet_clinic_phone`, `vet_clinic_address`,
`vet_name`, `vet_phone` — plus `pet_vet_visits.clinic_name` and `vet_name`, and
`insurance_claims.clinic_name`. Three tables carry a clinic identity as loose
strings. Canonical: `UNKNOWN` today. A `clinics` entity would resolve it; it is
not urgent.

### 4. Three activity arrays on `pets`
`personality_tags[]`, `favorite_activities[]`, `activities[]`. Which is
canonical is `UNKNOWN` from the schema alone. Resolve when `05` lands — all
three become `behavior.*` and `preference.*` facts.

### 5. Address — **not** a duplication
`orders.shipping_address` is a jsonb **snapshot** and `shipping_profiles` is
the reusable profile. An order must keep the address it actually shipped to,
even after the user edits their profile. This is correct. What should be
documented is which one the checkout prefills from.

### 6. Media — two systems, defensibly
`user_uploads` (+ `/app/uploads`) and `product_images` (+ pipeline). Product
media is normalised and versioned; user media is stored raw. The split is
reasonable; the *asymmetry in processing* is the problem, not the split
(`11`, `19`).

---

## The two-repository question

Two repositories exist and only one is the system:

| | `samuelgalili/petid` | `samuelgalili/mipo` |
|---|---|---|
| Serves | **`mipo.pet` production** | — |
| Backend | Node 20, own API, PostgreSQL, 53 tables, 33 migrations | Express + Supabase, 6 migrations |
| Source files | ~600 under `src/` + `server/` | 10 |
| Domain | pets, store, orders, social, AI gateway, admin | chat, vector/episodic memory, agent evals, breeds, pets |
| Infra | AWS EC2, Docker Compose, Caddy, GitHub Actions | `.vercel` present |

**`petid` is canonical for the product.** `mipo` is a separate prototype whose
migrations (`001_vector_memory`, `002_episodic_memory`, `003_agent_evals`) are
about conversational memory — a capability `petid` does not have and that is
worth a separate decision, not a merge.

This audit describes `petid`. Recorded in `DECISIONS.md`.

---

## Data ownership

| Entity | Creates | Updates | Deletes | Reads | Owns |
|---|---|---|---|---|---|
| `app_users` | self (signup) | self | self (`DELETE /api/me/account`) | self, admin | user |
| `pets` | owner | owner | owner | owner; public if lost/public | owner |
| `pet_documents` | owner | — (no update route) | owner | owner only | owner |
| `pet_vet_visits` | owner | — (no update route) | — (no delete route) | owner | owner |
| `social_posts` | owner | — | owner | anyone if public | owner |
| `orders` | customer or guest | **admin only** | nobody (anonymised on account deletion) | customer, admin | Mipo (financial record) |
| `business_products` | admin/PM | admin/PM | admin only | public | Mipo |
| `notifications` | recipient (only path today) | recipient (read flags) | — | recipient | user |
| `ai_requests`/`usage_events`/`cost_events` | system | never (append-only) | never | admin | Mipo |
| `admin_audit_log` | system | never | never | admin | Mipo |

Two gaps fall out of this table: **health records cannot be corrected** (no
update route on vet visits or vaccinations, and no delete), and **nobody can
share anything with anyone** — there is no delegation model at all, so a vet, a
sitter or a family member cannot be given access to a pet. Both are listed in
`29`.
