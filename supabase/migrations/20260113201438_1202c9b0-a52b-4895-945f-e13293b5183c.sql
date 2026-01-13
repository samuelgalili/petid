-- Drop existing constraint
ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_discount_type_check;

-- Add new constraint with free_shipping option
ALTER TABLE public.coupons ADD CONSTRAINT coupons_discount_type_check 
  CHECK (discount_type IN ('fixed', 'percentage', 'free_shipping'));

-- Update the FREESHIP coupon
UPDATE public.coupons SET discount_type = 'free_shipping', discount_value = 0 WHERE code = 'FREESHIP';