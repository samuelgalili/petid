-- 0053_pet_species.sql
-- A species is a row, not one of four enum values.
--
-- public.pet_type is enum ('dog','cat','other','all'). MIPO sells to parrots,
-- rodents, poultry, horses, cattle and laying hens, and every one of them is
-- 'other'. C-0 measured it on 2026-09-15: 141 products, 38% of the catalogue,
-- sit in that bucket, and a product page cannot vary on a distinction the data
-- does not carry.
--
-- The species data already exists. C-14 crossed pet_type against the 'animal'
-- attribute the importer writes, and the 'other' bucket decomposes almost
-- completely:
--
--     תוכים 63 · מכרסם 41 · עופות 17 · צאן ובקר 10 · סוסים 6 · מטילות 2
--     absent 2
--
-- 139 of 141 name a real species. So this is a data migration, not a research
-- project.
--
-- WHY NOT CONVERT THE ENUM. Three tables use pet_type and 65 frontend files
-- read it. Converting in one step is a big-bang refactor of working code to get
-- a column that nothing reads yet. This is additive instead - a new table and a
-- new nullable column, backfilled - and pet_type is left exactly as it is. That
-- is the pattern this codebase already established when /api/catalog was added
-- ALONGSIDE /api/products rather than instead of it, for the same reason:
-- switching the thing customers use, on the day the replacement first exists,
-- is how a shop empties.
--
-- pet_type stays authoritative until something reads species_id. Nothing in
-- this migration changes a single existing value.

