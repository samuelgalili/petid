-- 0023_terms_acceptance.sql
-- Records that a person accepted the terms, when, and which version.
--
-- The version matters as much as the timestamp: terms change, and "they
-- agreed" is only meaningful if you can say what they agreed to. Without it
-- the column answers a question nobody asks.
--
-- Deliberately nullable. Everyone who registered before this migration never
-- saw a consent box, and backfilling a timestamp for them would be inventing
-- a consent that was never given. Null is the honest record of that, and it
-- also makes those accounts findable if they ever need to be asked.

alter table public.app_users
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

create index if not exists idx_app_users_terms_pending
  on public.app_users (created_at desc)
  where terms_accepted_at is null;
