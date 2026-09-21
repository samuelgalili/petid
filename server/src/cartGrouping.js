/**
 * Which orders a basket has to become.
 *
 * The checkout refuses two things, at index.js:6102 and :6114:
 *
 *   MULTIPLE_SELLERS_IN_ORDER  more than one distinct seller_business_id
 *   MIXED_CATALOGUE_ORDER      one seller PLUS a line that has none
 *
 * and its own comment says why it is enforced there: "the cart lives in a
 * browser and a browser is not where a rule like this can be enforced." That
 * is right, and it is not an argument for the cart being ignorant of the rule.
 * The canvas's audit put it plainly: "הלקוח בונה סל שנדחה בשלב האחרון."
 *
 * So the server keeps enforcing and the cart starts PREDICTING, out of this
 * one module, so the two cannot drift into a basket the cart calls fine and
 * the checkout rejects.
 *
 * LEGACY IS A GROUP, NOT AN ABSENCE. A line with no seller cannot ride along
 * with a line that has one - that is the second rule, and it is the one that
 * is easy to miss, because "no seller" reads as "no opinion". Grouping it
 * under its own key is what makes the two rules one rule here: one group is
 * one order.
 *
 * WHAT IS REACHABLE TODAY: nothing but legacy. A marketplace line needs an
 * offer_id (index.js:5640) and the browser's CartItem has no such field, so
 * every basket is one group and this module returns one. It is written now
 * because the alternative is writing it the week offers ship, in a hurry,
 * against a customer who has already been refused.
 */

/** The key a line is grouped by. Legacy lines share one. */
export const LEGACY_SELLER_KEY = "__legacy__";

export const sellerKeyOf = (item) => {
  const id = item?.sellerId ?? item?.seller_business_id ?? null;
  return id ? String(id) : LEGACY_SELLER_KEY;
};

/**
 * The basket, split into the orders it must become.
 *
 * Order is preserved: the group whose first item was added first comes first,
 * so the list does not reshuffle under the shopper as they add things.
 */
export const groupCartBySeller = (items = []) => {
  const groups = new Map();

  for (const item of items) {
    const key = sellerKeyOf(item);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        sellerId: key === LEGACY_SELLER_KEY ? null : key,
        // The shop's own name when a line carries one. Never invented: an
        // unnamed seller is shown as a seller, not as MIPO.
        sellerName: item?.sellerName ?? null,
        items: [],
        subtotal: 0,
        count: 0,
      });
    }

    const group = groups.get(key);
    group.items.push(item);
    group.subtotal += Number(item?.price || 0) * Number(item?.quantity || 0);
    group.count += Number(item?.quantity || 0);
    if (!group.sellerName && item?.sellerName) group.sellerName = item.sellerName;
  }

  return [...groups.values()].map((group) => ({
    ...group,
    subtotal: Math.round(group.subtotal * 100) / 100,
  }));
};

/**
 * True when this basket cannot check out as one order.
 *
 * Deliberately derived from the grouping rather than re-deriving the rule: two
 * groups is exactly what the server refuses, whichever of its two codes it
 * answers with.
 */
export const needsSeparateOrders = (items = []) => groupCartBySeller(items).length > 1;
