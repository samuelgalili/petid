// The public catalogue, read from the new model.
//
// Served on /api/catalog/* ALONGSIDE the existing /api/products rather than
// replacing it. That is a deliberate refusal to do the tempting thing.
//
// Switching /api/products to read catalog_products would empty the shop the
// moment it deployed: every product customers can see today lives in
// business_products, none of them has been through intake, and the decision on
// record is that legacy ownership is NOT retroactively legitimised. So a
// cutover is a migration of ten products plus a business decision, not a change
// of table name - and it belongs in its own change, after there is something in
// the new model to serve.
//
// What a shopper may see is defined here once, and it is narrow:
//
//     the product is PUBLISHED
//     its Seller is verified AND commercially approved
//     it has an ACTIVE variant with an ACTIVE, priced offer
//     that offer has an availability
//     it has an approved image
//
// Those are the publication gate's conditions, re-checked at read time rather
// than trusted. publication_state is a stored flag, and a stored flag drifts:
// a Seller suspended after publishing would otherwise keep selling until
// somebody remembered to unpublish every one of its products.

import { sellerEligibleSql } from "./sellerEligibility.js";

// Columns a shopper is allowed to see. An allowlist, not an exclusion list, for
// the same reason PUBLIC_PRODUCT_FIELDS is one: a column added later is invisible
// by default instead of exposed by default.
const PUBLIC_PRODUCT_COLUMNS = `
  p.id,
  p.name,
  p.description,
  p.brand,
  p.category_id,
  p.pet_type,
  p.attributes,
  p.slug,
  p.published_at
`;

const LIVE_OFFER_JOIN = `
  join public.product_variants v
    on v.catalog_product_id = p.id and v.archived_at is null and v.status = 'ACTIVE'
  join public.seller_offers o
    on o.product_variant_id = v.id and o.archived_at is null and o.status = 'ACTIVE' and o.price > 0
  join public.inventory i
    on i.seller_offer_id = o.id
  join public.business_profiles b
    on b.id = o.business_id
`;

/**
 * The conditions a row must meet to be visible publicly, as SQL.
 *
 * Note this checks the OFFER's Seller, not the product's owner. They are
 * different businesses in a marketplace, and it is the seller who has to be
 * approved to sell - the curator of the content is a separate question.
 */
const visibleSql = `
  p.publication_state = 'PUBLISHED'
  and p.archived_at is null
  and ${sellerEligibleSql("b")}
  and i.availability in ('IN_STOCK', 'PREORDER')
  and exists (
    select 1 from public.product_media m
     where m.catalog_product_id = p.id
       and m.archived_at is null
       and m.approved_at is not null
  )
`;

/**
 * The image a shopper sees, resolved by the documented fallback:
 * approved variant image → approved product image → approved default-variant
 * image. A non-approved image is never returned, so there is no fallback to a
 * supplier URL - an unapproved product simply has no image, and the gate stops
 * it being published at all.
 */
const approvedImageSql = `
  coalesce(
    (select m.storage_path from public.product_media m
      where m.catalog_product_id = p.id and m.product_variant_id = v.id
        and m.archived_at is null and m.approved_at is not null
      order by m.display_order, m.approved_at limit 1),
    (select m.storage_path from public.product_media m
      where m.catalog_product_id = p.id and m.product_variant_id is null
        and m.archived_at is null and m.approved_at is not null
      order by m.display_order, m.approved_at limit 1)
  )
`;

export const createPublicCatalog = ({ pool }) => {
  /**
   * The catalogue listing: one row per purchasable offer.
   *
   * Per offer rather than per product, because in a marketplace the same
   * product legitimately appears at two prices from two Sellers, and collapsing
   * them here would mean choosing one arbitrarily.
   */
  const listCatalog = async ({ categoryId = null, limit = 60, offset = 0 } = {}) => {
    const params = [];
    let categoryFilter = "";
    if (categoryId) {
      params.push(categoryId);
      categoryFilter = ` and p.category_id = $${params.length}`;
    }
    params.push(Math.min(Number(limit) || 60, 200));
    const limitParam = `$${params.length}`;
    params.push(Math.max(Number(offset) || 0, 0));
    const offsetParam = `$${params.length}`;

    const { rows } = await pool.query(
      `select ${PUBLIC_PRODUCT_COLUMNS},
              v.id as variant_id, v.label as variant_label, v.options,
              o.id as offer_id, o.business_id as seller_id, o.price, o.sale_price, o.currency,
              i.availability,
              b.business_name as seller_name,
              ${approvedImageSql} as image_path
         from public.catalog_products p
         ${LIVE_OFFER_JOIN}
        where ${visibleSql}${categoryFilter}
        order by p.published_at desc nulls last, p.id, o.price
        limit ${limitParam} offset ${offsetParam}`,
      params,
    );
    return rows;
  };

  /**
   * One product, with every purchasable offer on it.
   *
   * Returns null when the product is not publicly visible - the caller answers
   * 404. A product that exists but is unpublished, or whose Seller was
   * suspended, is indistinguishable from one that never existed, which is the
   * correct answer for a public endpoint.
   */
  const getCatalogProduct = async (productId) => {
    const { rows } = await pool.query(
      `select ${PUBLIC_PRODUCT_COLUMNS},
              v.id as variant_id, v.label as variant_label, v.options, v.barcode,
              o.id as offer_id, o.business_id as seller_id, o.sku,
              o.price, o.sale_price, o.currency,
              i.availability, i.restock_expected_at,
              b.business_name as seller_name,
              ${approvedImageSql} as image_path
         from public.catalog_products p
         ${LIVE_OFFER_JOIN}
        where ${visibleSql} and p.id = $1
        order by o.price`,
      [productId],
    );
    if (rows.length === 0) return null;

    const [first] = rows;
    return {
      id: first.id,
      name: first.name,
      description: first.description,
      brand: first.brand,
      category_id: first.category_id,
      pet_type: first.pet_type,
      attributes: first.attributes,
      slug: first.slug,
      offers: rows.map((row) => ({
        offer_id: row.offer_id,
        seller_id: row.seller_id,
        seller_name: row.seller_name,
        variant_id: row.variant_id,
        variant_label: row.variant_label,
        options: row.options,
        sku: row.sku,
        price: row.price,
        sale_price: row.sale_price,
        currency: row.currency,
        availability: row.availability,
        restock_expected_at: row.restock_expected_at,
        image_path: row.image_path,
      })),
    };
  };

  /**
   * Resolves one offer for checkout: the price and availability the SERVER
   * says, never what the client sent.
   *
   * Not wired into checkout - checkout is unchanged in this stage - but it is
   * the function checkout will call, and it exists here so the visibility rule
   * has exactly one definition rather than a second, subtly different one
   * written later under time pressure.
   */
  const resolveOfferForPurchase = async (offerId) => {
    const { rows } = await pool.query(
      `select o.id as offer_id, o.business_id as seller_id, o.sku,
              o.price, o.sale_price, o.currency, o.price_locked_at,
              v.id as variant_id, p.id as product_id, p.name as product_name,
              i.availability, i.quantity, i.reserved_quantity
         from public.catalog_products p
         ${LIVE_OFFER_JOIN}
        where ${visibleSql} and o.id = $1`,
      [offerId],
    );
    return rows[0] ?? null;
  };

  return { listCatalog, getCatalogProduct, resolveOfferForPurchase };
};
