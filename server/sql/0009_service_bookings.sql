create table if not exists public.pet_service_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  service_type text not null,
  service_id text,
  service_name text not null,
  provider_name text,
  requested_date date,
  start_date date,
  end_date date,
  total_price numeric(10,2),
  status text not null default 'pending',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pet_service_bookings_user_created
  on public.pet_service_bookings(user_id, created_at desc);

create index if not exists idx_pet_service_bookings_pet_created
  on public.pet_service_bookings(pet_id, created_at desc);

create index if not exists idx_pet_service_bookings_type_status
  on public.pet_service_bookings(service_type, status);
