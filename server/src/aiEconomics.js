// Read queries over the usage and cost ledgers.
//
// These are the answers Mipo could not produce before: what AI cost, which
// feature spent it, and which users drive it. Everything aggregates from
// cost_events and usage_events - no number here is estimated in application
// code, so an admin figure and a ledger row can always be reconciled.

const MAX_WINDOW_DAYS = 400;

/**
 * Clamp a caller-supplied window. Admin screens pass query strings, and an
 * unbounded range over a growing ledger is a slow query waiting to happen.
 */
export const resolveWindow = ({ from, to, days = 30 } = {}) => {
  const end = to ? new Date(to) : new Date();
  const safeEnd = Number.isFinite(end.getTime()) ? end : new Date();

  if (from) {
    const start = new Date(from);
    if (Number.isFinite(start.getTime()) && start < safeEnd) {
      const spanDays = (safeEnd.getTime() - start.getTime()) / 86400000;
      if (spanDays <= MAX_WINDOW_DAYS) return { from: start, to: safeEnd };
      return { from: new Date(safeEnd.getTime() - MAX_WINDOW_DAYS * 86400000), to: safeEnd };
    }
  }

  const requestedDays = Math.min(MAX_WINDOW_DAYS, Math.max(1, Number(days) || 30));
  return { from: new Date(safeEnd.getTime() - requestedDays * 86400000), to: safeEnd };
};

export const resolveBucket = (bucket) => (
  ["hour", "day", "week", "month"].includes(String(bucket)) ? String(bucket) : "day"
);

const numeric = (value) => (value === null || value === undefined ? 0 : Number(value));

export const getEconomicsOverview = async (pool, window) => {
  const params = [window.from, window.to];

  const [usage, cost, users] = await Promise.all([
    pool.query(
      `
        select
          coalesce(sum(input_tokens), 0)::bigint  as total_input_tokens,
          coalesce(sum(output_tokens), 0)::bigint as total_output_tokens,
          coalesce(sum(cached_tokens), 0)::bigint as total_cached_tokens,
          coalesce(sum(total_tokens), 0)::bigint  as total_tokens,
          coalesce(sum(mipo_credits_consumed), 0) as total_mipo_credits,
          count(*)::int                           as total_events,
          count(distinct user_id)::int            as active_users
        from public.usage_events
        where occurred_at >= $1 and occurred_at < $2
      `,
      params,
    ),
    pool.query(
      `
        select
          coalesce(sum(provider_cost) filter (where service = 'ai'), 0)  as total_ai_cost,
          coalesce(sum(provider_cost) filter (where service <> 'ai'), 0) as total_external_cost,
          coalesce(sum(provider_cost), 0)                                as total_variable_cost,
          coalesce(max(currency), 'USD')                                 as currency
        from public.cost_events
        where occurred_at >= $1 and occurred_at < $2
      `,
      params,
    ),
    pool.query("select count(*)::int as total_users from public.app_users"),
  ]);

  const u = usage.rows[0];
  const c = cost.rows[0];
  const totalUsers = users.rows[0].total_users;
  const activeUsers = u.active_users;
  const variableCost = numeric(c.total_variable_cost);

  const requests = await pool.query(
    `
      select
        count(*) filter (where status = 'succeeded')::int as succeeded,
        count(*) filter (where status <> 'succeeded')::int as failed,
        coalesce(round(avg(latency_ms) filter (where status = 'succeeded')), 0)::int as avg_latency_ms
      from public.ai_requests
      where created_at >= $1 and created_at < $2
    `,
    params,
  );

  return {
    window: { from: window.from.toISOString(), to: window.to.toISOString() },
    total_users: totalUsers,
    active_ai_users: activeUsers,
    total_input_tokens: Number(u.total_input_tokens),
    total_output_tokens: Number(u.total_output_tokens),
    total_cached_tokens: Number(u.total_cached_tokens),
    total_tokens: Number(u.total_tokens),
    total_mipo_credits_consumed: numeric(u.total_mipo_credits),
    total_ai_cost: numeric(c.total_ai_cost),
    total_external_cost: numeric(c.total_external_cost),
    total_variable_cost: variableCost,
    currency: c.currency,
    // Per-user averages divide by different denominators on purpose: one is the
    // whole base, the other only those who actually used AI.
    average_cost_per_user: totalUsers > 0 ? variableCost / totalUsers : 0,
    average_cost_per_active_user: activeUsers > 0 ? variableCost / activeUsers : 0,
    requests_succeeded: requests.rows[0].succeeded,
    requests_failed: requests.rows[0].failed,
    average_latency_ms: requests.rows[0].avg_latency_ms,
  };
};

