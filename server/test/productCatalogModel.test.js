// Stage 1A · catalog_products, product_variants, seller_offers, inventory,
// product_media.
//
// The question these tests answer is not "does the schema exist" but "can the
// marketplace failures actually happen". Each of the big ones gets a test that
// fails if the guarantee is removed:
//
//   two Sellers, same variant, different prices, neither overwriting the other
//   a product that is sellable the moment it exists
//   stock that defaults to available
//   a scraped image on a product page without a human seeing it
//   a SKU collision between unrelated Sellers
//
// The first is the reason the flat business_products table cannot become a
// marketplace by adding columns: its price is a column on the product.

import assert from "node:assert/strict";
import test from "node:test";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const pgPool = async () => {
  const { default: pg } = await import("pg");
  return new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
};

const withDb = async (fn) => {
  const pool = await pgPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    return await fn(client);
  } finally {
    await client.query("rollback").catch(() => {});
    client.release();
    await pool.end();
  }
};

// ─── fixtures ────────────────────────────────────────────────────────────────

const seedBusiness = (client, name) => client.query(
  `insert into public.business_profiles (business_name, business_type, is_verified)
   values ($1, 'shop', true) returning id`,
  [name],
).then((r) => r.rows[0].id);

const seedAdmin = (client, email) => client.query(
  `insert into public.admin_users (email, password_hash, display_name, role, is_active)
   values ($1, 'x', 'Catalog Test', 'admin', true) returning id`,
  [email],
).then((r) => r.rows[0].id);

const seedDraft = (client, { businessId, adminId, name = "קולר לכלב" }) => client.query(
  `insert into public.product_drafts (business_id, created_by, name) values ($1, $2, $3) returning id`,
  [businessId, adminId, name],
).then((r) => r.rows[0].id);

const seedProduct = async (client, { businessId, adminId, name = "קולר לכלב", slug = null }) => {
  const draft = await seedDraft(client, { businessId, adminId, name });
  const { rows } = await client.query(
    `insert into public.catalog_products (owning_business_id, origin_draft_id, name, slug, created_by)
     values ($1, $2, $3, $4, $5) returning id`,
    [businessId, draft, name, slug, adminId],
  );
  return { productId: rows[0].id, draftId: draft };
};

