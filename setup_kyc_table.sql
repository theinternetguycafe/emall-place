-- =============================================================
-- KYC SETUP SCRIPT
-- Run this in your Supabase SQL Editor (https://app.supabase.com)
-- Navigate to your project -> SQL Editor -> New Query -> Paste & Run
-- =============================================================

-- 1. Create the kyc_submissions table
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

-- 2. Enable Row Level Security
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Users can insert their own KYC submission
CREATE POLICY "Users can insert own kyc" ON public.kyc_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own KYC submission
CREATE POLICY "Users can view own kyc" ON public.kyc_submissions
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view and manage all KYC submissions
CREATE POLICY "Admins can manage all kyc" ON public.kyc_submissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Create the kyc-documents storage bucket (if it doesn't already exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS: Allow authenticated users to upload their own documents
DO $$
BEGIN
  -- Insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'KYC Auth Upload Access'
  ) THEN
    EXECUTE 'CREATE POLICY "KYC Auth Upload Access" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''kyc-documents'' AND auth.role() = ''authenticated'')';
  END IF;

  -- Select policy (Admins only for privacy)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'KYC Admin Read Access'
  ) THEN
    EXECUTE 'CREATE POLICY "KYC Admin Read Access" ON storage.objects FOR SELECT USING (bucket_id = ''kyc-documents'' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin'')))';
  END IF;
END $$;

-- Done!
SELECT 'KYC setup complete. The kyc_submissions table and kyc-documents bucket are ready.' AS result;
