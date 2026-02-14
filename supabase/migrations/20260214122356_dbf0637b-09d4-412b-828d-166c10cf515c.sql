
-- Fix get_order_status: add search_path to prevent search_path injection
CREATE OR REPLACE FUNCTION public.get_order_status(p_order_number text, p_phone text DEFAULT NULL::text)
RETURNS TABLE(order_id uuid, order_number text, status text, tracking_number text, carrier text, estimated_delivery timestamp with time zone, total numeric, created_at timestamp with time zone, shipping_address jsonb)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
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
