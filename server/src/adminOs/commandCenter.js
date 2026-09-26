/**
 * The Command Center's board, its activity feed, and the system's own state.
 *
 * ─── THE BOARD IS A SENTENCE, NOT FOUR LISTS ────────────────────────────────
 *
 * Something went wrong → somebody has to decide → somebody is doing it → it is
 * done. Four columns in that order, and the value is not the columns: it is
 * that a thing MOVES between them, so "what is stuck" is a place you look
 * rather than a query you run. The owner chose the four kinds of thing that
 * flow through it: orders, products, stock and AI cost.
 *
 * ─── EVERY ROW HERE IS A ROW THAT EXISTS ────────────────────────────────────
 *
 * The brief forbids inventing data and it is right to. Half of this file is
 * therefore about what CANNOT honestly be said:
 *
 *   - There is no budget anywhere in this schema, so "AI cost exceeded
 *     budget" is not a sentence this can form. What it can say is that AI
 *     REQUESTS FAILED, which is a fact with a row behind it.
 *   - `shipping_status` has exactly one value in production - 'label_created' -
 *     so it cannot distinguish "picked" from "handed to a courier". Orders
 *     move through `status` instead, which does.
 *   - `outbox_events.status` is only ever 'pending', so a "failed deliveries"
 *     count would always be zero and would look like health rather than like
 *     a column nothing writes. Stuck events are counted by AGE instead.
 *
 * ─── COUNT AND LIST ARE DIFFERENT QUESTIONS ─────────────────────────────────
 *
 * Each column returns a cap of rows AND a true total. A morning with forty
 * exceptions must say forty, and show eight; a column that shows eight and
 * says eight is a dashboard that gets quieter the worse things get.
 */

const PER_COLUMN = 6;

/** Money that failed, or a payment that never finished starting. */
const EXCEPTION_ORDERS = `
  select
    o.id::text, o.order_number, o.customer_name, o.total::float, o.created_at,
    case when o.payment_status = 'failed' then 'התשלום נכשל'
         else 'תשלום שלא הושלם' end as why
  from public.orders o
  where o.status <> 'cancelled'
    and (
      o.payment_status = 'failed'
      -- 'creating' is a payment attempt in flight. After fifteen minutes it is
      -- not in flight, it is abandoned, and the customer is looking at a page
      -- that never resolved.
      or (o.payment_status = 'creating' and o.updated_at < now() - interval '15 minutes')
    )
  order by o.created_at desc
`;

/** Products live in the shop that somebody marked as wrong. */
const EXCEPTION_PRODUCTS = `
  select
    id::text, name, price::float, updated_at,
    case when is_flagged then coalesce(nullif(flagged_reason, ''), 'המוצר דווח')
         when needs_image_review and needs_price_review then 'התמונה והמחיר לבדיקה'
         when needs_image_review then 'התמונה לבדיקה'
         else 'המחיר לבדיקה' end as why
  from public.business_products
  where is_flagged or needs_image_review or needs_price_review
  order by updated_at desc
`;

/**
 * Stock at or below the line somebody drew for it.
 *
 * THREE JOINS TO GET A NAME, and that is the schema rather than the query
 * being awkward: inventory hangs off a seller's OFFER, an offer is for a
 * VARIANT, and the name lives on the catalogue PRODUCT above the variant.
 * There is one inventory row per sellable thing, not per catalogue entry.
 *
 * Every join is a LEFT join and the name falls back to the offer's id,
 * because a row whose product was archived still has stock, and dropping it
 * from an exception list is how the one product nobody can account for
 * becomes invisible.
 */
