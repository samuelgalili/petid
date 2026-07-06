create table if not exists public.shop_customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_order_at timestamptz
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage', 'percent', 'fixed', 'amount', 'free_shipping')),
  discount_value numeric(10,2) not null default 0,
  min_order_amount numeric(10,2) not null default 0,
  max_uses integer,
  used_count integer not null default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.shop_customers(id) on delete set null,
  user_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status text not null default 'pending',
  payment_method text not null default 'credit-card',
  payment_installments integer not null default 1,
  payment_transaction_id text,
  subtotal numeric(10,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  cash_on_delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  coupon_id uuid references public.coupons(id) on delete set null,
  shipping_address jsonb not null default '{}'::jsonb,
  order_type text not null default 'regular',
  pet_name text,
  special_instructions text,
  medical_urgency text not null default 'none',
  shipping_status text not null default 'label_created',
  tracking_number text,
  order_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid,
  product_source text,
  product_name text not null,
  product_image text,
  quantity integer not null check (quantity > 0),
  price numeric(10,2) not null,
  variant text,
  size text,
  created_at timestamptz not null default now()
);

create index if not exists idx_shop_customers_email_lower on public.shop_customers (lower(email));
create index if not exists idx_orders_customer on public.orders(customer_id);
create index if not exists idx_orders_customer_email_lower on public.orders(lower(customer_email));
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_order_date on public.orders(order_date desc);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_product on public.order_items(product_id);
create index if not exists idx_coupons_code_upper on public.coupons(upper(code));
