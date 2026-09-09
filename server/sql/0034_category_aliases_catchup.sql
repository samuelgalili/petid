-- 0034_category_aliases_catchup.sql
-- Files the products 0025 could not, and gives food the two shelves the
-- catalogue already uses.
--
-- 0025 assigned a category to every product whose free-text value appeared in a
-- fixed list of about thirty aliases, and left the rest with category_id null
-- on purpose. What it could not know is which values the catalogue actually
-- uses. "אוכל רטוב" is one of them — the list had "מזון רטוב" — so those
-- products were never filed, and the shop's category filter drops anything
-- unfiled the moment a category is chosen. From the shopper's side the filter
-- simply returns less than it should, with nothing to say why.
--
-- This adds the spellings we know are in use and re-runs the backfill. It is
-- not a guess at the whole vocabulary: the admin screen now lists every value
-- that still matches nothing, with counts, so the rest can be adopted from
-- what is really there rather than from what someone imagined.

-- ── 1. Food gets its two shelves ────────────────────────────────────────────
-- Both already exist as free text in the catalogue. As children of מזון they
-- keep filtering by the parent working — a parent tab collects its children —
-- while giving the bar the distinction the shop actually makes.
insert into public.product_categories (slug, name_he, name_en, icon, position, parent_id)
select
  seed.slug, seed.name_he, seed.name_en, seed.icon, seed.position, food.id
from (values
  ('food-dry', 'אוכל יבש',  'Dry food', '🥣', 11),
  ('food-wet', 'אוכל רטוב', 'Wet food', '🥫', 12)
) as seed(slug, name_he, name_en, icon, position)
cross join lateral (
  select id from public.product_categories where slug = 'food'
) as food
on conflict (slug) do nothing;

-- ── 2. The spellings that were missing ──────────────────────────────────────
-- Aliases are matched on the lower-cased, trimmed value, so they are stored
-- that way. Hebrew has no case, but imports do arrive in English.
insert into public.product_category_aliases (alias, category_id)
select lower(btrim(seed.alias)), c.id
from (values
  ('אוכל יבש',        'food-dry'),
  ('מזון יבש',        'food-dry'),
  ('dry food',        'food-dry'),
  ('אוכל רטוב',       'food-wet'),
  ('מזון רטוב',       'food-wet'),
  ('שימורים',         'food-wet'),
  ('wet food',        'food-wet'),
  ('canned food',     'food-wet'),
  ('אוכל לחתולים',    'food'),
  ('אוכל לכלבים',     'food'),
  ('מזון לחתולים',    'food'),
  ('מזון לכלבים',     'food'),
  ('חטיפים לכלבים',   'treats'),
  ('חטיפים לחתולים',  'treats'),
  ('snacks',          'treats'),
  ('ויטמינים',        'health'),
  ('תוסף תזונה',      'health'),
  ('vitamins',        'health'),
  ('שמפו',            'grooming'),
  ('מברשות',          'grooming'),
  ('טיפוח והיגיינה',  'grooming'),
  ('משחקים',          'toys'),
  ('כדורים',          'toys'),
  ('מזרנים',          'beds'),
  ('מיטות ומזרנים',   'beds'),
  ('קולרים',          'accessories'),
  ('רצועות',          'accessories'),
  ('קערות',           'accessories'),
  ('collars',         'accessories'),
  ('leashes',         'accessories')
) as seed(alias, slug)
join public.product_categories c on c.slug = seed.slug
-- An alias already pointing somewhere was put there deliberately, by 0025 or by
-- an admin. Leave it alone.
on conflict (alias) do nothing;

-- ── 3. File what now matches ────────────────────────────────────────────────
-- Only rows with no category of their own: anything an admin has already filed
-- stays where they put it.
update public.business_products p
set category_id = a.category_id, updated_at = now()
from public.product_category_aliases a
where p.category_id is null
  and p.category is not null
  and lower(btrim(p.category)) = a.alias;

update public.scraped_products p
set category_id = a.category_id
from public.product_category_aliases a
where p.category_id is null
  and coalesce(nullif(btrim(p.sub_category), ''), p.main_category) is not null
  and lower(btrim(coalesce(nullif(btrim(p.sub_category), ''), p.main_category))) = a.alias;
