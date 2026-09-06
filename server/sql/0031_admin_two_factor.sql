-- Mandatory two-factor authentication for every admin account.
--
-- The TOTP seed is written at the start of enrolment and confirmed by the first
-- correct code, so totp_enrolled_at (not the presence of a secret) is what marks
-- an account as protected. totp_last_used_step stores the RFC 6238 step a code
-- was accepted for, which is what makes a captured code unusable a second time
-- inside its own validity window.
alter table public.admin_users
  add column if not exists totp_secret_encrypted text,
  add column if not exists totp_enrolled_at timestamptz,
  add column if not exists totp_last_used_step bigint;

-- A session only becomes fully authenticated once the second factor is proven.
-- Until then it may reach the enrolment and verification routes and nothing else.
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
