-- M8 · product_media - images, with approval as its own fact.
--
-- Source, adopted and approved are three INDEPENDENT facts, not three values of
-- one status. That is the whole design:
--
--   source_url   someone pointed at these bytes
--   adopted_at   the bytes are ours now, at a path we control
--   approved_at  a human looked at them and accepted them for public display
--
-- Collapsing them into a single status column is how a scraped banner ends up
-- on a product page: "we have an image" gets read as "the image is right". The
-- existing needs_image_review boolean is exactly that collapse, and it defaults
-- to false, so an unreviewed image reads as reviewed.
--
-- The publication gate requires an approved image (OD-3, decided). A
-- non-approved image is never shown publicly, which is enforced by the display
-- fallback below and by the gate, not by hoping the frontend filters.
--
-- product_variant_id NULL means a product-level image. Variant images take
-- precedence for that variant; see the fallback chain.

create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),

  catalog_product_id uuid not null
    references public.catalog_products(id)
    on delete restrict,

  -- NULL = product-level image.
  product_variant_id uuid
    references public.product_variants(id)
    on delete restrict,

  -- Where the bytes came from. Provenance of content only.
  source_url text,
  -- Where WE keep them.
  storage_path text,
  checksum text,

  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  bytes integer check (bytes is null or bytes > 0),
  content_type text,

  -- The bytes are ours.
  adopted_at timestamptz,
  -- A human accepted them for public display. This is the fact the gate reads.
  approved_at timestamptz,
  approved_by uuid references public.admin_users(id) on delete restrict,
  rejected_at timestamptz,
  rejection_reason text,

  display_order integer not null default 0,

  created_by uuid not null references public.admin_users(id) on delete restrict,
  updated_by uuid references public.admin_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  archived_at timestamptz,
  archived_by uuid references public.admin_users(id) on delete restrict,

  -- Approval is a human act and must name the human.
  constraint product_media_approved_has_approver
    check (approved_at is null or approved_by is not null),

  -- A rejection without a reason tells a Seller nothing about what to fix.
  constraint product_media_rejection_needs_reason
    check (rejected_at is null or nullif(btrim(coalesce(rejection_reason, '')), '') is not null),

  -- Approved and rejected are mutually exclusive. Without this, a row carrying
  -- both would be read as approved by the gate and as rejected by the queue.
  constraint product_media_not_both_approved_and_rejected
    check (approved_at is null or rejected_at is null),

  -- Nothing is approved before it is ours. Approving a hotlinked URL would mean
  -- the supplier can change what our customers see, after review.
  constraint product_media_approved_requires_adopted
    check (approved_at is null or adopted_at is not null)
);

-- The same bytes are not stored twice for one product.
create unique index if not exists uq_product_media_checksum
  on public.product_media (catalog_product_id, checksum)
  where checksum is not null and archived_at is null;

create index if not exists idx_product_media_product_order
  on public.product_media (catalog_product_id, display_order);

-- The display path: approved images for a product, and nothing else.
create index if not exists idx_product_media_approved
  on public.product_media (catalog_product_id)
  where approved_at is not null and archived_at is null;

create index if not exists idx_product_media_variant
  on public.product_media (product_variant_id)
  where product_variant_id is not null;

-- A variant image must belong to the same product as the variant.
--
-- A CHECK cannot look at another table, so this is a trigger. Without it a
-- variant image could be attached to a product the variant does not belong to,
-- and the display fallback would show one product's photograph on another.
create or replace function public.product_media_variant_matches_product()
returns trigger
language plpgsql
as $$
declare
  owner uuid;
begin
  if new.product_variant_id is null then
    return new;
  end if;

  select catalog_product_id into owner
    from public.product_variants
   where id = new.product_variant_id;

  if owner is distinct from new.catalog_product_id then
    raise exception
      'product_media.product_variant_id belongs to a different catalog_product'
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists product_media_variant_matches_product on public.product_media;
create trigger product_media_variant_matches_product
  before insert or update on public.product_media
  for each row execute function public.product_media_variant_matches_product();

comment on table public.product_media is
  'Product and variant images. source, adopted and approved are three independent facts - collapsing them into one status is how a scraped banner reaches a product page.';

comment on column public.product_media.approved_at is
  'A human accepted these bytes for public display. The publication gate requires one approved image (OD-3). A non-approved image is never shown publicly.';

comment on column public.product_media.product_variant_id is
  'NULL means a product-level image. Display fallback: approved variant image, then approved product image, then the approved default-variant image, then a placeholder.';
