
-- User Products join table: links users to products they promote
CREATE TABLE public.user_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.business_products(id) ON DELETE CASCADE NOT NULL,
  custom_commission_rate NUMERIC(5,2) DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  total_clicks INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own promoted products" ON public.user_products
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can manage own promoted products" ON public.user_products
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own promoted products" ON public.user_products
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own promoted products" ON public.user_products
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Creator wallets table
CREATE TABLE public.creator_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_balance NUMERIC(10,2) DEFAULT 0,
  pending_amount NUMERIC(10,2) DEFAULT 0,
  available_amount NUMERIC(10,2) DEFAULT 0,
  total_withdrawn NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'ILS',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.creator_wallets
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can create own wallet" ON public.creator_wallets
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Wallet transactions log
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  wallet_id UUID REFERENCES public.creator_wallets(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('commission', 'withdrawal', 'adjustment')),
  amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'completed',
  order_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Add commission_rate and supplier_link to business_products if not exists
ALTER TABLE public.business_products 
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS supplier_link TEXT;

-- Function: process payout when order is delivered
CREATE OR REPLACE FUNCTION public.process_order_payout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission NUMERIC(10,2);
  v_wallet_id UUID;
  v_seller_user_id UUID;
BEGIN
  -- Only trigger when shipping_status changes to 'delivered'
  IF NEW.shipping_status = 'delivered' AND (OLD.shipping_status IS DISTINCT FROM 'delivered') THEN
    -- Calculate commission
    v_commission := NEW.total_price * (COALESCE(NEW.commission_rate, 10) / 100.0);
    
    -- Get seller user_id from business_profiles
    SELECT user_id INTO v_seller_user_id
    FROM business_profiles
    WHERE id = NEW.seller_id;
    
    IF v_seller_user_id IS NOT NULL THEN
      -- Ensure wallet exists
      INSERT INTO creator_wallets (user_id, total_balance, pending_amount, available_amount)
      VALUES (v_seller_user_id, 0, 0, 0)
      ON CONFLICT (user_id) DO NOTHING;
      
      SELECT id INTO v_wallet_id FROM creator_wallets WHERE user_id = v_seller_user_id;
      
      -- Move from pending to available
      UPDATE creator_wallets
      SET 
        pending_amount = GREATEST(0, pending_amount - v_commission),
        available_amount = available_amount + v_commission,
        updated_at = now()
      WHERE user_id = v_seller_user_id;
      
      -- Log transaction
      INSERT INTO wallet_transactions (user_id, wallet_id, type, amount, order_id, description)
      VALUES (v_seller_user_id, v_wallet_id, 'commission', v_commission, NEW.id, 'Commission from delivered order');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on orders table
DROP TRIGGER IF EXISTS trigger_order_payout ON public.orders;
CREATE TRIGGER trigger_order_payout
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.process_order_payout();

-- Function: add pending commission when order is created
CREATE OR REPLACE FUNCTION public.process_order_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission NUMERIC(10,2);
  v_wallet_id UUID;
  v_seller_user_id UUID;
BEGIN
  -- Calculate pending commission
  v_commission := NEW.total_price * (COALESCE(NEW.commission_rate, 10) / 100.0);
  
  -- Get seller user_id
  SELECT user_id INTO v_seller_user_id
  FROM business_profiles
  WHERE id = NEW.seller_id;
  
  IF v_seller_user_id IS NOT NULL THEN
    -- Ensure wallet exists
    INSERT INTO creator_wallets (user_id, total_balance, pending_amount, available_amount)
    VALUES (v_seller_user_id, 0, v_commission, 0)
    ON CONFLICT (user_id) DO UPDATE SET
      pending_amount = creator_wallets.pending_amount + v_commission,
      total_balance = creator_wallets.total_balance + v_commission,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_order_pending ON public.orders;
CREATE TRIGGER trigger_order_pending
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.process_order_pending();
