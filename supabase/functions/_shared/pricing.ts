// Server-side order pricing.
//
// The client is never trusted for money. It sends product ids and quantities;
// every price, discount and total in an order is resolved here from the
// database. Keep the rules in this file in sync with the cart summary in
// src/pages/Checkout.tsx, which shows the customer the same numbers.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Free shipping at or above this subtotal, otherwise a flat fee. */
export const FREE_SHIPPING_THRESHOLD = 199;
export const FLAT_SHIPPING_FEE = 25;
/** Surcharge applied to cash-on-delivery orders. */
export const COD_SURCHARGE = 5;

export interface RequestedItem {
  product_id: string;
  quantity: number;
  variant?: string | null;
  size?: string | null;
}

export interface PricedItem {
  product_id: string;
  source: "business" | "scraped";
  name: string;
  image: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  variant: string | null;
  size: string | null;
}

export interface PricingFailure {
  ok: false;
  code:
    | "EMPTY_CART"
    | "INVALID_QUANTITY"
    | "PRODUCT_NOT_FOUND"
    | "OUT_OF_STOCK"
    | "INVALID_PRICE"
    | "COUPON_INVALID"
    | "INVALID_AMOUNT";
  message: string;
  details?: unknown;
}

export interface PricingSuccess {
  ok: true;
  items: PricedItem[];
  subtotal: number;
  base_shipping: number;
  shipping: number;
  shipping_discount: number;
  discount: number;
  cod_surcharge: number;
  total: number;
  coupon: { id: string; code: string } | null;
}

export type PricingResult = PricingSuccess | PricingFailure;

/** Round to agorot so repeated float math cannot drift. */
function money(n: number): number {
  return Math.round(n * 100) / 100;
}

const MAX_QUANTITY_PER_LINE = 99;

/**
 * Resolve prices from the database and compute every total for an order.
 *
 * Storefront products live in two tables that Shop.tsx merges into one list,
 * so an id may belong to either. business_products is checked first; any id
 * not found there is looked up in scraped_products.
 */
export async function priceOrder(
  supabase: SupabaseClient,
  params: {
    items: RequestedItem[];
    couponCode?: string | null;
    userId: string;
    paymentMethod: string;
  }
): Promise<PricingResult> {
  const { items, couponCode, userId, paymentMethod } = params;

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, code: "EMPTY_CART", message: "העגלה ריקה." };
  }

  // Collapse duplicate lines so a repeated id cannot be used to confuse the
  // lookup, and reject quantities that are not sane positive integers.
  const wanted = new Map<string, RequestedItem>();
  for (const item of items) {
    const qty = Number(item?.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY_PER_LINE) {
      return {
        ok: false,
        code: "INVALID_QUANTITY",
        message: "כמות לא תקינה בעגלה.",
        details: { product_id: item?.product_id, quantity: item?.quantity },
      };
    }
    if (typeof item.product_id !== "string" || item.product_id.length === 0) {
      return { ok: false, code: "PRODUCT_NOT_FOUND", message: "מזהה מוצר חסר." };
    }

    const key = `${item.product_id}|${item.variant ?? ""}|${item.size ?? ""}`;
    const existing = wanted.get(key);
    if (existing) {
      existing.quantity += qty;
    } else {
      wanted.set(key, {
        product_id: item.product_id,
        quantity: qty,
        variant: item.variant ?? null,
        size: item.size ?? null,
      });
    }
  }

  const ids = [...new Set([...wanted.values()].map((i) => i.product_id))];

  const { data: businessRows, error: businessError } = await supabase
    .from("business_products")
    .select("id, name, price, sale_price, image_url, in_stock")
    .in("id", ids);

  if (businessError) {
    throw new Error(`business_products lookup failed: ${businessError.message}`);
  }

  const priced = new Map<
    string,
    { source: "business" | "scraped"; name: string; image: string; price: number; inStock: boolean }
  >();

  for (const row of businessRows ?? []) {
    // Matches ProductCard: the sale price wins when one is set.
    const price = Number(row.sale_price ?? row.price ?? NaN);
    priced.set(row.id, {
      source: "business",
      name: row.name ?? "מוצר",
      image: row.image_url ?? "",
      price,
      inStock: row.in_stock !== false,
    });
  }

  const missing = ids.filter((id) => !priced.has(id));
  if (missing.length > 0) {
    const { data: scrapedRows, error: scrapedError } = await supabase
      .from("scraped_products")
      .select("id, product_name, regular_price, sale_price, final_price, main_image_url, stock_status")
      .in("id", missing);

    if (scrapedError) {
      throw new Error(`scraped_products lookup failed: ${scrapedError.message}`);
    }

    for (const row of scrapedRows ?? []) {
      // Shop.tsx maps final_price || regular_price into price, then
      // ProductCard prefers sale_price over it.
      const base = row.final_price ?? row.regular_price;
      const price = Number(row.sale_price ?? base ?? NaN);
      priced.set(row.id, {
        source: "scraped",
        name: row.product_name ?? "מוצר",
        image: row.main_image_url ?? "",
        price,
        inStock: row.stock_status === "in_stock" || !row.stock_status,
      });
    }
  }

  const pricedItems: PricedItem[] = [];
  for (const item of wanted.values()) {
    const product = priced.get(item.product_id);

    if (!product) {
      return {
        ok: false,
        code: "PRODUCT_NOT_FOUND",
        message: "אחד המוצרים בעגלה אינו קיים יותר.",
        details: { product_id: item.product_id },
      };
    }
    if (!product.inStock) {
      return {
        ok: false,
        code: "OUT_OF_STOCK",
        message: `המוצר "${product.name}" אזל מהמלאי.`,
        details: { product_id: item.product_id },
      };
    }
    if (!Number.isFinite(product.price) || product.price <= 0) {
      return {
        ok: false,
        code: "INVALID_PRICE",
        message: `למוצר "${product.name}" אין מחיר תקין.`,
        details: { product_id: item.product_id },
      };
    }

    const unitPrice = money(product.price);
    pricedItems.push({
      product_id: item.product_id,
      source: product.source,
      name: product.name,
      image: product.image,
      unit_price: unitPrice,
      quantity: item.quantity,
      line_total: money(unitPrice * item.quantity),
      variant: item.variant ?? null,
      size: item.size ?? null,
    });
  }

  const subtotal = money(pricedItems.reduce((sum, i) => sum + i.line_total, 0));
  const baseShipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;

  const couponResult = await resolveCoupon(supabase, {
    code: couponCode,
    subtotal,
    userId,
  });
  if (couponResult.ok === false) return couponResult as PricingFailure;

  const { coupon, discount, freeShipping } = couponResult;
  const shipping = freeShipping ? 0 : baseShipping;
  const shippingDiscount = freeShipping ? baseShipping : 0;
  const codSurcharge = paymentMethod === "cash-on-delivery" ? COD_SURCHARGE : 0;

  const discountedSubtotal = Math.max(0, money(subtotal - discount));
  const total = money(discountedSubtotal + shipping + codSurcharge);

  if (!Number.isFinite(total) || total <= 0) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      message: "הסכום לתשלום אינו תקין.",
      details: { subtotal, discount, shipping, total },
    };
  }

  return {
    ok: true,
    items: pricedItems,
    subtotal,
    base_shipping: baseShipping,
    shipping,
    shipping_discount: money(shippingDiscount),
    discount: money(discount),
    cod_surcharge: codSurcharge,
    total,
    coupon: coupon ? { id: coupon.id, code: coupon.code } : null,
  };
}

