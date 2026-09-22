import { readCommandCenter } from "./commandCenter.js";

/**
 * The admin's first screen.
 *
 * The four numbers live here; the board under them, the activity feed and the
 * system's own state live in commandCenter.js. One round trip returns all of
 * it, because the screen is usually read on a phone.
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

const one = async (pool, sql) => {
  const result = await pool.query(sql);
  return result.rows[0] ?? {};
};

/**
 * The first screen, in one round trip.
 *
 * THE FLAT QUEUE THAT USED TO BE HERE IS GONE. It listed waiting orders,
 * flagged products and unpublished products in one undifferentiated pile,
 * which answered "what needs me" and not "where is it stuck". The board in
 * commandCenter.js answers both, over the same rows and three more kinds
 * besides, so keeping the queue as well would be two representations of one
 * thing - and the way two representations end is disagreeing.
 */
export const adminHome = async ({ pool }) => {
  const [pending, revenue, unpublished, customers, centre] = await Promise.all([
    one(pool, PENDING_ORDERS),
    one(pool, REVENUE),
    one(pool, UNPUBLISHED_PRODUCTS),
    one(pool, NEW_CUSTOMERS),
    readCommandCenter({ pool }),
  ]);

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
      ...centre,
    },
  };
};
