alter table public.app_users
  add column if not exists legacy_auth_provider text,
  add column if not exists legacy_user_id uuid,
  add column if not exists password_reset_required boolean not null default false,
  add column if not exists password_reset_last_requested_at timestamptz,
  add column if not exists imported_at timestamptz;

create table if not exists public.password_reset_otps (
  email text primary key,
  otp_hash text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_password_reset_otps_expires
  on public.password_reset_otps(expires_at);

alter table public.profiles
  add column if not exists points integer not null default 0,
  add column if not exists location_blur_enabled boolean,
  add column if not exists profile_visibility text,
  add column if not exists show_location boolean,
  add column if not exists show_email boolean,
  add column if not exists allow_messages_from text,
  add column if not exists favorite_breeds text[],
  add column if not exists interests text[],
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_by uuid,
  add column if not exists blocked_reason text,
  add column if not exists last_active_at timestamptz,
  add column if not exists show_activity_status boolean,
  add column if not exists quiet_mode_until timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists is_online boolean,
  add column if not exists region text,
  add column if not exists house_number text,
  add column if not exists apartment_number text,
  add column if not exists building_code text,
  add column if not exists postal_code text,
  add column if not exists id_number_encrypted text,
  add column if not exists ai_consent_given boolean,
  add column if not exists ai_consent_date timestamptz,
  add column if not exists marketing_consent boolean,
  add column if not exists marketing_consent_date timestamptz,
  add column if not exists marketing_unsubscribed_at timestamptz,
  add column if not exists consent_method text;

alter table public.pets
  add column if not exists age integer,
  add column if not exists weight_unit text,
  add column if not exists insurance_policy_number text,
  add column if not exists vet_name text,
  add column if not exists vet_phone text,
  add column if not exists size text,
  add column if not exists current_mood text,
  add column if not exists mood_score integer,
  add column if not exists mood_updated_at timestamptz,
  add column if not exists license_number text,
  add column if not exists license_renewal_date date,
  add column if not exists is_lost boolean not null default false,
  add column if not exists lost_since timestamptz,
  add column if not exists lost_reward_text text,
  add column if not exists lost_temperament text,
  add column if not exists lost_medication_note text,
  add column if not exists lost_allergy_note text,
  add column if not exists lost_show_phone boolean not null default false,
  add column if not exists lost_contact_phone text;

create table if not exists public.breed_information (
  id uuid primary key default gen_random_uuid(),
  breed_name text not null,
  breed_name_he text,
  pet_type text not null,
  description text,
  description_he text,
  origin_country text,
  size_category text,
  weight_range_kg text,
  height_range_cm text,
  life_expectancy_years text,
  temperament text[],
  temperament_he text[],
  exercise_needs text,
  grooming_needs text,
  health_issues text[],
  health_issues_he text[],
  dietary_notes text,
  training_difficulty text,
  good_with_children boolean,
  good_with_other_pets boolean,
  apartment_friendly boolean,
  source_references text[],
  image_url text,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  affection_family integer,
  kids_friendly integer,
  dog_friendly integer,
  shedding_level integer,
  grooming_freq integer,
  drooling_level integer,
  stranger_openness integer,
  playfulness integer,
  watchdog_nature integer,
  trainability integer,
  energy_level integer,
  barking_level integer,
  mental_needs integer
);

create index if not exists idx_breed_information_pet_type
  on public.breed_information(pet_type, is_active);

create table if not exists public.dog_parks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  address text not null,
  latitude numeric,
  longitude numeric,
  google_maps_link text,
  status text not null default 'active',
  size text,
  fencing boolean,
  water boolean,
  shade boolean,
  agility boolean,
  parking boolean,
  lighting boolean,
  notes text,
  source text,
  verified boolean,
  rating numeric,
  total_reviews integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create index if not exists idx_dog_parks_city
  on public.dog_parks(city);
