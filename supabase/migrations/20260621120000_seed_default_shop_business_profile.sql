-- Ensure the default shop profile exists for admin-created products.
INSERT INTO public.business_profiles (
  id,
  business_name,
  business_type,
  description,
  is_verified,
  is_featured
)
VALUES (
  'cf941cc4-e1d1-4d7c-8122-a5df81a1e53c',
  'PetID Shop',
  'shop',
  'Default PetID shop profile for admin-created products.',
  true,
  true
)
ON CONFLICT (id) DO NOTHING;
