-- 0051_hyphenated_food_category_aliases.sql
-- Files the 241 products that 0034 could not, because of a hyphen.
--
-- 0034 added the spellings known to be in use and re-ran the backfill, with the
-- honest caveat that it was "not a guess at the whole vocabulary". Measuring
-- production (C-0, 2026-09-15) found what it missed, and it is smaller and
-- sillier than it looks:
--
--   241 of 375 products carry no category_id. Between them they hold exactly
--   TWO distinct free-text values:
--
--       dry-food   226
--       wet-food    15
--
--   and the aliases already defined are spelled 'dry food' and 'wet food',
--   WITH A SPACE. The import writes a hyphen.
--
-- So 64% of the catalogue is unfiled over one character.
--
-- This is not only migration groundwork. It is a live defect, and 0034 already
-- described its shape: the shop's category filter drops anything unfiled the
-- moment a category is chosen, so a shopper filtering to אוכל יבש sees 3
-- products where 229 exist, with nothing to say why.
--
-- The categories themselves need no work. 0034 created food-dry (אוכל יבש) and
-- food-wet (אוכל רטוב) as children of food, and they are the canonical Hebrew
-- shelves. The English spellings are import variants and stay aliases, which is
-- what the alias table is for.

-- ── 1. The two spellings the importer actually writes ───────────────────────
-- Stored lower-cased and trimmed, as the table's check constraint requires and
-- as every lookup assumes.
insert into public.product_category_aliases (alias, category_id)
select lower(btrim(seed.alias)), c.id
from (values
  ('dry-food', 'food-dry'),
  ('wet-food', 'food-wet')
) as seed(alias, slug)
join public.product_categories c on c.slug = seed.slug
on conflict (alias) do nothing;

-- ── 1b. Four aliases 0034 meant to move, and silently did not ───────────────
-- Found while testing the above. 0034 listed eight aliases for the two new
-- shelves, but four of those keys were already claimed by 0025 pointing at the
-- parent 'food', and 0034 used ON CONFLICT (alias) DO NOTHING. So half its work
-- was a no-op and nobody noticed:
--
--     alias         0034 intended    actually points at
--     dry food      food-dry         food
--     מזון יבש      food-dry         food
--     wet food      food-wet         food
--     מזון רטוב     food-wet         food
--
-- 0034 exists to fix exactly this class of problem - its own header says
-- "'אוכל רטוב' is one of them - the list had 'מזון רטוב'" - and it failed on
-- its own mechanism. DO UPDATE, not DO NOTHING, so the re-point actually
-- happens.
insert into public.product_category_aliases (alias, category_id)
select lower(btrim(seed.alias)), c.id
from (values
  ('dry food',  'food-dry'),
  ('מזון יבש',  'food-dry'),
  ('wet food',  'food-wet'),
  ('מזון רטוב', 'food-wet')
) as seed(alias, slug)
join public.product_categories c on c.slug = seed.slug
on conflict (alias) do update set category_id = excluded.category_id;

-- Deliberately NOT re-filed: products already sitting under the parent 'food'
-- because of those stale aliases stay there. A row filed by the old alias and a
-- row an admin chose to file under 'food' are indistinguishable now - the
-- database records the category, not who decided it - and overwriting an
-- admin's decision to correct a migration's is the worse of the two errors.
-- The re-point governs what happens next, which is what can be fixed honestly.

-- ── 2. File what now matches ────────────────────────────────────────────────
-- Identical in shape to 0034's backfill, deliberately: same predicate, same
-- restriction to rows with no category of their own, so anything an admin has
-- filed by hand stays where they put it.
--
-- Idempotent by construction. A re-run matches nothing, because every row it
-- would touch now has a category_id.
update public.business_products p
set category_id = a.category_id, updated_at = now()
from public.product_category_aliases a
where p.category_id is null
  and p.category is not null
  and lower(btrim(p.category)) = a.alias;

-- scraped_products holds no rows in production today (C-12 measured zero), but
-- the two tables have been kept in step since 0025 and a silent divergence here
-- would be discovered by whoever next imports into it.
update public.scraped_products p
set category_id = a.category_id
from public.product_category_aliases a
where p.category_id is null
  and coalesce(nullif(btrim(p.sub_category), ''), p.main_category) is not null
  and lower(btrim(coalesce(nullif(btrim(p.sub_category), ''), p.main_category))) = a.alias;

-- What this deliberately does NOT do:
--
--   * It does not invent a category for anything else. C-0 found only these two
--     unmatched values; if a third appears later it stays unfiled and visible
--     in the admin screen that lists unmatched values with counts, rather than
--     being guessed at here.
--
--   * It does not touch ownership. These products all belong to the unowned
--     fallback business profile, and filing them under a category says nothing
--     about who sells them. That question is answered by the catalogue
--     migration, not by this.
