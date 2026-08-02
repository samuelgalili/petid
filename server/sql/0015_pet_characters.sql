create table if not exists public.pet_characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  status text not null default 'generating_candidates'
    check (status in ('generating_candidates', 'awaiting_selection', 'generating_pack', 'ready', 'failed')),
  style_key text not null default 'mipo-soft-character-v1',
  selected_candidate_key text,
  source_storage_keys jsonb not null default '[]'::jsonb,
  visual_identity jsonb not null default '{}'::jsonb,
  model text,
  generation_version integer not null default 1,
  error_code text,
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pet_id)
);

create table if not exists public.pet_character_assets (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.pet_characters(id) on delete cascade,
  asset_key text not null,
  asset_type text not null check (asset_type in ('candidate', 'expression')),
  storage_key text not null,
  content_type text not null,
  file_size integer not null,
  created_at timestamptz not null default now(),
  unique (character_id, asset_key)
);

create index if not exists idx_pet_characters_user_pet
  on public.pet_characters(user_id, pet_id);

create index if not exists idx_pet_characters_status
  on public.pet_characters(status, updated_at);

create index if not exists idx_pet_character_assets_character
  on public.pet_character_assets(character_id, asset_type, asset_key);
