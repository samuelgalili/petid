import { recordEvent } from "./events.js";

// Turning mapped rows into products.
//
// Every row that has an identity becomes a product. What it does not become is
// published: the first delivery from a supplier lands entirely in review, so a
// mapping mistake is caught by a person rather than by a shopper. Publishing is
// switched on for later runs once the mapping has been confirmed.
//
// Resolution is deterministic. Brands, categories, suppliers and animals are
// looked up by normalised name and created when missing — created as proposals
// where the specification asks for approval, so nothing silently enters the
// production taxonomy.

export const APPLY_JOB_TYPE = "import.apply";

const ROW_PAGE = 200;
const asJson = (value) => JSON.stringify(value ?? null);

const normalizeKey = (value) =>
  String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const slugify = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9֐-׿]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || null;

/**
 * A small cache per run.
 *
 * Resolving the same eight brands for 267 rows would be 267 round trips for
 * eight answers.
 */
const createResolverCache = () => ({
  brands: new Map(),
  categories: new Map(),
  suppliers: new Map(),
  animals: new Map(),
});

const resolveBrand = async (client, cache, name) => {
  const key = normalizeKey(name);
  if (!key) return null;
  if (cache.brands.has(key)) return cache.brands.get(key);

  const existing = await client.query(
    "select id from public.brands where normalized_name = $1",
    [key],
  );

  let id = existing.rows[0]?.id;
  if (!id) {
    const created = await client.query(
      `
        insert into public.brands (name, normalized_name, slug)
        values ($1, $2, $3)
        on conflict (normalized_name) do update set updated_at = now()
        returning id
      `,
      [String(name).trim(), key, slugify(name)],
    );
    id = created.rows[0].id;
  }

  cache.brands.set(key, id);
  return id;
};

const resolveAnimal = async (client, cache, name) => {
  const key = normalizeKey(name);
  if (!key) return null;
  if (cache.animals.has(key)) return cache.animals.get(key);

  const existing = await client.query(
    "select id, pet_type_fallback from public.animal_types where normalized_name = $1",
    [key],
  );

  let row = existing.rows[0];
  if (!row) {
    // An animal nobody has seen before is proposed rather than adopted, so a
    // typo in one row cannot invent a category the shop then filters on.
    const created = await client.query(
      `
        insert into public.animal_types (name, normalized_name, slug, pet_type_fallback, status)
        values ($1, $2, $3, 'other', 'proposed')
        on conflict (normalized_name) do update set updated_at = now()
        returning id, pet_type_fallback
      `,
      [String(name).trim(), key, slugify(name)],
    );
    row = created.rows[0];
  }

  cache.animals.set(key, row);
  return row;
};

/**
 * Two levels: the supplier's product family, then the type within it.
 *
 * Both arrive as proposals. AI and imports may suggest a taxonomy; only a
 * person promotes it to one the storefront navigates by.
 */
const resolveCategory = async (client, cache, { code, label, type }) => {
  const familyName = String(label || code || "").trim();
  if (!familyName) return null;

  const familyKey = `family:${normalizeKey(familyName)}`;
  let familyId = cache.categories.get(familyKey);

  if (!familyId) {
    const created = await client.query(
      `
        insert into public.categories (name, slug, source_code, status)
        values ($1, $2, $3, 'proposed')
        on conflict (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(name)))
        do update set source_code = coalesce(public.categories.source_code, excluded.source_code), updated_at = now()
        returning id
      `,
      [familyName, slugify(familyName), code ? String(code).trim() : null],
    );
    familyId = created.rows[0].id;
    cache.categories.set(familyKey, familyId);
  }

  const typeName = String(type || "").trim();
  if (!typeName) return familyId;

  const typeKey = `type:${familyId}:${normalizeKey(typeName)}`;
  let typeId = cache.categories.get(typeKey);

  if (!typeId) {
    const created = await client.query(
      `
        insert into public.categories (parent_id, name, slug, status)
        values ($1, $2, $3, 'proposed')
        on conflict (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(name)))
        do update set updated_at = now()
        returning id
      `,
      [familyId, typeName, slugify(`${familyName}-${typeName}`)],
    );
    typeId = created.rows[0].id;
    cache.categories.set(typeKey, typeId);
  }

  return typeId;
};

