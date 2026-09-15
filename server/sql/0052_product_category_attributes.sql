-- 0052_product_category_attributes.sql
-- What a category's products are supposed to have, declared rather than assumed.
--
-- The product page has three bands. The first is a contract every product keeps
-- - gallery, name, brand, price, availability, SKU, category, description,
-- "נמכר על ידי" - and the new model already guarantees it structurally, because
-- the publication gate refuses anything missing a variant, a priced offer,
-- availability or an approved image.
--
-- The second band is the one that varies, and nothing in the schema described
-- it. product_categories holds slug, name_he, icon and parent_id - presentation
-- metadata with no field definitions - while catalog_products.attributes is
-- unvalidated jsonb. So nothing said that a food product has ingredients and a
-- life stage while a toy has a material and a size, and a page built on that
-- renders whatever survived the import.
--
-- THE RULE THIS TABLE EXISTS TO ENFORCE: a field renders "לא צוין" only when
-- its category declared it required. Otherwise it is omitted entirely. A chew
-- toy never shows a calorie row. That sentence was already a comment in
-- ProductDetailAws.tsx before any of this; the table is what makes it true of
-- every category rather than of the two hard-coded lists it had.
--
-- is_required MUST be set from measured fill rates, not from what sounds
-- natural. C-0 measured production on 2026-09-15: kcal_per_kg is populated on
-- THREE products out of 375. Required, it would render "לא צוין" on 99.2% of
-- pages - more absurd, not more consistent. In dry-food (226 products) nothing
-- clears 59%, so on today's data that category requires nothing beyond the
-- universal band. The seeds at the bottom reflect exactly that.

create table if not exists public.product_category_attributes (
  id uuid primary key default gen_random_uuid(),

  category_id uuid not null
    references public.product_categories(id) on delete cascade,

  -- The key inside catalog_products.attributes. Constrained to the same shape
  -- as an alias so a key cannot arrive with a stray space or a capital that
  -- silently makes it a different key from the one the importer writes.
  key text not null
    constraint product_category_attributes_key_shape
      check (key = lower(btrim(key)) and length(key) between 1 and 80),

  label_he text not null
    constraint product_category_attributes_label_present
      check (btrim(label_he) <> ''),

  -- What kind of value the key holds. The page renders by type: a number gets
  -- its unit, an enum gets a chip, a list gets chips, richtext gets a block.
  value_type text not null
    check (value_type in ('text', 'number', 'boolean', 'enum', 'list', 'richtext')),

  -- Only meaningful for number. Kept as free text because 'kcal/kg', 'g' and
  -- 'ק״ג' are all real and none of them is an enum worth maintaining.
  unit text,

  -- Only meaningful for enum. NOT NULL-checked below rather than by convention:
  -- an enum with no values is a field nobody can ever fill.
  enum_values text[],

  -- The whole point. See the header: set this from a fill rate, never from
  -- intuition.
  is_required boolean not null default false,

  -- Whether this attribute distinguishes one variant from another (size,
  -- flavour, colour) rather than describing the product as a whole. C-16/C-17
  -- established that the legacy data carries NO variant grouping - family_code
  -- turned out to be a merchandising family, not a variant set - so nothing is
  -- seeded as a variant axis. This exists for the intake wizard to use when a
  -- human builds a real variant set later.
  is_variant_axis boolean not null default false,

  display_group text
    check (display_group is null or display_group in ('specs', 'nutrition', 'usage', 'care')),
  position integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One definition per key per category. Two would mean two labels for one
  -- field and a page that renders whichever the query happened to return first.
  constraint product_category_attributes_unique_key unique (category_id, key),

  -- An enum must offer something to choose from.
  constraint product_category_attributes_enum_has_values
    check (value_type <> 'enum' or (enum_values is not null and array_length(enum_values, 1) > 0)),

  -- A unit describes a number. On anything else it is decoration that would
  -- render as "black kg".
  constraint product_category_attributes_unit_needs_number
    check (unit is null or value_type = 'number'),

  -- A variant axis has to be a value you can pick between. A richtext variant
  -- axis is not a thing, and a boolean one is a checkbox pretending to be a
  -- size.
  constraint product_category_attributes_axis_is_choosable
    check (not is_variant_axis or value_type in ('text', 'enum', 'number'))
);

create index if not exists idx_product_category_attributes_category
  on public.product_category_attributes (category_id, position, key);

-- The publication gate reads this to find what a category insists on, so the
-- lookup it does - required attributes for one category - gets its own partial
-- index rather than filtering the whole table each time.
create index if not exists idx_product_category_attributes_required
  on public.product_category_attributes (category_id)
  where is_required;

