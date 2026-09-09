# 12 — Store Workflows

## The flow as built

```
Store Home (/shop)  ──►  Product page (/product/:id)  ──►  Cart (/cart)
   GET /api/products         GET /api/products/:id        localStorage
   GET /api/categories                                          │
        │                                                       ▼
   client-side search,                                    Checkout (/checkout)
   filter, category                                        POST /api/orders
                                                                │
                                                       POST /api/payments/shop
                                                                │
                                                          CardCom hosted page
                                                                │
                                                          webhook → cardcom_events
                                                                │
                                                    /payment-success | /payment-failed
```

| Step | Status |
|---|---|
| Store home | `EXISTS` |
| Search | `PARTIALLY IMPLEMENTED` — `/api/products` returns the whole catalogue and the client filters. No server-side search, no pagination. |
| Category | `EXISTS` — `product_categories` with `parent_id` hierarchy + `product_category_aliases` |
| Personalised products | `MISSING` |
| Product detail | `EXISTS` — `src/pages/ProductDetailAws.tsx` |
| Pet matching | `MISSING` — see `13` |
| Variant selection | `PARTIALLY IMPLEMENTED` — `product_variations` exists for `scraped_products` only |
| Add to cart | `EXISTS` client-side only |
| Cart | `PARTIALLY IMPLEMENTED` — `localStorage["mipo-cart"]` |
| Checkout | `EXISTS` |
| Payment | `EXISTS` — CardCom |
| Order | `EXISTS` |
| Fulfilment / delivery | `PARTIALLY IMPLEMENTED` — `shipping_status`, `tracking_number` on `orders`; no carrier integration |
| Post-purchase | `PARTIALLY IMPLEMENTED` — `/order-tracking/:id`, `/reorder-confirmation` |
| Reorder | `PARTIALLY IMPLEMENTED` — `orders.order_type = 'auto-restock'` accepted at creation; nothing schedules a repeat |

---

## The catalogue problem — `DUPLICATED` and `CONFLICTING`

There are **two product tables**:

| | `business_products` | `scraped_products` |
|---|---|---|
| Columns | 52 | 54 |
| Owner | `business_id` → `business_profiles` | none |
| Populated by | Admin creation + import | Scraper (`scraping_jobs`) |
| Has images table | `images[]` column | `product_images` (1:N) |
| Has variants | no | `product_variations` |
| Reviewed? | yes, by an admin | **no** |

`listProducts` (`server/src/index.js:4229`) returns the **union**:

```js
const [businessProducts, scrapedProducts] = await Promise.all([
  queryProductsWithCategories("business_products", …),
  queryProductsWithCategories("scraped_products", …),
]);
return [...businessProducts.rows.map(mapBusinessProduct),
        ...scrapedProducts.rows.map(mapScrapedProduct)];
```

The AI assistant deliberately does **not**. `catalogRecommendations.js:16-18`
says so in as many words:

> "Only business_products is searched. scraped_products holds raw import rows
> that no one has reviewed: they have no publication state yet, so the
> assistant must not be the thing that puts them in front of a customer."

**The reasoning is right and the shop does not follow it.** `/api/products` is
public and returns unreviewed scraper output to every customer. This is the
highest-severity product finding in the audit — not a security hole, a
merchandising one: prices, names and images nobody approved are on sale.

### Recommended resolution
`business_products` is canonical (it has an owner, it is what the assistant
trusts, and it is what admins edit). `scraped_products` becomes a **staging**
table: an import lands there, an admin adopts a row into `business_products`,
and the shop reads one table. The `/admin/quick-import` and
`/admin/smart-editor` screens and the `needs_image_review` /
`needs_price_review` / `is_flagged` columns already exist as the review
machinery — the missing piece is a publication state and a shop query that
respects it. See `28-SOURCE-OF-TRUTH.md`.

---

## Product data that exists and is underused

`business_products` already carries the fields a matching engine needs:

```
pet_type (enum) · life_stage · dog_size · special_diet[] · breed_tags[]
medical_tags[] · ingredients · feeding_guide (jsonb) · kcal_per_kg
benefits (jsonb) · safety_score · product_attributes (jsonb)
weight · weight_unit · price_per_weight
```

Nothing consumes `breed_tags`, `medical_tags`, `special_diet`, `life_stage`,
`dog_size` or `kcal_per_kg` in any read path. The catalogue is annotated for
matching and no matching happens. Combined with `04` — where the *pet* side of
those same fields is missing — that is the whole diagnosis of `13`.

`server/src/productIntel.js` (42 KB) is the enrichment side: it uses the AI
Gateway to populate these fields from a product page. So the annotations are
produced by AI and never read.

## Images

`server/src/imagePipeline.js` normalises every product image to 1200×1200 @ q82
with a 400×400 thumbnail, stores it locally, and keeps the original.
`image_source_url` and `image_adopted_at` (migration `0027`) record the
supplier origin — and `toPublicProduct` deliberately excludes both from public
responses so the supplier is not disclosed. Good.

Background removal (`server/src/backgroundRemoval.js`) is opt-in, never
replaces the normalised image, and keeps the original. Also good.

## Missing store capabilities

| Capability | Status |
|---|---|
| Server-side search / pagination | `MISSING` — whole catalogue per request |
| Buy Again | `MISSING` |
| Wishlist / Favorites | `PARTIALLY IMPLEMENTED` — `localStorage["mipo-favorites"]`, lost on device change |
| Product comparison | `MISSING` |
| Alternatives / related | `MISSING` |
| Recommendations | `PARTIALLY IMPLEMENTED` — only inside chat |
| Sponsored products | `MISSING` — `/ad-campaigns` redirects to `/shop` |
| Contraindications | `MISSING` — `medical_tags[]` exists, nothing checks it |
| Inventory | `PARTIALLY IMPLEMENTED` — `in_stock` boolean only; no quantity, no reservation |
| Reviews | `PARTIALLY IMPLEMENTED` — `average_rating`, `review_count` columns; no reviews table |
| Multi-currency / tax | `PARTIALLY IMPLEMENTED` — `orders.tax` column, single currency assumed |

`in_stock` as a boolean deserves attention before any reorder or subscription
work: without a quantity there is nothing to decrement, and two customers can
buy the last unit.
