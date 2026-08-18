-- Two new products in one delivery are two changes, not one.
--
-- 0024 made a change unique on (import, product, type, field). A product that
-- does not exist yet has no product_id, so every product_added in a delivery
-- collapsed to the same key and only the first survived. A supplier sending two
-- new products would have had one of them silently disappear from the list a
-- person reviews, which is the exact failure this table exists to prevent.
--
-- The row is what makes a row-scoped change distinct, so the row is part of the
-- key. A product_removed has no current row and stays keyed on the product,
-- which is correct: it is the product that went missing, not a row.

drop index if exists public.idx_import_changes_unique;

create unique index if not exists idx_import_changes_unique
  on public.import_changes(
    import_id,
    coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(import_row_id, '00000000-0000-0000-0000-000000000000'::uuid),
    change_type,
    coalesce(field_name, '')
  );