-- ── Inheritance ─────────────────────────────────────────────────────────────
--
-- Attributes inherit down the category tree. מזון declares ingredients and life
-- stage; מזון לכלבים adds dog size and keeps both. Without this every child
-- would restate its parent's fields and they would drift apart the first time
-- one was edited.
--
-- A child may override a parent's definition by declaring the same key - a
-- narrower label, a different enum, or making an optional parent field required
-- locally. The nearest definition wins, which is why depth is returned.
create or replace function public.category_attributes_effective(target_category uuid)
returns table (
  category_id uuid,
  key text,
  label_he text,
  value_type text,
  unit text,
  enum_values text[],
  is_required boolean,
  is_variant_axis boolean,
  display_group text,
  -- Quoted: `position` is a reserved word in a RETURNS TABLE list, where
  -- PostgreSQL reads it as the position(x in y) function and fails to parse.
  -- It parses unquoted in the table definition above, which is exactly the kind
  -- of inconsistency that makes this worth a comment rather than a silent fix.
  "position" integer,
  depth integer
)
language sql
stable
as $$
  with recursive ancestry as (
    select c.id, c.parent_id, 0 as depth
      from public.product_categories c
     where c.id = target_category
    union all
    select p.id, p.parent_id, a.depth + 1
      from public.product_categories p
      join ancestry a on a.parent_id = p.id
  )
  select distinct on (att.key)
         att.category_id, att.key, att.label_he, att.value_type, att.unit,
         att.enum_values, att.is_required, att.is_variant_axis,
         att.display_group, att.position, ancestry.depth
    from ancestry
    join public.product_category_attributes att on att.category_id = ancestry.id
   -- Nearest ancestor first, so a child's own definition overrides its parent's.
   order by att.key, ancestry.depth, att.position;
$$;

comment on function public.category_attributes_effective(uuid) is
  'Attributes that apply to a category, including those inherited from its ancestors. A child declaring the same key overrides the parent: the nearest definition wins.';

comment on column public.product_category_attributes.is_required is
  'Whether a product in this category must carry this attribute to publish, and whether the page shows "לא צוין" when it is absent. Set from measured fill rates - C-0 found kcal_per_kg on 3 of 375 products, which is why it is required nowhere.';

-- ── Seeds ───────────────────────────────────────────────────────────────────
--
-- Every attribute below is OPTIONAL. That is not caution, it is what the
-- measurement says: in the largest category nothing clears 59% and most fields
-- sit under 20%. Marking any of them required today would put "לא צוין" on the
-- majority of pages in that category.
--
-- These seed the vocabulary and the labels so the page renders consistently
-- where a value does exist. Requiring them is a later decision, made per
-- category once the intake wizard is filling them.
insert into public.product_category_attributes
  (category_id, key, label_he, value_type, unit, enum_values, display_group, position)
select c.id, seed.key, seed.label_he, seed.value_type, seed.unit, seed.enum_values,
       seed.display_group, seed.position
from (values
  -- Food, inherited by אוכל יבש and אוכל רטוב.
  ('food', 'ingredients',  'רכיבים',          'richtext', null, null,                                    'nutrition', 10),
  ('food', 'life_stage',   'שלב חיים',        'enum',     null, array['גור','בוגר','מבוגר','כל הגילאים'], 'usage',     20),
  ('food', 'kcal_per_kg',  'קלוריות לק״ג',    'number',   'kcal/kg', null,                               'nutrition', 30),
  ('food', 'special_diet', 'תזונה מיוחדת',    'list',     null, null,                                    'nutrition', 40),
  ('food', 'weight',       'משקל',            'number',   'ק״ג', null,                                   'specs',     50),
  ('food', 'dog_size',     'גודל מומלץ',      'enum',     null, array['קטן','בינוני','גדול','ענק'],       'usage',     60),
  -- Treats.
  ('treats', 'ingredients', 'רכיבים',         'richtext', null, null,                                    'nutrition', 10),
  ('treats', 'flavor',      'טעם',            'text',     null, null,                                    'specs',     20),
  -- Toys.
  ('toys', 'material',      'חומר',           'text',     null, null,                                    'specs',     10),
  ('toys', 'size',          'גודל',           'enum',     null, array['קטן','בינוני','גדול'],            'specs',     20),
  -- Accessories.
  ('accessories', 'material', 'חומר',         'text',     null, null,                                    'specs',     10),
  ('accessories', 'color',    'צבע',          'text',     null, null,                                    'specs',     20),
  -- Grooming.
  ('grooming', 'volume',     'נפח',           'number',   'מ״ל', null,                                   'specs',     10),
  ('grooming', 'coat_type',  'סוג פרווה',     'text',     null, null,                                    'usage',     20),
  -- Health.
  ('health', 'active_ingredient', 'חומר פעיל', 'text',    null, null,                                    'specs',     10),
  ('health', 'dosage',            'מינון',     'richtext', null, null,                                   'usage',     20)
) as seed(slug, key, label_he, value_type, unit, enum_values, display_group, position)
join public.product_categories c on c.slug = seed.slug
on conflict (category_id, key) do nothing;