const groupedQuery = (joinTable, labelColumn, groupColumn) => `
  select
    g.id                                          as id,
    ${labelColumn}                                as label,
    coalesce(sum(u.total_tokens), 0)::bigint      as total_tokens,
    coalesce(sum(u.mipo_credits_consumed), 0)     as mipo_credits,
    count(u.id)::int                              as events,
    coalesce(sum(c.provider_cost), 0)             as provider_cost
  from public.usage_events u
  join ${joinTable} g on g.id = u.${groupColumn}
  left join public.cost_events c on c.usage_event_id = u.id
  where u.occurred_at >= $1 and u.occurred_at < $2
  group by g.id, label
  order by provider_cost desc, total_tokens desc
`;

const withShare = (rows) => {
  const total = rows.reduce((sum, row) => sum + numeric(row.provider_cost), 0);
  return rows.map((row) => ({
    ...row,
    total_tokens: Number(row.total_tokens),
    mipo_credits: numeric(row.mipo_credits),
    provider_cost: numeric(row.provider_cost),
    // The share an admin actually reads off the screen, computed from the
    // ledger rather than typed into a slide.
    cost_share_percent: total > 0 ? Math.round((numeric(row.provider_cost) / total) * 1000) / 10 : 0,
  }));
};

export const getCostByFeature = async (pool, window) => {
  const result = await pool.query(
    groupedQuery("public.ai_features", "g.name", "feature_id"),
    [window.from, window.to],
  );
  return withShare(result.rows);
};

export const getCostByModel = async (pool, window) => {
  const result = await pool.query(
    groupedQuery("public.ai_models", "coalesce(g.display_name, g.slug)", "model_id"),
    [window.from, window.to],
  );
  return withShare(result.rows);
};

export const getCostByProvider = async (pool, window) => {
  const params = [window.from, window.to];
  const result = await pool.query(
    `
      with provider_usage as (
        select
          u.provider_id,
          coalesce(sum(u.total_tokens), 0)::bigint  as total_tokens,
          coalesce(sum(u.mipo_credits_consumed), 0) as mipo_credits,
          coalesce(sum(c.provider_cost), 0)         as provider_cost
        from public.usage_events u
        left join public.cost_events c on c.usage_event_id = u.id
        where u.occurred_at >= $1 and u.occurred_at < $2
        group by u.provider_id
      ),
      provider_requests as (
        select
          provider_id,
          count(*)::int                                                        as requests,
          count(*) filter (where status = 'succeeded')::int                    as succeeded,
          count(*) filter (where status = 'fallback')::int                     as fallbacks,
          coalesce(round(avg(latency_ms) filter (where status = 'succeeded')), 0)::int as avg_latency_ms
        from public.ai_requests
        where created_at >= $1 and created_at < $2
        group by provider_id
      )
      select
        p.id,
        p.slug,
        p.name as label,
        p.is_enabled,
        coalesce(pu.total_tokens, 0)::bigint as total_tokens,
        coalesce(pu.mipo_credits, 0)         as mipo_credits,
        coalesce(pu.provider_cost, 0)        as provider_cost,
        coalesce(pr.requests, 0)             as requests,
        coalesce(pr.succeeded, 0)            as succeeded,
        coalesce(pr.fallbacks, 0)            as fallbacks,
        coalesce(pr.avg_latency_ms, 0)       as avg_latency_ms
      from public.ai_providers p
      left join provider_usage pu on pu.provider_id = p.id
      left join provider_requests pr on pr.provider_id = p.id
      order by provider_cost desc, p.name
    `,
    params,
  );

  return result.rows.map((row) => ({
    ...row,
    total_tokens: Number(row.total_tokens),
    mipo_credits: numeric(row.mipo_credits),
    provider_cost: numeric(row.provider_cost),
    success_rate: row.requests > 0 ? Math.round((row.succeeded / row.requests) * 1000) / 10 : null,
    average_cost_per_request: row.requests > 0 ? numeric(row.provider_cost) / row.requests : 0,
  }));
};

/**
 * Most expensive users in the window.
 *
 * Exposed as data only. This is cost monitoring - it is not wired to any
 * upsell, and deliberately so.
 */
