-- M4 · catalog_products - the canonical commercial product.
--
-- The product as a thing that exists, independent of price and stock. Those
-- live on seller_offers and inventory, and keeping them out of here is what
-- lets two Sellers offer the same product at different prices without one
-- overwriting the other - the failure the flat business_products table cannot
-- avoid, because price is a column on the product itself.
--
-- owning_business_id is the Seller who CURATES the content. It is not who may
-- sell it; that is seller_offers.business_id. Conflating the two is what makes
-- a marketplace impossible to open later. (OD-1: Seller-owned, decided.)
--
-- origin_draft_id is NOT NULL: every product came from a reviewed draft, and
-- there is no other way to create one. That is the whole point of the intake
-- chain - a product with no draft behind it would be exactly the legacy path
-- this replaces.
--
-- publication_state starts at UNPUBLISHED. business_products had no status
-- column at all, so a row was sellable the instant it existed; that is the
-- defect this column closes.

create table if not exists public.catalog_products (
  id uuid primary key default gen_random_uuid(),

  -- Who curates the content. Never who may sell it.
  owning_business_id uuid not null
    references public.business_profiles(id)
    on delete restrict,

  -- Immutable, enforced below. Every product traces to a reviewed draft.
  origin_draft_id uuid not null
    references public.product_drafts(id)
    on delete restrict,

  publication_state text not null default 'UNPUBLISHED'
    check (publication_state in ('UNPUBLISHED', 'PUBLISHED', 'ARCHIVED')),
  published_at timestamptz,
  published_by uuid references public.admin_users(id) on delete restrict,
  unpublished_at timestamptz,
  unpublished_reason text,

  -- Approved content, copied from the draft at approval.
  name text not null,
  description text,
  brand text,
  category_id uuid references public.product_categories(id) on delete restrict,
  pet_type public.pet_type,
  attributes jsonb not null default '{}'::jsonb,
  slug text,

  created_by uuid not null references public.admin_users(id) on delete restrict,
  updated_by uuid references public.admin_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  archived_at timestamptz,
  archived_by uuid references public.admin_users(id) on delete restrict,

  -- A published product must record when and by whom. Without this the
  -- publication gate has no evidence it ever ran.
  constraint catalog_products_published_has_provenance
    check (publication_state <> 'PUBLISHED' or (published_at is not null and published_by is not null)),

  -- An archived row is not a live row, and must not also claim to be published.
  constraint catalog_products_archived_not_published
    check (publication_state <> 'ARCHIVED' or archived_at is not null)
);

-- One draft produces one product. Without this, re-running an approval would
-- silently create duplicates of the same reviewed content.
create unique index if not exists uq_catalog_products_origin_draft
  on public.catalog_products (origin_draft_id);

-- The public catalogue reads exactly this. Partial, because unpublished and
-- archived rows are the majority over time and never appear publicly.
create index if not exists idx_catalog_products_published
  on public.catalog_products (publication_state)
  where publication_state = 'PUBLISHED';

create index if not exists idx_catalog_products_owner
  on public.catalog_products (owning_business_id);

create index if not exists idx_catalog_products_category
  on public.catalog_products (category_id)
  where category_id is not null;

create unique index if not exists uq_catalog_products_slug
  on public.catalog_products (slug)
  where slug is not null and archived_at is null;

-- The forward pointer from the draft, deferred out of M3 until this table
-- existed. RESTRICT: a product may not be deleted out from under the draft that
-- records how it came to exist.
alter table public.product_drafts
  add constraint product_drafts_approved_catalog_product_fkey
  foreign key (approved_catalog_product_id)
  references public.catalog_products(id)
  on delete restrict;

-- origin_draft_id is immutable.
--
-- Repointing a live product at a different draft would rewrite its provenance:
-- the product would claim to have been reviewed as something it was not. The
-- owner is deliberately NOT frozen here - ownership transfer is a legitimate
-- action - but it is an explicit, audited one, never a side effect, and the
-- route layer is what restricts it.
create or replace function public.catalog_products_origin_frozen()
returns trigger
language plpgsql
as $$
begin
  if new.origin_draft_id is distinct from old.origin_draft_id then
    raise exception
      'catalog_products.origin_draft_id is immutable; a product cannot be repointed at another draft'
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists catalog_products_origin_frozen on public.catalog_products;
create trigger catalog_products_origin_frozen
  before update on public.catalog_products
  for each row execute function public.catalog_products_origin_frozen();

comment on table public.catalog_products is
  'The canonical product, independent of price and stock. owning_business_id curates content; the right to sell lives on seller_offers.';

comment on column public.catalog_products.owning_business_id is
  'Who curates this content. NOT who may sell it - that is seller_offers.business_id.';

comment on column public.catalog_products.publication_state is
  'UNPUBLISHED until the publication gate passes. business_products had no such column, which is why a row there was sellable the moment it existed.';
