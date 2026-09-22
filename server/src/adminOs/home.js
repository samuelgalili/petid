/**
 * The admin's first screen.
 *
 * There was not one. `/admin` redirected to the product list, so the question
 * an owner opens the admin to ask - what needs me this morning - was answered
 * by visiting four screens and reading four tables.
 *
 * The owner picked the four numbers himself: orders waiting, money today
 * against yesterday, products not in the shop, customers new this week. This
 * computes them in one round trip, which matters because the screen he reads
 * them on is usually a phone.
 *
 * ─── "TODAY" IS A PLACE, NOT A MOMENT ───────────────────────────────────────
 *
 * Every date here is cut in Asia/Jerusalem. now()::date in a container running
 * UTC puts an order placed at 21:00 Israel time - which is a good hour for
 * this shop - onto TOMORROW, so "today's revenue" would read low all evening
 * and the comparison against yesterday would be wrong in both directions. The
 * server's own clock is not the shop's day.
 *
 * ─── WHAT COUNTS AS MONEY ───────────────────────────────────────────────────
 *
 * payment_status = 'paid', and not cancelled. 'awaiting_cod' is money the
 * courier has not collected yet and 'creating' is a payment attempt in flight;
 * counting either would show revenue that may never arrive. Refunds are not
 * modelled anywhere in this schema, so a cancelled order that was paid is
 * excluded rather than guessed at - the conservative direction, and the one
 * that does not quietly overstate a day.
 *
 * ─── "NOT PUBLISHED" MEANS THE INTAKE PIPELINE, NOT THE SHOP TABLES ─────────
 *
 * The shop lists business_products and scraped_products, neither of which has
 * a publication flag - so there is no honest "unpublished" number to be had
 * from them. catalog_products does have one: a product that was approved and
 * has not been put in the shop. That is a real queue with a real screen behind
 * it, which is why it is the one reported.
 */

/** Orders in a state where somebody still has to do something. */
const PENDING_ORDERS = `
  select count(*)::int as value
  from public.orders
  where status = 'pending'
`;

const REVENUE = `
  select
    coalesce(sum(total) filter (
      where (created_at at time zone 'Asia/Jerusalem')::date
            = (now() at time zone 'Asia/Jerusalem')::date
    ), 0)::float as today,
    coalesce(sum(total) filter (
      where (created_at at time zone 'Asia/Jerusalem')::date
            = (now() at time zone 'Asia/Jerusalem')::date - 1
    ), 0)::float as yesterday
  from public.orders
  where payment_status = 'paid'
    and status <> 'cancelled'
    and created_at >= now() - interval '3 days'
`;

const UNPUBLISHED_PRODUCTS = `
  select count(*)::int as value
  from public.catalog_products
  where publication_state = 'UNPUBLISHED'
`;

/**
 * People who first appeared in the last seven days.
 *
 * The FULL JOIN is spelled out rather than read from customer_identities,
 * which does not carry a created_at - the view exists to answer "who is this
 * person", not "when did they arrive". The join is the view's own, so the
 * count is over the same set of people the customers screen lists.
 *
 * A guest who ordered without an account is a new customer as much as somebody
 * who registered, and counting app_users alone reports zero on a week of
 * nothing but guest checkouts. least() takes the earlier of the two rows for
 * somebody who has both, ignoring nulls, because that is when they first
 * appeared rather than when their second record was made.
 *
 * The boundary is converted BACK to a timestamptz. Comparing a timestamptz to
 * a bare date makes Postgres read the date at the session's timezone, which in
 * a UTC container is a different instant from midnight in Israel - a
 * three-hour window at each end of the week landing on the wrong side.
 */
const NEW_CUSTOMERS = `
  select count(*)::int as value
  from public.app_users au
  full join public.shop_customers sc on sc.user_id = au.id
  where least(au.created_at, sc.created_at)
        >= (((now() at time zone 'Asia/Jerusalem')::date - 6)::timestamp
            at time zone 'Asia/Jerusalem')
`;

/**
 * The queue underneath the numbers: one row per thing to do, newest first.
 *
 * Capped per kind. A morning with two hundred waiting orders is a morning for
 * the orders screen, and a list that long on a phone is a list nobody reads to
 * the end; the number above says how many there really are.
 */
const PER_KIND = 8;

const WAITING_ORDERS = `
  select id::text, order_number, customer_name, total::float, created_at
  from public.orders
  where status = 'pending'
  order by created_at desc
  limit ${PER_KIND}
`;

const WAITING_PRODUCTS = `
  select id::text, name, created_at
  from public.catalog_products
  where publication_state = 'UNPUBLISHED'
  order by created_at desc
  limit ${PER_KIND}
`;

/**
 * Products already in the shop that a person marked as wrong.
 *
 * These are live - somebody can buy one right now at a price flagged as
 * suspect or next to an image flagged as wrong - which is why they belong in
 * a queue rather than on a report.
 */
const FLAGGED_PRODUCTS = `
  select id::text, name, needs_image_review, needs_price_review, price::float
  from public.business_products
  where needs_image_review or needs_price_review
  order by updated_at desc
  limit ${PER_KIND}
`;

const one = async (pool, sql) => {
  const result = await pool.query(sql);
  return result.rows[0] ?? {};
};

export const adminHome = async ({ pool }) => {
  const [pending, revenue, unpublished, customers, orders, products, flagged] = await Promise.all([
    one(pool, PENDING_ORDERS),
    one(pool, REVENUE),
    one(pool, UNPUBLISHED_PRODUCTS),
    one(pool, NEW_CUSTOMERS),
    pool.query(WAITING_ORDERS),
    pool.query(WAITING_PRODUCTS),
    pool.query(FLAGGED_PRODUCTS),
  ]);

  const actions = [
    ...orders.rows.map((row) => ({
      kind: "order_waiting",
      id: row.id,
      title: `הזמנה ${row.order_number}`,
      subtitle: row.customer_name || "ללא שם",
      amount: row.total,
      at: row.created_at,
      href: `/admin/orders?order=${row.id}`,
    })),
    ...flagged.rows.map((row) => ({
      kind: "product_flagged",
      id: row.id,
      title: row.name,
      // Both can be true, and which it is changes what the admin does next.
      subtitle: row.needs_image_review && row.needs_price_review
        ? "התמונה והמחיר סומנו לבדיקה"
        : row.needs_image_review ? "התמונה סומנה לבדיקה" : "המחיר סומן לבדיקה",
      amount: row.needs_price_review ? row.price : null,
      at: null,
      href: `/admin/products?product=${row.id}`,
    })),
    ...products.rows.map((row) => ({
      kind: "product_unpublished",
      id: row.id,
      title: row.name,
      subtitle: "אושר ולא פורסם לחנות",
      amount: null,
      at: row.created_at,
      href: "/admin/publishing",
    })),
  ];

  return {
    status: 200,
    body: {
      numbers: {
        pending_orders: pending.value ?? 0,
        revenue_today: revenue.today ?? 0,
        revenue_yesterday: revenue.yesterday ?? 0,
        unpublished_products: unpublished.value ?? 0,
        new_customers_this_week: customers.value ?? 0,
      },
      actions,
    },
  };
};
