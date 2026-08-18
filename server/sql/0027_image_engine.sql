-- The image engine.
--
-- The supplier file points at a private ERP file share, so none of its 217
-- references can be fetched. Images therefore come from several places with
-- different trustworthiness, and the table has to record which — a picture
-- found by searching the web is not the same fact as one the manufacturer sent,
-- even when both look right.
--
-- Nothing here bypasses anyone's access control. A source that needs
-- credentials is used only with credentials that were given to us.

-- Ranked, so a better source replaces a worse one automatically when it
-- arrives. The supplier export is expected later; when it lands it outranks
-- everything found in the meantime without anyone having to re-review.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'image_source_kind') then
    create type public.image_source_kind as enum (
      'supplier_export',   -- 1. sent to us directly, named by SKU
      'supplier_url',      -- 2. a public address the supplier gave
      'manufacturer',      -- 3. the brand's own site
      'barcode_lookup',    -- 4. a public catalogue matched on GTIN
      'name_search',       -- 5. a web search on the product name
      'manual_upload',     -- an administrator chose it
      'erp_path'           -- the unusable path from the file, kept for reference
    );
  end if;
end $$;

alter table public.product_images
  add column if not exists source_kind public.image_source_kind not null default 'name_search',
  add column if not exists source_url text,
  add column if not exists source_reference text,
  add column if not exists storage_key text,
  add column if not exists checksum_sha256 text,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists content_type text,
  add column if not exists byte_size integer,

  -- 0 to 100. How well the candidate matched the product it is claimed to
  -- depict, and on what evidence.
  add column if not exists confidence integer check (confidence between 0 and 100),
  add column if not exists match_evidence jsonb not null default '{}'::jsonb,

  add column if not exists status text not null default 'candidate'
    check (status in ('candidate', 'accepted', 'review', 'rejected', 'failed')),

  add column if not exists reviewed_by_admin_user_id uuid references public.admin_users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_product_images_status
  on public.product_images(status);
create index if not exists idx_product_images_product_rank
  on public.product_images(product_id, source_kind, confidence desc);

-- The same picture arriving twice from two searches is one image. Checksum
-- rather than URL, because the same file is served from many addresses.
create unique index if not exists idx_product_images_checksum
  on public.product_images(product_id, checksum_sha256)
  where checksum_sha256 is not null;

-- Bytes we hold ourselves. Hotlinking a product image means the shop breaks
-- when someone else's site changes, which is why an accepted image is copied
-- rather than linked.
create table if not exists public.image_blobs (
  storage_key text primary key,
  content bytea not null,
  content_type text not null,
  byte_size integer not null,
  checksum_sha256 text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_image_blobs_checksum on public.image_blobs(checksum_sha256);

-- What the engine tried, whether or not it worked. A product with no image
-- after three attempts is a different problem from one nobody has looked at.
create table if not exists public.image_resolution_attempts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  source_kind public.image_source_kind not null,
  query text,
  candidates_found integer not null default 0,
  accepted integer not null default 0,
  error text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_image_attempts_product
  on public.image_resolution_attempts(product_id, created_at desc);

-- Where a supplier export is expected from, per profile.
alter table public.supplier_import_profiles
  add column if not exists image_export_notes text;