const resolveSupplier = async (client, cache, name, fallbackId) => {
  const key = normalizeKey(name);
  if (!key) return fallbackId || null;
  if (cache.suppliers.has(key)) return cache.suppliers.get(key);

  const created = await client.query(
    `
      insert into public.suppliers (name, normalized_name, slug)
      values ($1, $2, $3)
      on conflict (normalized_name) do update set updated_at = now()
      returning id
    `,
    [String(name).trim(), key, slugify(name)],
  );

  const id = created.rows[0].id;
  cache.suppliers.set(key, id);
  return id;
};

/**
 * Finds the product this row already refers to.
 *
 * SKU within the supplier's scope, and nothing looser. Matching on a similar
 * name across suppliers is how two different products become one.
 */
const findExistingProduct = async (client, { sku, supplierId }) => {
  if (!sku) return null;

  const bySupplierSku = await client.query(
    `
      select p.id
      from public.products p
      join public.product_supplier_links l on l.product_id = p.id
      where l.supplier_id = $1
        and lower(btrim(l.supplier_sku)) = lower(btrim($2))
        and p.deleted_at is null
      limit 1
    `,
    [supplierId, sku],
  );
  if (bySupplierSku.rows[0]) return bySupplierSku.rows[0].id;

  const byImportSku = await client.query(
    `
      select id from public.products
      where source_kind = 'import'
        and lower(btrim(sku)) = lower(btrim($1))
        and coalesce(primary_supplier_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = coalesce($2::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
        and deleted_at is null
      limit 1
    `,
    [sku, supplierId],
  );
  return byImportSku.rows[0]?.id || null;
};

/**
 * Creates or updates one product from one mapped row.
 *
 * Fields Mipo owns — the selling price, the written description, the chosen
 * image — are never overwritten by a later import. That is the whole point of
 * the ownership matrix: a supplier delivery must not undo an editor's work.
 */
const applyRow = async (client, cache, { row, importRow, profile }) => {
  const values = row.normalized || {};
  const sku = values.sku ? String(values.sku).trim() : null;
  const name = values.name ? String(values.name).trim() : null;

  if (!sku || !name) {
    return { action: "skip", reason: "MISSING_IDENTITY" };
  }

  const supplierId = await resolveSupplier(
    client,
    cache,
    values.supplier_name,
    profile?.default_supplier_id || importRow.supplier_id,
  );
  const brandId = await resolveBrand(client, cache, values.brand);
  const categoryId = await resolveCategory(client, cache, {
    code: values.category_code,
    label: values.category_label,
    type: values.category_type,
  });
  const animal = await resolveAnimal(client, cache, values.animal);

  const existingId = await findExistingProduct(client, { sku, supplierId });

  const sellingPrice = typeof values.selling_price === "number" ? values.selling_price : null;
  const costPrice = typeof values.cost_price === "number" ? values.cost_price : null;
  const imagePath = values.image_path_repaired || values.image_path || null;

  let productId = existingId;
  let action = existingId ? "update" : "create";

  if (existingId) {
    // Only supplier-owned facts. name, price, description and image belong to
    // Mipo once a product exists, so they are left exactly as they are.
    await client.query(
      `
        update public.products set
          brand_id = coalesce($2, brand_id),
          primary_category_id = coalesce($3, primary_category_id),
          primary_supplier_id = coalesce($4, primary_supplier_id),
          animal_type_id = coalesce($5, animal_type_id),
          cost_price = coalesce($6, cost_price),
          variant_group_key = coalesce($7, variant_group_key),
          size_amount = coalesce($8, size_amount),
          size_unit = coalesce($9, size_unit),
          source_import_row_id = $10,
          updated_at = now()
        where id = $1
      `,
      [
        existingId, brandId, categoryId, supplierId, animal?.id || null,
        costPrice, values.variant_group_key || null,
        values.size_amount ?? null, values.size_unit || null, row.id,
      ],
    );
  } else {
    const created = await client.query(
      `
        insert into public.products (
          source_kind, status, name, description, price, image_url, category, sku,
          pet_type, brand, brand_id, primary_category_id, primary_supplier_id,
          animal_type_id, cost_price, in_stock, variant_group_key, size_amount, size_unit,
          source_import_row_id
        )
        values (
          'import', $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, true, $15, $16, $17,
          $18
        )
        returning id
      `,
      [
        // The administrator's decision: nothing from a first delivery goes
        // straight to the shop.
        "pending_review",
        name,
        values.name_en || null,
        sellingPrice ?? 0,
        imagePath || "/placeholder.svg",
        values.category_type || values.category_label || null,
        sku,
        animal?.pet_type_fallback || "other",
        values.brand || null,
        brandId,
        categoryId,
        supplierId,
        animal?.id || null,
        costPrice,
        values.variant_group_key || null,
        values.size_amount ?? null,
        values.size_unit || null,
        row.id,
      ],
    );
    productId = created.rows[0].id;
  }

  if (supplierId) {
    await client.query(
      `
        insert into public.product_supplier_links (
          product_id, supplier_id, supplier_sku, cost, currency, is_primary, last_import_at
        )
        values ($1, $2, $3, $4, coalesce($5, 'ILS'), true, now())
        on conflict (supplier_id, lower(btrim(coalesce(supplier_sku, ''))), product_id)
        do update set cost = excluded.cost, currency = excluded.currency,
                      last_import_at = now(), updated_at = now()
      `,
      [productId, supplierId, sku, costPrice, values.currency || null],
    );
  }

  // The barcode is recorded whether or not it passes its check digit, flagged
  // so nothing downstream mistakes it for a verified identity.
  if (values.barcode) {
    await client.query(
      `
        insert into public.product_identifiers (product_id, id_type, value, normalized_value, is_valid, source)
        values ($1, 'gtin13', $2, $3, $4, 'import')
        on conflict (product_id, id_type, normalized_value) do update set is_valid = excluded.is_valid
      `,
      [
        productId,
        String(values.barcode),
        String(values.barcode).replace(/\D/g, ""),
        values.barcode_valid_gtin13 !== false,
      ],
    );
  }

  await client.query(
    `
      insert into public.product_identifiers (product_id, id_type, value, normalized_value, source)
      values ($1, 'supplier_sku', $2, $3, 'import')
      on conflict (product_id, id_type, normalized_value) do nothing
    `,
    [productId, sku, sku.toLowerCase()],
  );

  return { action, productId };
};

