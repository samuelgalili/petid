-- 0039_backfill_pet_weight.sql
-- The one backfill this sprint performs, and the reasons it is only one.
--
-- pets.weight is a number an owner typed. It is unambiguous, it is canonical,
-- and 51-EXISTING-TARGET-MAPPING.md names it explicitly. Everything else on the
-- pets row that could become a fact needs a judgement the data cannot support:
--   * medical_conditions text[] would need each element split into its own
--     condition with an onset nobody recorded
--   * personality_tags would need "energetic" turned into an ordinal, which is
--     an invented number
--   * current_food would need a text name matched to a catalogue product, and a
--     near match is how a recommendation ends up about a food the animal does
--     not eat
-- Those wait for the sprint that gives them a writer and a review path.
--
-- Honesty rules applied here, from 51:
--   1. Never invent an observed_at. The real measurement date is unknown, so
--      updated_at is used and the confidence is MEDIUM, not HIGH. Pretending to
--      a date would be a lie told in the provenance layer, which is the one
--      place a lie is unrecoverable.
--   2. Never infer a source. Everything from pets is USER_PROVIDED.
--   3. Idempotent: re-running inserts nothing.
--   4. Reversible: every row carries source_id 'backfill@0039', so the whole
--      backfill is one delete away.
--
-- Rollback:
--   delete from public.pet_facts where source_id = 'backfill@0039';
--   delete from public.pet_observations where source_id = 'backfill@0039';
--
-- Out-of-range weights are deliberately skipped rather than clamped. A 0 or a
-- 900 kg dog is a data-entry error, and importing it as a fact would give it a
-- provenance it has not earned; it stays on pets.weight where it is today, for
-- a human to look at.

-- The observations first: the fact points at one through derived_from.
insert into public.pet_observations (
  pet_id, observation_type, value_number, unit,
  source_value, source_unit, measured_at, recorded_at,
  source_type, source_id, method, confidence, note
)
select
  p.id,
  'weight',
  round(p.weight * 1000),        -- kg, the unit the column has always assumed
  'g',
  p.weight,
  'kg',
  p.updated_at,
  now(),
  'USER_PROVIDED',
  'backfill@0039',
  'manual',
  'MEDIUM',
  'Imported from pets.weight; the measurement date is unknown and updated_at stands in for it.'
from public.pets p
where p.weight is not null
  and p.weight > 0
  and p.weight <= 120
  and not exists (
    select 1 from public.pet_observations o
    where o.pet_id = p.id and o.source_id = 'backfill@0039'
  );

-- Then the current fact, one per pet, only where the pet has no open weight
-- fact already. A value written through the API since this migration was
-- authored is newer and better sourced, and must not be superseded by an
-- import.
insert into public.pet_facts (
  pet_id, definition_id, namespace, key, value_type,
  value_number, unit,
  source_type, source_id, source_channel,
  confidence, verification_status,
  observed_at, effective_from, effective_to, status,
  derived_from
)
select
  p.id,
  d.id,
  'physical',
  'weight',
  'number',
  o.value_number,
  'g',
  'USER_PROVIDED',
  'backfill@0039',
  'SYSTEM',
  'MEDIUM',
  'UNVERIFIED',
  o.measured_at,
  o.measured_at,
  null,
  'CURRENT',
  jsonb_build_array('pet_observations:' || o.id::text)
from public.pets p
join public.pet_observations o
  on o.pet_id = p.id and o.source_id = 'backfill@0039' and o.observation_type = 'weight'
join public.pet_fact_definitions d
  on d.namespace = 'physical' and d.key = 'weight'
where not exists (
    select 1 from public.pet_facts f
    where f.pet_id = p.id
      and f.namespace = 'physical'
      and f.key = 'weight'
      and f.effective_to is null
  );
