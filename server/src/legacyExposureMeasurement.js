// G-7 · Legacy catalogue exposure measurement.
//
// Before anything is hidden, blocked, migrated or reassigned, somebody has to
// know how much is actually at stake. This module measures that and changes
// nothing: every statement here is a SELECT, and the route that serves it is a
// GET that writes nothing, not even an access audit row.
//
// THE ONE THING THIS MODULE MUST NOT BE ALLOWED TO DO
//
// It runs against whatever database it is pointed at. Pointed at a developer's
// scratch database it returns small, tidy, entirely meaningless numbers - and
// those numbers look exactly like production numbers. So every response carries
// `production_validated: false` and an environment label, and nothing in this
// codebase may set that flag true: only a human who knows which database was
// queried can say so, out of band.
//
// WHAT IT REFUSES TO INFER
//
// A count is a fact. What a count means is usually not. Three questions look
// answerable and are not, and each returns UNRECONSTRUCTIBLE rather than a
// plausible number:
//
//   - which products were created through the legacy intake path (no intake
//     channel was ever recorded);
//   - which products carry a fallback business_id (the fallback wrote nothing
//     to distinguish itself, so a fallback row and a deliberate one are
//     byte-identical);
//   - who owns any of it (that is what the G-6 review is for, and it is the
//     product of human decisions, not of a query).
//
// source_url, supplier_id, image origin, product name, source domain and order
// history are never read as ownership evidence anywhere in this file.

export const MEASURABILITY = Object.freeze({
  MEASURED: "MEASURED",
  UNRECONSTRUCTIBLE: "UNRECONSTRUCTIBLE",
  UNMEASURABLE_SERVER_SIDE: "UNMEASURABLE_SERVER_SIDE",
  CLIENT_SIDE_ONLY: "CLIENT_SIDE_ONLY",
  CODE_VERIFIED: "CODE_VERIFIED",
});

const OWNERSHIP_ENTITY_TYPE = "product_ownership_review";

// Nothing may declare itself production-validated. A human confirms which
// database was queried; this flag is a reminder that no such confirmation is
// carried in the response.
const PRODUCTION_VALIDATED = false;

const count = (row, key = "count") => Number(row?.[key] ?? 0);

// ─── A · population ──────────────────────────────────────────────────────────

const measurePopulation = async (pool) => {
  const [commercial, scraped] = await Promise.all([
    pool.query(`
      select
        count(*) as total,
        count(*) filter (where business_id is null) as business_id_null,
        count(*) filter (where source_url is not null and btrim(source_url) <> '') as with_content_provenance,
        count(*) filter (where source_url is null or btrim(source_url) = '') as without_content_provenance,
        count(*) filter (where supplier_id is not null) as with_supplier_reference
      from public.business_products
    `),
    pool.query("select count(*) as total from public.scraped_products"),
  ]);

  const row = commercial.rows[0];
  return {
    // Two populations, deliberately never summed: a discovery row is not a
    // listing, and adding them would invent a catalogue that does not exist.
    commercial_listings: {
      status: MEASURABILITY.MEASURED,
      total: count(row, "total"),
      // Structurally always 0: the column is NOT NULL with a foreign key.
      business_id_null: count(row, "business_id_null"),
      with_content_provenance: count(row, "with_content_provenance"),
      without_content_provenance: count(row, "without_content_provenance"),
      with_supplier_reference: count(row, "with_supplier_reference"),
      note: "content_provenance counts a non-empty source_url. It says where the CONTENT came from and is not evidence of ownership or of the creation path.",
    },
    discovery_records: {
      status: MEASURABILITY.MEASURED,
      total: count(scraped.rows[0], "total"),
      note: "scraped_products. Counted separately from commercial listings and never added to them.",
    },
    created_through_legacy_path: {
      status: MEASURABILITY.UNRECONSTRUCTIBLE,
      reason: "No intake channel was ever recorded. The creation path cannot be derived from source_url, supplier_id, product name or timestamps, and this module will not estimate it.",
    },
    default_business_id_assignment: {
      status: MEASURABILITY.UNRECONSTRUCTIBLE,
      reason: "createProduct assigns a fallback business_id without recording that it did so, so a fallback row and a deliberate one are byte-identical. The per-business_id counts in breakdowns.by_business_id are raw row counts and conflate both; they are not evidence of fallback assignment.",
    },
  };
};

