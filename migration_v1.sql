-- ============================================================
-- eMall Place: Architecture Refactor Migration v1
-- Run this ENTIRE script in Supabase SQL Editor
-- SAFE: additive only — seller_stores is NOT dropped yet
-- ============================================================

-- ─── 1. SELLER PROFILES (core identity table) ───────────────────────────────
CREATE TABLE IF NOT EXISTS seller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  seller_type TEXT NOT NULL DEFAULT 'product'
    CHECK (seller_type IN ('product', 'service', 'both')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,

  store_name TEXT,
  store_slug TEXT UNIQUE,

  kyc_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (kyc_status IN ('not_started', 'pending', 'approved', 'rejected')),

  is_online BOOLEAN DEFAULT false,

  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,

  -- Contact (moved here from seller_stores)
  seller_email TEXT,
  seller_phone TEXT,

  rating_avg NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,

  -- Service-specific
  service_mode TEXT CHECK (service_mode IN ('on_site', 'in_house', 'both')),
  radius_km NUMERIC(6,2) DEFAULT 10,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- ─── 2. STORES (presentation / branding layer) ──────────────────────────────
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE UNIQUE,

  banner_url TEXT,
  logo_url TEXT,
  tagline TEXT,
  description TEXT,
  theme_color TEXT,
  announcement_text TEXT,
  store_policies JSONB,
  featured_product_ids UUID[],

  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. SERVICES (proper service listings) ──────────────────────────────────
-- Note: table may already exist with a different schema — ALTER adds missing columns safely
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add all required columns if they don't already exist
ALTER TABLE services ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES seller_profiles(id) ON DELETE CASCADE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS base_rate NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE services ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ─── 4. SERVICE LOCATIONS (scalable geo coverage) ───────────────────────────
CREATE TABLE IF NOT EXISTS service_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  coverage_radius_km NUMERIC(6,2) DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 5. DATA MIGRATION: seller_stores → seller_profiles ─────────────────────
INSERT INTO seller_profiles (
  user_id, seller_type, onboarding_completed,
  store_name, store_slug,
  kyc_status, is_online,
  latitude, longitude, address,
  seller_email, seller_phone,
  rating_avg, rating_count,
  service_mode, radius_km,
  created_at
)
SELECT
  ss.owner_id,
  COALESCE(ss.seller_type, 'product'),
  true, -- existing sellers have completed onboarding
  ss.store_name,
  -- Slug = sanitised name + first 6 chars of user ID (guarantees global uniqueness)
  lower(regexp_replace(trim(ss.store_name), '[^a-zA-Z0-9]+', '-', 'g'))
    || '-' || substr(replace(ss.owner_id::text, '-', ''), 1, 6),
  CASE ss.kyc_status
    WHEN 'verified' THEN 'approved'
    WHEN 'pending'  THEN 'pending'
    WHEN 'rejected' THEN 'rejected'
    ELSE 'not_started'
  END,
  COALESCE(ss.is_online, false),
  ss.latitude,
  ss.longitude,
  ss.address,
  ss.seller_email,
  ss.seller_phone,
  COALESCE(ss.average_rating, 0),
  COALESCE(ss.review_count, 0),
  ss.service_mode,
  COALESCE(ss.radius_km, 10),
  ss.created_at
FROM seller_stores ss
ON CONFLICT (user_id) DO NOTHING;

-- ─── 6. DATA MIGRATION: seller_stores → stores (branding) ───────────────────
INSERT INTO stores (
  seller_id,
  banner_url, logo_url, tagline, description,
  is_verified, is_featured,
  created_at
)
SELECT
  sp.id,
  ss.banner_url,
  ss.logo_url,
  ss.tagline,
  ss.description,
  COALESCE(ss.is_verified, false),
  false,
  ss.created_at
FROM seller_stores ss
JOIN seller_profiles sp ON sp.user_id = ss.owner_id
ON CONFLICT (seller_id) DO NOTHING;

-- ─── 7. MIGRATE SERVICE-TYPE PRODUCTS → services table ──────────────────────
-- Detects rows where seller_stores.seller_type = 'service' OR stock >= 999
INSERT INTO services (
  seller_id, title, description, base_rate,
  category_id, is_active, status, created_at
)
SELECT
  sp.id,
  p.title,
  p.description,
  p.price,
  p.category_id,
  (p.status = 'approved'),
  p.status,
  p.created_at
FROM products p
JOIN seller_stores ss ON ss.id = p.seller_store_id
JOIN seller_profiles sp ON sp.user_id = ss.owner_id
WHERE ss.seller_type = 'service' OR (p.stock >= 999 AND ss.seller_type IN ('service', 'both'))
ON CONFLICT DO NOTHING;

-- Also insert service_locations for migrated services (using seller lat/lng)
INSERT INTO service_locations (service_id, latitude, longitude, coverage_radius_km)
SELECT
  svc.id,
  sp.latitude,
  sp.longitude,
  COALESCE(sp.radius_km, 10)
FROM services svc
JOIN seller_profiles sp ON sp.id = svc.seller_id
WHERE sp.latitude IS NOT NULL AND sp.longitude IS NOT NULL
ON CONFLICT DO NOTHING;

-- ─── 8. ADD seller_id FK TO products ────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES seller_profiles(id);

UPDATE products p
SET seller_id = sp.id
FROM seller_stores ss
JOIN seller_profiles sp ON sp.user_id = ss.owner_id
WHERE p.seller_store_id = ss.id
  AND p.seller_id IS NULL;

-- ─── 9. ADD seller_id FK TO store_reviews ───────────────────────────────────
-- Reviews go directly to seller identity, not the branding layer
ALTER TABLE store_reviews ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES seller_profiles(id);

UPDATE store_reviews sr
SET seller_id = sp.id
FROM seller_stores ss
JOIN seller_profiles sp ON sp.user_id = ss.owner_id
WHERE sr.store_id = ss.id
  AND sr.seller_id IS NULL;

-- ─── 10. UPDATED_AT TRIGGER for seller_profiles + stores ────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_updated_at_seller_profiles ON seller_profiles;
CREATE TRIGGER set_updated_at_seller_profiles
  BEFORE UPDATE ON seller_profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_stores ON stores;
CREATE TRIGGER set_updated_at_stores
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ─── 11. ROW LEVEL SECURITY ─────────────────────────────────────────────────

-- seller_profiles
ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read seller_profiles" ON seller_profiles;
CREATE POLICY "Public can read seller_profiles"
  ON seller_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Sellers can update their own profile" ON seller_profiles;
CREATE POLICY "Sellers can update their own profile"
  ON seller_profiles FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sellers can insert their own profile" ON seller_profiles;
CREATE POLICY "Sellers can insert their own profile"
  ON seller_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- stores
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read stores" ON stores;
CREATE POLICY "Public can read stores"
  ON stores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Sellers manage their store" ON stores;
CREATE POLICY "Sellers manage their store"
  ON stores FOR ALL
  USING (
    seller_id IN (SELECT id FROM seller_profiles WHERE user_id = auth.uid())
  );

-- services
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active approved services" ON services;
CREATE POLICY "Public can read active approved services"
  ON services FOR SELECT
  USING (is_active = true AND status = 'approved');

DROP POLICY IF EXISTS "Sellers manage their services" ON services;
CREATE POLICY "Sellers manage their services"
  ON services FOR ALL
  USING (
    seller_id IN (SELECT id FROM seller_profiles WHERE user_id = auth.uid())
  );

-- service_locations
ALTER TABLE service_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read service_locations" ON service_locations;
CREATE POLICY "Public can read service_locations"
  ON service_locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Sellers manage their service_locations" ON service_locations;
CREATE POLICY "Sellers manage their service_locations"
  ON service_locations FOR ALL
  USING (
    service_id IN (
      SELECT id FROM services
      WHERE seller_id IN (SELECT id FROM seller_profiles WHERE user_id = auth.uid())
    )
  );

-- ─── 12. INDEXES for performance ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_seller_profiles_user_id ON seller_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_slug ON seller_profiles(store_slug);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_kyc ON seller_profiles(kyc_status);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_online ON seller_profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_stores_seller_id ON stores(seller_id);
CREATE INDEX IF NOT EXISTS idx_services_seller_id ON services(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_service_locations_service_id ON service_locations(service_id);

-- ─── DONE ────────────────────────────────────────────────────────────────────
-- seller_stores is NOT dropped in this script.
-- Drop it only AFTER verifying the frontend is fully migrated:
--   ALTER TABLE products DROP COLUMN IF EXISTS seller_store_id;
--   ALTER TABLE store_reviews DROP COLUMN IF EXISTS store_id;
--   DROP TABLE IF EXISTS seller_stores CASCADE;
