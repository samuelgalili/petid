// What a shopper is allowed to buy from the legacy catalogue.
//
// One predicate: hidden, no image, or a selling price of 0. The shop, search,
// sitemap, product page, cart and checkout all use it. shop_hidden is the
// reversible hide flag. Nothing here reads or writes in_stock, and nothing
// here deletes a product.
//
// SHARED_SHOP_VISIBILITY_START
// The block between these two markers is copied verbatim into
// src/lib/shopVisibility.ts. A test compares the two character for character.

export const UNAVAILABLE_ITEM_HE = "המוצר אינו זמין כרגע";

export const CHECKOUT_UNAVAILABLE_HE = "המוצר אינו זמין לרכישה. אפשר להמשיך עם שאר הפריטים בעגלה.";

export const PRODUCT_UNAVAILABLE_CODE = "PRODUCT_UNAVAILABLE";

export const PRODUCT_UNAVAILABLE_HE = "המוצר לא זמין כרגע";

const flaggedHidden = (value) => (
  value === true || value === "true" || value === "t" || value === 1 || value === "1"
);

export const isHiddenFromShop = (product) => flaggedHidden(product?.shop_hidden);

const positiveMoney = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

/** The price a shopper would be charged. A sale counts only when it is above zero. */
export const shopSellingPrice = (product) => {
  const sale = positiveMoney(product?.sale_price);
  if (sale > 0) return sale;
  const finalPrice = positiveMoney(product?.final_price);
  if (finalPrice > 0) return finalPrice;
  const price = positiveMoney(product?.price);
  if (price > 0) return price;
  return positiveMoney(product?.regular_price);
};

const imageText = (value) => String(value ?? "").trim();

/** A blank main image and an empty gallery. A non-empty path, including a placeholder, still counts. */
export const hasShopImage = (product) => {
  if (!product || typeof product !== "object") return false;
  if (imageText(product.image_url) || imageText(product.main_image_url) || imageText(product.image)) return true;
  if (!Array.isArray(product.images)) return false;
  return product.images.some((entry) => imageText(entry));
};

/**
 * Hidden, no image, or a selling price of 0.
 * The shop, search, sitemap, product page, cart and checkout share this.
 */
export const isShopUnavailable = (product) => {
  if (!product || typeof product !== "object") return true;
  if (isHiddenFromShop(product)) return true;
  if (!(shopSellingPrice(product) > 0)) return true;
  if (!hasShopImage(product)) return true;
  return false;
};

export const visibleShopProducts = (products) => (
  (Array.isArray(products) ? products : []).filter((product) => !isShopUnavailable(product))
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
  if (view !== "full" && isShopUnavailable(product)) return null;
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