// ─── B · public catalogue exposure ───────────────────────────────────────────

const measurePublicExposure = async (pool) => {
  // listProducts() concatenates both tables and applies no row filter, so what
  // it returns is simply every row in both. Measured rather than assumed.
  const result = await pool.query(`
    select
      (select count(*) from public.business_products) as commercial,
      (select count(*) from public.scraped_products) as discovery
  `);
  const row = result.rows[0];
  const commercial = count(row, "commercial");
  const discovery = count(row, "discovery");

  return {
    returned_by_public_listing: {
      status: MEASURABILITY.MEASURED,
      commercial_listings: commercial,
      discovery_records: discovery,
      total_rows_served: commercial + discovery,
      note: "GET /api/products serves listProducts(), which applies no row filter. toPublicProduct() strips columns, never rows.",
    },
    reachable_via_product_detail: {
      status: MEASURABILITY.MEASURED,
      commercial_listings: commercial,
      discovery_records: discovery,
      note: "GET /api/products/:id resolves against both tables independently of the listing, so a direct link reaches any row.",
    },
    excluded_by_existing_filters: {
      status: MEASURABILITY.CODE_VERIFIED,
      count: 0,
      reason: "No publication, visibility, active or approval column exists on either table, and no public route filters rows. There is nothing for a filter to exclude.",
    },
    shop_and_search_surfaces: {
      status: MEASURABILITY.CLIENT_SIDE_ONLY,
      reason: "Shop search and filtering run in the browser over the array already delivered by GET /api/products. What a given visitor sees after filtering is not observable from server-side data.",
    },
  };
};

// ─── C · purchase exposure ───────────────────────────────────────────────────

const measurePurchaseExposure = async (pool) => {
  // These predicates mirror resolveCatalogOrderItem: stock first, then a price
  // that resolves above zero. They are read as counts; no order is created.
  const [commercial, discovery] = await Promise.all([
    pool.query(`
      select
        count(*) filter (where in_stock is true) as in_stock,
        count(*) filter (
          where in_stock is true
            and coalesce(nullif(sale_price, 0), price) > 0
        ) as purchasable,
        count(*) filter (
          where in_stock is true
            and coalesce(nullif(sale_price, 0), price) is null
        ) as no_resolvable_price,
        count(*) filter (where coalesce(cardinality(flavors), 0) > 1) as multi_variant,
        count(*) filter (where coalesce(cardinality(flavors), 0) = 1) as single_variant,
        count(*) filter (where coalesce(cardinality(flavors), 0) = 0) as no_variant_data
      from public.business_products
    `),
    pool.query(`
      select
        count(*) filter (where stock_status in ('in_stock', 'limited')) as in_stock,
        count(*) filter (
          where stock_status in ('in_stock', 'limited')
            and coalesce(nullif(final_price, 0), nullif(sale_price, 0), regular_price) > 0
        ) as purchasable
      from public.scraped_products
    `),
  ]);

  const c = commercial.rows[0];
  const d = discovery.rows[0];

  return {
    accepted_by_checkout_resolution: {
      status: MEASURABILITY.MEASURED,
      commercial_listings: count(c, "purchasable"),
      discovery_records: count(d, "purchasable"),
      note: "Mirrors resolveCatalogOrderItem: in stock, and a price that resolves above zero. Counted, never purchased.",
    },
    can_reach_order_resolution: {
      status: MEASURABILITY.MEASURED,
      commercial_listings: count(c, "in_stock"),
      discovery_records: count(d, "in_stock"),
      note: "Stock is the only gate before price resolution; both tables are reachable by id.",
    },
    no_resolvable_price: {
      status: MEASURABILITY.MEASURED,
      commercial_listings: count(c, "no_resolvable_price"),
    },
    variant_data: {
      status: MEASURABILITY.MEASURED,
      multi_variant: count(c, "multi_variant"),
      single_variant: count(c, "single_variant"),
      no_variant_data: count(c, "no_variant_data"),
      note: "flavors[] is the only variant carrier that exists. Its entries are display strings with prices embedded in the text.",
    },
    exposed_to_variant_price_bug: {
      status: MEASURABILITY.MEASURED,
      count: count(c, "multi_variant"),
      reason: "A listing with more than one variant label is priced from the base product regardless of the variant a customer selects (F-4). Whether those labels actually carry different prices cannot be determined from a text array, so this is an upper bound on affected listings, not a count of mischarges.",
    },
  };
};