const EXCEPTION_STOCK = `
  select
    i.id::text,
    coalesce(
      nullif(trim(coalesce(cp.name, '') || ' ' || coalesce(v.label, '')), ''),
      'מלאי ' || left(i.seller_offer_id::text, 8)
    ) as name,
    i.quantity, i.low_stock_threshold, i.updated_at,
    case when i.quantity <= 0 then 'אזל מהמלאי'
         else 'מתחת לסף — נותרו ' || i.quantity end as why
  from public.inventory i
  left join public.seller_offers so on so.id = i.seller_offer_id
  left join public.product_variants v on v.id = so.product_variant_id
  left join public.catalog_products cp on cp.id = v.catalog_product_id
  where i.quantity <= coalesce(i.low_stock_threshold, 0)
  order by i.quantity asc, i.updated_at desc
`;

/**
 * AI that failed, and connectors that cannot authenticate.
 *
 * NOT "over budget", because no budget exists in this schema and a threshold
 * invented here would be a number the owner never set being reported back to
 * him as if he had.
 */
const EXCEPTION_AI = `
  select id, name, why, at from (
    select
      r.id::text as id,
      coalesce(m.display_name, m.provider_model_name, m.slug, 'מודל') as name,
      'בקשת AI נכשלה: ' || coalesce(nullif(r.safe_error_message, ''), r.error_code, 'שגיאה') as why,
      r.created_at as at
    from public.ai_requests r
    left join public.ai_models m on m.id = r.model_id
    where r.status = 'error' and r.created_at > now() - interval '24 hours'

    union all

    select
      c.id::text,
      c.provider,
      'החיבור ל-' || c.provider || ' לא מאומת' as why,
      c.updated_at as at
    from public.admin_connectors c
    where c.status = 'error'
  ) ai
  order by at desc
`;

/** Waiting for a person to decide. */
const APPROVAL_ORDERS = `
  select id::text, order_number, customer_name, total::float, created_at
  from public.orders
  where status = 'pending'
  order by created_at desc
`;

const APPROVAL_DRAFTS = `
  select id::text, coalesce(name, 'טיוטה ללא שם') as name, brand, submitted_at, created_at
  from public.product_drafts
  where state = 'IN_REVIEW' and archived_at is null
  order by coalesce(submitted_at, created_at) desc
`;

const APPROVAL_PUBLISH = `
  select id::text, name, created_at
  from public.catalog_products
  where publication_state = 'UNPUBLISHED'
  order by created_at desc
`;

/** Being worked on right now. */
const PROGRESS_ORDERS = `
  select id::text, order_number, customer_name, total::float, updated_at,
         case when status = 'processing' then 'בליקוט' else 'נשלחה' end as why
  from public.orders
  where status in ('processing', 'shipped')
  order by updated_at desc
`;

const PROGRESS_DRAFTS = `
  select id::text, coalesce(name, 'טיוטה ללא שם') as name, updated_at
  from public.product_drafts
  where state = 'DRAFT' and archived_at is null
  order by updated_at desc
`;

/** Finished, recently enough to still be worth seeing. */
const DONE_ORDERS = `
  select id::text, order_number, customer_name, total::float, updated_at
  from public.orders
  where status = 'delivered' and updated_at > now() - interval '7 days'
  order by updated_at desc
`;

const DONE_PUBLISHED = `
  select id::text, name, published_at
  from public.catalog_products
  where publication_state = 'PUBLISHED' and published_at > now() - interval '7 days'
  order by published_at desc
`;

/**
 * What people did, newest first.
 *
 * From admin_audit_log, which already records actor, action, entity and both
 * sides of every change. A separate "activity" table would be a second,
 * poorer copy of it.
 */
const ACTIVITY = `
  select
    id::text, action_type, entity_type, entity_id::text, actor_email,
    actor_role, created_at, new_values
  from public.admin_audit_log
  order by created_at desc
  limit 12
`;

