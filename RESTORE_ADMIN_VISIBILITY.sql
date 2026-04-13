-- ============================================================
-- 🔐 RESTORE ADMIN VISIBILITY: Fix RLS, Relations, and Storage
-- Run this in your Supabase SQL Editor (https://app.supabase.com)
-- ============================================================

-- 1. Storage Repair: Create the SECURE kyc-documents bucket
-- Set to public: false so only signed URLs can view these sensitive files.
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Create a helper function to break RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Schema Repair: Ensure profiles table has the expected email column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 4. DATA REPAIR: Fix "Orphan" records and Sync Emails
INSERT INTO public.profiles (id, full_name, role, email)
SELECT DISTINCT user_id, 'Legacy User', 'buyer', NULL
FROM public.kyc_submissions
WHERE user_id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 5. Link tables to public.profiles (Fixes PGRST200 Relation Error)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kyc_submissions') THEN
        ALTER TABLE public.kyc_submissions DROP CONSTRAINT IF EXISTS kyc_submissions_user_id_fkey;
        ALTER TABLE public.kyc_submissions ADD CONSTRAINT kyc_submissions_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seller_profiles') THEN
        ALTER TABLE public.seller_profiles DROP CONSTRAINT IF EXISTS seller_profiles_user_id_fkey;
        ALTER TABLE public.seller_profiles ADD CONSTRAINT seller_profiles_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 6. Ensure your current user is an Admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = auth.uid();

-- 7. Fix RLS for Tables (Profiles, KYC, Sellers, Products)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin() OR id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all kyc_submissions" ON public.kyc_submissions;
CREATE POLICY "Admins can view all kyc_submissions" ON public.kyc_submissions FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update kyc_submissions" ON public.kyc_submissions;
CREATE POLICY "Admins can update kyc_submissions" ON public.kyc_submissions FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admin view all" ON public.seller_profiles;
CREATE POLICY "Admin view all" ON public.seller_profiles FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin update all" ON public.seller_profiles;
CREATE POLICY "Admin update all" ON public.seller_profiles FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
CREATE POLICY "Admins can manage all products" ON public.products FOR ALL USING (public.is_admin());

-- 8. Fix RLS for Storage (Proper Secure Implementation)
-- 8a. Allow Users to UPLOAD their own documents during onboarding
DROP POLICY IF EXISTS "Sellers can upload KYC docs" ON storage.objects;
CREATE POLICY "Sellers can upload KYC docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 8b. Allow Admins to READ (needed for signed URL generation)
DROP POLICY IF EXISTS "Admins can read KYC documents" ON storage.objects;
CREATE POLICY "Admins can read KYC documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'kyc-documents' AND public.is_admin());

-- 9. Final check
SELECT 'Database, Storage, and Admin Visibility FULLY Restored!' AS result;