// ─── D · order exposure ──────────────────────────────────────────────────────

const measureOrderExposure = async (pool) => {
  const [bySource, orders, dangling] = await Promise.all([
    pool.query(`
      select coalesce(product_source, 'null') as source,
             count(*) as items,
             count(distinct product_id) as distinct_products
        from public.order_items
       group by coalesce(product_source, 'null')
       order by coalesce(product_source, 'null')
    `),
    pool.query(`
      select
        count(distinct order_id) filter (where product_source = 'scraped') as orders_with_discovery_item,
        count(distinct order_id) as orders_with_any_item,
        count(*) filter (where product_id is null) as items_without_product_id
      from public.order_items
    `),
    // A dangling product_id is the CORRECT state for a snapshot, not a defect.
    // It is counted here only to size a future clean-up conversation. No
    // runtime code performs this join: order history renders from order_items
    // alone, and adding this join anywhere would break snapshot independence.
    pool.query(`
      select count(*) as items
        from public.order_items oi
       where oi.product_id is not null
         and not exists (select 1 from public.business_products bp where bp.id = oi.product_id)
         and not exists (select 1 from public.scraped_products sp where sp.id = oi.product_id)
    `),
  ]);

  return {
    items_by_product_source: {
      status: MEASURABILITY.MEASURED,
      breakdown: bySource.rows.map((row) => ({
        product_source: row.source,
        items: count(row, "items"),
        distinct_products: count(row, "distinct_products"),
      })),
    },
    orders_containing_a_discovery_item: {
      status: MEASURABILITY.MEASURED,
      count: count(orders.rows[0], "orders_with_discovery_item"),
      of_total_orders_with_items: count(orders.rows[0], "orders_with_any_item"),
    },
    items_without_product_id: {
      status: MEASURABILITY.MEASURED,
      count: count(orders.rows[0], "items_without_product_id"),
    },
    items_whose_catalogue_row_is_gone: {
      status: MEASURABILITY.MEASURED,
      count: count(dangling.rows[0], "items"),
      note: "Planning metric only. A dangling product_id is the expected, correct state of an immutable snapshot - not a fault. Order history renders from order_items alone and never performs this join.",
    },
    snapshot_independence: {
      status: MEASURABILITY.CODE_VERIFIED,
      holds: true,
      reason: "order_items has exactly one foreign key, to orders.id. No catalogue row can cascade into history, and attachOrderItems selects from order_items with no join.",
    },
  };
};

// ─── F · recommendation exposure ─────────────────────────────────────────────

