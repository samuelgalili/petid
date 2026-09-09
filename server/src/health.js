export const checkDatabaseHealth = async (database) => {
  try {
    await database.query("select 1");
    return true;
  } catch {
    return false;
  }
};

/**
 * The queries below are the reason this file is more than `select 1`.
 *
 * On 8 September a deploy applied a migration that dropped four identity
 * columns from `profiles`, then failed on a later migration — so the previous
 * API kept running against the new schema and every authenticated request
 * threw. Both of the deploy's own checks passed throughout: the container
 * healthcheck and the post-deploy smoke test are `/api/health`, and `select 1`
 * answers just as happily on a schema the running code cannot use. The
 * pipeline reported success on a site nobody could log into.
 *
 * Each probe selects the columns one of the API's hot paths actually selects,
 * with `limit 1`, so it costs nothing and passes on an empty database: what is
 * being checked is that the schema still has what the code asks for, not that
 * there is data in it. A renamed or dropped column fails its probe by name,
 * which is also the fastest way to read what broke.
 *
 * Keep these in step with the queries they mirror. A probe that drifts out of
 * date is worse than no probe: it reports health for a query nobody runs.
 */
export const SCHEMA_PROBES = [
  // getUserFromSession / loginUser — the path that broke.
  ["session", `
    select s.id, s.session_token_hash, s.expires_at, s.user_agent,
           u.id, u.email, u.full_name, u.phone, u.birthdate,
           u.password_hash, u.is_active, u.email_verified_at, u.terms_accepted_at
    from public.user_sessions s
    join public.app_users u on u.id = s.user_id
    limit 1`],

  // getProfileByUserId — identity moved to app_users, the join has to hold.
  ["profile", `
    select p.id, p.first_name, p.last_name, au.email, au.full_name
    from public.profiles p
    join public.app_users au on au.id = p.id
    limit 1`],

  // The catalogue, including the columns the warehouse label prints from.
  ["catalog", `
    select id, name, price, sku, weight, category_id, image_source_url
    from public.business_products
    limit 1`],

  // The shop's category tree. Its absence is not loud in the browser: the
  // frontend quietly falls back to a built-in list that matches nothing.
  ["categories", `
    select id, parent_id, slug, name_he, is_active
    from public.product_categories
    limit 1`],

  // An order and what ships with it.
  ["orders", `
    select o.id, o.order_number, o.shipping_address,
           i.sku, i.weight, i.weight_unit, i.quantity
    from public.orders o
    left join public.order_items i on i.order_id = o.id
    limit 1`],

  // The admin panel's own identity.
  ["admin", `
    select id, email, password_hash, role, is_active
    from public.admin_users
    limit 1`],
];

/**
 * Runs every probe and reports which ones the schema can no longer answer.
 * Never throws: a health check that throws tells you less than one that
 * reports.
 */
export const checkSchemaHealth = async (database) => {
  const failures = [];

  for (const [name, sql] of SCHEMA_PROBES) {
    try {
      await database.query(sql);
    } catch (error) {
      // The column or relation name is the whole point of the message; the
      // query text is not repeated, since it is in this file.
      failures.push({ probe: name, error: error.message });
    }
  }

  return { ok: failures.length === 0, checked: SCHEMA_PROBES.length, failures };
};
