-- Run this in your Supabase SQL Editor to create the bucket and set up RLS policies.
-- Note: You can also do this manually in the Supabase Dashboard under Storage.

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kyc-documents', 'kyc-documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS Policies for kyc-documents bucket
-- Allow public read (for admin to view documents)
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'kyc-documents');

-- Allow authenticated users to upload their own documents
CREATE POLICY "Auth Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kyc-documents' 
  AND auth.role() = 'authenticated'
);

-- Allow owners to update/delete their own documents
CREATE POLICY "Owner Update Access"
ON storage.objects FOR UPDATE
USING (bucket_id = 'kyc-documents' AND auth.uid() = owner);

CREATE POLICY "Owner Delete Access"
ON storage.objects FOR DELETE
USING (bucket_id = 'kyc-documents' AND auth.uid() = owner);