const measureRecommendationExposure = async (pool) => {
  const result = await pool.query("select count(*) as total from public.business_products");
  return {
    server_side_ai_recommendations: {
      status: MEASURABILITY.CODE_VERIFIED,
      includes_discovery_records: false,
      candidate_pool: count(result.rows[0], "total"),
      reason: "catalogRecommendations.js queries public.business_products only; the exclusion is stated in the module itself and is covered by a test.",
    },
    client_side_recommendations: {
      status: MEASURABILITY.CLIENT_SIDE_ONLY,
      includes_discovery_records: true,
      reason: "src/lib/productRecommendations.ts ranks the array returned by getShopProducts(), which is GET /api/products and therefore includes discovery records. What any visitor is shown is not observable server-side.",
    },
    persisted_recommendation_data: {
      status: MEASURABILITY.CODE_VERIFIED,
      exists: false,
      reason: "Recommendations are computed per request. No table stores them.",
    },
  };
};

// ─── G · analytics exposure ──────────────────────────────────────────────────

const measureAnalyticsExposure = () => ({
  product_analytics: {
    status: MEASURABILITY.CODE_VERIFIED,
    includes_discovery_records: true,
    shared_dependency: "listProducts()",
    risk: "listAdminAnalytics calls the same listProducts() that serves the public catalogue. A row filter added there to hide legacy products would silently restate every admin product number as well. Any future public visibility filter must be a parameter at the call site, not a hardcoded WHERE.",
  },
  order_analytics: {
    status: MEASURABILITY.CODE_VERIFIED,
    includes_discovery_records: true,
    reason: "Order analytics read orders and order_items, which contain legacy items as immutable snapshots. They are unaffected by any catalogue change.",
  },
  revenue_analytics: {
    status: MEASURABILITY.CODE_VERIFIED,
    reason: "Revenue is derived from orders. Hiding a catalogue row cannot alter historical revenue, because no revenue figure joins the catalogue.",
  },
  seller_analytics: {
    status: MEASURABILITY.CODE_VERIFIED,
    exists: false,
    reason: "No per-seller analytics surface exists. business_id is not exposed in public product responses and no admin report groups by it.",
  },
});

// ─── H · ownership review exposure ───────────────────────────────────────────

const measureOwnershipReview = async (pool) => {
  const [latest, totals, reopened] = await Promise.all([
    // Deterministic latest-event selection: created_at is written with
    // clock_timestamp(), so it is strictly increasing per product, and id
    // breaks any remaining tie.
    pool.query(
      `
        with latest as (
          select distinct on (entity_id) entity_id, new_values
            from public.admin_audit_log
           where entity_type = $1
           order by entity_id, created_at desc, id desc
        )
        select coalesce(new_values->>'state', 'unresolved') as state, count(*) as products
          from latest
         group by coalesce(new_values->>'state', 'unresolved')
         order by coalesce(new_values->>'state', 'unresolved')
      `,
      [OWNERSHIP_ENTITY_TYPE],
    ),
    pool.query(
      `
        select count(*) as events,
               count(distinct entity_id) as products_with_any_event
          from public.admin_audit_log
         where entity_type = $1
      `,
      [OWNERSHIP_ENTITY_TYPE],
    ),
    pool.query(
      `
        select count(distinct entity_id) as products
          from public.admin_audit_log
         where entity_type = $1
           and new_values->>'state' = 'ownership_review'
           and old_values->>'state' in ('verified_mipo_shop', 'verified_external_seller', 'rejected')
      `,
      [OWNERSHIP_ENTITY_TYPE],
    ),
  ]);

  const byState = latest.rows.reduce((totals_, row) => {
    totals_[row.state] = count(row, "products");
    return totals_;
  }, {});

  const reviewed = count(totals.rows[0], "products_with_any_event");
  const catalogue = await pool.query(`
    select (select count(*) from public.business_products)
         + (select count(*) from public.scraped_products) as total
  `);

  return {
    status: MEASURABILITY.MEASURED,
    total_review_events: count(totals.rows[0], "events"),
    products_with_any_review_event: reviewed,
    products_with_no_review_event: Math.max(0, count(catalogue.rows[0], "total") - reviewed),
    products_with_multiple_review_events: Math.max(0, count(totals.rows[0], "events") - reviewed),
    products_reopened_after_a_decision: count(reopened.rows[0], "products"),
    by_latest_state: {
      unresolved: byState.unresolved ?? 0,
      ownership_review: byState.ownership_review ?? 0,
      verified_mipo_shop: byState.verified_mipo_shop ?? 0,
      verified_external_seller: byState.verified_external_seller ?? 0,
      rejected: byState.rejected ?? 0,
    },
    note: "A review event records a human decision about ownership. It is not a reassignment: no business_id has been changed by any of these events.",
  };
};

