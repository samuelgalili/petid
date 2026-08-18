// Attribution for the version trigger.
//
// The trigger records who changed a product and why, but a database trigger
// cannot know that a request came from an administrator on the review screen or
// from an import worker. The caller says so by setting three settings on its
// own transaction, and the trigger reads them.
//
// Setting them is local to the transaction, so nothing leaks between requests
// sharing a pooled connection.

/**
 * Marks the current transaction with who is making the change and why.
 *
 * Must be called on the same client that performs the update, inside the same
 * transaction — a pool would otherwise hand the update to a different
 * connection that never saw these settings.
 */
export const setChangeContext = async (client, { source = "system", reason = null, adminUserId = null } = {}) => {
  await client.query(
    "select set_config('mipo.change_source', $1, true), set_config('mipo.change_reason', $2, true), set_config('mipo.actor_admin_user_id', $3, true)",
    [source, reason || "", adminUserId || ""],
  );
};

/** A product's history, newest first. */
export const getProductVersions = async (pool, productId, limit = 50) => {
  const result = await pool.query(
    `
      select
        v.version, v.changed_fields, v.reason, v.source, v.created_at,
        a.email as actor_email,
        -- The whole state is large and rarely needed in a list, so only the
        -- fields a person compares at a glance are lifted out.
        jsonb_build_object(
          'name', v.state->>'name',
          'price', v.state->>'price',
          'status', v.state->>'status',
          'description', left(coalesce(v.state->>'description', ''), 200),
          'image_url', v.state->>'image_url'
        ) as summary
      from public.product_versions v
      left join public.admin_users a on a.id = v.actor_admin_user_id
      where v.product_id = $1
      order by v.version desc
      limit $2
    `,
    [productId, Math.min(200, Math.max(1, Number(limit) || 50))],
  );

  return result.rows;
};

/** One version in full, for comparing against another. */
export const getProductVersion = async (pool, productId, version) => {
  const result = await pool.query(
    "select version, state, changed_fields, reason, source, created_at from public.product_versions where product_id = $1 and version = $2",
    [productId, version],
  );
  return result.rows[0] || null;
};

/**
 * Restores a product to an earlier version.
 *
 * The restore is an update like any other, so it becomes the newest version
 * rather than replacing anything. Rolling back from 5 to 2 leaves 1 through 5
 * in place and adds 6 holding what 2 held, which means the rollback can itself
 * be rolled back.
 */
export const rollbackProduct = async (pool, { productId, version, adminUserId, reason }) => {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const result = await client.query(
      "select public.rollback_product_to_version($1, $2, $3, $4) as new_version",
      [productId, version, adminUserId || null, reason || null],
    );

    await client.query(
      `
        insert into public.admin_audit_log (action_type, entity_type, entity_id, new_values, actor_admin_user_id)
        values ('product.rollback', 'product', $1, $2::jsonb, $3)
      `,
      [
        productId,
        JSON.stringify({ restored_from_version: version, new_version: result.rows[0].new_version }),
        adminUserId || null,
      ],
    );

    await client.query("commit");
    return { product_id: productId, restored_from: version, new_version: result.rows[0].new_version };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};