/** What each query contributes, and which column it lands in. */
const COLUMNS = [
  {
    key: "exception",
    sources: [
      { kind: "order_failed", sql: EXCEPTION_ORDERS, row: (r) => ({
        id: r.id, title: `הזמנה ${r.order_number}`, subtitle: r.why,
        detail: r.customer_name || "ללא שם", amount: r.total, at: r.created_at,
        href: `/admin/orders?order=${r.id}`,
      }) },
      { kind: "product_flagged", sql: EXCEPTION_PRODUCTS, row: (r) => ({
        id: r.id, title: r.name, subtitle: r.why, detail: null,
        amount: r.price, at: r.updated_at, href: `/admin/products?product=${r.id}`,
      }) },
      { kind: "stock_low", sql: EXCEPTION_STOCK, row: (r) => ({
        id: r.id, title: r.name, subtitle: r.why, detail: null,
        amount: null, at: r.updated_at, href: "/admin/inventory",
      }) },
      { kind: "ai_failed", sql: EXCEPTION_AI, row: (r) => ({
        id: r.id, title: r.name, subtitle: r.why, detail: null,
        amount: null, at: r.at, href: "/admin/ai-economics",
      }) },
    ],
  },
  {
    key: "approval",
    sources: [
      { kind: "order_pending", sql: APPROVAL_ORDERS, row: (r) => ({
        id: r.id, title: `הזמנה ${r.order_number}`, subtitle: "ממתינה לאישור",
        detail: r.customer_name || "ללא שם", amount: r.total, at: r.created_at,
        href: `/admin/orders?order=${r.id}`,
      }) },
      { kind: "draft_in_review", sql: APPROVAL_DRAFTS, row: (r) => ({
        id: r.id, title: r.name, subtitle: "טיוטה בביקורת",
        detail: r.brand || null, amount: null, at: r.submitted_at || r.created_at,
        href: "/admin/products?section=publishing",
      }) },
      { kind: "product_unpublished", sql: APPROVAL_PUBLISH, row: (r) => ({
        id: r.id, title: r.name, subtitle: "אושר וממתין לפרסום",
        detail: null, amount: null, at: r.created_at,
        href: "/admin/products?section=publishing",
      }) },
    ],
  },
  {
    key: "in_progress",
    sources: [
      { kind: "order_processing", sql: PROGRESS_ORDERS, row: (r) => ({
        id: r.id, title: `הזמנה ${r.order_number}`, subtitle: r.why,
        detail: r.customer_name || "ללא שם", amount: r.total, at: r.updated_at,
        href: `/admin/orders?order=${r.id}`,
      }) },
      { kind: "draft_open", sql: PROGRESS_DRAFTS, row: (r) => ({
        id: r.id, title: r.name, subtitle: "טיוטה בעריכה", detail: null,
        amount: null, at: r.updated_at, href: "/admin/products?section=publishing",
      }) },
    ],
  },
  {
    key: "completed",
    sources: [
      { kind: "order_delivered", sql: DONE_ORDERS, row: (r) => ({
        id: r.id, title: `הזמנה ${r.order_number}`, subtitle: "נמסרה",
        detail: r.customer_name || "ללא שם", amount: r.total, at: r.updated_at,
        href: `/admin/orders?order=${r.id}`,
      }) },
      { kind: "product_published", sql: DONE_PUBLISHED, row: (r) => ({
        id: r.id, title: r.name, subtitle: "פורסם לחנות", detail: null,
        amount: null, at: r.published_at, href: "/admin/products?section=publishing",
      }) },
    ],
  },
];

const newestFirst = (a, b) => new Date(b.at || 0) - new Date(a.at || 0);

/**
 * One column: every source, counted in full and listed in part.
 *
 * The count comes from the same query the list does, so the two cannot
 * disagree about what the column contains - which is the way a board starts
 * lying: a number from one definition over a list from another.
 */
const buildColumn = async (pool, column) => {
  const results = await Promise.all(column.sources.map(async (source) => {
    const { rows } = await pool.query(source.sql);
    return rows.map((row) => ({ kind: source.kind, ...source.row(row) }));
  }));

  const all = results.flat().sort(newestFirst);
  return { key: column.key, total: all.length, items: all.slice(0, PER_COLUMN) };
};