type CouponResolution =
  | { ok: true; coupon: { id: string; code: string } | null; discount: number; freeShipping: boolean }
  | PricingFailure;

/**
 * Look the coupon up by code and re-derive its discount. Nothing about the
 * discount is taken from the request.
 */
async function resolveCoupon(
  supabase: SupabaseClient,
  params: { code?: string | null; subtotal: number; userId: string }
): Promise<CouponResolution> {
  const code = params.code?.trim().toUpperCase();
  if (!code) return { ok: true, coupon: null, discount: 0, freeShipping: false };

  const { data: coupon, error } = await supabase
    .from("coupons")
    .select("id, code, discount_type, discount_value, is_active, max_uses, used_count, min_order_amount, valid_from, valid_until")
    .eq("code", code)
    .maybeSingle();

  if (error) throw new Error(`coupon lookup failed: ${error.message}`);

  const reject = (message: string): PricingFailure => ({
    ok: false,
    code: "COUPON_INVALID",
    message,
    details: { code },
  });

  if (!coupon || coupon.is_active === false) return reject("הקופון אינו תקף.");

  const now = Date.now();
  if (coupon.valid_from && new Date(coupon.valid_from).getTime() > now) {
    return reject("הקופון עדיין לא בתוקף.");
  }
  if (coupon.valid_until && new Date(coupon.valid_until).getTime() < now) {
    return reject("תוקף הקופון פג.");
  }
  if (coupon.min_order_amount && params.subtotal < Number(coupon.min_order_amount)) {
    return reject(`הקופון תקף מהזמנה של ₪${Number(coupon.min_order_amount).toFixed(2)}.`);
  }

  // Redemptions are counted from coupon_uses rather than coupons.used_count.
  // Nothing has ever written used_count, so trusting it would leave max_uses
  // permanently unenforced.
  if (coupon.max_uses !== null && coupon.max_uses !== undefined) {
    const { count: totalUses, error: totalError } = await supabase
      .from("coupon_uses")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id);

    if (totalError) throw new Error(`coupon_uses lookup failed: ${totalError.message}`);
    if ((totalUses ?? 0) >= Number(coupon.max_uses)) return reject("הקופון מוצה.");
  }

  // One redemption per customer.
  const { count: priorUses, error: usesError } = await supabase
    .from("coupon_uses")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", coupon.id)
    .eq("user_id", params.userId);

  if (usesError) throw new Error(`coupon_uses lookup failed: ${usesError.message}`);
  if ((priorUses ?? 0) > 0) return reject("כבר מימשת את הקופון הזה.");

  if (coupon.discount_type === "free_shipping") {
    return { ok: true, coupon, discount: 0, freeShipping: true };
  }

  const value = Number(coupon.discount_value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return reject("הקופון אינו תקף.");

  const discount =
    coupon.discount_type === "percentage"
      ? money((params.subtotal * Math.min(value, 100)) / 100)
      : money(Math.min(value, params.subtotal));

  return { ok: true, coupon, discount, freeShipping: false };
}
