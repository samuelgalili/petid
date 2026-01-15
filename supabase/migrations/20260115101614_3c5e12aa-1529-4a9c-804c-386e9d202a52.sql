-- 1) Enable RLS on orders and order_tracking
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;

-- 2) Policy: user sees only their own orders
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;

CREATE POLICY "orders_select_own"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id);

-- 3) Policy for tracking via order_id (only if order belongs to user)
DROP POLICY IF EXISTS "order_tracking_select_own" ON public.order_tracking;

CREATE POLICY "order_tracking_select_own"
ON public.order_tracking
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = order_tracking.order_id
      AND o.user_id = auth.uid()
  )
);

-- 4) Replace RPC: without SECURITY DEFINER, with auth.uid() check
CREATE OR REPLACE FUNCTION public.get_order_status(
  p_order_number text
)
RETURNS TABLE (
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
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    o.id AS order_id,
    o.order_number,
    o.status::text,
    ot.tracking_number,
    ot.carrier,
    ot.estimated_delivery,
    o.total,
    o.created_at,
    o.shipping_address
  FROM public.orders o
  LEFT JOIN public.order_tracking ot ON ot.order_id = o.id
  WHERE auth.uid() IS NOT NULL
    AND o.user_id = auth.uid()
    AND o.order_number = p_order_number
  ORDER BY o.created_at DESC
  LIMIT 1;
$$;