import { recordEvent } from "./events.js";
import { setChangeContext } from "./productVersions.js";

// Working out what a product should cost.
//
// Nothing here prices anything. It produces a proposal with every input and
// every step attached, and a person applies it. A number that reaches the shop
// without anyone looking at it is the one mistake that costs money on every
// single sale, and this catalogue arrives with more than half its selling
// prices set to zero — so the engine would be doing the deciding, at scale,
// unsupervised.
//
// The formula is configuration. "Cheapest" and "most expensive" are both the
// wrong target; where between them a category sits is a business question.

export const PRICING_JOB_TYPE = "pricing.propose";

// Narrower beats broader. A rule for one product beats one for its brand, which
// beats its category, which beats the catalogue default.
const SCOPE_RANK = { product: 0, brand: 1, category: 2, supplier: 3, global: 4 };

const round2 = (value) => Math.round(value * 100) / 100;

/**
 * Applies the rule's rounding.
 *
 * A price ending in .90 reads as a decision; 87.43 reads as arithmetic that
 * escaped. Rounding always goes up, so it never quietly eats into margin.
 */
export const applyRounding = (price, rounding) => {
  if (!Number.isFinite(price) || price <= 0) return price;

  switch (rounding) {
    case "nearest_shekel":
      return Math.ceil(price);
    case "ends_90": {
      const whole = Math.floor(price);
      const candidate = whole + 0.9;
      return candidate >= price ? round2(candidate) : round2(whole + 1.9);
    }
    case "ends_99": {
      const whole = Math.floor(price);
      const candidate = whole + 0.99;
      return candidate >= price ? round2(candidate) : round2(whole + 1.99);
    }
    default:
      return round2(price);
  }
};

/** The percentile of a set of observed prices, linearly interpolated. */
export const percentileOf = (values, percentile) => {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];

  const position = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];

  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
};

/**
 * Computes a price from a rule, and shows its working.
 *
 * Returns the number plus every input and step, because a price a person is
 * asked to approve without being shown how it was reached is a price they will
 * either rubber-stamp or ignore.
 */
export const computePrice = (rule, { cost, marketPrices = [], currentPrice = null }) => {
  const calculation = { strategy: rule.strategy, inputs: {} };
  const warnings = [];
  let net = null;

  if (rule.strategy === "manual") {
    return { price: null, calculation: { strategy: "manual", reason: "This rule proposes nothing" }, warnings };
  }

  if (rule.strategy === "cost_plus_margin" || rule.strategy === "keystone") {
    if (!Number.isFinite(cost) || cost <= 0) {
      return { price: null, calculation, warnings: [{ code: "NO_COST", message: "אין עלות לחשב ממנה" }] };
    }

    calculation.inputs.cost = cost;

    if (rule.strategy === "keystone") {
      const multiplier = Number(rule.markup_multiplier) || 2;
      calculation.inputs.multiplier = multiplier;
      net = cost * multiplier;
      calculation.steps = [`${cost} × ${multiplier} = ${round2(net)}`];
    } else {
      const margin = Number(rule.margin_percent) || 0;
      calculation.inputs.margin_percent = margin;
      // Margin on the selling price, not markup on cost: a 45% margin means
      // cost is 55% of what the shopper pays. Confusing the two is the classic
      // way a shop prices itself into a loss.
      net = cost / (1 - margin / 100);
      calculation.steps = [`${cost} ÷ (1 − ${margin}/100) = ${round2(net)}`];
    }
  }

  if (rule.strategy === "market_median" || rule.strategy === "market_percentile") {
    // An uncertain match is a weaker observation, so it is left out rather than
    // allowed to drag the answer.
    const usable = marketPrices
      .filter((observation) => (observation.match_confidence ?? 100) >= 70)
      .map((observation) => Number(observation.price))
      .filter((price) => Number.isFinite(price) && price > 0);

    if (usable.length === 0) {
      return {
        price: null,
        calculation,
        warnings: [{ code: "NO_MARKET_DATA", message: "אין מחירי שוק להשוות אליהם" }],
      };
    }

    const target = rule.strategy === "market_median" ? 50 : (rule.market_percentile ?? 50);
    calculation.inputs.observations = usable.length;
    calculation.inputs.percentile = target;
    calculation.inputs.range = { min: Math.min(...usable), max: Math.max(...usable) };

    const positioned = percentileOf(usable, target);
    // Market prices are what shoppers see, so they already include VAT.
    net = rule.price_includes_vat
      ? positioned / (1 + Number(rule.vat_percent) / 100)
      : positioned;
    calculation.steps = [`percentile ${target} of ${usable.length} = ${round2(positioned)}`];
  }

  if (net === null) {
    return { price: null, calculation, warnings: [{ code: "NO_RESULT", message: "לא ניתן לחשב מחיר" }] };
  }

  let gross = net;
  if (rule.price_includes_vat) {
    const vat = Number(rule.vat_percent) || 0;
    gross = net * (1 + vat / 100);
    calculation.inputs.vat_percent = vat;
    calculation.steps.push(`+ ${vat}% מע״מ = ${round2(gross)}`);
  }

  const rounded = applyRounding(gross, rule.rounding);
  if (rounded !== round2(gross)) {
    calculation.steps.push(`עיגול (${rule.rounding}) = ${rounded}`);
  }

  // Margin is reported against the price without VAT, since VAT is not ours.
  const netFinal = rule.price_includes_vat
    ? rounded / (1 + (Number(rule.vat_percent) || 0) / 100)
    : rounded;
  const marginPercent = Number.isFinite(cost) && cost > 0 && netFinal > 0
    ? round2(((netFinal - cost) / netFinal) * 100)
    : null;

  // Guard rails mark rather than cap. Capping hides a rule that is wrong.
  if (marginPercent !== null) {
    if (rule.min_margin_percent !== null && marginPercent < Number(rule.min_margin_percent)) {
      warnings.push({
        code: "BELOW_MIN_MARGIN",
        message: `מרווח ${marginPercent}% מתחת למינימום ${rule.min_margin_percent}%`,
      });
    }
    if (rule.max_margin_percent !== null && marginPercent > Number(rule.max_margin_percent)) {
      warnings.push({
        code: "ABOVE_MAX_MARGIN",
        message: `מרווח ${marginPercent}% מעל למקסימום ${rule.max_margin_percent}%`,
      });
    }
  }

  // A price that moves a long way is worth a second look even when the rule is
  // right, because it usually means an input changed rather than the market.
  if (Number.isFinite(currentPrice) && currentPrice > 0) {
    const change = ((rounded - currentPrice) / currentPrice) * 100;
    calculation.inputs.current_price = currentPrice;
    calculation.change_percent = round2(change);
    if (Math.abs(change) >= 25) {
      warnings.push({
        code: "LARGE_CHANGE",
        message: `שינוי של ${round2(change)}% מהמחיר הנוכחי`,
      });
    }
  }

  return { price: rounded, margin_percent: marginPercent, calculation, warnings };
};

