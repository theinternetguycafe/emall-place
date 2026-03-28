-- SQL to initialize all required storage buckets and set correct permissions
-- Run this in your Supabase SQL Editor

-- 1. Create Buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('kyc-documents', 'kyc-documents', false),
  ('store-logos', 'store-logos', true),
  ('store-banners', 'store-banners', true),
  ('marketplace', 'marketplace', true),
  ('store-images', 'store-images', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable Storage Policies (Public Access)
-- This allows anyone to view images in public buckets

-- Policy for store-logos
CREATE POLICY "Public Access for logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-logos');

CREATE POLICY "Authenticated Upload for logos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'store-logos' AND auth.role() = 'authenticated');

-- Policy for store-banners
CREATE POLICY "Public Access for banners" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-banners');

CREATE POLICY "Authenticated Upload for banners" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'store-banners' AND auth.role() = 'authenticated');

-- Policy for marketplace (Product Images)
CREATE POLICY "Public Access for marketplace" ON storage.objects
  FOR SELECT USING (bucket_id = 'marketplace');

CREATE POLICY "Authenticated Upload for marketplace" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'marketplace' AND auth.role() = 'authenticated');

-- Policy for store-images
CREATE POLICY "Public Access for store-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-images');

CREATE POLICY "Authenticated Upload for store-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'store-images' AND auth.role() = 'authenticated');

-- Policy for avatars
CREATE POLICY "Public Access for avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated Upload for avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');


-- 3. Private Policy for KYC Documents
-- Only the owner can upload/view their own documents
-- Admins can view all documents

CREATE POLICY "KYC Owner Access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'kyc-documents' AND 
    (auth.uid()::text = (storage.foldername(name))[1] OR 
     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  );
