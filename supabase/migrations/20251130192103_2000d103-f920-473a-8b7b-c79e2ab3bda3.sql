-- Create updated_at trigger function if not exists
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create storage bucket for pet documents
insert into storage.buckets (id, name)
values ('pet-documents', 'pet-documents');

-- Create pet_documents table
create table public.pet_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  pet_id uuid references public.pets(id) on delete cascade not null,
  document_type text not null check (document_type in ('vaccination', 'medical', 'other')),
  title text not null,
  description text,
  file_url text not null,
  file_name text not null,
  file_size integer,
  uploaded_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table public.pet_documents enable row level security;

-- RLS Policies for pet_documents
create policy "Users can view their own pet documents"
  on public.pet_documents
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own pet documents"
  on public.pet_documents
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own pet documents"
  on public.pet_documents
  for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete their own pet documents"
  on public.pet_documents
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Storage policies for pet-documents bucket
create policy "Users can view their own documents"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'pet-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can upload their own documents"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'pet-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own documents"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'pet-documents' and auth.uid()::text = (storage.foldername(name))[1]);

-- Create updated_at trigger
create trigger update_pet_documents_updated_at
  before update on public.pet_documents
  for each row
  execute function public.handle_updated_at();

-- Create indexes for better query performance
create index idx_pet_documents_user_id on public.pet_documents(user_id);
create index idx_pet_documents_pet_id on public.pet_documents(pet_id);
create index idx_pet_documents_type on public.pet_documents(document_type);