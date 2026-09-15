-- 0054_legacy_import_source_system.sql
-- The two things phase 5 needs before it can run, and neither was noticed when
-- the plan was written.
--
-- The plan says the legacy migration writes raw_import_records with
-- source_system = 'legacy_business_products'. It cannot:
-- raw_import_records_source_system_check allows exactly
-- ('url','scrape','csv','xlsx','manual','api'), so every one of the 375 inserts
-- would have failed with 23514. Found by reading the constraint rather than by
-- running the migration against production and watching it abort.
--
-- The obvious shortcut - reuse 'manual' or 'api' - is what this migration
-- exists to avoid. source_system is provenance. These rows did not come from a
-- human typing them or from a partner's API; they came from a table that
-- predates the intake model, and that is a fact worth being able to query. Six
-- months from now "which products came in before the new model existed" is a
-- question somebody will ask, and the answer must not be "we cannot tell any
-- more".

alter table public.raw_import_records
  drop constraint if exists raw_import_records_source_system_check;

alter table public.raw_import_records
  add constraint raw_import_records_source_system_check
  check (source_system in ('url', 'scrape', 'csv', 'xlsx', 'manual', 'api',
                           'legacy_business_products'));

comment on column public.raw_import_records.source_system is
  'Where this record came from. ''legacy_business_products'' marks the one-time migration of the pre-intake business_products table (phase 5) and must stay distinguishable from rows a human or a partner API created.';

-- ── The actor ───────────────────────────────────────────────────────────────
--
-- raw_import_records.created_by is NOT NULL and references admin_users. The
-- migration therefore needs somebody to be responsible for 375 rows, and the
-- alternatives are both wrong: attributing them to a real administrator puts
-- that person's name on an import they did not perform, and every audit trail
-- downstream then reads as a human decision. This is a machine's work and says
-- so.
--
-- It must not be a way in. Two independent reasons it cannot authenticate:
--
--   1. is_active = false, and the login path checks that BEFORE the password.
--   2. verifyPassword() requires a hash of the form 'scrypt$salt$hash' and
--      returns false for anything else. The sentinel below is not that shape,
--      so no password verifies against it - including an empty one.
--
-- Least privilege: product_manager rather than admin. The role is almost
-- academic for an account that cannot log in, but "almost" is not a reason to
-- hand it the higher one.
insert into public.admin_users (email, password_hash, display_name, role, is_active)
values (
  'system+legacy-migration@mipo.pet',
  'disabled-no-password-verifies-against-this',
  'Legacy catalogue migration (system)',
  'product_manager',
  false
)
on conflict (email) do nothing;

comment on table public.raw_import_records is
  'The immutable record of what arrived, before any mapping. A mapping error is correctable by re-running against the payload; the payload itself is never edited (see the raw_import_records_immutable trigger).';
