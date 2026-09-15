-- 0055_image_action_queue.sql
-- Which product images need a human, and which one needs them first.
--
-- An approved image is the last thing standing between the migrated catalogue
-- and a published shop: phase 4b gives every approved product a variant, a
-- priced offer and availability, and OD-3 still refuses to publish without an
-- approved image. So "which images need manual work" stops being a reporting
-- question and becomes the work queue.
--
-- COMPUTED, NOT STORED, for exactly the reason OD-2 gives about publication
-- readiness: "a stored 'ready' flag is a claim that drifts from the rows it
-- describes - delete the last variant and the flag still says ready." A stored
-- needs_urgent_image column would say a product needs an image long after
-- somebody gave it one, and the queue would fill with work already done. This
-- reads the live row every time.
--
-- The catalogue already carries four independent signals and they disagree,
-- which is why this exists rather than a single column:
--
--   image_url                          '/placeholder.svg' means no file at all
--   product_attributes.image_review_status   the importer's own verdict
--   needs_image_review                 a flag somebody set, undated
--   image_adopted_at                   whether we host the bytes
--
-- C-25 and C-26 measured them against each other on 2026-09-15: 98 products
-- carry needs_image_review, 69 of those have no image at all, and 91 carry the
-- importer's "Needs manual image research". The two records agree on those 91,
-- which is corroboration rather than noise - and 23 of the 91 ALREADY have a
-- normalized image, because that verdict is about RIGHTS and adopting a file
-- does not settle them.

-- ── The classification ──────────────────────────────────────────────────────
--
-- Ordered by what blocks publication hardest, not by what is easiest to fix.
create or replace function public.image_action_for(
  image_url text,
  image_review_status text,
  needs_image_review boolean,
  image_adopted_at timestamptz
)
returns text
language sql
immutable
as $$
  select case
    -- 1. There is no picture. Nothing can publish, and no amount of rights
    --    work helps: somebody has to obtain a photograph. 69 products.
    when coalesce(btrim(image_url), '') = '' or btrim(image_url) = '/placeholder.svg'
      then 'missing'

    -- 2. A picture exists and we may not be allowed to use it. The importer
    --    said so in its own words, and C-26 found the flag column agreeing on
    --    91 of 98. Adopting the file does NOT clear this - 23 of those 91 are
    --    already normalized - so image_adopted_at is deliberately not consulted
    --    here.
    when btrim(coalesce(image_review_status, '')) = 'Needs manual image research'
      then 'rights_unresolved'

    -- 3. The bytes still live on a supplier's server: they can be changed,
    --    resized or deleted by someone else, and every page view leaks traffic
    --    to them. Mechanical to fix - adoptProductImages.mjs exists - which is
    --    why it ranks below the two that need a person.
    when image_adopted_at is null and btrim(image_url) ~ '^https?://'
      then 'foreign_host'

    -- 4. Somebody flagged it and no other signal explains why. Undated, so it
    --    may be stale; it still gets looked at, last.
    when needs_image_review is true
      then 'review_requested'

    else 'ok'
  end;
$$;

comment on function public.image_action_for(text, text, boolean, timestamptz) is
  'What a product image needs from a human, computed from the four disagreeing signals the catalogue carries. Never stored: a stored flag would outlive the problem it describes (OD-2).';

-- ── The queue ───────────────────────────────────────────────────────────────
--
-- One row per product needing work, most blocking first, so an administrator
-- opening this sees what to do rather than what is wrong.
--
-- priority is the sort key and is deliberately NOT the same as the action: two
-- actions can share a priority later without renaming either.
create or replace view public.image_action_queue as
select
  p.id as product_id,
  p.business_id,
  p.name,
  p.category_id,
  p.species_id,
  action.value as action,
  case action.value
    when 'missing'           then 1
    when 'rights_unresolved' then 2
    when 'foreign_host'      then 3
    when 'review_requested'  then 4
  end as priority,
  -- Kept so the queue can explain itself without a second query. source_url is
  -- what makes the rights problem finite (D-7): you cannot ask a supplier for
  -- permission if you no longer know which supplier.
  p.source_url,
  nullif(btrim(coalesce(p.product_attributes ->> 'image_review_status', '')), '') as importer_verdict,
  p.needs_image_review,
  p.image_adopted_at,
  p.updated_at
from public.business_products p
cross join lateral (
  select public.image_action_for(
    p.image_url,
    p.product_attributes ->> 'image_review_status',
    p.needs_image_review,
    p.image_adopted_at
  ) as value
) as action
where action.value <> 'ok';

comment on view public.image_action_queue is
  'Products whose image needs a human, most publication-blocking first. Computed live from business_products, so a product leaves this queue the moment it stops needing work.';

-- The queue filters on a computed expression, so the index has to match it.
-- Partial: the rows that need nothing are the majority and are never selected.
create index if not exists idx_business_products_image_unresolved
  on public.business_products (needs_image_review, image_adopted_at)
  where image_url = '/placeholder.svg'
     or needs_image_review is true
     or image_adopted_at is null;
