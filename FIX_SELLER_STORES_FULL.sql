-- =============================================================
-- SELLER STORES FULL FIX SCRIPT
-- Run this in your Supabase SQL Editor (https://app.supabase.com)
-- Navigate to: Project → SQL Editor → New Query → Paste & Run
--
-- This is SAFE to run multiple times — all statements use 
-- "IF NOT EXISTS" or "ON CONFLICT DO NOTHING" guards.
-- =============================================================

-- 1. Add all missing columns to seller_stores
ALTER TABLE public.seller_stores
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS seller_email TEXT,
  ADD COLUMN IF NOT EXISTS seller_phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS seller_type TEXT DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS service_mode TEXT,
  ADD COLUMN IF NOT EXISTS radius_km INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT 0;

-- 2. Create the kyc_submissions table (if it doesn't exist yet)
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_number text NOT NULL,
  document_url text,
  selfie_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS on kyc_submissions
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for kyc_submissions (skip if they already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kyc_submissions' AND policyname = 'Users can create their own kyc_submissions') THEN
    EXECUTE 'CREATE POLICY "Users can create their own kyc_submissions" ON public.kyc_submissions FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kyc_submissions' AND policyname = 'Users can view their own kyc_submissions') THEN
    EXECUTE 'CREATE POLICY "Users can view their own kyc_submissions" ON public.kyc_submissions FOR SELECT USING (auth.uid() = user_id)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kyc_submissions' AND policyname = 'Admins can view all kyc_submissions') THEN
    EXECUTE 'CREATE POLICY "Admins can view all kyc_submissions" ON public.kyc_submissions FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin''))';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kyc_submissions' AND policyname = 'Admins can update kyc_submissions') THEN
    EXECUTE 'CREATE POLICY "Admins can update kyc_submissions" ON public.kyc_submissions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin''))';
  END IF;
END $$;

-- 5. Create the kyc-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage policies for kyc-documents
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow authenticated uploads to kyc') THEN
    EXECUTE 'CREATE POLICY "Allow authenticated uploads to kyc" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''kyc-documents'' AND auth.role() = ''authenticated'')';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow authenticated read to own kyc') THEN
    EXECUTE 'CREATE POLICY "Allow authenticated read to own kyc" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''kyc-documents'' AND auth.uid()::text = (storage.foldername(name))[1])';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can read all kyc documents') THEN
    EXECUTE 'CREATE POLICY "Admins can read all kyc documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''kyc-documents'' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin''))';
  END IF;
END $$;

-- 7. Add a useful index
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user_id ON public.kyc_submissions(user_id);

-- Done!
SELECT 'All seller store columns and KYC setup complete!' AS result;
