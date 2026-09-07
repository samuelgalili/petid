-- 0029_pet_character_identity_image.sql
--
-- Keeps the photo the avatar was built from.
--
-- Today the uploaded photos are deleted as soon as the candidates are
-- generated (processPetCharacterCandidates ends with deletePetCharacterFiles
-- over the source keys). The consequence is that regenerating an avatar - after
-- a failure, or because the owner wants a different one - forces them to find
-- and upload the photo again. If they no longer have it, the avatar they had is
-- the only one they can ever have.
--
-- The uploaded photo is the identity reference: it is what says this is *this*
-- pet rather than another one of the same breed. It belongs alongside the
-- character, not in a temporary working set.
--
-- source_storage_keys stays what it is - the in-flight upload batch, cleared
-- when the job finishes. This column is the one that survives.

alter table public.pet_characters
  add column if not exists identity_image_key text;

comment on column public.pet_characters.identity_image_key is
  'The retained source photo the avatar was generated from, so it can be regenerated without re-uploading. Lives in the private pet-characters upload directory.';
