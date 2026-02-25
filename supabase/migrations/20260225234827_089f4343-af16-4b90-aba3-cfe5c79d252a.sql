
-- Enable realtime on shipment_tracking for live UI updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_tracking;

-- Add webhook_secret column to shipping_providers for signature validation
ALTER TABLE public.shipping_providers ADD COLUMN IF NOT EXISTS webhook_secret TEXT;
