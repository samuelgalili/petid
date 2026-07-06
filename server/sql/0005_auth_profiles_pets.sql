create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text,
  phone text,
  birthdate date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  user_agent text,
  ip_address text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists public.profiles (
  id uuid primary key references public.app_users(id) on delete cascade,
  email text not null unique,
  full_name text,
  first_name text,
  last_name text,
  bio text,
  phone text,
  whatsapp_number text,
  avatar_url text,
  birthdate date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('dog', 'cat', 'other')),
  breed text,
  secondary_breed text,
  is_mixed boolean not null default false,
  breed_confidence integer,
  avatar_url text,
  weight numeric(8,2),
  birth_date date,
  gender text,
  is_neutered boolean,
  medical_conditions text[],
  health_notes text,
  personality_tags text[],
  favorite_activities text[],
  activities text[],
  theme_color text,
  archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_users_email_lower on public.app_users(lower(email));
create index if not exists idx_user_sessions_token_hash on public.user_sessions(session_token_hash);
create index if not exists idx_user_sessions_user on public.user_sessions(user_id);
create index if not exists idx_user_sessions_expires_at on public.user_sessions(expires_at);
create index if not exists idx_profiles_email_lower on public.profiles(lower(email));
create index if not exists idx_pets_user_archived on public.pets(user_id, archived, created_at desc);
create index if not exists idx_pets_user_created on public.pets(user_id, created_at desc);
