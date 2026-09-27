-- Admin two-factor authentication. Additive only: new columns and a new
-- table, nothing dropped and no existing row rewritten.
--
-- The feature stays off until ADMIN_2FA_ENABLED is set, so these columns can
-- land in production before any admin is asked for a code. totp_enrolled_at
-- (not the presence of a secret) is what marks an account as enrolled: the
-- secret is written at the start of enrolment and confirmed by the first
-- correct code. totp_last_used_step stores the RFC 6238 step a code was
-- accepted for, so a captured code cannot be replayed inside its own window.
alter table public.admin_users
  add column if not exists totp_secret_encrypted text,
  add column if not exists totp_enrolled_at timestamptz,
  add column if not exists totp_last_used_step bigint;

-- Set when a session has proven the second factor. Ignored while the feature
-- flag is off, so a password session keeps working exactly as it does today.
alter table public.admin_sessions
  add column if not exists mfa_verified_at timestamptz;

create table if not exists public.admin_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_ip text
);

create index if not exists idx_admin_recovery_codes_unused
  on public.admin_recovery_codes(admin_user_id)
  where used_at is null;

create index if not exists idx_admin_sessions_mfa_verified_at
  on public.admin_sessions(mfa_verified_at);
