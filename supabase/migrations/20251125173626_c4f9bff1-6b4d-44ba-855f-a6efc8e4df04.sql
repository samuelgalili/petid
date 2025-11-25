-- Create rewards table for available rewards
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points_cost INTEGER NOT NULL,
  value TEXT NOT NULL,
  type TEXT NOT NULL,
  icon TEXT NOT NULL,
  gradient TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create redemptions table for user's redeemed rewards
CREATE TABLE public.redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  redemption_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT valid_status CHECK (status IN ('active', 'used', 'expired'))
);

-- Enable RLS
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rewards (everyone can view active rewards)
CREATE POLICY "Anyone can view active rewards"
  ON public.rewards
  FOR SELECT
  USING (is_active = true);

-- RLS Policies for redemptions (users can only see their own)
CREATE POLICY "Users can view their own redemptions"
  ON public.redemptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own redemptions"
  ON public.redemptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own redemptions"
  ON public.redemptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_redemptions_user_id ON public.redemptions(user_id);
CREATE INDEX idx_redemptions_reward_id ON public.redemptions(reward_id);
CREATE INDEX idx_redemptions_status ON public.redemptions(status);

-- Insert initial rewards data
INSERT INTO public.rewards (title, description, points_cost, value, type, icon, gradient) VALUES
  ('Store Voucher', 'Get ₪50 off your next purchase', 500, '₪50', 'voucher', 'Gift', 'from-purple-500 to-pink-500'),
  ('Premium Food Discount', '20% off premium pet food brands', 300, '20%', 'discount', 'ShoppingBag', 'from-blue-500 to-cyan-500'),
  ('Grooming Service', 'Free grooming session at partner salons', 800, '₪150', 'service', 'Scissors', 'from-green-500 to-emerald-500'),
  ('Vet Consultation', 'Free 30-minute vet consultation', 1000, '₪200', 'service', 'Stethoscope', 'from-orange-500 to-red-500'),
  ('Toy Bundle', 'Premium toy package for your pet', 400, '₪80', 'product', 'Package', 'from-yellow-500 to-orange-500'),
  ('Training Session', 'One-on-one training session', 600, '₪120', 'service', 'Award', 'from-indigo-500 to-purple-500');