// ─── I · provenance quality ──────────────────────────────────────────────────

const measureProvenance = async (pool) => {
  const result = await pool.query(`
    select
      count(*) filter (where source_url is not null and btrim(source_url) <> '') as available,
      count(*) filter (where source_url is null or btrim(source_url) = '') as missing,
      count(*) filter (
        where source_url is not null and btrim(source_url) <> ''
          and source_url !~* '^https?://'
      ) as ambiguous
    from public.business_products
  `);
  const row = result.rows[0];
  return {
    content_provenance: {
      status: MEASURABILITY.MEASURED,
      available: count(row, "available"),
      missing: count(row, "missing"),
      ambiguous: count(row, "ambiguous"),
      note: "Ambiguous means a source_url that is present but is not an http(s) URL, so no host can be read from it.",
    },
    ownership_provenance: {
      status: MEASURABILITY.UNRECONSTRUCTIBLE,
      reason: "Never recorded. source_url, supplier_id, image origin, current business_id, product name, order history and source domain are each evidence of something other than ownership, and none of them is read as ownership evidence here or anywhere else.",
    },
  };
};

// ─── J · breakdowns ──────────────────────────────────────────────────────────

const BREAKDOWN_LIMIT = 50;

const measureBreakdowns = async (pool) => {
  const [byBusiness, byCategory, byMonth, byOrderExposure] = await Promise.all([
    pool.query(
      `
        select bp.business_id, bpr.business_name, bpr.is_verified, count(*) as products
          from public.business_products bp
          left join public.business_profiles bpr on bpr.id = bp.business_id
         group by bp.business_id, bpr.business_name, bpr.is_verified
         order by count(*) desc, bp.business_id
         limit $1
      `,
      [BREAKDOWN_LIMIT],
    ),
    pool.query(
      `
        select coalesce(category, 'uncategorised') as category, count(*) as products
          from public.business_products
         group by coalesce(category, 'uncategorised')
         order by count(*) desc, coalesce(category, 'uncategorised')
         limit $1
      `,
      [BREAKDOWN_LIMIT],
    ),
    pool.query(
      `
        select to_char(date_trunc('month', created_at), 'YYYY-MM') as month, count(*) as products
          from public.business_products
         group by date_trunc('month', created_at)
         order by date_trunc('month', created_at) desc
         limit $1
      `,
      [BREAKDOWN_LIMIT],
    ),
    pool.query(`
      select
        count(*) filter (where exists (
          select 1 from public.order_items oi where oi.product_id = bp.id
        )) as with_order_exposure,
        count(*) filter (where not exists (
          select 1 from public.order_items oi where oi.product_id = bp.id
        )) as without_order_exposure
      from public.business_products bp
    `),
  ]);

  return {
    by_source_type: {
      status: MEASURABILITY.MEASURED,
      note: "See population: commercial_listings and discovery_records are counted separately and never summed.",
    },
    by_business_id: {
      status: MEASURABILITY.MEASURED,
      truncated_to: BREAKDOWN_LIMIT,
      rows: byBusiness.rows.map((row) => ({
        business_id: row.business_id,
        business_name: row.business_name ?? null,
        business_is_verified: row.is_verified ?? null,
        products: count(row, "products"),
      })),
      note: "Raw row counts. A business_id here is where the row currently points, not a finding about who owns it: fallback and deliberate assignment are indistinguishable.",
    },
    by_category: {
      status: MEASURABILITY.MEASURED,
      truncated_to: BREAKDOWN_LIMIT,
      rows: byCategory.rows.map((row) => ({ category: row.category, products: count(row, "products") })),
    },
    by_creation_month: {
      status: MEASURABILITY.MEASURED,
      truncated_to: BREAKDOWN_LIMIT,
      rows: byMonth.rows.map((row) => ({ month: row.month, products: count(row, "products") })),
      note: "A creation date is not evidence of the creation path.",
    },
    by_order_exposure: {
      status: MEASURABILITY.MEASURED,
      with_order_exposure: count(byOrderExposure.rows[0], "with_order_exposure"),
      without_order_exposure: count(byOrderExposure.rows[0], "without_order_exposure"),
    },
    by_publication_state: {
      status: MEASURABILITY.UNRECONSTRUCTIBLE,
      reason: "No publication, visibility, active, status or approval column exists on either catalogue table. There is no publication state to break down.",
    },
    by_ownership_review_state: {
      status: MEASURABILITY.MEASURED,
      note: "See ownership_review.by_latest_state.",
    },
  };
};