export const getTopCostUsers = async (pool, window, limit = 10) => {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const result = await pool.query(
    `
      select
        u.user_id,
        au.email,
        au.full_name,
        coalesce(sum(u.total_tokens), 0)::bigint      as total_tokens,
        coalesce(sum(u.mipo_credits_consumed), 0)     as mipo_credits,
        count(u.id)::int                              as events,
        coalesce(sum(c.provider_cost) filter (where c.service = 'ai'), 0)  as ai_cost,
        coalesce(sum(c.provider_cost) filter (where c.service <> 'ai'), 0) as external_cost,
        coalesce(sum(c.provider_cost), 0)             as total_cost
      from public.usage_events u
      left join public.cost_events c on c.usage_event_id = u.id
      left join public.app_users au on au.id = u.user_id
      where u.occurred_at >= $1 and u.occurred_at < $2
        and u.user_id is not null
      group by u.user_id, au.email, au.full_name
      order by total_cost desc, total_tokens desc
      limit $3
    `,
    [window.from, window.to, safeLimit],
  );

  return result.rows.map((row) => ({
    ...row,
    total_tokens: Number(row.total_tokens),
    mipo_credits: numeric(row.mipo_credits),
    ai_cost: numeric(row.ai_cost),
    external_cost: numeric(row.external_cost),
    total_cost: numeric(row.total_cost),
  }));
};

export const getEconomicsTimeline = async (pool, window, bucket = "day") => {
  const safeBucket = resolveBucket(bucket);
  const result = await pool.query(
    `
      select
        date_trunc($3, u.occurred_at)                 as bucket,
        coalesce(sum(u.total_tokens), 0)::bigint      as total_tokens,
        coalesce(sum(u.mipo_credits_consumed), 0)     as mipo_credits,
        count(u.id)::int                              as events,
        count(distinct u.user_id)::int                as active_users,
        coalesce(sum(c.provider_cost), 0)             as provider_cost
      from public.usage_events u
      left join public.cost_events c on c.usage_event_id = u.id
      where u.occurred_at >= $1 and u.occurred_at < $2
      group by bucket
      order by bucket
    `,
    [window.from, window.to, safeBucket],
  );

  return result.rows.map((row) => ({
    bucket: row.bucket,
    total_tokens: Number(row.total_tokens),
    mipo_credits: numeric(row.mipo_credits),
    events: row.events,
    active_users: row.active_users,
    provider_cost: numeric(row.provider_cost),
  }));
};

/**
 * What one user is allowed to see about their own usage.
 *
 * Provider cost, model, provider and routing are all absent by construction
 * rather than by filtering a wider row - internal economics is not the user's
 * business, and a query that never selects it cannot leak it.
 */
export const getUserUsageSummary = async (pool, userId, window) => {
  const result = await pool.query(
    `
      select
        coalesce(sum(total_tokens), 0)::bigint    as total_tokens,
        coalesce(sum(mipo_credits_consumed), 0)   as credits_consumed,
        count(*)::int                             as events
      from public.usage_events
      where user_id = $1 and occurred_at >= $2 and occurred_at < $3
    `,
    [userId, window.from, window.to],
  );

  const byFeature = await pool.query(
    `
      select f.slug, f.name, count(u.id)::int as events,
             coalesce(sum(u.mipo_credits_consumed), 0) as credits_consumed
      from public.usage_events u
      join public.ai_features f on f.id = u.feature_id
      where u.user_id = $1 and u.occurred_at >= $2 and u.occurred_at < $3
      group by f.slug, f.name
      order by credits_consumed desc
    `,
    [userId, window.from, window.to],
  );

  return {
    period: { from: window.from.toISOString(), to: window.to.toISOString() },
    total_tokens: Number(result.rows[0].total_tokens),
    credits_consumed: numeric(result.rows[0].credits_consumed),
    events: result.rows[0].events,
    by_feature: byFeature.rows.map((row) => ({
      ...row,
      credits_consumed: numeric(row.credits_consumed),
    })),
  };
};

/**
 * Reconstruct one trace: every request that shared a trace_id, in order.
 */
export const getTrace = async (pool, traceId) => {
  const result = await pool.query(
    `
      select
        r.id, r.request_id, r.trace_id, r.status, r.attempt,
        r.started_at, r.completed_at, r.latency_ms,
        r.input_tokens, r.output_tokens, r.cached_tokens, r.total_tokens,
        r.error_code, r.safe_error_message, r.metadata,
        f.slug as feature, p.slug as provider, m.slug as model,
        u.mipo_credits_consumed, c.provider_cost, c.currency
      from public.ai_requests r
      left join public.ai_features f on f.id = r.feature_id
      left join public.ai_providers p on p.id = r.provider_id
      left join public.ai_models m on m.id = r.model_id
      left join public.usage_events u on u.ai_request_id = r.id
      left join public.cost_events c on c.usage_event_id = u.id
      where r.trace_id = $1
      order by r.started_at
    `,
    [traceId],
  );
  return result.rows;
};
