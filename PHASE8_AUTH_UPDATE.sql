-- PHASE 8 AUTH & ONBOARDING DATABASE UPDATE

-- 1. Modify seller_stores table
ALTER TABLE seller_stores
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS seller_type text DEFAULT 'product', -- product, service, both
ADD COLUMN IF NOT EXISTS service_mode text, -- on_site, in_house, both
ADD COLUMN IF NOT EXISTS radius_km integer DEFAULT 10;

-- 2. Create kyc_submissions table
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    id_number text NOT NULL,
    document_url text NOT NULL,
    selfie_url text NOT NULL,
    status text DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on kyc_submissions
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own KYC
CREATE POLICY "Users can create their own kyc_submissions"
    ON public.kyc_submissions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can read their own KYC
CREATE POLICY "Users can view their own kyc_submissions"
    ON public.kyc_submissions FOR SELECT
    USING (auth.uid() = user_id);

-- 3. Storage bucket for KYC
-- Note: The bucket 'kyc-documents' needs to be created, and permissions set.
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false) ON CONFLICT (id) DO NOTHING;

-- Storage Policies for kyc-documents (Users can upload, read their own)
CREATE POLICY "Allow authenticated uploads to kyc" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow authenticated read to own kyc" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add index for user_id to speed up queries
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user_id ON public.kyc_submissions(user_id);
