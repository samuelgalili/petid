alter table public.orders
  add column if not exists access_token_hash text,
  add column if not exists payment_url text;

create index if not exists idx_orders_access_token_hash
  on public.orders(access_token_hash)
  where access_token_hash is not null;

alter table public.pet_documents
  add column if not exists storage_key text;

create unique index if not exists idx_pet_documents_storage_key
  on public.pet_documents(storage_key)
  where storage_key is not null;

create index if not exists idx_pet_documents_file_url
  on public.pet_documents(file_url);

create table if not exists public.user_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  storage_key text not null unique,
  content_type text not null,
  file_size integer not null check (file_size > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_user_uploads_user_created
  on public.user_uploads(user_id, created_at desc);

update public.insurance_claims
set owner_id_number = case
  when length(regexp_replace(owner_id_number, '[^0-9]', '', 'g')) >= 4
    then right(regexp_replace(owner_id_number, '[^0-9]', '', 'g'), 4)
  else null
end
where owner_id_number is not null
  and owner_id_number !~ '^[0-9]{4}$';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'insurance_claims_owner_id_last4_check'
      and conrelid = 'public.insurance_claims'::regclass
  ) then
    alter table public.insurance_claims
      add constraint insurance_claims_owner_id_last4_check
      check (owner_id_number is null or owner_id_number ~ '^[0-9]{4}$');
  end if;
end
$$;