/**
 * Whether the parts of the platform are working.
 *
 * Measured, not declared. Every line here is something this process just
 * checked or just counted; there is no stored uptime figure and none is
 * invented, because a number nothing computes is the most convincing kind of
 * wrong thing to put on an operations screen.
 */
const readHealth = async (pool, emailState) => {
  const checks = [];

  const startedAt = Date.now();
  await pool.query("select 1");
  const latency = Date.now() - startedAt;
  checks.push({
    key: "database",
    label: "מסד נתונים",
    state: latency < 250 ? "ok" : "degraded",
    detail: `${latency}ms`,
  });

  const connectors = await pool.query(
    "select provider, status from public.admin_connectors order by provider",
  );
  const broken = connectors.rows.filter((row) => row.status === "error");
  checks.push({
    key: "connectors",
    label: "חיבורים",
    state: connectors.rowCount === 0 ? "unknown" : broken.length > 0 ? "down" : "ok",
    detail: connectors.rowCount === 0
      ? "לא הוגדרו חיבורים"
      : broken.length > 0
        ? `${broken.length} מתוך ${connectors.rowCount} בשגיאה`
        : `${connectors.rowCount} מחוברים`,
  });

  // By AGE, not by status: outbox_events.status only ever holds 'pending', so
  // a failed-delivery count would read as health rather than as a column
  // nothing writes to.
  const stuck = await pool.query(`
    select
      count(*) filter (where delivered_at is null)::int as waiting,
      count(*) filter (where delivered_at is null and occurred_at < now() - interval '1 hour')::int as stale
    from public.outbox_events
  `);
  const { waiting, stale } = stuck.rows[0];
  checks.push({
    key: "events",
    label: "תור אירועים",
    state: stale > 0 ? "degraded" : "ok",
    detail: stale > 0 ? `${stale} תקועים מעל שעה` : `${waiting} ממתינים`,
  });

  /*
   * OUTBOUND EMAIL, WHICH IS WHY THIS CHECK EXISTS AT ALL.
   *
   * "No verification email on signup" was reported, and every layer looked
   * fine: the key is required at boot, so the server being up proved it was
   * set. What is NOT proved by anything is that the FROM address can reach a
   * customer - Resend's testing sender delivers only to the Resend account's
   * own address and refuses everyone else with a 403 that is logged and
   * swallowed.
   *
   * It is injected rather than imported, because this module must not pull in
   * a 9,000-line server entry point to read two environment variables.
   */
  if (emailState) {
    const mail = emailState();
    checks.push({ key: "email", label: "מיילים יוצאים", state: mail.state, detail: mail.detail });
  }

  const ai = await pool.query(`
    select
      count(*) filter (where status = 'error')::int as failed,
      count(*)::int as total
    from public.ai_requests
    where created_at > now() - interval '1 hour'
  `);
  const { failed, total } = ai.rows[0];
  checks.push({
    key: "ai",
    label: "שירותי AI",
    state: total === 0 ? "unknown" : failed > 0 ? "degraded" : "ok",
    detail: total === 0 ? "אין בקשות בשעה האחרונה" : `${failed} כשלים מתוך ${total}`,
  });

  return checks;
};

const readActivity = async (pool) => {
  const { rows } = await pool.query(ACTIVITY);
  return rows.map((row) => ({
    id: row.id,
    action: row.action_type,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    actor: row.actor_email || "המערכת",
    actor_role: row.actor_role,
    at: row.created_at,
  }));
};

export const readCommandCenter = async ({ pool, emailState = null }) => {
  const [columns, activity, health] = await Promise.all([
    Promise.all(COLUMNS.map((column) => buildColumn(pool, column))),
    readActivity(pool),
    readHealth(pool, emailState),
  ]);

  return {
    board: Object.fromEntries(columns.map((column) => [column.key, {
      total: column.total,
      items: column.items,
    }])),
    activity,
    health,
  };
};
