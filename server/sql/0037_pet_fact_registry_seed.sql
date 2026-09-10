-- 0037_pet_fact_registry_seed.sql
-- The first fact keys.
--
-- A new fact key is a reviewed migration, exactly like a new column -- because
-- that is what it is. Nothing in the application creates a definition: there is
-- no API for it and no admin screen, and the write path rejects any
-- (namespace, key) that is not here.
--
-- This is the starter set, not the full dictionary. It covers the columns
-- docs/pet-intelligence/51-EXISTING-TARGET-MAPPING.md marks MOVE_TO_FACT and
-- MOVE_TO_TIME_SERIES, plus the two derived keys whose definitions the
-- foundation needs in order to prove that a user cannot write them. Everything
-- else in 46's namespace listing arrives with the sprint that gives it a
-- writer and a consumer -- an ACTIVE key nothing writes is a promise the
-- system cannot keep.
--
-- on conflict do nothing: re-running is a no-op, and changing a definition is
-- a new migration rather than an edit to this one.
--
-- Rollback: delete from public.pet_fact_definitions where introduced_in =
-- '0037' -- which fails, correctly, if any fact references a definition.

insert into public.pet_fact_definitions (
  namespace, key, value_type, unit, allowed_units, enum_values, ref_entity,
  cardinality, allowed_species, min_value, max_value,
  is_sensitive, is_derived, is_time_series, volatile,
  requires_source, requires_confirmation, decays, half_life_days,
  label_he, label_en, display_unit, rule_version, introduced_in
) values

-- physical -------------------------------------------------------------------

-- Grams, not kilograms: a budgerigar is 0.035 kg and 35 g, and only one of
-- those survives a rounding rule. Range is 1 g (a hatchling finch) to 120 kg.
-- Volatile: two weights are two truths about a changing quantity, so a later
-- one supersedes and never disputes.
('physical', 'weight', 'number', 'g', array['kg','g','lb','oz'], '{}', null,
 'single', '{}', 1, 120000,
 false, false, true, true,
 array['VET_CONFIRMED','VET_DOCUMENT','USER_PROVIDED','ACTIVITY_DERIVED'], false, false, null,
 'משקל', 'Weight', 'kg', null, '0037'),

('physical', 'target_weight', 'number', 'g', array['kg','g','lb','oz'], '{}', null,
 'single', '{}', 1, 120000,
 true, false, false, false,
 array['VET_CONFIRMED','VET_DOCUMENT'], false, false, null,
 'משקל יעד', 'Target weight', 'kg', null, '0037'),

-- Four states, no more. Clinical because it drives dietary advice, and for the
-- same reason a model must never infer it from a photo.
('physical', 'body_condition', 'enum', null, '{}',
 array['UNDERWEIGHT','IDEAL','OVERWEIGHT','OBESE'], null,
 'single', '{}', null, null,
 true, false, false, false,
 array['VET_CONFIRMED','VET_DOCUMENT'], true, false, null,
 'מצב גופני', 'Body condition', null, null, '0037'),

-- Derived, so exactly one writer: the rule engine. No writer exists yet; the
-- definition exists so that a user attempting to set it is rejected by the
-- registry rather than by a reviewer remembering.
('physical', 'size_band', 'enum', null, '{}',
 array['TOY','SMALL','MEDIUM','LARGE','GIANT'], null,
 'single', array['dog'], null, null,
 false, true, false, false,
 array['SYSTEM_DERIVED'], false, false, null,
 'קטגוריית גודל', 'Size band', null, 'size_band@2026-09-10', '0037'),

-- Defined for birds. pets.type is ('dog','cat','other') today, so nothing can
-- currently satisfy it -- which is the point: the key is registered and the
-- species gate rejects every write until a bird can exist.
('physical', 'wingspan', 'number', 'cm', array['cm','mm','in'], '{}', null,
 'single', array['bird'], 1, 300,
 false, false, false, false,
 array['USER_PROVIDED','VET_CONFIRMED','VET_DOCUMENT'], false, false, null,
 'מוטת כנפיים', 'Wingspan', 'cm', null, '0037'),

-- identity -------------------------------------------------------------------

-- Derived from species, birth date and size band. The one key that can carry a
-- future effective_to, so the SENIOR transition happens on the right day
-- without a scheduler -- which matters, because this system has none.
--
-- There is deliberately no identity.age. Age is arithmetic over one column and
-- is derived at read time by calculatePetAge; a stored age is the cautionary
-- tale this whole layer exists to avoid repeating.
('identity', 'life_stage', 'enum', null, '{}',
 array['PUPPY','KITTEN','JUNIOR','JUVENILE','ADULT','MATURE','SENIOR'], null,
 'single', '{}', null, null,
 false, true, false, false,
 array['SYSTEM_DERIVED'], false, false, null,
 'שלב חיים', 'Life stage', null, 'life_stage@2026-09-10', '0037'),

