-- ============================================================
-- FIX_STOREFRONT_BRANDING.sql
-- Run this ENTIRE script in your Supabase SQL Editor.
-- It fixes missing stores rows, restores images from legacy 
-- table, and sets up the storage buckets properly.
-- ============================================================

-- STEP 1: Ensure every seller_profile has a matching stores row
INSERT INTO stores (seller_id)
SELECT id FROM seller_profiles
WHERE id NOT IN (SELECT seller_id FROM stores WHERE seller_id IS NOT NULL)
ON CONFLICT DO NOTHING;

-- STEP 2: Restore images from the legacy seller_stores table
-- (Uses COALESCE so it won't overwrite any images already in stores)
UPDATE stores
SET
  logo_url   = COALESCE(stores.logo_url,   ss.logo_url),
  banner_url = COALESCE(stores.banner_url,  ss.banner_url),
  tagline    = COALESCE(stores.tagline,     ss.tagline),
  description = COALESCE(stores.description, ss.description)
FROM seller_stores ss
JOIN seller_profiles sp ON sp.user_id = ss.owner_id
WHERE stores.seller_id = sp.id
  AND (ss.logo_url IS NOT NULL OR ss.banner_url IS NOT NULL);

-- STEP 3: Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-logos', 'store-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('store-banners', 'store-banners', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- STEP 4: Drop + recreate storage policies for store-logos
DROP POLICY IF EXISTS "Anyone can view store logos" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can upload their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can update their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can delete their own logos" ON storage.objects;

CREATE POLICY "Anyone can view store logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'store-logos');

CREATE POLICY "Sellers can upload their own logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'store-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Sellers can update their own logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'store-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Sellers can delete their own logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'store-logos' AND auth.uid() IS NOT NULL);

-- STEP 5: Drop + recreate storage policies for store-banners
DROP POLICY IF EXISTS "Anyone can view store banners" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can upload their own banners" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can update their own banners" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can delete their own banners" ON storage.objects;

CREATE POLICY "Anyone can view store banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'store-banners');

CREATE POLICY "Sellers can upload their own banners"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'store-banners' AND auth.uid() IS NOT NULL);

CREATE POLICY "Sellers can update their own banners"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'store-banners' AND auth.uid() IS NOT NULL);

CREATE POLICY "Sellers can delete their own banners"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'store-banners' AND auth.uid() IS NOT NULL);

-- STEP 6: Ensure stores table has correct RLS policies
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view stores" ON stores;
DROP POLICY IF EXISTS "Sellers can update their own store" ON stores;
DROP POLICY IF EXISTS "Sellers can insert their own store" ON stores;

CREATE POLICY "Anyone can view stores"
  ON stores FOR SELECT USING (true);

CREATE POLICY "Sellers can update their own store"
  ON stores FOR UPDATE
  USING (seller_id IN (
    SELECT id FROM seller_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Sellers can insert their own store"
  ON stores FOR INSERT
  WITH CHECK (seller_id IN (
    SELECT id FROM seller_profiles WHERE user_id = auth.uid()
  ));

-- STEP 7: Verify the result
SELECT 
  sp.store_name,
  sp.kyc_status,
  s.logo_url IS NOT NULL AS has_logo,
  s.banner_url IS NOT NULL AS has_banner,
  s.logo_url,
  s.banner_url
FROM seller_profiles sp
LEFT JOIN stores s ON s.seller_id = sp.id
ORDER BY sp.created_at DESC
LIMIT 20;
