-- ================================================================
-- FIX: KYC Admin Visibility + Seller Insert Policy
-- Run this ONCE in Supabase SQL Editor → New Query → Paste & Run
-- ================================================================

-- 1. Ensure kyc_submissions table exists
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_number text NOT NULL,
  document_url text NULL,
  selfie_url text NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text NULL,
  reviewed_by uuid NULL REFERENCES auth.users(id),
  reviewed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- 3. Drop all existing KYC policies to avoid conflicts  
DROP POLICY IF EXISTS "Users can insert own kyc" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Users can view own kyc" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Admins can manage all kyc" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Admins can view all kyc_submissions" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Admins can update kyc_submissions" ON public.kyc_submissions;

-- 4. Re-create clean policies

-- Sellers can INSERT their own KYC submission
CREATE POLICY "Users can insert own kyc" ON public.kyc_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can SELECT their own KYC submission  
CREATE POLICY "Users can view own kyc" ON public.kyc_submissions
  FOR SELECT USING (auth.uid() = user_id);

-- Admins have FULL access (SELECT, INSERT, UPDATE, DELETE) on ALL rows
CREATE POLICY "Admins can manage all kyc" ON public.kyc_submissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Ensure kyc-documents storage bucket exists (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage policies for KYC documents
DO $$
BEGIN
  -- Allow authenticated users to upload their own documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'KYC Auth Upload Access'
  ) THEN
    EXECUTE 'CREATE POLICY "KYC Auth Upload Access" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''kyc-documents'' AND auth.role() = ''authenticated'')';
  END IF;

  -- Allow owners + admins to read KYC documents
  DROP POLICY IF EXISTS "KYC Admin Read Access" ON storage.objects;
  EXECUTE 'CREATE POLICY "KYC Admin Read Access" ON storage.objects FOR SELECT USING (bucket_id = ''kyc-documents'' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin'')))';
END $$;

-- 7. Ensure admin can update seller_stores (for approve/reject actions)
DROP POLICY IF EXISTS "Admins can update all seller_stores" ON public.seller_stores;
CREATE POLICY "Admins can update all seller_stores" 
    ON public.seller_stores FOR UPDATE
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

SELECT '✅ KYC Admin Visibility fix applied! Admins can now see all KYC applications.' as result;
