-- M1 · Seller scope on the admin identity.
--
-- NULL means platform scope. That is the correct and permanent value for the
-- admin and product_manager roles, not a placeholder waiting to be filled: a
-- reviewer scoped to one Seller could not review anybody else's drafts.
--
-- Nothing is backfilled. There is no source of truth for which Seller an
-- existing admin belongs to, and inventing one would repeat the mistake that
-- made legacy product ownership unrecoverable - a fallback that assigned an
-- owner without recording that it had. A Seller is assigned only by an explicit,
-- audited action, which does not exist yet.
--
-- No default, for the same reason: a default would quietly give every future
-- admin a Seller nobody chose.
--
-- ON DELETE RESTRICT rather than SET NULL or CASCADE. SET NULL would silently
-- promote a Seller-scoped admin to platform scope when an unrelated business was
-- deleted, which is a privilege escalation triggered by somebody else's cleanup.
-- CASCADE would delete admin accounts. RESTRICT forces the detachment to be a
-- deliberate act.
--
-- Nothing reads this column yet. Seller isolation begins in Stage 1A, and needs
-- a further migration first: admin_users_role_check still restricts role to
-- admin and product_manager, so seller_admin cannot be inserted.

alter table public.admin_users
  add column business_id uuid
    references public.business_profiles(id)
    on delete restrict;

-- Partial: platform admins are NULL and will stay the majority, so they do not
-- belong in an index whose only purpose is finding one Seller's admins.
create index if not exists idx_admin_users_business_id
  on public.admin_users (business_id)
  where business_id is not null;

comment on column public.admin_users.business_id is
  'Seller scope for this admin. NULL = platform-wide. Never backfilled automatically; assigned only by an explicit audited action. Platform roles keep this NULL.';
