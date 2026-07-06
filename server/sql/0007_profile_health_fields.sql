alter table public.profiles
  add column if not exists street text,
  add column if not exists city text,
  add column if not exists id_number_last4 text;

alter table public.pets
  add column if not exists has_insurance boolean,
  add column if not exists insurance_company text,
  add column if not exists insurance_expiry_date date,
  add column if not exists current_food text,
  add column if not exists last_vet_visit date,
  add column if not exists next_vet_visit date,
  add column if not exists vet_clinic text,
  add column if not exists vet_clinic_name text,
  add column if not exists vet_clinic_phone text,
  add column if not exists vet_clinic_address text,
  add column if not exists microchip_number text,
  add column if not exists color text,
  add column if not exists is_dangerous_breed boolean not null default false,
  add column if not exists license_conditions text,
  add column if not exists license_expiry_date date;

alter table public.pet_vet_visits
  add column if not exists visit_type text,
  add column if not exists next_visit_date date,
  add column if not exists is_recovery_mode boolean not null default false,
  add column if not exists recovery_until date,
  add column if not exists raw_summary text,
  add column if not exists cost numeric(10,2);

create index if not exists idx_pet_vet_visits_recovery
  on public.pet_vet_visits(pet_id, is_recovery_mode, recovery_until)
  where is_recovery_mode = true;

create index if not exists idx_pet_vet_visits_next_visit
  on public.pet_vet_visits(pet_id, next_visit_date)
  where next_visit_date is not null;