-- health ---------------------------------------------------------------------

('health', 'neuter_status', 'boolean', null, '{}', '{}', null,
 'single', '{}', null, null,
 true, false, false, false,
 array['VET_CONFIRMED','VET_DOCUMENT','USER_PROVIDED'], false, false, null,
 'עיקור/סירוס', 'Neuter status', null, null, '0037'),

-- One row per condition, each with its own onset, source and resolution. That
-- is exactly what pets.medical_conditions text[] cannot express.
('health', 'condition', 'string', null, '{}', '{}', null,
 'multi', '{}', null, null,
 true, false, false, false,
 array['VET_CONFIRMED','VET_DOCUMENT','USER_PROVIDED'], true, false, null,
 'מצב רפואי', 'Condition', null, null, '0037'),

-- Clinical, and never decays: an allergy does not fade because nobody
-- mentioned it for a year. Only a source can end it.
--
-- 46 specifies this as an enum over ingredient_terms.canonical_key. That table
-- does not exist, and an enum with no values would accept everything, so this
-- is registered as a string carrying normalized_value until the ingredient
-- vocabulary is built. See 55 for the conflict record.
('health', 'allergy', 'string', null, '{}', '{}', null,
 'multi', '{}', null, null,
 true, false, false, false,
 array['VET_CONFIRMED','VET_DOCUMENT','USER_PROVIDED'], true, false, null,
 'אלרגיה', 'Allergy', null, null, '0037'),

('health', 'note', 'string', null, '{}', '{}', null,
 'single', '{}', null, null,
 true, false, false, false,
 array['VET_CONFIRMED','VET_DOCUMENT','USER_PROVIDED'], false, false, null,
 'הערות בריאות', 'Health note', null, null, '0037'),

-- nutrition ------------------------------------------------------------------

-- A ref to the catalogue, which is the whole point: a food the system can
-- reason about, rather than a name it can only print.
('nutrition', 'current_food', 'ref', null, '{}', '{}', 'business_products',
 'single', '{}', null, null,
 false, false, false, true,
 array['USER_PROVIDED','VET_CONFIRMED','PURCHASE_DERIVED'], false, false, null,
 'מזון נוכחי', 'Current food', null, null, '0037'),

-- What the owner typed. Never guessed into a product ref -- an approximate
-- match to a catalogue item is how a recommendation ends up about a food the
-- animal does not eat.
('nutrition', 'current_food_text', 'string', null, '{}', '{}', null,
 'single', '{}', null, null,
 false, false, false, true,
 array['USER_PROVIDED','VET_DOCUMENT'], false, false, null,
 'מזון נוכחי (טקסט)', 'Current food (text)', null, null, '0037'),

-- behavior -------------------------------------------------------------------

-- The unmapped remainder of pets.personality_tags. A tag is a tag; turning
-- "energetic" into behavior.energy = 4 is an invented ordinal, and 51 forbids
-- guessing one.
('behavior', 'tag', 'string', null, '{}', '{}', null,
 'multi', '{}', null, null,
 false, false, false, false,
 array['USER_PROVIDED'], false, false, null,
 'תכונת אופי', 'Behaviour tag', null, null, '0037'),

-- preference -----------------------------------------------------------------

-- Decays: a preference recorded two years ago should not still rank products.
-- Computed at read time from observed_at and the half-life, because there is
-- no durable scheduler and a read-time computation cannot silently stop.
('preference', 'activity', 'string', null, '{}', '{}', null,
 'multi', '{}', null, null,
 false, false, false, false,
 array['USER_PROVIDED','PURCHASE_DERIVED','AI_INFERRED'], false, true, 365,
 'פעילות מועדפת', 'Preferred activity', null, null, '0037'),

-- insurance ------------------------------------------------------------------

('insurance', 'provider', 'string', null, '{}', '{}', null,
 'single', '{}', null, null,
 false, false, false, true,
 array['USER_PROVIDED'], false, false, null,
 'חברת ביטוח', 'Insurance provider', null, null, '0037'),

('insurance', 'policy_active', 'boolean', null, '{}', '{}', null,
 'single', '{}', null, null,
 false, false, false, true,
 array['USER_PROVIDED'], false, false, null,
 'ביטוח פעיל', 'Insurance active', null, null, '0037'),

('insurance', 'expiry', 'date', null, '{}', '{}', null,
 'single', '{}', null, null,
 false, false, false, true,
 array['USER_PROVIDED'], false, false, null,
 'תוקף ביטוח', 'Insurance expiry', null, null, '0037')

on conflict (namespace, key) do nothing;
