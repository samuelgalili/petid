-- 0062_business_products_catalog_link.sql
-- The link that makes "publish" mean something to the shop.
--
-- MIPO has two product models and the shop reads one of them. `/api/products`
-- returns every row of business_products and scraped_products with no WHERE
-- clause at all; the only thing deciding whether a shopper sees a product is
-- `in_stock`, filtered in the browser. Meanwhile catalog_products carries
-- publication_state, a seven-condition gate, an audit trail and a button
-- labelled "פרסם לחנות" - and nothing has ever written from that model into
-- the one the shop reads. Publishing set a column and changed nothing a
-- customer could see.
--
-- This column is the join between them. It is not a second source of truth:
-- catalog_products still decides what is published, and the business_products
-- row is a projection of that decision into the table the shop happens to
-- query.
--
-- WHY A COLUMN AND NOT A MATCH ON NAME. Publishing has to be repeatable - a
-- price changes, an image is replaced, the product is unpublished and
-- published again - and each of those must land on the row it landed on last
-- time. Matching on name would create a second listing the first time somebody
-- corrected a typo, and there is no way to tell that from a genuine second
-- product with a similar name.
--
-- Additive. Nothing is dropped, nothing is rewritten, and every existing
-- business_products row keeps catalog_product_id null, which is exactly what
-- it means: this row did not come from the catalogue. The 375 legacy products
-- are untouched.

alter table public.business_products
  add column if not exists catalog_product_id uuid;

-- WHICH OFFER THE PRICE CAME FROM.
--
-- A catalogue product can have several variants at several prices, and a shop
-- row has one price. The owner chose the cheapest active offer. That choice is
-- only defensible if the row can say which offer it took: otherwise "why does
-- this say ₪79 when the 12kg bag is ₪240" is a question answered by rerunning
-- the query in your head against data that has since changed.
alter table public.business_products
  add column if not exists shop_offer_id uuid;

-- No cascade. Deleting a catalog product must not silently remove a shop
-- listing that orders may already reference; the delete fails instead, which
-- is the outcome somebody should have to look at.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'business_products_catalog_product_id_fkey'
       and conrelid = 'public.business_products'::regclass
  ) then
    alter table public.business_products
      add constraint business_products_catalog_product_id_fkey
      foreign key (catalog_product_id) references public.catalog_products (id);
  end if;
end $$;

-- ONE shop row per catalogue product, enforced by the database rather than by
-- the code that writes it. A publish that raced with itself - two admins, or a
-- retried request - would otherwise put the same product on the shelf twice,
-- and a partial unique index is the only thing that makes the upsert's
-- ON CONFLICT target legal.
create unique index if not exists uq_business_products_catalog_product
  on public.business_products (catalog_product_id)
  where catalog_product_id is not null;

comment on column public.business_products.catalog_product_id is
  'The catalog_products row this listing was published from. Null for a product '
  'created directly in the admin or imported, which is every legacy row. '
  'Written by the publication bridge in server/src/catalogShopBridge.js.';
