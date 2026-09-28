/**
 * Order 360 — one order, completely enough to act on it.
 *
 * ─── WHY THIS EXISTS AT ALL ─────────────────────────────────────────────────
 *
 * There was no endpoint for ONE order. The admin read orders from the list
 * endpoint and opened them in a panel beside it, which means an order had no
 * address: six links in this codebase pointed at `/admin/orders?order=<id>`
 * and the orders screen never read that parameter, so every Command Center
 * card and every order on a customer's card landed on the unfiltered list.
 *
 * ─── WHAT A 360 ADDS OVER THE PANEL ─────────────────────────────────────────
 *
 * The panel showed the order. This adds the three things it could not:
 *
 *   - WHO. The panel printed a customer's name as text. There was no way to
 *     get from an order to the person who placed it, which is the next thing
 *     anybody wants after reading a failed payment. The identity is resolved
 *     with the same expression customer_identities uses, so the order and the
 *     customer screens cannot disagree about who somebody is.
 *   - WHAT HAPPENED. Every status change to an order has been recorded in the
 *     outbox since migration 0020, with its origin, and nothing ever read it
 *     back. "Who moved this to shipped, and when" was in the database and on
 *     no screen.
 *   - WHERE IT SITS. First order or eleventh, and what they have spent. A
 *     refund decision is a different decision for each.
 *
 * ─── THE HISTORY'S ONE HONESTY PROBLEM ──────────────────────────────────────
 *
 * outbox_events is a DELIVERY QUEUE that happens to be a good history. Two
 * things follow, and both are stated in the response rather than left for the
 * screen to assume:
 *
 *   - Orders placed before migration 0020 have no events at all. An empty
 *     stream must not read as "nothing has happened to this order" when it
 *     means "nothing was recorded". `history_covers_order` says which.
 *   - The schema declares an intent to sweep delivered rows. Nothing sweeps
 *     today, but a stream that silently loses its early entries the day
 *     something does is a screen that will mislead somebody about a refund.
 *     The same flag answers that case, because it is computed by comparing the
 *     earliest event against the order's own placement rather than by
 *     counting rows.
 */

import { ORDER_IDENTITY_EXPRESSION, customerIdentityQuery } from "./entity360.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * How many of the customer's OTHER orders travel with this one.
 *
 * Small on purpose. The question this answers is "is this person new here",
 * and that is answered by the count in the header; the list is context for the
 * eye, not a history to search. A customer's full history is one click away on
 * their own card, which says out loud when it is truncated.
 */
export const SIBLING_ORDER_LIMIT = 6;

/** The event types that describe an order, in the words an operator would use. */
export const ORDER_EVENT_TYPES = Object.freeze([
  "order.created",
  "order.paid",
  "order.payment_failed",
  "order.status_changed",
  "order.shipped",
]);

export const createOrderEntity360 = ({ pool, toMoney, attachOrderItems, mapCustomerIdentity }) => {
  /**
   * What happened to this order.
   *
   * entity_type/entity_id is exactly the index idx_outbox_entity was created
   * for - the comment on it in 0020 says "What happened to this order? - the
   * support and debugging path". This is that path, finally reaching a screen.
   *
   * `occurred_at` and not `created_at`: they are the same for every row written
   * so far, and occurred_at is the one that means what the reader thinks.
   */
  const listOrderEvents = async (orderId) => {
    const result = await pool.query(
      `
        select id, event_type, origin, payload, occurred_at
        from public.outbox_events
        where entity_type = 'order' and entity_id = $1
        order by occurred_at asc
      `,
      [orderId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      type: row.event_type,
      origin: row.origin,
      at: row.occurred_at,
      // The payload carries the from/to of whatever moved. Passed through
      // rather than flattened here: the screen renders a transition, and
      // deciding in SQL which half of it matters would throw away the other.
      payload: row.payload || {},
    }));
  };

  /**
   * The person who placed it, as the customer screens know them.
   *
   * Resolved through customerIdentityQuery rather than off the order's own
   * columns. An order carries user_id, customer_id and customer_email, and
   * picking one of those would give an identity that disagrees with the
   * customer list for exactly the awkward cases the identity view exists for -
   * a guest checkout later claimed by an account.
   */
  const orderCustomer = async (order) => {
    const identity = await pool.query(
      `
        select ${ORDER_IDENTITY_EXPRESSION} as identity_id
        from public.orders o
        left join public.shop_customers sc on sc.id = o.customer_id
        where o.id = $1
      `,
      [order.id],
    );

    const identityId = identity.rows[0]?.identity_id || null;
    if (!identityId) return null;

    const result = await pool.query(customerIdentityQuery("where ci.identity_id = $1", "limit 1"), [identityId]);
    if (result.rowCount === 0) return null;

    return mapCustomerIdentity(result.rows[0]);
  };

  /** Their other orders, most recent first, this one left out. */
  const siblingOrders = async (order, identityId) => {
    if (!identityId) return [];

    const result = await pool.query(
      `
        select o.id, o.order_number, o.status, o.payment_status, o.total,
               coalesce(o.order_date, o.created_at) as placed_at
        from public.orders o
        left join public.shop_customers sc on sc.id = o.customer_id
        where ${ORDER_IDENTITY_EXPRESSION} = $1 and o.id <> $2
        order by coalesce(o.order_date, o.created_at) desc
        limit ${SIBLING_ORDER_LIMIT}
      `,
      [identityId, order.id],
    );

    return result.rows.map((row) => ({
      id: row.id,
      order_number: row.order_number,
      status: row.status,
      payment_status: row.payment_status,
      total: toMoney(row.total),
      placed_at: row.placed_at,
    }));
  };

  const getAdminOrder360 = async (orderId) => {
    if (!UUID_PATTERN.test(String(orderId || ""))) return null;

    const rows = await pool.query("select * from public.orders where id = $1", [orderId]);
    if (rows.rowCount === 0) return null;

    const [order] = await attachOrderItems(rows.rows);
    const customer = await orderCustomer(order);

    const [events, siblings] = await Promise.all([
      listOrderEvents(order.id),
      siblingOrders(order, customer?.identity_id || null),
    ]);

    /*
     * DOES THE HISTORY REACH BACK TO THE ORDER ITSELF?
     *
     * Computed by comparing the earliest event against the order's placement,
     * not by asking whether the list is empty. Both of the ways this stream
     * can be incomplete then answer to one flag: an order older than the
     * outbox has no events, and an order whose early rows were swept has
     * events that all postdate it. The screen says "the record starts here"
     * instead of implying nothing happened.
     *
     * A minute of slack, because the order row and its first event are written
     * in one transaction but timestamped by separate now() calls, and a
     * history declared incomplete on every single order would be noise that
     * teaches the reader to ignore it.
     */
    const placedAt = order.order_date || order.created_at || null;
    const earliest = events[0]?.at || null;
    const historyCoversOrder = Boolean(
      placedAt && earliest
      && new Date(earliest).getTime() <= new Date(placedAt).getTime() + 60_000,
    );

    return {
      order,
      customer,
      events,
      sibling_orders: siblings,
      history_covers_order: historyCoversOrder,
    };
  };

  return { getAdminOrder360, listOrderEvents };
};
