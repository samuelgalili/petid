-- An admin saying the money arrived.
--
-- The owner described the case in his own words: the customer paid one of the
-- admins by some route the system never saw - Bit, a transfer, cash in hand -
-- the admin confirms receipt privately, and the order can then move on to a
-- warehouse label.
--
-- WHY THIS IS NOT JUST payment_status = 'paid'. Every other way an order
-- becomes paid leaves a trace somebody else wrote: a Cardcom transaction id, a
-- gateway callback, a COD collection. This one leaves nothing. It is one
-- person's word that money changed hands, and it releases goods from a
-- warehouse.
--
-- A claim like that has to carry WHO made it, WHEN, and BY WHAT MEANS, or the
-- only record of a payment nobody can verify is a status field that looks
-- exactly like a card payment. These three columns are what make the
-- difference visible afterwards - "show me every order marked paid with no
-- transaction behind it" is a question the table can now answer.
--
-- Nothing is backfilled. An existing paid order was paid some other way, and
-- writing an attestation onto it would be inventing a record of a conversation
-- that never happened.

alter table public.orders
  -- The admin who says they received it. ON DELETE SET NULL rather than
  -- CASCADE: if that admin account is later removed, the ORDER must not
  -- vanish, and the attestation stays visible as one whose author is gone.
  add column if not exists payment_attested_by uuid references public.admin_users(id) on delete set null,
  add column if not exists payment_attested_at timestamptz,
  -- How the money arrived, in the admin's own words. Required by the endpoint
  -- rather than by a NOT NULL, because the column is null for every order that
  -- was not attested at all - which is almost all of them.
  add column if not exists payment_attestation_note text;

comment on column public.orders.payment_attested_by is
  'The admin who declared this order paid by a route the system never saw. NULL for every order paid through a gateway.';

comment on column public.orders.payment_attestation_note is
  'How the money arrived, in the admin''s words. Required when payment_method = admin-attested.';

-- The question this exists to answer: which orders are paid on somebody's word
-- alone. Partial, because it is a small minority of a large table.
create index if not exists idx_orders_payment_attested
  on public.orders (payment_attested_at desc)
  where payment_attested_by is not null;