/** The rule that applies to one product: the narrowest active match. */
export const findRule = async (pool, product) => {
  const result = await pool.query(
    `
      select * from public.pricing_rules
      where is_active
        and (
          scope = 'global'
          or (scope = 'product' and product_id = $1)
          or (scope = 'brand' and brand_id = $2)
          or (scope = 'category' and category_id = $3)
          or (scope = 'supplier' and supplier_id = $4)
        )
    `,
    [product.id, product.brand_id, product.primary_category_id, product.primary_supplier_id],
  );

  return result.rows.sort((a, b) => {
    const byScope = SCOPE_RANK[a.scope] - SCOPE_RANK[b.scope];
    return byScope !== 0 ? byScope : a.priority - b.priority;
  })[0] || null;
};

/**
 * Produces a proposal for one product.
 *
 * Never writes a price. A second run supersedes an open proposal rather than
 * leaving two different answers waiting for the same decision.
 */
export const proposePrice = async (pool, productId) => {
  const productResult = await pool.query(
    `
      select id, name, sku, price, cost_price, brand_id, primary_category_id, primary_supplier_id
      from public.products
      where id = $1 and deleted_at is null
    `,
    [productId],
  );
  const product = productResult.rows[0];
  if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

  const rule = await findRule(pool, product);
  if (!rule) {
    return { product_id: productId, proposed: false, reason: "NO_RULE" };
  }

  const marketResult = await pool.query(
    `
      select price, match_confidence
      from public.market_prices
      where product_id = $1 and captured_at > now() - interval '30 days'
      order by captured_at desc
      limit 50
    `,
    [productId],
  );

  const { price, margin_percent, calculation, warnings } = computePrice(rule, {
    cost: Number(product.cost_price),
    marketPrices: marketResult.rows,
    currentPrice: Number(product.price),
  });

  if (price === null) {
    return { product_id: productId, proposed: false, reason: warnings[0]?.code || "NO_RESULT", warnings };
  }

  // Nothing to decide if the answer is what the product already costs.
  if (Number(product.price) > 0 && Math.abs(price - Number(product.price)) < 0.01) {
    return { product_id: productId, proposed: false, reason: "UNCHANGED", price };
  }

  await pool.query(
    "update public.price_proposals set status = 'superseded' where product_id = $1 and status = 'pending'",
    [productId],
  );

  const stored = await pool.query(
    `
      insert into public.price_proposals (
        product_id, rule_id, current_price, proposed_price, cost,
        calculation, margin_percent, warnings
      )
      values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb)
      returning id
    `,
    [
      productId, rule.id, Number(product.price) || null, price,
      Number(product.cost_price) || null,
      JSON.stringify(calculation), margin_percent, JSON.stringify(warnings),
    ],
  );

  return {
    product_id: productId,
    proposed: true,
    proposal_id: stored.rows[0].id,
    rule: rule.name,
    current_price: Number(product.price) || null,
    proposed_price: price,
    margin_percent,
    calculation,
    warnings,
  };
};

