-- Commercial status - the field that says a business may sell.
--
-- Until now nothing in the schema made that claim. is_verified says somebody
-- confirmed the business is real; business_type says which dropdown entry it
-- picked. Neither is authorisation, and four separate places had been left
-- evaluating "is this a Seller" against is_verified alone because it was the
-- only signal available: provisioning, the publication gate, checkout, and the
-- D-18 prerequisites. This closes that gap in one column.
--
-- DEFAULT 'none', and no backfill. Every existing business - including the
-- Mipo Shop profile that ensureDefaultBusinessProfile creates - becomes 'none'
-- and can sell nothing until somebody approves it explicitly. Defaulting to
-- 'approved' would be a retroactive legitimisation of every row the legacy
-- fallback ever touched, which is precisely what was ruled out.
--
-- NOT NULL, unlike is_verified. is_verified being nullable is why every check
-- against it has to be written `IS TRUE` - a two-valued column cannot be read
-- wrong by accident, and this one is new, so there is no reason to repeat the
-- mistake.
--
-- 'pending' is a real state, not a waiting room for 'approved': it lets a
-- business prepare data - drafts, variants, images - while remaining unable to
-- publish or sell. That separation is the point. 'suspended' is the same
-- prohibition applied to a business that could sell before, and it is
-- deliberately distinct from 'none' so that "never approved" and "approval
-- withdrawn" do not look identical afterwards.

alter table public.business_profiles
  add column commercial_status text not null default 'none'
    check (commercial_status in ('none', 'pending', 'approved', 'suspended'));

-- Partial: 'none' will be the overwhelming majority and is never the thing
-- being looked up. The index exists to find sellers, not non-sellers.
create index if not exists idx_business_profiles_commercial_status
  on public.business_profiles (commercial_status)
  where commercial_status <> 'none';

-- The eligibility predicate, written once here so the schema and the
-- application agree on it by construction. Application code calls the shared
-- helper in sellerEligibility.js; this is for queries that need it inline.
create index if not exists idx_business_profiles_sellable
  on public.business_profiles (id)
  where is_verified is true and commercial_status = 'approved';

comment on column public.business_profiles.commercial_status is
  'Whether this business may sell. none = never approved; pending = may prepare data but not publish or sell; approved = may sell; suspended = approval withdrawn. A Seller is is_verified IS TRUE AND commercial_status = approved. business_type is a category and is never a substitute for this.';
