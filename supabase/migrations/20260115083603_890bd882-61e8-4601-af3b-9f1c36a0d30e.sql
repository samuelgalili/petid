-- RPC: Get Order Status with tracking info
create or replace function get_order_status(
  p_order_number text,
  p_phone text default null
)
returns table (
  order_id uuid,
  order_number text,
  status text,
  tracking_number text,
  carrier text,
  estimated_delivery timestamptz,
  total numeric,
  created_at timestamptz,
  shipping_address jsonb
)
language sql
security definer
as $$
  select
    o.id as order_id,
    o.order_number,
    o.status::text,
    ot.tracking_number,
    ot.carrier,
    ot.estimated_delivery,
    o.total,
    o.created_at,
    o.shipping_address
  from orders o
  left join order_tracking ot on ot.order_id = o.id
  where o.order_number = p_order_number
  order by o.created_at desc
  limit 1;
$$;