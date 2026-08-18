import { TARGET_FIELDS, extractSize, isValidGtin13, mapRow, repairImagePath, suggestTargetField, variantGroupKey } from "./importMapping.js";

// Applying a profile's mappings to the rows already stored.
//
// This runs against import_rows, never against the file, which is the point of
// keeping raw. A mapping corrected today can be re-run over a delivery from
// three months ago without asking the supplier for anything.

export const MAP_JOB_TYPE = "import.map";

const ROW_PAGE = 500;
const asJson = (value) => JSON.stringify(value ?? null);

/**
 * Fills in proposed targets for columns nobody has decided about yet.
 *
 * Only touches rows still marked unmapped, so a correction an administrator
 * made by hand is never overwritten by a later guess.
 */
export const suggestProfileMappings = async (pool, profileId) => {
  const existing = await pool.query(
    "select id, source_field, target_kind from public.import_field_mappings where profile_id = $1",
    [profileId],
  );

  let proposed = 0;
  for (const mapping of existing.rows) {
    if (mapping.target_kind !== "unmapped") continue;

    const target = suggestTargetField(mapping.source_field);
    if (!target) continue;

    const spec = TARGET_FIELDS[target];
    await pool.query(
      `
        update public.import_field_mappings
        set target_kind = $2, target_field = $3, value_type = $4, updated_at = now()
        where id = $1
      `,
      [mapping.id, spec.kind, target, spec.type],
    );
    proposed += 1;
  }

  return { proposed, total: existing.rows.length };
};

/**
 * Everything derived from a mapped row that is not a straight field copy.
 *
 * Kept separate from mapping so it is obvious which values came from the
 * supplier and which the engine worked out.
 */
export const deriveRowFacts = (normalized) => {
  const derived = {};

  const size = extractSize(normalized.name);
  if (size) {
    derived.size_amount = size.amount;
    derived.size_unit = size.unit;
    derived.size_base_amount = size.base_amount;
    derived.size_base_unit = size.base_unit;
  }

  const groupKey = variantGroupKey(normalized.name, normalized.brand);
  if (groupKey) derived.variant_group_key = groupKey;

  if (normalized.barcode) {
    // Kept either way. A barcode that fails its check digit is a hint, not an
    // identity, and in this catalogue six of them are shared across pack sizes.
    derived.barcode_valid_gtin13 = isValidGtin13(normalized.barcode);
  }

  if (normalized.image_path) {
    const repaired = repairImagePath(normalized.image_path);
    derived.image_path_repaired = repaired;
    derived.image_path_was_reordered = repaired !== normalized.image_path;
    derived.image_is_http = /^https?:\/\//i.test(String(normalized.image_path));
  }

  // The selling price is whichever the supplier actually filled in. Zero is
  // treated as absent because more than half this catalogue carries a zero
  // there while holding a real cost.
  const sellingPrice = [normalized.list_price_inc_vat, normalized.list_price_ex_vat]
    .find((value) => typeof value === "number" && value > 0);
  if (sellingPrice !== undefined) derived.selling_price = sellingPrice;

  const cost = [normalized.cost, normalized.last_purchase_price]
    .find((value) => typeof value === "number" && value > 0);
  if (cost !== undefined) derived.cost_price = cost;

  return derived;
};

/** Problems that stop a row becoming a product, stated in the terms a person fixes. */
export const validateRow = (normalized, derived) => {
  const errors = [];
  const warnings = [];

  if (!normalized.sku) errors.push({ code: "MISSING_SKU", field: "sku", message: "אין מק\"ט" });
  if (!normalized.name) errors.push({ code: "MISSING_NAME", field: "name", message: "אין שם מוצר" });

  if (derived.selling_price === undefined) {
    warnings.push({ code: "MISSING_PRICE", field: "price", message: "אין מחיר מכירה במקור" });
  }
  if (!normalized.brand) {
    warnings.push({ code: "MISSING_BRAND", field: "brand", message: "אין יצרן" });
  }
  if (!normalized.image_path) {
    warnings.push({ code: "MISSING_IMAGE", field: "image_path", message: "אין הפניה לתמונה" });
  }
  if (!normalized.supplier_name) {
    warnings.push({ code: "MISSING_SUPPLIER", field: "supplier_name", message: "אין ספק בשורה" });
  }
  if (normalized.barcode && derived.barcode_valid_gtin13 === false) {
    warnings.push({ code: "INVALID_BARCODE", field: "barcode", message: "ברקוד שאינו EAN-13 תקין" });
  }
  if (derived.image_path_was_reordered) {
    warnings.push({
      code: "IMAGE_PATH_REORDERED",
      field: "image_path",
      message: "נתיב התמונה שוחזר מסדר כתיבה הפוך",
    });
  }

  return { errors, warnings };
};

