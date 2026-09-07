-- 0019_profile_identity_dedup.sql
-- Gives core identity a single owner.
--
-- email, full_name, phone and birthdate exist in BOTH app_users and profiles.
-- Application code keeps them in step through three pushApp() calls in one
-- function; nothing in the database enforces it. Any future write path that
-- misses those calls breaks the agreement silently.
--
-- After this migration app_users owns identity, and profiles is a focused
-- extension: address, privacy, consent, social. first_name and last_name stay
-- in profiles as display fields.
--
-- Deploy the code changes in 0019_code_changes.md in the same release, or
-- before this runs: dropping a column a live query still selects breaks it
-- immediately.

-- Steps 1 and 2 read columns this migration removes, so they are guarded and
-- executed dynamically — that keeps a second run a clean no-op.
do $$
declare
  conflicts integer;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'profiles'
      and column_name  = 'full_name'
  ) then
    raise notice 'identity dedup: already applied, nothing to backfill';
    return;
  end if;

  -- 1. Carry across any value that exists only on profiles. Under current code
  --    these are already equal; this covers rows written before the sync
  --    existed, and anything imported.
  execute $q$
    update public.app_users au
    set full_name  = coalesce(au.full_name, p.full_name),
        phone      = coalesce(au.phone,     p.phone),
        birthdate  = coalesce(au.birthdate, p.birthdate),
        updated_at = now()
    from public.profiles p
    where p.id = au.id
      and (
           (au.full_name is null and p.full_name is not null)
        or (au.phone     is null and p.phone     is not null)
        or (au.birthdate is null and p.birthdate is not null)
      )
  $q$;

  -- 2. Report real disagreements rather than discarding them silently.
  execute $q$
    select count(*)
    from public.app_users au
    join public.profiles p on p.id = au.id
    where (au.full_name is distinct from p.full_name)
       or (au.phone     is distinct from p.phone)
       or (au.birthdate is distinct from p.birthdate)
       or (lower(au.email) is distinct from lower(p.email))
  $q$ into conflicts;

  if conflicts > 0 then
    raise warning
      'identity dedup: % row(s) disagreed between app_users and profiles; app_users kept as authoritative',
      conflicts;
  else
    raise notice 'identity dedup: no disagreements found';
  end if;
end
$$;

-- 3. The identity columns go. customer_identities (0017) no longer reads
--    profiles, so nothing depends on them.
alter table public.profiles
  drop column if exists email,
  drop column if exists full_name,
  drop column if exists phone,
  drop column if exists birthdate;

-- app_users.email is already unique; profiles carried a second, now removed.
