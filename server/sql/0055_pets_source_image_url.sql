-- 0055_pets_source_image_url.sql
--
-- Q4 Gate2 / Design D-Q4 v0.1: the uploaded source photo is a separate
-- column from Master (pets.avatar_url).
--
-- QR center image uses this column only. Hero stays on avatar_url.
-- Nullable on purpose: existing pets are not backfilled. A pet that has a
-- Master but no source shows the type icon in QR, never avatar_url.
--
-- Do not copy pets.avatar_url into this column here. Do not read
-- pet_characters.identity_image_key.

alter table public.pets
  add column if not exists source_image_url text;

comment on column public.pets.source_image_url is
  'Uploaded source photo for QR (http(s), site-relative /…, or data:image/*). Written on first photo / onboarding persist. Updating Master (avatar_url) must not overwrite this. Null for legacy pets — no backfill.';
