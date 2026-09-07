-- Keeps a copy of the identity columns 0019 is about to drop.
--
-- 0019 moves email, full_name, phone and birthdate from profiles to app_users
-- and then drops them. It backfills first and warns about disagreements, so
-- almost nothing is lost — but "almost" is doing real work in that sentence,
-- and a dropped column cannot be un-dropped. This runs first and writes the
-- four values somewhere they survive, so the release is recoverable without
-- depending on a hand-run backup.
--
-- Named so it sorts after 0018_external_refs.sql and before 0019. The runner
-- only accepts files matching ^\d+_ , so the prefix stays purely numeric: a
-- name like "0018a_" is skipped silently, which is how this file failed the
-- first time it was written.
--
-- Once the release has been confirmed good this table can be dropped; it holds
-- personal data that no longer has a purpose:
--   drop table public.profiles_identity_snapshot;
do $$
begin
  -- Nothing to snapshot once 0019 has run, which keeps a second run a no-op.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'profiles'
      and column_name  = 'full_name'
  ) then
    raise notice 'identity snapshot: profiles has already been deduplicated, nothing to copy';
    return;
  end if;

  create table if not exists public.profiles_identity_snapshot (
    id uuid primary key,
    email text,
    full_name text,
    phone text,
    birthdate date,
    captured_at timestamptz not null default now()
  );

  execute $q$
    insert into public.profiles_identity_snapshot (id, email, full_name, phone, birthdate)
    select p.id, p.email, p.full_name, p.phone, p.birthdate
    from public.profiles p
    on conflict (id) do nothing
  $q$;

  raise notice 'identity snapshot: % profile row(s) copied before 0019 drops the columns',
    (select count(*) from public.profiles_identity_snapshot);
end
$$;

comment on table public.profiles_identity_snapshot is
  'Identity columns copied from profiles immediately before 0019 dropped them. Safe to drop once the release is confirmed.';
