-- Where a product's feeding guidance actually came from.
--
-- business_products.feeding_guide is populated by productIntel.js, which reads
-- the supplier's product page with a model and returns [{range, amount}]. That
-- is the manufacturer's number *as transcribed by a model*, which is not the
-- same thing as the manufacturer's number -- and until now the column carried
-- no way to say so. The pet profile meanwhile computed its own grams-per-day
-- from a body-weight percentage and rendered it under a heading that said
-- manufacturer guidance, so an owner had no way to tell any of the three apart.
--
-- The owner-facing feeding path is now the catalogue guide alone, which makes
-- this column the thing standing behind a number someone feeds their animal on.
-- It needs to be able to say how sure it is.
--
--   ai_extracted           read off the product page by a model. Shown, and
--                          labelled as coming from the product page.
--   manufacturer_confirmed a human checked it against the manufacturer. Only
--                          this may be labelled "הנחיות יצרן". No writer sets
--                          it yet; the admin flow is P1.
--   unknown                provenance not established. Treated as ai_extracted
--                          for labelling -- the conservative direction.
--
-- Backfill is 'ai_extracted' for rows that already hold a guide, because that
-- is how every one of them got there. Rows with no guide stay 'unknown' rather
-- than being given a provenance they have nothing to attach it to.
alter table public.business_products
  add column if not exists feeding_guide_source text not null default 'unknown';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'business_products_feeding_guide_source_check'
  ) then
    alter table public.business_products
      add constraint business_products_feeding_guide_source_check
      check (feeding_guide_source in ('ai_extracted', 'manufacturer_confirmed', 'unknown'));
  end if;
end $$;

update public.business_products
set feeding_guide_source = 'ai_extracted'
where feeding_guide_source = 'unknown'
  and feeding_guide is not null
  and jsonb_typeof(feeding_guide) = 'array'
  and jsonb_array_length(feeding_guide) > 0;
