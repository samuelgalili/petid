alter table public.admin_users
  add column if not exists must_change_password boolean not null default false;

alter table public.admin_users
  drop constraint if exists admin_users_role_check;

alter table public.admin_users
  add constraint admin_users_role_check
  check (role in ('admin', 'product_manager'));

alter table public.admin_audit_log
  add column if not exists actor_admin_user_id uuid references public.admin_users(id) on delete set null,
  add column if not exists actor_email text,
  add column if not exists actor_role text;

create index if not exists idx_admin_audit_log_actor_created
  on public.admin_audit_log(actor_admin_user_id, created_at desc);
