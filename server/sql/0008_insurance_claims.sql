create table if not exists public.insurance_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  pet_name text,
  pet_microchip text,
  owner_name text,
  owner_id_number text,
  clinic_name text,
  visit_date date,
  diagnosis text,
  treatment text,
  total_amount numeric(10,2),
  paid_amount numeric(10,2),
  status text not null default 'pending',
  status_note text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_insurance_claims_user_submitted
  on public.insurance_claims(user_id, submitted_at desc);

create index if not exists idx_insurance_claims_pet_submitted
  on public.insurance_claims(pet_id, submitted_at desc);
