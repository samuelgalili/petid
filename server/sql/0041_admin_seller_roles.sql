-- M1b · the role model the Seller scope needs.
--
-- M1 added admin_users.business_id and stopped there: the role check still
-- permitted only admin and product_manager, so no account could ever carry a
-- Seller. The column was capacity. This is the capability.
--
-- The scope invariant lives in the database rather than only in the
-- application. A Seller-scoped role must have a Seller, and a platform role
-- must not, so "a seller_admin with no Seller" becomes unrepresentable rather
-- than merely rejected somewhere in a route. That distinction matters: such a
-- row would not fail loudly, it would read as platform scope, which is a
-- silent promotion - the same shape of bug as ON DELETE SET NULL, which M1
-- refused for the same reason.
--
-- What a CHECK cannot do is reach into business_profiles. "The business must be
-- an approved Seller" is therefore application-level by necessity rather than
-- by choice, and it is enforced at provisioning time. A seller_admin attached
-- to an unverified business is accepted by the database; that was verified, not
-- assumed.
--
-- readonly_admin is Seller-scoped, not platform-scoped. An earlier draft had it
-- the other way round.
--
-- No backfill. Every existing row is admin or product_manager with a NULL
-- business_id, which already satisfies the platform branch of the scope check,
-- so no row is touched and none needs to be.

alter table public.admin_users
  drop constraint admin_users_role_check;

alter table public.admin_users
  add constraint admin_users_role_check
  check (role in ('admin', 'product_manager', 'seller_admin', 'readonly_admin'));

alter table public.admin_users
  add constraint admin_users_scope_check
  check (
    (role in ('admin', 'product_manager') and business_id is null)
    or
    (role in ('seller_admin', 'readonly_admin') and business_id is not null)
  );

comment on constraint admin_users_scope_check on public.admin_users is
  'Platform roles (admin, product_manager) have no Seller; Seller roles (seller_admin, readonly_admin) must have one. Makes an unscoped Seller admin unrepresentable rather than merely rejected.';
