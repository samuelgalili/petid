create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  type text not null default 'general',
  category text,
  title text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  action_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pet_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  document_type text not null default 'other',
  title text not null,
  description text,
  file_url text not null,
  file_name text not null,
  file_size integer,
  content_type text,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pet_vet_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  visit_date date,
  clinic_name text,
  vet_name text,
  reason text,
  diagnosis text,
  treatment text,
  notes text,
  vaccines jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pet_vaccinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  vaccine_name text not null,
  administered_at date,
  expires_at date,
  veterinarian text,
  batch_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_user_unread on public.notifications(user_id, is_read, created_at desc);
create index if not exists idx_pet_documents_user_uploaded on public.pet_documents(user_id, uploaded_at desc);
create index if not exists idx_pet_documents_pet_uploaded on public.pet_documents(pet_id, uploaded_at desc);
create index if not exists idx_pet_documents_type on public.pet_documents(document_type);
create index if not exists idx_pet_vet_visits_pet_date on public.pet_vet_visits(pet_id, visit_date desc nulls last, created_at desc);
create index if not exists idx_pet_vaccinations_pet_expires on public.pet_vaccinations(pet_id, expires_at asc nulls last);
