// Cart and checkout decide which lines can still be bought by reading the
// public catalogue. GET /api/products pages that list, and a page is never
// larger than 200 (server/src/storefrontProduct.js). The catalogue is past
// that, so stopping after the first page marks a real line as missing.
//
// A 409 PRODUCT_UNAVAILABLE names the one line the server refused. Checkout
// drops that line and keeps the rest.

export const CATALOGUE_PAGE_SIZE = 200;

export const REMOVED_UNAVAILABLE_ITEM_HE = "הפריט הוסר מהעגלה כי הוא כבר לא זמין";

const finiteCount = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/** True when this response is the end of the catalogue, not a full page. */
export const cataloguePageComplete = (page, offset, pageSize = CATALOGUE_PAGE_SIZE) => {
  const products = Array.isArray(page?.products) ? page.products : [];
  if (products.length === 0) return true;
  const total = finiteCount(page?.total);
  if (total !== null) return offset + products.length >= total;
  const limit = finiteCount(page?.limit);
  if (limit !== null) return products.length < limit;
  // No paging fields: the server sent the whole list in this body.
  return true;
};

const productIdOf = (product) => {
  const id = product?.id;
  return typeof id === "string" && id ? id : null;
};

/**
 * Every public id, following limit/offset until the catalogue is covered.
 * `fetchPage` receives `{ limit, offset }` and returns the JSON body.
 */
export async function fetchAllCatalogueIds(fetchPage, pageSize = CATALOGUE_PAGE_SIZE) {
  const ids = [];
  const seen = new Set();
  let offset = 0;
  for (let guard = 0; guard < 50; guard += 1) {
    const page = await fetchPage({ limit: pageSize, offset });
    const products = Array.isArray(page?.products) ? page.products : [];
    for (const product of products) {
      if (product?.shop_hidden === true) continue;
      const id = productIdOf(product);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    if (cataloguePageComplete(page, offset, pageSize)) break;
    const next = offset + products.length;
    if (next <= offset) break;
    offset = next;
  }
  return ids;
}

/** The product id on a 409 PRODUCT_UNAVAILABLE body, or null when this is a different refusal. */
export const readProductUnavailable = (status, body) => {
  if (status !== 409 || !body || typeof body !== "object") return null;
  const details = body.details && typeof body.details === "object" ? body.details : {};
  const code = details.code || body.code;
  if (code !== "PRODUCT_UNAVAILABLE") return null;
  const raw = details.product_id || body.product_id;
  const productId = typeof raw === "string" && raw.trim() ? raw.trim() : null;
  return { productId };
};

/** Cart lines whose product is the one the server just refused. */
export const cartLinesForUnavailable = (items, productId) => {
  if (!productId) return [];
  const list = Array.isArray(items) ? items : [];
  return list.filter((item) => String(item?.productId || item?.product_id || "") === productId);
};

export const removedUnavailableMessage = (name) => {
  const item = String(name || "").trim();
  if (!item) return REMOVED_UNAVAILABLE_ITEM_HE;
  return `${item} הוסר מהעגלה כי הוא כבר לא זמין`;
};