// ─── the report ──────────────────────────────────────────────────────────────

export const measureLegacyExposure = async (pool, { environmentLabel = null } = {}) => {
  const [
    population,
    publicExposure,
    purchaseExposure,
    orderExposure,
    recommendationExposure,
    ownershipReview,
    provenance,
    breakdowns,
  ] = await Promise.all([
    measurePopulation(pool),
    measurePublicExposure(pool),
    measurePurchaseExposure(pool),
    measureOrderExposure(pool),
    measureRecommendationExposure(pool),
    measureOwnershipReview(pool),
    measureProvenance(pool),
    measureBreakdowns(pool),
  ]);

  return {
    generated_at: new Date().toISOString(),
    scope: {
      read_only: true,
      // Never true from inside the process. Which database answered these
      // queries is something only the operator running them knows.
      production_validated: PRODUCTION_VALIDATED,
      environment_label: environmentLabel || process.env.MEASUREMENT_ENVIRONMENT_LABEL || "unlabelled",
      warning: "These counts describe whichever database served this request. They are not production figures unless an operator confirms, out of band, that this instance is production.",
    },
    population,
    public_exposure: publicExposure,
    purchase_exposure: purchaseExposure,
    order_exposure: orderExposure,
    cart_exposure: {
      status: MEASURABILITY.UNMEASURABLE_SERVER_SIDE,
      reason: "Cart state lives in each browser's localStorage under the key mipo-cart. There is no cart table in the schema and no cart telemetry, so the number of carts holding a legacy product cannot be observed server-side at any cost. Adding telemetry is out of scope for this task.",
    },
    recommendation_exposure: recommendationExposure,
    analytics_exposure: measureAnalyticsExposure(),
    ownership_review: ownershipReview,
    provenance,
    breakdowns,
    blocked_questions: [
      { question: "Which products were created through the legacy intake path?", status: MEASURABILITY.UNRECONSTRUCTIBLE, reason: "No intake channel was ever recorded." },
      { question: "Which products carry a fallback business_id?", status: MEASURABILITY.UNRECONSTRUCTIBLE, reason: "The fallback recorded nothing to distinguish itself." },
      { question: "Who owns any legacy product?", status: MEASURABILITY.UNRECONSTRUCTIBLE, reason: "Requires the G-6 human review; no query answers it." },
      { question: "How many carts hold a legacy product?", status: MEASURABILITY.UNMEASURABLE_SERVER_SIDE, reason: "localStorage only; no cart table, no telemetry." },
      { question: "What does a visitor actually see after client-side filtering?", status: MEASURABILITY.CLIENT_SIDE_ONLY, reason: "Shop search and filters run in the browser." },
      { question: "What are the real production figures for any metric above?", status: MEASURABILITY.UNRECONSTRUCTIBLE, reason: "No production access exists in this environment. Every number above describes the database that served the request." },
    ],
  };
};