/**
 * Maps, normalises, derives and validates every row of one import.
 *
 * A row that fails does not stop the run: it is marked and the next row is
 * processed, because one bad line must never cost the other two hundred.
 */
export const runImportMap = async (pool, importId) => {
  const importResult = await pool.query("select * from public.imports where id = $1", [importId]);
  const importRow = importResult.rows[0];
  if (!importRow) throw new Error(`Import ${importId} not found`);
  if (!importRow.profile_id) throw new Error("This import has no profile, so there is nothing to map with");

  const mappingsResult = await pool.query(
    "select * from public.import_field_mappings where profile_id = $1",
    [importRow.profile_id],
  );
  const mappings = mappingsResult.rows;

  await pool.query(
    "update public.imports set status = 'normalized', updated_at = now() where id = $1",
    [importId],
  );

  const counts = { valid: 0, pending_review: 0, error: 0 };
  const unmappedWithData = new Set();
  let offset = 0;

  for (;;) {
    const page = await pool.query(
      `
        select id, row_number, raw
        from public.import_rows
        where import_id = $1
        order by row_number
        limit $2 offset $3
      `,
      [importId, ROW_PAGE, offset],
    );
    if (page.rows.length === 0) break;

    for (const row of page.rows) {
      try {
        const { mapped, normalized, unmappedWithData: rowUnmapped } = mapRow(row.raw, mappings);
        for (const field of rowUnmapped) unmappedWithData.add(field);

        const derived = deriveRowFacts(normalized);
        const { errors, warnings } = validateRow(normalized, derived);

        const status = errors.length > 0
          ? "error"
          : warnings.length > 0
            ? "pending_review"
            : "valid";

        if (status === "valid") counts.valid += 1;
        else if (status === "pending_review") counts.pending_review += 1;
        else counts.error += 1;

        await pool.query(
          `
            update public.import_rows set
              mapped = $2::jsonb,
              normalized = $3::jsonb,
              status = $4,
              errors = $5::jsonb,
              warnings = $6::jsonb,
              updated_at = now()
            where id = $1
          `,
          [
            row.id,
            asJson(mapped),
            asJson({ ...normalized, ...derived }),
            status,
            asJson(errors),
            asJson(warnings),
          ],
        );
      } catch (error) {
        counts.error += 1;
        await pool.query(
          `
            update public.import_rows set
              status = 'error',
              errors = $2::jsonb,
              updated_at = now()
            where id = $1
          `,
          [row.id, asJson([{ code: "MAP_FAILED", message: error.message }])],
        ).catch(() => {});
      }
    }

    offset += page.rows.length;
  }

  const mappedFields = mappings.filter((mapping) => mapping.target_kind !== "unmapped" && mapping.target_kind !== "ignored").length;
  const ignoredFields = mappings.filter((mapping) => mapping.target_kind === "ignored").length;
  const stillUnmapped = mappings.filter((mapping) => mapping.target_kind === "unmapped").length;

  const warnings = [];
  if (unmappedWithData.size > 0) {
    // The check that makes "no silent data loss" more than a claim: these
    // columns hold values and no mapping accounts for them.
    warnings.push({
      code: "UNMAPPED_COLUMNS_WITH_DATA",
      message: `${unmappedWithData.size} columns carry data that no mapping accounts for`,
      columns: [...unmappedWithData],
    });
  }

  await pool.query(
    `
      update public.imports set
        status = $2,
        valid_rows = $3,
        invalid_rows = $4,
        pending_review_rows = $5,
        mapped_fields = $6,
        unmapped_fields = $7,
        ignored_fields = $8,
        warnings = (coalesce(warnings, '[]'::jsonb) || $9::jsonb),
        updated_at = now()
      where id = $1
    `,
    [
      importId,
      counts.error > 0 || counts.pending_review > 0 ? "review_required" : "ready",
      counts.valid,
      counts.error,
      counts.pending_review,
      mappedFields,
      stillUnmapped,
      ignoredFields,
      asJson(warnings),
    ],
  );

  return {
    import_id: importId,
    rows: counts,
    fields: { mapped: mappedFields, unmapped: stillUnmapped, ignored: ignoredFields },
    unmapped_columns_with_data: [...unmappedWithData],
  };
};
