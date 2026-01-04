-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.set_redemption_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := NOW() + INTERVAL '14 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;