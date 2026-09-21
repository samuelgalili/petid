/**
 * Which orders a basket has to become — the browser's copy.
 *
 * The rules live in server/src/cartGrouping.js, which mirrors what the
 * checkout actually enforces at index.js:6102 and :6114. The two are pinned
 * to each other by server/test/cartGrouping.test.js.
 *
 * The server keeps enforcing; this only PREDICTS, so a shopper is not told at
 * the last step that the basket they spent ten minutes on cannot be bought.
 * The canvas's audit named it: "הלקוח בונה סל שנדחה בשלב האחרון."
 *
 * Today every basket is one group. A marketplace line needs an offer_id and
 * CartItem has no such field, so nothing but legacy reaches the cart. This is
 * written now because the alternative is writing it the week offers ship,
 * against a customer who has already been refused.
 */

export interface GroupableCartItem {
  price: number;
  quantity: number;
  sellerId?: string | null;
  sellerName?: string | null;
}

export interface CartSellerGroup<T extends GroupableCartItem> {
  key: string;
  sellerId: string | null;
  sellerName: string | null;
  items: T[];
  subtotal: number;
  count: number;
}

/** The key a line is grouped by. Legacy lines share one. */
export const LEGACY_SELLER_KEY = "__legacy__";

export const sellerKeyOf = (item: GroupableCartItem): string => (
  item?.sellerId ? String(item.sellerId) : LEGACY_SELLER_KEY
);

/**
 * The basket, split into the orders it must become.
 *
 * LEGACY IS A GROUP, NOT AN ABSENCE. A line with no seller cannot ride along
 * with one that has a seller - that is the checkout's second refusal, and it
 * is the one that is easy to miss, because "no seller" reads as "no opinion".
 *
 * Insertion order is preserved so the list does not reshuffle under someone
 * who is still adding to it.
 */
export const groupCartBySeller = <T extends GroupableCartItem>(items: T[] = []): CartSellerGroup<T>[] => {
  const groups = new Map<string, CartSellerGroup<T>>();

  for (const item of items) {
    const key = sellerKeyOf(item);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        sellerId: key === LEGACY_SELLER_KEY ? null : key,
        // Never invented. A seller whose name did not load is shown as a
        // seller; calling it MIPO is a claim about who the shopper is paying.
        sellerName: item?.sellerName ?? null,
        items: [],
        subtotal: 0,
        count: 0,
      });
    }

    const group = groups.get(key)!;
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

/** True when this basket cannot check out as one order. */
export const needsSeparateOrders = (items: GroupableCartItem[] = []): boolean => (
  groupCartBySeller(items).length > 1
);
