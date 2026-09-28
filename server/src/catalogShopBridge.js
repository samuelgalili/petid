/**
 * Publishing a catalogue product into the table the shop actually reads.
 *
 * ─── THE BUTTON THAT DID NOTHING ────────────────────────────────────────────
 *
 * MIPO has two product models. The shop reads `GET /api/products`, which is
 * `listProducts()` in index.js: every row of business_products plus every row
 * of scraped_products, with no WHERE clause. The only thing between a row and
 * a shopper is `in_stock`, filtered in the browser in Shop.tsx.
 *
 * The admin's "פרסם לחנות" writes `catalog_products.publication_state`, and
 * nothing anywhere read that back into business_products. The seven-condition
 * gate, the audit entry, the publication state machine - all real, all
 * governing a table the shop never queries. The owner pressed publish and the
 * shop was unchanged, which is worse than an error, because an error can be
 * reported.
 *
 * This module is the missing half-step: publish now also writes the row the
 * shop reads, inside the same transaction that moved the state.
 *
 * ─── IT IS A PROJECTION, NOT A SECOND TRUTH ─────────────────────────────────
 *
 * catalog_products decides what is published. The business_products row is
 * what that decision looks like in the shop's table, rebuilt from the
 * catalogue every time it is published. Nothing here reads the shop row and
 * copies it back, so the two cannot disagree about a product's state - only
 * about how stale the projection is, and the projection is rewritten on every
 * publish.
 *
 * ─── THE TWO DECISIONS THE OWNER MADE ───────────────────────────────────────
 *
 *  1. PRICE: the cheapest active offer. A catalogue product may have several
 *     variants and several offers; a shop row has one price. The shop's card
 *     has no variant picker, so the shopper is buying "this product" at the
 *     price shown - and the owner chose to show the lowest rather than block
 *     multi-variant products from the shop entirely.
 *
 *     The risk in that choice, stated because it is real: a product whose
 *     variants differ in price shows the cheapest, and the shop has no way for
 *     the customer to say which one they meant. `shop_offer_id` records which
 *     offer the price came from, so the answer exists in the row rather than
 *     having to be reconstructed.
 *
 *  2. UNPUBLISH: the row stays and `in_stock` goes false. That is the only
 *     switch the shop honours, so it removes the product immediately; keeping
 *     the row means republishing lands on the same listing rather than minting
 *     a second one, and an order that already points at this product id still
 *     resolves.
 */

/**
 * The cheapest active offer, and everything a shop row needs, in one statement.
 *
 * One statement rather than several because it runs inside the publishing
 * transaction with the catalogue row locked: anything read in a second round
 * trip is read at a different moment from the gate that approved it.
 *
 * CHEAPEST BY WHAT THE CUSTOMER PAYS. `coalesce(nullif(sale_price, 0), price)`,
 * not price - an offer at ₪120 with a ₪79 sale is cheaper than one at ₪99, and
 * ordering by the list price would pick the wrong one and then charge the
 * discounted amount of a different offer.
 *
 * The image rule is publicCatalog.js's documented fallback, deliberately
 * identical: approved variant image, then approved product image. An
 * unapproved image is never used - the gate does not let an unapproved product
 * publish, so reaching for `source_url` here would only matter in the case
 * where the rule has already been violated. D-7 keeps source_url in the table;
 * it just is not what the shop shows.
 */
const SHOP_ROW_SQL = `
  with cheapest as (
    select o.id           as offer_id,
           o.price        as price,
           o.sale_price   as sale_price,
           o.sku          as sku,
           v.id           as variant_id,
           v.weight       as weight,
           v.weight_unit  as weight_unit,
           i.availability as availability
      from public.product_variants v
      join public.seller_offers o on o.product_variant_id = v.id
      left join public.inventory i on i.seller_offer_id = o.id
     where v.catalog_product_id = $1
       and v.archived_at is null and v.status = 'ACTIVE'
       and o.archived_at is null and o.status = 'ACTIVE' and o.price > 0
     order by coalesce(nullif(o.sale_price, 0), o.price) asc, o.created_at asc, o.id asc
     limit 1
  )
  select p.id,
         p.owning_business_id,
         p.name,
         p.description,
         p.brand,
         p.category_id,
         p.pet_type,
         p.attributes,
         c.offer_id,
         c.price,
         c.sale_price,
         c.sku,
         c.weight,
         c.weight_unit,
         c.availability,
         coalesce(
           (select m.storage_path from public.product_media m
             where m.catalog_product_id = p.id and m.product_variant_id = c.variant_id
               and m.archived_at is null and m.approved_at is not null
             order by m.display_order, m.approved_at limit 1),
           (select m.storage_path from public.product_media m
             where m.catalog_product_id = p.id and m.product_variant_id is null
               and m.archived_at is null and m.approved_at is not null
             order by m.display_order, m.approved_at limit 1)
         ) as image_url,
         coalesce((
           select array_agg(m.storage_path order by m.display_order, m.approved_at)
             from public.product_media m
            where m.catalog_product_id = p.id
              and m.archived_at is null and m.approved_at is not null
         ), '{}') as images
    from public.catalog_products p
    left join cheapest c on true
   where p.id = $1
`;

