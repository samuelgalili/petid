-- 0057_manual_customer_identity.sql
-- A customer who has never checked out, and a way to tell two of them apart.
--
-- shop_customers rows are born in exactly one place: the checkout, at
-- server/src/index.js:6143, with `on conflict (lower(email)) do update`. That
-- is why email is NOT NULL and why the only unique key on the table is
-- lower(email) - at a checkout there is always an email, so it works.
--
-- An admin opening a customer by hand has a different reality. A person who
-- rang up about a rabbit and left a mobile number has no email, and today that
-- person cannot be represented in this table at all. Not "would be hard to
-- deduplicate" - literally cannot be inserted.
--
-- So two changes, and they belong together. Making email nullable without a
-- second way to recognise somebody would let anyone create unlimited
-- indistinguishable rows for the same person, in a table that already has a
-- duplicates problem: index.js:6611 carries `distinct on` and a comment about
-- "two shop_customers rows" because that has already happened through email
-- alone.
--
-- The second way is a NORMALISED PHONE, and it is a lookup rather than a
-- constraint. The reasoning is at the index below; the short version is that a
-- phone number is an address rather than an identity, and households share
-- one.

-- ─── one spelling of a phone number ──────────────────────────────────────────

-- Mirrors src/lib/customerContact.ts `toWhatsAppNumber` exactly, and
-- server/test/phoneNormalisation.test.js asserts the two agree case by case.
-- Two normalisers that disagree are worse than one that is wrong: the index
-- would consider two rows distinct while the API's lookup considered them the
-- same, so "search before create" would find a match and then fail to write it.
--
-- IMMUTABLE because a generated column requires it, and it genuinely is: the
-- same text always produces the same digits.
create or replace function public.mipo_normalize_phone(raw text)
returns text
language sql
immutable
strict
as $$
  with digits as (
    select regexp_replace(raw, '\D', '', 'g') as d
  ),
  -- 00972... is the same number as +972...
  international as (
    select case when d like '00%' then substr(d, 3) else d end as d from digits
  ),
  national as (
    select case
      -- +972 050 ... - a country code in front of a national number that kept
      -- its trunk zero. Both halves are present, so drop the zero.
      when d like '972%' and length(d) = 13 and substr(d, 4, 1) = '0' then '972' || substr(d, 5)
      when d like '972%' then d
      when d like '0%' then '972' || substr(d, 2)
      else d
    end as d from international
  )
  -- Shortest plausible international number. Below that it is a typo or an
  -- extension, and treating it as an identity key would merge strangers.
  select case when length(d) >= 10 then d else null end from national;
$$;

comment on function public.mipo_normalize_phone(text) is
  'Israeli phone number to bare international digits. Mirrors '
  'toWhatsAppNumber in src/lib/customerContact.ts; a test pins them together.';

-- ─── a customer may now exist without an email ───────────────────────────────

alter table public.shop_customers alter column email drop not null;

-- uq_shop_customers_email_lower is unaffected and stays exactly as it is:
-- Postgres treats NULLs as distinct in a unique index, so any number of
-- phone-only customers coexist while two rows still cannot share an email.
-- The checkout's `on conflict (lower(email))` keeps working untouched - it
-- always supplies an email, so it never reaches the null case.

alter table public.shop_customers
  add column if not exists phone_normalized text
  generated always as (public.mipo_normalize_phone(phone)) stored;

comment on column public.shop_customers.phone_normalized is
  'Derived, never written directly. The dedup key for a customer with no email.';

-- ─── a lookup index, NOT a uniqueness key ────────────────────────────────────
--
-- THIS WAS A UNIQUE INDEX AND THAT WAS WRONG, on the data model before it was
-- wrong on the risk.
--
-- The first version of this migration refused to run if two rows already
-- shared a phone number, on the reasoning that a dedup key which silently is
-- not there is worse than none. It fired on the first attempt - against a
-- local database whose nine smoke-test buyers all carry 0501234567 - and
-- looking at why changed the conclusion:
--
--   AN EMAIL IS AN IDENTITY. A PHONE NUMBER IS AN ADDRESS.
--
-- One mailbox is one person, near enough. A phone number is shared by a
-- household, by a couple, by everyone who works behind one counter. A unique
-- index would refuse the second real customer at the same landline, and there
-- is no message a constraint can give that makes that the right answer.
--
-- So the index is for looking up, and the deduplication moves to the endpoint,
-- where it can do the thing an index cannot: say WHO the number already
-- belongs to and let an administrator decide whether this is the same person.
-- That is also what D-2 asks for on the account-link question, for the same
-- reason.
--
-- The side effect is that no pre-existing data can block a deploy, which was
-- the risk. It is a side effect and not the argument.

create index if not exists idx_shop_customers_phone_normalized
  on public.shop_customers (phone_normalized)
  where phone_normalized is not null;

-- The unique key on lower(email) is untouched and is still the identity key.
-- Postgres treats NULLs as distinct there, so any number of phone-only
-- customers coexist while two rows still cannot share an email.
