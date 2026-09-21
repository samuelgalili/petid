/**
 * Entity 360 — reading one entity completely enough to act on it.
 *
 * WHY THIS IS A MODULE AND NOT MORE OF index.js. The customer card has been on
 * screen for a while and carried two untrue statements the whole time: an
 * order history silently cut at 100 rows under a header counting all of them,
 * and a pet count that excluded archived animals sitting above a list that
 * included them. Neither is subtle. Both survived because the code lived in a
 * 9,400-line entry point that cannot be imported without starting a server, so
 * there was no place to write the test that would have said so.
 *
 * That is the argument for the move: not tidiness, but that a screen making
 * claims about somebody's money and somebody's animals should have those
 * claims checked by something other than reading.
 *
 * The dependencies come in rather than being imported, because the loaders
 * they name (orders with their items, a user's pets, a customer's notes) are
 * still index.js's, and a half-move that copies them is how two versions of
 * "what are this person's orders" start disagreeing.
 */

/**
 * An order belongs to the account that placed it, or — for a guest checkout —
 * to the account that has since claimed the commerce row, or to the guest row
 * itself. Same precedence customer_identities uses for identity_id, so the two
 * always agree on who a person is.
 */
export const ORDER_IDENTITY_EXPRESSION = "coalesce(o.user_id, sc.user_id, o.customer_id)";

/**
 * How much of a customer's order history the card loads.
 *
 * Exported because it is half of a promise: the card may show this many
 * orders, and it must say so when there are more. A test that invents its own
 * number proves nothing about the screen.
 */
export const ORDER_HISTORY_LIMIT = 100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const customerIdentityQuery = (where, tail) => `
  with attributed_orders as (
    select
      ${ORDER_IDENTITY_EXPRESSION} as identity_id,
      o.payment_status,
      o.total,
      coalesce(o.order_date, o.created_at) as placed_at
    from public.orders o
    left join public.shop_customers sc on sc.id = o.customer_id
  ),
  order_stats as (
    select
      identity_id,
      count(*) as orders_count,
      count(*) filter (where payment_status = 'paid') as paid_orders_count,
      coalesce(sum(total) filter (where payment_status = 'paid'), 0) as total_spent,
      max(placed_at) as last_order_at,
      min(placed_at) as first_order_at
    from attributed_orders
    where identity_id is not null
    group by identity_id
  ),
  pet_stats as (
    select user_id, count(*) as pets_count
    from public.pets
    where not archived
    group by user_id
  )
  select * from (
    -- distinct on guards the one case the view cannot: two shop_customers rows
    -- claimed by the same account would otherwise list that person twice.
    select distinct on (ci.identity_id)
      ci.identity_id,
      ci.identity_kind,
      ci.user_id,
      ci.shop_customer_id,
      ci.email,
      ci.full_name,
      ci.phone,
      au.is_active,
      au.last_login_at,
      coalesce(au.created_at, sc.created_at) as created_at,
      coalesce(os.last_order_at, ci.last_order_at) as last_order_at,
      os.first_order_at,
      coalesce(os.orders_count, 0) as orders_count,
      coalesce(os.paid_orders_count, 0) as paid_orders_count,
      coalesce(os.total_spent, 0) as total_spent,
      coalesce(ps.pets_count, 0) as pets_count,
      greatest(
        coalesce(os.last_order_at, ci.last_order_at),
        coalesce(au.created_at, sc.created_at)
      ) as last_activity_at
    from public.customer_identities ci
    left join public.app_users au on au.id = ci.user_id
    left join public.shop_customers sc on sc.id = ci.shop_customer_id
    left join order_stats os on os.identity_id = ci.identity_id
    left join pet_stats ps on ps.user_id = ci.user_id
    ${where}
    order by ci.identity_id, sc.created_at asc nulls last
  ) customers
  ${tail}
`;