/** Proposes for every product that has a cost and no live proposal. */
export const proposeForCatalogue = async (pool, { limit = 500 } = {}) => {
  const candidates = await pool.query(
    `
      select p.id
      from public.products p
      where p.deleted_at is null
        and p.cost_price > 0
        and not exists (
          select 1 from public.price_proposals pp
          where pp.product_id = p.id and pp.status = 'pending'
        )
      limit $1
    `,
    [Math.min(2000, Math.max(1, Number(limit) || 500))],
  );

  const summary = { considered: candidates.rowCount, proposed: 0, skipped: 0, reasons: {} };

  for (const row of candidates.rows) {
    // One product's failure must not stop the rest of the catalogue.
    try {
      const result = await proposePrice(pool, row.id);
      if (result.proposed) summary.proposed += 1;
      else {
        summary.skipped += 1;
        summary.reasons[result.reason] = (summary.reasons[result.reason] || 0) + 1;
      }
    } catch (error) {
      summary.skipped += 1;
      summary.reasons.ERROR = (summary.reasons.ERROR || 0) + 1;
    }
  }

  return summary;
};

/** Applies or rejects proposals. This is the only path that writes a price. */
export const decideProposals = async (pool, { proposalIds, action, adminUserId }) => {
  const ids = [...new Set((proposalIds || []).filter(Boolean))].slice(0, 500);
  if (ids.length === 0) throw Object.assign(new Error("No proposals selected"), { statusCode: 400 });
  if (!["apply", "reject"].includes(action)) {
    throw Object.assign(new Error("action must be apply or reject"), { statusCode: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await setChangeContext(client, {
      source: "admin",
      reason: action === "apply" ? "מחיר עודכן מהצעת תמחור" : "הצעת תמחור נדחתה",
      adminUserId,
    });

    if (action === "reject") {
      const result = await client.query(
        `
          update public.price_proposals
          set status = 'rejected', decided_by_admin_user_id = $2, decided_at = now()
          where id = any($1::uuid[]) and status = 'pending'
          returning id
        `,
        [ids, adminUserId || null],
      );
      await client.query("commit");
      return { requested: ids.length, decided: result.rowCount, applied: 0 };
    }

    const pending = await client.query(
      "select id, product_id, proposed_price from public.price_proposals where id = any($1::uuid[]) and status = 'pending'",
      [ids],
    );

    for (const proposal of pending.rows) {
      await client.query(
        "update public.products set price = $2, updated_at = now() where id = $1",
        [proposal.product_id, proposal.proposed_price],
      );

      await recordEvent(client, {
        event_type: "product.price_changed",
        actor_admin_user_id: adminUserId,
        entity_type: "product",
        entity_id: proposal.product_id,
        source: "admin",
        payload: { new_price: Number(proposal.proposed_price), proposal_id: proposal.id },
      });
    }

    await client.query(
      `
        update public.price_proposals
        set status = 'applied', decided_by_admin_user_id = $2, decided_at = now()
        where id = any($1::uuid[]) and status = 'pending'
      `,
      [ids, adminUserId || null],
    );

    await client.query(
      `
        insert into public.admin_audit_log (action_type, entity_type, metadata, actor_admin_user_id)
        values ('pricing.apply', 'product', $1::jsonb, $2)
      `,
      [JSON.stringify({ requested: ids.length, applied: pending.rowCount }), adminUserId || null],
    );

    await client.query("commit");
    return { requested: ids.length, decided: pending.rowCount, applied: pending.rowCount };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

/** Proposals waiting for a decision, worst margin first. */
export const getPendingProposals = async (pool, { limit = 100 } = {}) => {
  const result = await pool.query(
    `
      select
        pp.id, pp.current_price, pp.proposed_price, pp.cost, pp.margin_percent,
        pp.calculation, pp.warnings, pp.created_at,
        p.id as product_id, p.name as product_name, p.sku,
        r.name as rule_name
      from public.price_proposals pp
      join public.products p on p.id = pp.product_id
      left join public.pricing_rules r on r.id = pp.rule_id
      where pp.status = 'pending'
      order by jsonb_array_length(pp.warnings) desc, pp.margin_percent nulls first
      limit $1
    `,
    [Math.min(500, Math.max(1, Number(limit) || 100))],
  );
  return result.rows;
};