create table if not exists public.pet_species (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    constraint pet_species_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_he text not null
    constraint pet_species_name_present check (btrim(name_he) <> ''),
  name_en text,
  icon text,

  -- The bridge back. Which pet_type value a product of this species would have
  -- carried, so a query can still answer in the old vocabulary while the
  -- frontend migrates, and so the backfill below can work in both directions.
  legacy_pet_type public.pet_type,

  -- D-4: צאן ובקר, סוסים and מטילות are farm animals, not pets, and were
  -- decided out of scope for phase 1. Flagged rather than omitted, so those 18
  -- products keep a real species and "add later" is a filter change rather than
  -- a second migration.
  is_farm boolean not null default false,

  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_pet_species_active
  on public.pet_species (is_active, position);

-- The spellings the importer actually writes, mapped to a species. Exactly the
-- shape of product_category_aliases, and for the same reason: the import
-- vocabulary is not the catalogue vocabulary, and pretending otherwise is what
-- left 241 products unfiled over a hyphen.
create table if not exists public.pet_species_aliases (
  alias text primary key
    constraint pet_species_aliases_normalized check (alias = lower(btrim(alias))),
  species_id uuid not null references public.pet_species(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_pet_species_aliases_species
  on public.pet_species_aliases (species_id);

-- ── The species in use ──────────────────────────────────────────────────────
-- Taken from C-13's measured vocabulary, not from a list of animals somebody
-- thought of. Nothing here is aspirational: every row below has products.
insert into public.pet_species (slug, name_he, name_en, icon, legacy_pet_type, is_farm, position)
values
  ('dog',      'כלב',       'Dog',      '🐕', 'dog',   false, 10),
  ('cat',      'חתול',      'Cat',      '🐈', 'cat',   false, 20),
  ('parrot',   'תוכים',     'Parrots',  '🦜', 'other', false, 30),
  ('rodent',   'מכרסם',     'Rodents',  '🐹', 'other', false, 40),
  ('poultry',  'עופות',     'Poultry',  '🐓', 'other', true,  50),
  ('horse',    'סוסים',     'Horses',   '🐴', 'other', true,  60),
  ('cattle',   'צאן ובקר',  'Livestock','🐄', 'other', true,  70),
  ('layer-hen','מטילות',    'Layer hens','🥚','other', true,  80)
on conflict (slug) do nothing;

insert into public.pet_species_aliases (alias, species_id)
select lower(btrim(seed.alias)), s.id
from (values
  ('כלב', 'dog'), ('כלבים', 'dog'), ('dog', 'dog'), ('dogs', 'dog'),
  ('חתול', 'cat'), ('חתולים', 'cat'), ('cat', 'cat'), ('cats', 'cat'),
  ('תוכים', 'parrot'), ('תוכי', 'parrot'), ('parrot', 'parrot'),
  ('מכרסם', 'rodent'), ('מכרסמים', 'rodent'), ('rodent', 'rodent'),
  ('עופות', 'poultry'), ('poultry', 'poultry'),
  ('סוסים', 'horse'), ('סוס', 'horse'), ('horse', 'horse'),
  ('צאן ובקר', 'cattle'), ('בקר', 'cattle'), ('צאן', 'cattle'),
  ('מטילות', 'layer-hen')
) as seed(alias, slug)
join public.pet_species s on s.slug = seed.slug
on conflict (alias) do nothing;

-- ── The column ──────────────────────────────────────────────────────────────
-- Nullable, no default, no foreign-key cascade that could delete a product.
-- NULL means "no species recorded", which is a true statement about the 7
-- products that genuinely have none, and is not the same as 'other'.
alter table public.business_products
  add column if not exists species_id uuid references public.pet_species(id) on delete restrict;
alter table public.product_drafts
  add column if not exists species_id uuid references public.pet_species(id) on delete restrict;
alter table public.catalog_products
  add column if not exists species_id uuid references public.pet_species(id) on delete restrict;

create index if not exists idx_business_products_species
  on public.business_products (species_id) where species_id is not null;
create index if not exists idx_catalog_products_species
  on public.catalog_products (species_id) where species_id is not null;

-- ── Backfill ────────────────────────────────────────────────────────────────
--
-- Two sources, in order of precision. C-14 showed they are complementary rather
-- than contradictory: where both exist they agree (dog/כלב 94, cat/חתול 32),
-- and each covers rows the other does not.
--
-- 1. The 'animal' attribute, which is the only thing that distinguishes a
--    parrot from a hamster. Resolved through the alias table.
--
-- The markers below are load-bearing: petSpeciesBackfill.test.js extracts the
-- text between them and runs it against a fixture of the measured production
-- cross-tab. The test therefore proves THIS text, not a copy of it that can
-- drift. Each step is delimited separately so the test can falsify one by
-- omitting it. Do not remove or renumber them without updating that test.
-- BACKFILL-STEP-1-BEGIN
insert into public.pet_species_aliases (alias, species_id)
select distinct lower(btrim(p.product_attributes ->> 'animal')), s.id
  from public.business_products p
  join public.pet_species s on s.name_he = btrim(p.product_attributes ->> 'animal')
 where btrim(coalesce(p.product_attributes ->> 'animal', '')) <> ''
on conflict (alias) do nothing;

update public.business_products p
   set species_id = a.species_id
  from public.pet_species_aliases a
 where p.species_id is null
   and a.alias = lower(btrim(p.product_attributes ->> 'animal'));
-- BACKFILL-STEP-1-END

-- 2. pet_type, for the rows with no attribute. Only 'dog' and 'cat' carry a
--    species: 'other' does not name one, and 'all' is not a species at all - a
--    product for every pet has no species, and giving it one would be inventing
--    a fact. Those rows keep NULL, which is the honest answer.
-- BACKFILL-STEP-2-BEGIN
update public.business_products p
   set species_id = s.id
  from public.pet_species s
 where p.species_id is null
   and p.pet_type in ('dog', 'cat')
   and s.legacy_pet_type = p.pet_type
   and s.slug = p.pet_type::text;
-- BACKFILL-STEP-2-END

comment on column public.business_products.species_id is
  'The species this product is for. Backfilled from the import''s animal attribute, falling back to pet_type for dog and cat. NULL where none is recorded - including pet_type = all, which is not a species. pet_type is left untouched and stays authoritative until something reads this.';

comment on column public.pet_species.is_farm is
  'Farm animals, decided out of scope for phase 1 of the catalogue migration (D-4). Flagged rather than omitted so the products keep a real species and including them later is a filter change.';