/** Applies every mapped row of one import, one row's failure at a time. */
export const runImportApply = async (pool, importId) => {
  const importResult = await pool.query("select * from public.imports where id = $1", [importId]);
  const importRow = importResult.rows[0];
  if (!importRow) throw new Error(`Import ${importId} not found`);

  const profileResult = importRow.profile_id
    ? await pool.query("select * from public.supplier_import_profiles where id = $1", [importRow.profile_id])
    : { rows: [] };
  const profile = profileResult.rows[0] || null;

  const cache = createResolverCache();
  const counts = { created: 0, updated: 0, skipped: 0, failed: 0 };
  let offset = 0;

  for (;;) {
    const page = await pool.query(
      `
        select id, row_number, normalized
        from public.import_rows
        where import_id = $1 and status in ('valid', 'pending_review')
        order by row_number
        limit $2 offset $3
      `,
      [importId, ROW_PAGE, offset],
    );
    if (page.rows.length === 0) break;

    for (const row of page.rows) {
      // One row per transaction. A row that fails must not roll back the two
      // hundred that already worked.
      const client = await pool.connect();
      try {
        await client.query("begin");
        const result = await applyRow(client, cache, { row, importRow, profile });

        if (result.action === "skip") {
          counts.skipped += 1;
          await client.query(
            "update public.import_rows set action = 'skip', updated_at = now() where id = $1",
            [row.id],
          );
        } else {
          counts[result.action === "create" ? "created" : "updated"] += 1;
          await client.query(
            "update public.import_rows set action = $2, product_id = $3, updated_at = now() where id = $1",
            [row.id, result.action, result.productId],
          );
        }

        await client.query("commit");
      } catch (error) {
        await client.query("rollback").catch(() => {});
        counts.failed += 1;
        await pool.query(
          `
            update public.import_rows set
              status = 'error',
              action = 'error',
              errors = coalesce(errors, '[]'::jsonb) || $2::jsonb,
              updated_at = now()
            where id = $1
          `,
          [row.id, asJson([{ code: "APPLY_FAILED", message: error.message }])],
        ).catch(() => {});
      } finally {
        client.release();
      }
    }

    offset += page.rows.length;
  }

  await pool.query(
    `
      update public.imports set
        status = 'completed_with_review',
        created_products = $2,
        updated_products = $3,
        completed_at = now(),
        updated_at = now()
      where id = $1
    `,
    [importId, counts.created, counts.updated],
  );

  await recordEvent(pool, {
    event_type: "supplier.import_completed",
    entity_type: "import",
    entity_id: importId,
    source: "import",
    idempotency_key: `supplier.import_completed:${importId}`,
    payload: counts,
  });

  return { import_id: importId, ...counts };
};
