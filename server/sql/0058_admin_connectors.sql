-- Connectors: a third party's credential, held by us.
--
-- This is Phase 7, which was blocked on D-4 until secretStore.js existed. The
-- shape of this table is downstream of that decision and of one rule in
-- particular: THE SECRET IS NEVER A COLUMN A HUMAN READS.
--
-- `secret` is the sealed record from secretStore.encryptSecret - {v, provider,
-- iv, tag, ct} - and nothing else in this table is derived from it. Every
-- column an admin screen shows (provider, label, status, last_verified_at,
-- last_error) can be read without decrypting anything, which is what makes it
-- possible to honour D-4's "never a secret, not even masked from the server
-- side".
--
-- WHY `settings` IS A COLUMN AND NOT A CONSTANT. A provider's base URL and API
-- version live here rather than in code because getting them wrong is a
-- support incident, not a bug: the owner sees "401" and concludes their key is
-- bad. Stored, they are fixable from the admin screen in a minute instead of a
-- deploy. They are NOT secret and are returned to the client.

create table if not exists public.admin_connectors (
  id uuid primary key default gen_random_uuid(),

  -- One connection per provider for now. A second Runway account is a real
  -- thing to want, and when it is wanted this unique constraint is the
  -- decision to revisit rather than a surprise.
  provider text not null unique,

  -- What the owner calls this connection. Never the account's own name pulled
  -- from the provider, because we would then be showing something we cannot
  -- verify is current.
  label text,

  -- The sealed record. NULL means "configured but not connected", which is a
  -- real state: settings can be fixed before a key is pasted.
  secret jsonb,

  -- Non-secret, editable, returned to the client.
  settings jsonb not null default '{}'::jsonb,

  -- 'connected' | 'error' | 'unverified'. Free text rather than an enum
  -- because a provider may report a state we have not met yet, and an enum
  -- turns that into a failed insert instead of a visible status.
  status text not null default 'unverified',

  -- What the last verification actually said. The message a provider returns
  -- is the single most useful thing on this screen and it was the thing most
  -- likely to be swallowed.
  last_error text,
  last_verified_at timestamptz,

  -- Who connected it. An audit row exists too; this is here so the screen can
  -- show it without joining the log.
  created_by uuid references public.admin_users(id) on delete set null,
  updated_by uuid references public.admin_users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.admin_connectors.secret is
  'Sealed by server/src/secretStore.js. Never selected into a response. Never logged.';

comment on column public.admin_connectors.settings is
  'Non-secret provider configuration (base url, api version). Safe to return to the client.';

create index if not exists idx_admin_connectors_status
  on public.admin_connectors (status);
