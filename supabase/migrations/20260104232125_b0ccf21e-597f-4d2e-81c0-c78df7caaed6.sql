-- Add cost control columns to rewards table
ALTER TABLE public.rewards 
ADD COLUMN IF NOT EXISTS min_order_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_limit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_membership_days INTEGER DEFAULT 30;

-- Add monthly redemption tracking
ALTER TABLE public.redemptions
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID;

-- Update existing rewards with sensible defaults
UPDATE public.rewards SET 
  min_order_amount = 100,
  monthly_limit = 50,
  requires_approval = CASE WHEN points_cost >= 2000 THEN true ELSE false END,
  min_membership_days = 30
WHERE min_order_amount IS NULL OR min_order_amount = 0;

-- Update expiration to 14 days for future redemptions (via trigger)
CREATE OR REPLACE FUNCTION public.set_redemption_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := NOW() + INTERVAL '14 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_redemption_expiry_trigger ON public.redemptions;
CREATE TRIGGER set_redemption_expiry_trigger
BEFORE INSERT ON public.redemptions
FOR EACH ROW
EXECUTE FUNCTION public.set_redemption_expiry();

-- Function to check if user can redeem (max 2 per month)
CREATE OR REPLACE FUNCTION public.can_user_redeem(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  monthly_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO monthly_count
  FROM public.redemptions
  WHERE user_id = p_user_id
    AND redeemed_at >= DATE_TRUNC('month', NOW())
    AND status != 'expired';
  
  RETURN monthly_count < 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check reward monthly availability
CREATE OR REPLACE FUNCTION public.is_reward_available(p_reward_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  monthly_count INTEGER;
  reward_limit INTEGER;
BEGIN
  SELECT monthly_limit INTO reward_limit
  FROM public.rewards
  WHERE id = p_reward_id;
  
  SELECT COUNT(*) INTO monthly_count
  FROM public.redemptions
  WHERE reward_id = p_reward_id
    AND redeemed_at >= DATE_TRUNC('month', NOW());
  
  RETURN monthly_count < COALESCE(reward_limit, 50);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;