-- 0024_email_verification.sql
-- Proves that the person who registered actually holds the address they gave.
--
-- Nothing checked this before: an account could be opened with somebody else's
-- email, and every order confirmation and document would then be delivered to
-- a person who never asked for them.
--
-- Modelled on password_reset_otps deliberately, down to being keyed by email:
-- the same shape, the same hashing, one code that is both typed and carried in
-- a link. Changing the account email leaves the old row stranded rather than
-- silently verifying the new address.

alter table public.app_users
  add column if not exists email_verified_at timestamptz,
  add column if not exists email_verification_last_sent_at timestamptz;

create table if not exists public.email_verification_otps (
  email text primary key,
  user_id uuid not null references public.app_users(id) on delete cascade,
  otp_hash text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_verification_otps_expires
  on public.email_verification_otps(expires_at);

create index if not exists idx_email_verification_otps_user
  on public.email_verification_otps(user_id);

-- Everyone who registered before this has no proof either way, and inventing
-- one would defeat the point. Null says "never asked", and this index makes
-- those accounts findable when someone decides what to do about them.
create index if not exists idx_app_users_email_unverified
  on public.app_users (created_at desc)
  where email_verified_at is null;