const seedVariant = (client, { productId, adminId, signature = "color=blue|size=S", isDefault = false }) =>
  client.query(
    `insert into public.product_variants
       (catalog_product_id, options, option_signature, label, is_default, created_by)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    [productId, { color: "blue", size: "S" }, signature, "כחול / S", isDefault, adminId],
  ).then((r) => r.rows[0].id);

const seedOffer = (client, { businessId, variantId, adminId, price = 49, sku = null }) =>
  client.query(
    `insert into public.seller_offers (business_id, product_variant_id, price, sku, created_by)
     values ($1, $2, $3, $4, $5) returning id`,
    [businessId, variantId, price, sku, adminId],
  ).then((r) => r.rows[0].id);

// ─── the marketplace property ────────────────────────────────────────────────

dbTest("two Sellers can offer the same variant at different prices", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog1@example.com");
    const mipo = await seedBusiness(client, "Mipo Shop Test");
    const other = await seedBusiness(client, "External Seller");
    const { productId } = await seedProduct(client, { businessId: mipo, adminId: admin });
    const variant = await seedVariant(client, { productId, adminId: admin });

    const offerA = await seedOffer(client, { businessId: mipo, variantId: variant, adminId: admin, price: 49 });
    const offerB = await seedOffer(client, { businessId: other, variantId: variant, adminId: admin, price: 55 });

    const { rows } = await client.query(
      "select business_id, price from public.seller_offers where product_variant_id = $1 order by price",
      [variant],
    );
    assert.equal(rows.length, 2, "both offers must survive");
    assert.equal(Number(rows[0].price), 49);
    assert.equal(Number(rows[1].price), 55);
    assert.notEqual(offerA, offerB);
    // This is the assertion the flat model cannot satisfy: its price is a
    // column on the product, so the second Seller would overwrite the first.
  });
});

dbTest("a Seller cannot list the same variant twice", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog2@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { productId } = await seedProduct(client, { businessId: seller, adminId: admin });
    const variant = await seedVariant(client, { productId, adminId: admin });
    await seedOffer(client, { businessId: seller, variantId: variant, adminId: admin });

    await assert.rejects(
      () => seedOffer(client, { businessId: seller, variantId: variant, adminId: admin, price: 60 }),
      (error) => {
        assert.equal(error.code, "23505");
        return true;
      },
      "two live offers from one Seller for one variant means two prices and nothing to choose between them",
    );
  });
});

dbTest("two Sellers may use the same SKU; one Seller may not reuse it", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog3@example.com");
    const sellerA = await seedBusiness(client, "Seller A");
    const sellerB = await seedBusiness(client, "Seller B");
    const { productId } = await seedProduct(client, { businessId: sellerA, adminId: admin });
    const variantOne = await seedVariant(client, { productId, adminId: admin, signature: "s=1" });
    const variantTwo = await seedVariant(client, { productId, adminId: admin, signature: "s=2" });

    await seedOffer(client, { businessId: sellerA, variantId: variantOne, adminId: admin, sku: "COLLAR-BLUE-S" });

    // A different Seller, same code: normal, and a global unique would reject it.
    await assert.doesNotReject(
      () => seedOffer(client, { businessId: sellerB, variantId: variantOne, adminId: admin, sku: "COLLAR-BLUE-S" }),
      "SKU must be unique within a Seller, never globally",
    );

    // The same Seller reusing its own code: ambiguous, and refused.
    await assert.rejects(
      () => seedOffer(client, { businessId: sellerA, variantId: variantTwo, adminId: admin, sku: "COLLAR-BLUE-S" }),
      (error) => {
        assert.equal(error.code, "23505");
        return true;
      },
    );
  });
});

// ─── nothing is sellable by default ──────────────────────────────────────────

dbTest("a new product is UNPUBLISHED, and a new offer is INACTIVE", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog4@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { productId } = await seedProduct(client, { businessId: seller, adminId: admin });
    const variant = await seedVariant(client, { productId, adminId: admin });
    const offer = await seedOffer(client, { businessId: seller, variantId: variant, adminId: admin });

    const product = await client.query(
      "select publication_state from public.catalog_products where id = $1", [productId],
    );
    const offerRow = await client.query("select status from public.seller_offers where id = $1", [offer]);

    assert.equal(product.rows[0].publication_state, "UNPUBLISHED",
      "business_products had no status column at all, so a row was sellable the moment it existed");
    assert.equal(offerRow.rows[0].status, "INACTIVE");
  });
});

dbTest("stock defaults to OUT_OF_STOCK, not to available", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog5@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { productId } = await seedProduct(client, { businessId: seller, adminId: admin });
    const variant = await seedVariant(client, { productId, adminId: admin });
    const offer = await seedOffer(client, { businessId: seller, variantId: variant, adminId: admin });

    await client.query("insert into public.inventory (seller_offer_id) values ($1)", [offer]);
    const { rows } = await client.query(
      "select availability, quantity from public.inventory where seller_offer_id = $1", [offer],
    );
    assert.equal(rows[0].availability, "OUT_OF_STOCK",
      "business_products.in_stock defaults to true, so a row with no stock information claimed to be available");
    assert.equal(rows[0].quantity, null, "untracked, not zero");
  });
});

dbTest("a published product must record when and by whom", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog6@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { productId } = await seedProduct(client, { businessId: seller, adminId: admin });

    await client.query("savepoint s");
    await assert.rejects(
      () => client.query(
        "update public.catalog_products set publication_state = 'PUBLISHED' where id = $1", [productId],
      ),
      (error) => {
        assert.equal(error.constraint, "catalog_products_published_has_provenance");
        return true;
      },
      "without this the gate leaves no evidence it ever ran",
    );
    await client.query("rollback to savepoint s");

    await assert.doesNotReject(() => client.query(
      `update public.catalog_products
          set publication_state = 'PUBLISHED', published_at = now(), published_by = $1
        where id = $2`,
      [admin, productId],
    ));
  });
});

// ─── identity cannot be rewritten underneath live data ───────────────────────

dbTest("a product cannot be repointed at a different draft", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog7@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { productId } = await seedProduct(client, { businessId: seller, adminId: admin });
    const otherDraft = await seedDraft(client, { businessId: seller, adminId: admin, name: "אחר" });

    await assert.rejects(
      () => client.query("update public.catalog_products set origin_draft_id = $1 where id = $2",
        [otherDraft, productId]),
      (error) => {
        assert.match(error.message, /origin_draft_id is immutable/);
        return true;
      },
      "repointing would make the product claim it was reviewed as something it was not",
    );
  });
});

dbTest("one draft cannot produce two products", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog8@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { draftId } = await seedProduct(client, { businessId: seller, adminId: admin });

    await assert.rejects(
      () => client.query(
        `insert into public.catalog_products (owning_business_id, origin_draft_id, name, created_by)
         values ($1, $2, 'duplicate', $3)`,
        [seller, draftId, admin],
      ),
      (error) => {
        assert.equal(error.code, "23505");
        return true;
      },
      "re-running an approval would otherwise silently duplicate reviewed content",
    );
  });
});

dbTest("an offer's Seller and variant are immutable", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog9@example.com");
    const sellerA = await seedBusiness(client, "Seller A");
    const sellerB = await seedBusiness(client, "Seller B");
    const { productId } = await seedProduct(client, { businessId: sellerA, adminId: admin });
    const variant = await seedVariant(client, { productId, adminId: admin });
    const offer = await seedOffer(client, { businessId: sellerA, variantId: variant, adminId: admin });

    await assert.rejects(
      () => client.query("update public.seller_offers set business_id = $1 where id = $2", [sellerB, offer]),
      (error) => {
        assert.match(error.message, /business_id is immutable/);
        return true;
      },
      "changing it would rewrite a promise already made to anything holding this offer in a cart",
    );
  });
});

dbTest("a price change re-stamps price_locked_at by itself", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog10@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { productId } = await seedProduct(client, { businessId: seller, adminId: admin });
    const variant = await seedVariant(client, { productId, adminId: admin });
    const offer = await seedOffer(client, { businessId: seller, variantId: variant, adminId: admin, price: 49 });

    const before = await client.query("select price_locked_at from public.seller_offers where id = $1", [offer]);

    await client.query("update public.seller_offers set price = 59 where id = $1", [offer]);
    const after = await client.query(
      "select price, price_locked_at from public.seller_offers where id = $1", [offer],
    );

    assert.equal(Number(after.rows[0].price), 59);
    assert.ok(after.rows[0].price_locked_at > before.rows[0].price_locked_at,
      "the stamp must advance; note it is clock_timestamp() and not now(), which would not move inside a transaction");

    // A change that is not a price change leaves the stamp alone.
    const stamp = after.rows[0].price_locked_at;
    await client.query("update public.seller_offers set sku = 'X-1' where id = $1", [offer]);
    const untouched = await client.query(
      "select price_locked_at from public.seller_offers where id = $1", [offer],
    );
    assert.deepEqual(untouched.rows[0].price_locked_at, stamp,
      "editing a SKU is not a price event");
  });
});

dbTest("a variant cannot be moved to another product", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog11@example.com");
    const seller = await seedBusiness(client, "Seller");
    const first = await seedProduct(client, { businessId: seller, adminId: admin });
    const second = await seedProduct(client, { businessId: seller, adminId: admin, name: "מוצר שני" });
    const variant = await seedVariant(client, { productId: first.productId, adminId: admin });

    await assert.rejects(
      () => client.query("update public.product_variants set catalog_product_id = $1 where id = $2",
        [second.productId, variant]),
      (error) => {
        assert.match(error.message, /catalog_product_id is immutable/);
        return true;
      },
      "it would move the offers, stock and order history hanging off it, silently",
    );
  });
});

// ─── variants ────────────────────────────────────────────────────────────────

dbTest("the same option combination cannot exist twice on one product", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog12@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { productId } = await seedProduct(client, { businessId: seller, adminId: admin });
    await seedVariant(client, { productId, adminId: admin, signature: "color=blue|size=S" });

    await assert.rejects(
      () => seedVariant(client, { productId, adminId: admin, signature: "color=blue|size=S" }),
      (error) => {
        assert.equal(error.code, "23505");
        return true;
      },
      "this is what stops an import creating the same variant four times",
    );
  });
});

dbTest("at most one default variant per product, and an archived one cannot be it", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog13@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { productId } = await seedProduct(client, { businessId: seller, adminId: admin });
    const first = await seedVariant(client, { productId, adminId: admin, signature: "s=1", isDefault: true });

    await client.query("savepoint s");
    await assert.rejects(
      () => seedVariant(client, { productId, adminId: admin, signature: "s=2", isDefault: true }),
      (error) => {
        assert.equal(error.code, "23505");
        return true;
      },
    );
    await client.query("rollback to savepoint s");

    await assert.rejects(
      () => client.query("update public.product_variants set archived_at = now() where id = $1", [first]),
      (error) => {
        assert.equal(error.constraint, "product_variants_archived_not_default");
        return true;
      },
      "the display fallback would otherwise resolve to something withdrawn",
    );
  });
});

dbTest("the same barcode may appear on many variants", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog14@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { productId } = await seedProduct(client, { businessId: seller, adminId: admin });

    for (const sig of ["s=1", "s=2"]) {
      await client.query(
        `insert into public.product_variants
           (catalog_product_id, option_signature, barcode, created_by)
         values ($1, $2, '7290000000001', $3)`,
        [productId, sig, admin],
      );
    }
    const { rows } = await client.query(
      "select count(*)::int as n from public.product_variants where barcode = '7290000000001'",
    );
    assert.equal(rows[0].n, 2, "a unique barcode constraint would reject honest data");
  });
});

// ─── offers and inventory ────────────────────────────────────────────────────

dbTest("a sale price above the price is refused", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog15@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { productId } = await seedProduct(client, { businessId: seller, adminId: admin });
    const variant = await seedVariant(client, { productId, adminId: admin });

    await assert.rejects(
      () => client.query(
        `insert into public.seller_offers (business_id, product_variant_id, price, sale_price, created_by)
         values ($1, $2, 49, 59, $3)`,
        [seller, variant, admin],
      ),
      (error) => {
        assert.equal(error.constraint, "seller_offers_sale_price_below_price");
        return true;
      },
      "the kind of import error that otherwise reaches a customer",
    );
  });
});

dbTest("an offer has at most one inventory row", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog16@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { productId } = await seedProduct(client, { businessId: seller, adminId: admin });
    const variant = await seedVariant(client, { productId, adminId: admin });
    const offer = await seedOffer(client, { businessId: seller, variantId: variant, adminId: admin });

    await client.query("insert into public.inventory (seller_offer_id) values ($1)", [offer]);
    await assert.rejects(
      () => client.query("insert into public.inventory (seller_offer_id) values ($1)", [offer]),
      (error) => {
        assert.equal(error.code, "23505");
        return true;
      },
      "two rows would mean two answers to 'is this in stock'",
    );
  });
});

dbTest("stock cannot be reserved beyond what is tracked", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog17@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { productId } = await seedProduct(client, { businessId: seller, adminId: admin });
    const variant = await seedVariant(client, { productId, adminId: admin });
    const offer = await seedOffer(client, { businessId: seller, variantId: variant, adminId: admin });

    // The violation aborts the transaction, so the second half needs a
    // savepoint to roll back to - otherwise it fails with 25P02 and reports the
    // wrong reason for the right outcome.
    await client.query("savepoint s");
    await assert.rejects(
      () => client.query(
        `insert into public.inventory (seller_offer_id, availability, quantity, reserved_quantity)
         values ($1, 'IN_STOCK', 3, 5)`,
        [offer],
      ),
      (error) => {
        assert.equal(error.constraint, "inventory_reserved_within_quantity");
        return true;
      },
    );
    await client.query("rollback to savepoint s");

    // Untracked quantity: there is nothing to compare against, so reservations
    // are not constrained by it.
    await assert.doesNotReject(() => client.query(
      `insert into public.inventory (seller_offer_id, availability, quantity, reserved_quantity)
       values ($1, 'IN_STOCK', null, 5)`,
      [offer],
    ));
  });
});

// ─── media ───────────────────────────────────────────────────────────────────

dbTest("an image cannot be approved before it is adopted", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog18@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { productId } = await seedProduct(client, { businessId: seller, adminId: admin });

    await assert.rejects(
      () => client.query(
        `insert into public.product_media (catalog_product_id, source_url, approved_at, approved_by, created_by)
         values ($1, 'https://supplier.example/x.jpg', now(), $2, $2)`,
        [productId, admin],
      ),
      (error) => {
        assert.equal(error.constraint, "product_media_approved_requires_adopted");
        return true;
      },
      "approving a hotlinked URL lets the supplier change what customers see, after review",
    );
  });
});

dbTest("approval must name a human, and rejection must give a reason", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog19@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { productId } = await seedProduct(client, { businessId: seller, adminId: admin });

    await client.query("savepoint s");
    await assert.rejects(
      () => client.query(
        `insert into public.product_media (catalog_product_id, adopted_at, approved_at, created_by)
         values ($1, now(), now(), $2)`,
        [productId, admin],
      ),
      (error) => {
        assert.equal(error.constraint, "product_media_approved_has_approver");
        return true;
      },
    );
    await client.query("rollback to savepoint s");

    await assert.rejects(
      () => client.query(
        `insert into public.product_media (catalog_product_id, rejected_at, created_by)
         values ($1, now(), $2)`,
        [productId, admin],
      ),
      (error) => {
        assert.equal(error.constraint, "product_media_rejection_needs_reason");
        return true;
      },
    );
  });
});

dbTest("an image cannot be approved and rejected at once", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog20@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { productId } = await seedProduct(client, { businessId: seller, adminId: admin });

    await assert.rejects(
      () => client.query(
        `insert into public.product_media
           (catalog_product_id, adopted_at, approved_at, approved_by, rejected_at, rejection_reason, created_by)
         values ($1, now(), now(), $2, now(), 'באנר', $2)`,
        [productId, admin],
      ),
      (error) => {
        assert.equal(error.constraint, "product_media_not_both_approved_and_rejected");
        return true;
      },
      "the gate would read it as approved and the queue as rejected",
    );
  });
});

dbTest("a variant image cannot be attached to a different product", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog21@example.com");
    const seller = await seedBusiness(client, "Seller");
    const first = await seedProduct(client, { businessId: seller, adminId: admin });
    const second = await seedProduct(client, { businessId: seller, adminId: admin, name: "מוצר שני" });
    const variantOfFirst = await seedVariant(client, { productId: first.productId, adminId: admin });

    await assert.rejects(
      () => client.query(
        `insert into public.product_media (catalog_product_id, product_variant_id, adopted_at, created_by)
         values ($1, $2, now(), $3)`,
        [second.productId, variantOfFirst, admin],
      ),
      (error) => {
        assert.match(error.message, /belongs to a different catalog_product/);
        return true;
      },
      "otherwise the display fallback shows one product's photograph on another",
    );
  });
});

dbTest("the same bytes are not stored twice for one product", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog22@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { productId } = await seedProduct(client, { businessId: seller, adminId: admin });

    await client.query(
      `insert into public.product_media (catalog_product_id, checksum, adopted_at, created_by)
       values ($1, 'abc123', now(), $2)`,
      [productId, admin],
    );
    await assert.rejects(
      () => client.query(
        `insert into public.product_media (catalog_product_id, checksum, adopted_at, created_by)
         values ($1, 'abc123', now(), $2)`,
        [productId, admin],
      ),
      (error) => {
        assert.equal(error.code, "23505");
        return true;
      },
    );
  });
});

// ─── cascade policy across the whole chain ───────────────────────────────────

dbTest("no foreign key in the catalogue chain cascades or nulls an owner", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select c.conrelid::regclass::text as table_name, c.conname, pg_get_constraintdef(c.oid) as def
         from pg_constraint c
        where c.contype = 'f'
          and c.conrelid in (
            'public.catalog_products'::regclass,
            'public.product_variants'::regclass,
            'public.seller_offers'::regclass,
            'public.inventory'::regclass,
            'public.product_media'::regclass)`,
    );
    assert.ok(rows.length >= 10, "there must be foreign keys to check");
    for (const row of rows) {
      assert.doesNotMatch(row.def, /ON DELETE CASCADE/i, `${row.table_name}.${row.conname} must not cascade`);
      assert.doesNotMatch(row.def, /ON DELETE SET NULL/i, `${row.table_name}.${row.conname} must not null an owner`);
    }
  });
});

dbTest("a business with offers cannot be deleted", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "catalog23@example.com");
    const seller = await seedBusiness(client, "Seller");
    const { productId } = await seedProduct(client, { businessId: seller, adminId: admin });
    const variant = await seedVariant(client, { productId, adminId: admin });
    await seedOffer(client, { businessId: seller, variantId: variant, adminId: admin });

    await assert.rejects(
      () => client.query("delete from public.business_profiles where id = $1", [seller]),
      (error) => {
        assert.equal(error.code, "23503");
        return true;
      },
    );
  });
});