export const createCustomerEntity360 = ({
  pool,
  toMoney,
  attachOrderItems,
  listUserPets,
  listCustomerNotes,
}) => {
  const mapCustomerIdentity = (row) => ({
    identity_id: row.identity_id,
    identity_kind: row.identity_kind,
    user_id: row.user_id,
    shop_customer_id: row.shop_customer_id,
    email: row.email,
    full_name: row.full_name,
    phone: row.phone,
    is_active: row.is_active === null || row.is_active === undefined ? null : Boolean(row.is_active),
    created_at: row.created_at,
    last_login_at: row.last_login_at,
    first_order_at: row.first_order_at,
    last_order_at: row.last_order_at,
    last_activity_at: row.last_activity_at,
    orders_count: Number(row.orders_count || 0),
    paid_orders_count: Number(row.paid_orders_count || 0),
    total_spent: toMoney(row.total_spent),
    pets_count: Number(row.pets_count || 0),
  });

  const listAdminCustomers = async ({ limit = 200, search = null, kind = null } = {}) => {
    const values = [];
    const where = [];

    const term = String(search || "").trim();
    if (term) {
      values.push(`%${term.replace(/[%_\\]/g, (character) => `\\${character}`)}%`);
      where.push(
        `(ci.email ilike $${values.length} or ci.full_name ilike $${values.length} or ci.phone ilike $${values.length})`,
      );
    }

    if (kind === "account" || kind === "guest") {
      values.push(kind);
      where.push(`ci.identity_kind = $${values.length}`);
    }

    values.push(Math.min(1000, Math.max(1, Number(limit) || 200)));

    const result = await pool.query(
      customerIdentityQuery(
        where.length > 0 ? `where ${where.join(" and ")}` : "",
        `order by last_activity_at desc nulls last, created_at desc nulls last limit $${values.length}`,
      ),
      values,
    );

    return result.rows.map(mapCustomerIdentity);
  };

  /**
   * Every row a note could have been filed against. An account may own several
   * shop_customers rows -- one per checkout email it has claimed -- and notes
   * written while those were still guests have to keep showing on the card.
   */
  const customerNoteSubjects = async (customer) => {
    if (!customer.user_id) {
      return {
        userId: null,
        shopCustomerIds: customer.shop_customer_id ? [customer.shop_customer_id] : [],
      };
    }

    const result = await pool.query("select id from public.shop_customers where user_id = $1", [customer.user_id]);
    return { userId: customer.user_id, shopCustomerIds: result.rows.map((row) => row.id) };
  };

  const getAdminCustomer = async (identityId) => {
    if (!UUID_PATTERN.test(String(identityId || ""))) return null;

    const result = await pool.query(customerIdentityQuery("where ci.identity_id = $1", "limit 1"), [identityId]);
    if (result.rowCount === 0) return null;

    const customer = mapCustomerIdentity(result.rows[0]);

    const orderRows = await pool.query(
      `
        select o.*
        from public.orders o
        left join public.shop_customers sc on sc.id = o.customer_id
        where ${ORDER_IDENTITY_EXPRESSION} = $1
        order by coalesce(o.order_date, o.created_at) desc
        limit ${ORDER_HISTORY_LIMIT}
      `,
      [customer.identity_id],
    );

    const subjects = await customerNoteSubjects(customer);

    const [orders, pets, notes] = await Promise.all([
      attachOrderItems(orderRows.rows),
      customer.user_id ? listUserPets(customer.user_id, "all") : Promise.resolve([]),
      listCustomerNotes(subjects),
    ]);

    // ─── every number here describes the list it sits above ────────────────
    //
    // Both of the following exist because the card printed a count taken over
    // one set on top of a list that was a different set, which is a lie a
    // reader can only catch by counting, and nobody counts.

    // The history stops at ORDER_HISTORY_LIMIT. orders_count does not, so
    // somebody hunting for an order that is real but not shown concludes it
    // does not exist - on a screen that is read while the customer is on the
    // phone. Stated as "fewer orders are here than exist" rather than as
    // "we hit the limit", so an order missing for ANY reason is still
    // declared.
    const ordersTruncated = customer.orders_count > orders.length;

    // listUserPets("all") returns archived animals; pet_stats counted only
    // live ones. Rather than choosing which set is right, the card shows all
    // of them and the count is DERIVED from what it shows, so the two cannot
    // drift again. archived_pets_count is what lets the screen mark the
    // animal that has died or been rehomed instead of listing it as if it
    // were still there.
    const archivedPets = pets.filter((pet) => pet.archived).length;

    return {
      customer: { ...customer, pets_count: pets.length - archivedPets },
      orders,
      pets,
      notes,
      orders_truncated: ordersTruncated,
      orders_shown: orders.length,
      archived_pets_count: archivedPets,
    };
  };

  return { listAdminCustomers, getAdminCustomer, customerNoteSubjects, mapCustomerIdentity };
};
