-- Remember where an adopted product image came from.
--
-- The image pipeline downloads a supplier's image, normalizes it and repoints
-- the product at our own storage. That is the point: the bytes become ours and
-- stop depending on somebody else's server.
--
-- It also removes a fallback that used to exist by accident. Before adoption,
-- if our uploads directory were lost the supplier URL still resolved. After
-- adoption it does not, so the origin is recorded here and the catalogue can be
-- rebuilt by re-running scripts/adoptProductImages.mjs against these values.
--
-- Nullable and unconstrained on purpose: a directly uploaded image has no
-- origin, and a row imported before the pipeline existed has none recorded.

alter table public.business_products
  add column if not exists image_source_url text,
  add column if not exists image_adopted_at timestamptz;

alter table public.scraped_products
  add column if not exists image_source_url text,
  add column if not exists image_adopted_at timestamptz;

-- Finds the rows still pointing at somebody else's server, which is what the
-- adoption backfill walks.
create index if not exists idx_business_products_unadopted_image
  on public.business_products(created_at)
  where image_url like 'http%';

-- Rows adopted before this migration existed kept their origin nowhere, so the
-- ones still holding a foreign URL are backfilled from the column itself: after
-- this runs, image_source_url is the origin for anything not yet adopted.
update public.business_products
set image_source_url = image_url
where image_source_url is null
  and image_url like 'http%';

update public.scraped_products
set image_source_url = main_image_url
where image_source_url is null
  and main_image_url like 'http%';
