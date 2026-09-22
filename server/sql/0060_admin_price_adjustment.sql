-- An admin changing what a customer pays.
--
-- The owner asked for two things on the manual order screen: a coupon, and
-- "לערוך את המחיר הסופי ללקוח ידנית" - to type the final figure himself.
--
-- WHY THIS IS THREE COLUMNS AND NOT AN EDITABLE total. The obvious
-- implementation is to let the screen send whatever total it likes and write
-- it down. That would remove the one rule standing between a screen and the
-- books: the server computes every line from the catalogue and REFUSES an
-- order whose claimed total disagrees (expected_total). With an editable
-- total, that check compares a number to itself and means nothing.
--
-- It also destroys information that cannot be recovered. An order recorded as
-- ₪150 does not say whether it was ₪150 of goods, or ₪200 of goods sold at a
-- ₪50 discretionary discount. The second is a fact about margin, about who
-- gave it, and about how often - and it is exactly the fact a manually typed
-- total erases.
--
-- So the total stays computed, and the difference the admin wants is recorded
-- as its own thing: an amount, a reason, and a name. The order then carries
-- all three facts separately - what the catalogue charges, what a coupon took
-- off, and what a person decided to take off on top.
--
-- SIGNED ON PURPOSE. A negative adjustment is a discount and a positive one is
-- a surcharge; special handling, a delivery somewhere awkward, a correction
-- agreed on the phone. Both are real, both need the same accounting, and
-- allowing only one direction would send the other back through a fake line
-- item.

alter table public.orders
  -- Signed. Negative takes money off, positive adds it. NULL means no admin
  -- touched the price, which is not the same as an adjustment of zero.
  add column if not exists admin_adjustment numeric(10, 2),

  -- Why. Required by the endpoint whenever the adjustment is non-zero: an
  -- unexplained change to what somebody pays is the thing this column exists
  -- to make impossible.
  add column if not exists admin_adjustment_reason text,

  -- Who. Same ON DELETE SET NULL reasoning as the payment attestation: losing
  -- the admin account must never take the order with it, and an adjustment
  -- whose author is gone should still be visible as one.
  add column if not exists admin_adjusted_by uuid references public.admin_users(id) on delete set null;

comment on column public.orders.admin_adjustment is
  'Signed discretionary change to the total, applied on top of the computed price. Negative is a discount. NULL means no admin changed the price.';

comment on column public.orders.admin_adjustment_reason is
  'Why the price was changed, in the admin''s words. Required whenever admin_adjustment is non-zero.';

-- The question this exists to answer: how much is being given away by hand,
-- and by whom. Partial, because most orders will never carry one.
create index if not exists idx_orders_admin_adjustment
  on public.orders (admin_adjusted_by, created_at desc)
  where admin_adjustment is not null;
