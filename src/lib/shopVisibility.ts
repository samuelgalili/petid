// What a shopper is allowed to see of the legacy catalogue.
//
// The shop, its search and its category listings all read GET /api/products
// (business_products). That list had no visibility column. The browser dropped
// rows with in_stock === false, and the sitemap named no product URLs. Those
// are stock and a static file, not a way to hide a product that is still in
// stock. shop_hidden is the visibility flag. Nothing here reads or writes
// in_stock.
//
// SHARED_SHOP_VISIBILITY_START
// The block between these two markers is copied verbatim into
// src/lib/shopVisibility.ts. A test compares the two character for character.

export const UNAVAILABLE_ITEM_HE = "המוצר אינו זמין כרגע";

export const CHECKOUT_UNAVAILABLE_HE = "המוצר אינו זמין לרכישה. אפשר להמשיך עם שאר הפריטים בעגלה.";

export const isHiddenFromShop = (product) => product?.shop_hidden === true;

export const visibleShopProducts = (products) => (
  (Array.isArray(products) ? products : []).filter((product) => !isHiddenFromShop(product))
);

export const matchesCategory = (product, categoryKey) => {
  const key = String(categoryKey ?? "").trim();
  if (!key || !product) return false;
  return product.category_id === key
    || product.category_slug === key
    || product.category === key
    || product.category_name === key;
};

/** A public category page: visible products whose category is this one. */
export const productsInCategory = (products, categoryKey) => (
  visibleShopProducts(products).filter((product) => matchesCategory(product, categoryKey))
);

/** Product URLs a sitemap may list. Hidden products contribute none. */
export const productSitemapPaths = (products) => (
  visibleShopProducts(products)
    .map((product) => (product && product.id ? `/product/${product.id}` : null))
    .filter(Boolean)
);

/**
 * The product a public caller may open, or null.
 * "full" is a platform admin (or the owning seller). Everyone else gets null
 * for a hidden row, which the product route answers as 404.
 */
export const publiclyVisibleProduct = (product, view) => {
  if (!product) return null;
  if (view !== "full" && isHiddenFromShop(product)) return null;
  return product;
};

/**
 * Split a cart against the public catalogue.
 *
 * Fail open. null (still loading or the request failed) and an empty id list
 * are not evidence that a line is hidden, so every line stays available and
 * checkout is not blocked. Only a non-empty storefront response that omits
 * the id is positive: show that line, and do not charge it. POST /api/orders
 * still refuses a hidden id.
 */
export const partitionCartByCatalogue = (items, catalogueIds) => {
  const list = Array.isArray(items) ? items : [];
  const known = catalogueIds == null
    ? null
    : (catalogueIds instanceof Set ? catalogueIds : new Set(catalogueIds));
  if (known == null || known.size === 0) {
    return { available: list.slice(), unavailable: [], catalogueKnown: false };
  }
  const available = [];
  const unavailable = [];
  for (const item of list) {
    const id = item?.productId || item?.product_id;
    if (id && known.has(id)) available.push(item);
    else unavailable.push(item);
  }
  return { available, unavailable, catalogueKnown: true };
};

/** The goods total of the lines that can still be bought. */
export const chargeableSubtotal = (items) => (
  (Array.isArray(items) ? items : []).reduce(
    (sum, item) => sum + Number(item?.price || 0) * Number(item?.quantity || 0),
    0,
  )
);

// SHARED_SHOP_VISIBILITY_END
