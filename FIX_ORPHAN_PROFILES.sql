-- ================================================================
-- FIX ORPHAN PROFILES + COMPLETE ADMIN VISIBILITY RESTORATION
-- Run in Supabase SQL Editor: https://app.supabase.com/project/_/sql
-- ================================================================

-- STEP 1: Create orphan profiles for seller_profiles users who exist
-- in auth.users but not in public.profiles
INSERT INTO public.profiles (id, full_name, email, role)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) AS full_name,
  u.email,
  'seller'
FROM auth.users u
WHERE u.id IN (
  SELECT user_id FROM public.seller_profiles
)
AND u.id NOT IN (SELECT id FROM public.profiles WHERE full_name IS NOT NULL)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

-- STEP 2: Sync emails to profiles that have them null
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- STEP 3: Sync full_name to profiles for anyone missing it
UPDATE public.profiles p
SET full_name = COALESCE(
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'name',
  split_part(u.email, '@', 1)
)
FROM auth.users u
WHERE p.id = u.id AND (p.full_name IS NULL OR p.full_name = '');

-- STEP 4: Create stores rows for seller_profiles that don't have one yet
INSERT INTO public.stores (seller_id, description, is_verified, is_featured)
SELECT sp.id, sp.description, false, false
FROM public.seller_profiles sp
WHERE sp.id NOT IN (SELECT seller_id FROM public.stores WHERE seller_id IS NOT NULL)
ON CONFLICT (seller_id) DO NOTHING;

-- STEP 5: Update seller_profiles store_name from stores if null
-- (Fixes the store_name: null issue in admin dashboard)
UPDATE public.seller_profiles sp
SET store_name = COALESCE(sp.store_name, p.full_name || '''s Store', 'My Store')
FROM public.profiles p
WHERE sp.user_id = p.id
AND (sp.store_name IS NULL OR sp.store_name = '');

-- STEP 6: Ensure KYC submissions have the right FK relationship
-- (Re-apply in case the previous run had an issue)
ALTER TABLE public.kyc_submissions 
  DROP CONSTRAINT IF EXISTS kyc_submissions_user_id_fkey;

ALTER TABLE public.kyc_submissions 
  ADD CONSTRAINT kyc_submissions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- STEP 7: Ensure seller_profiles has FK to profiles
ALTER TABLE public.seller_profiles
  DROP CONSTRAINT IF EXISTS seller_profiles_user_id_fkey;

ALTER TABLE public.seller_profiles
  ADD CONSTRAINT seller_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- STEP 8: Verify and report counts
SELECT 
  (SELECT COUNT(*) FROM public.profiles) AS total_profiles,
  (SELECT COUNT(*) FROM public.profiles WHERE full_name IS NOT NULL) AS profiles_with_name,
  (SELECT COUNT(*) FROM public.profiles WHERE email IS NOT NULL) AS profiles_with_email,
  (SELECT COUNT(*) FROM public.seller_profiles) AS total_sellers,
  (SELECT COUNT(*) FROM public.seller_profiles WHERE store_name IS NOT NULL) AS sellers_with_name,
  (SELECT COUNT(*) FROM public.stores) AS total_stores,
  (SELECT COUNT(*) FROM public.kyc_submissions) AS total_kyc
AS results;
