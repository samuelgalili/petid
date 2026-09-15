-- M3 · product_drafts - the correction workspace.
--
-- Separate from raw_import_records on purpose: the raw record keeps what the
-- source said, this keeps what we decided it should say. Every corrected field
-- therefore has both versions available, which is what makes a review queue
-- able to show a diff instead of asking a reviewer to trust the result.
--
-- The lifecycle lives here rather than on the product, because most of it
-- happens before a product exists at all. A draft becomes a catalog_product
-- only at APPROVED, and a product is never created any other way.
--
-- raw_import_record_id is NULLABLE, and that is deliberate: a hand-authored
-- draft has no external source. It is not a hole in the audit trail - the
-- absence is itself the fact, and created_by records who authored it.
--
-- business_id is NOT NULL and inherited from the raw record. As in M2: no
-- default, no fallback.

create table if not exists public.product_drafts (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.business_profiles(id)
    on delete restrict,

  -- RESTRICT, not CASCADE: a draft must never be able to delete the evidence it
  -- was derived from, and the raw record must never be able to delete the
  -- correction history.
  raw_import_record_id uuid
    references public.raw_import_records(id)
    on delete restrict,

  state text not null default 'DRAFT'
    check (state in ('IMPORTED', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED')),

  -- Corrected content.
  name text,
  description text,
  brand text,
  category_id uuid references public.product_categories(id) on delete restrict,
  pet_type public.pet_type,
  attributes jsonb not null default '{}'::jsonb,

  -- Indicative only. The binding price lives on seller_offers, and conflating
  -- the two is how a draft ends up being treated as a price authority.
  proposed_price numeric(10, 2),

  -- Required on rejection; see the CHECK below.
  review_note text,
  reviewed_by uuid references public.admin_users(id) on delete restrict,
  reviewed_at timestamptz,

  submitted_by uuid references public.admin_users(id) on delete restrict,
  submitted_at timestamptz,

  -- Set at APPROVED. The forward pointer to the product this draft became.
  -- The FK is added in M4, once catalog_products exists.
  approved_catalog_product_id uuid,

  created_by uuid not null references public.admin_users(id) on delete restrict,
  updated_by uuid references public.admin_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  archived_at timestamptz,
  archived_by uuid references public.admin_users(id) on delete restrict,

  -- A rejection without a reason is not a review. Enforced here rather than in
  -- a route, because there is more than one route that can reject.
  constraint product_drafts_rejection_needs_reason
    check (state <> 'REJECTED' or nullif(btrim(coalesce(review_note, '')), '') is not null),

  -- IN_REVIEW requires the minimum a reviewer needs in order to review.
  constraint product_drafts_review_needs_content
    check (
      state <> 'IN_REVIEW'
      or (nullif(btrim(coalesce(name, '')), '') is not null and category_id is not null)
    ),

  -- APPROVED must point at the product it created.
  constraint product_drafts_approved_has_product
    check (state <> 'APPROVED' or approved_catalog_product_id is not null)
);

-- One LIVE draft per source record. Archived drafts are excluded, so a record
-- whose draft was abandoned can be re-drafted; and the raw record itself is
-- never consumed.
create unique index if not exists uq_product_drafts_live_per_raw_record
  on public.product_drafts (raw_import_record_id)
  where raw_import_record_id is not null and archived_at is null;

create index if not exists idx_product_drafts_business_state
  on public.product_drafts (business_id, state);

-- The review queue's own ordering.
create index if not exists idx_product_drafts_state_updated
  on public.product_drafts (state, updated_at desc);

create index if not exists idx_product_drafts_raw_record
  on public.product_drafts (raw_import_record_id)
  where raw_import_record_id is not null;

-- Immutable after APPROVED.
--
-- Once a draft has become a product, its Seller, its source and the product it
-- produced are settled facts. Content may still be edited, but doing so returns
-- the draft to DRAFT (the application enforces the transition); what this
-- trigger prevents is the identity changing underneath an approved product -
-- which would silently re-own a live catalogue row.
create or replace function public.product_drafts_approved_identity_frozen()
returns trigger
language plpgsql
as $$
declare
  frozen text;
begin
  if old.state <> 'APPROVED' then
    return new;
  end if;

  frozen := case
    when new.business_id is distinct from old.business_id then 'business_id'
    when new.raw_import_record_id is distinct from old.raw_import_record_id then 'raw_import_record_id'
    when new.approved_catalog_product_id is distinct from old.approved_catalog_product_id
      then 'approved_catalog_product_id'
    else null
  end;

  if frozen is not null then
    raise exception
      'product_drafts.% cannot change once the draft is APPROVED', frozen
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists product_drafts_approved_identity_frozen on public.product_drafts;
create trigger product_drafts_approved_identity_frozen
  before update on public.product_drafts
  for each row execute function public.product_drafts_approved_identity_frozen();

comment on table public.product_drafts is
  'The corrected content for an intake, held separately so the raw record is never overwritten. Carries the intake lifecycle; becomes a catalog_product only at APPROVED.';

comment on column public.product_drafts.raw_import_record_id is
  'Nullable on purpose: a hand-authored draft has no external source. Never CASCADE.';

comment on column public.product_drafts.proposed_price is
  'Indicative only. The binding price is seller_offers.price.';