/**
 * A publishable product always has a priced offer and an approved image -
 * `no_priced_offer` and `no_approved_image` are two of the gate's seven
 * conditions, and the gate runs in this same transaction immediately before
 * this does. So a missing one here is not a product problem, it is this
 * module and the gate disagreeing, and the publish must fail rather than put a
 * ₪0 placeholder on the shelf.
 */
export class BridgeInconsistency extends Error {
  constructor(message) {
    super(message);
    this.name = "BridgeInconsistency";
    this.code = "SHOP_PROJECTION_FAILED";
  }
}

/**
 * Write (or rewrite) the shop's row for a published catalogue product.
 *
 * Takes the CLIENT, not the pool: it belongs to the transaction that set
 * publication_state, so the state and the listing commit together or neither
 * does. A shop row without the state behind it is a product that cannot be
 * unpublished through the admin; the state without the row is the bug this
 * module exists to fix.
 */
export const publishToShop = async (client, catalogProductId, adminId = null) => {
  const { rows } = await client.query(SHOP_ROW_SQL, [catalogProductId]);
  const row = rows[0];

  if (!row) {
    throw new BridgeInconsistency(`catalog product ${catalogProductId} disappeared mid-publish`);
  }
  if (!row.offer_id || !(Number(row.price) > 0)) {
    throw new BridgeInconsistency(
      `catalog product ${catalogProductId} passed the gate with no priced active offer`,
    );
  }
  if (!row.image_url) {
    throw new BridgeInconsistency(
      `catalog product ${catalogProductId} passed the gate with no approved image`,
    );
  }

  // IN_STOCK is the only availability the shop can honour. PREORDER and
  // DISCONTINUED are real states with no shop representation, and showing them
  // as buyable would sell something nobody can ship; they land as out of stock,
  // which is the truthful projection of "not purchasable right now".
  const inStock = row.availability === "IN_STOCK";

  const result = await client.query(
    `
      insert into public.business_products (
        business_id, catalog_product_id, name, description, brand,
        category_id, pet_type, price, sale_price, sku, weight, weight_unit,
        image_url, images, in_stock, product_attributes, shop_offer_id, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, now())
      on conflict (catalog_product_id) where catalog_product_id is not null
      do update set
        name = excluded.name,
        description = excluded.description,
        brand = excluded.brand,
        category_id = excluded.category_id,
        pet_type = excluded.pet_type,
        price = excluded.price,
        sale_price = excluded.sale_price,
        sku = excluded.sku,
        weight = excluded.weight,
        weight_unit = excluded.weight_unit,
        image_url = excluded.image_url,
        images = excluded.images,
        in_stock = excluded.in_stock,
        product_attributes = excluded.product_attributes,
        shop_offer_id = excluded.shop_offer_id,
        updated_at = now()
      returning id, in_stock, price
    `,
    [
      row.owning_business_id, row.id, row.name, row.description ?? null, row.brand ?? null,
      row.category_id ?? null, row.pet_type ?? null, row.price, row.sale_price ?? null,
      row.sku ?? null, row.weight ?? null, row.weight_unit ?? null,
      row.image_url, row.images ?? [], inStock, row.attributes ?? {}, row.offer_id,
    ],
  );

  return {
    business_product_id: result.rows[0].id,
    in_stock: result.rows[0].in_stock,
    price: Number(result.rows[0].price),
    offer_id: row.offer_id,
    // Said out loud rather than left for somebody to notice: the product is in
    // the shop's table and still invisible, because availability is not
    // IN_STOCK. Without this the admin reports success and the shelf is empty.
    availability: row.availability ?? null,
    adminId,
  };
};

/**
 * Take a published product back off the shelf.
 *
 * `in_stock = false` and the row stays, which is what the owner chose. It is
 * also the only lever that works: the shop has no published flag to clear, so
 * anything short of setting this leaves the product on sale.
 *
 * Returns how many rows moved, which is 0 for a product that was published
 * before this bridge existed. That is not an error - there is nothing on the
 * shelf to withdraw - but it is worth the caller being able to tell.
 */
export const hideFromShop = async (client, catalogProductId) => {
  const result = await client.query(
    `update public.business_products
        set in_stock = false, updated_at = now()
      where catalog_product_id = $1 and in_stock is distinct from false`,
    [catalogProductId],
  );
  return result.rowCount;
};
