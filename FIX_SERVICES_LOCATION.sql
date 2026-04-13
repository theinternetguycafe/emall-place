-- ============================================================
-- FIX: Services table — add location columns + fix RLS policies
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add latitude & longitude directly to services table
--    (Smart design: inherited from seller_profiles at insert time)
ALTER TABLE services ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION;
ALTER TABLE services ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2. Back-fill existing services with their seller's location
UPDATE services s
SET
  latitude  = sp.latitude,
  longitude = sp.longitude
FROM seller_profiles sp
WHERE sp.id = s.seller_id
  AND s.latitude IS NULL;

-- ============================================================
-- 3. Fix RLS on services table
--    "FOR ALL" policies created by migration_v1.sql only cover
--    SELECT (USING clause), not INSERT (needs WITH CHECK).
--    Re-create with correct coverage.
-- ============================================================

-- Drop any conflicting existing policies
DROP POLICY IF EXISTS "Sellers manage their services"           ON services;
DROP POLICY IF EXISTS "Allow sellers to insert services"        ON services;
DROP POLICY IF EXISTS "Sellers can insert services"             ON services;
DROP POLICY IF EXISTS "Sellers can insert their own services"   ON services;
DROP POLICY IF EXISTS "Sellers can select their own services"   ON services;
DROP POLICY IF EXISTS "Sellers can update their own services"   ON services;
DROP POLICY IF EXISTS "Sellers can delete their own services"   ON services;
DROP POLICY IF EXISTS "Public can read active approved services" ON services;

-- Public read: active + approved
CREATE POLICY "Public can read active approved services"
ON services FOR SELECT
USING (is_active = true AND status = 'approved');

-- Sellers: full control over their own services
CREATE POLICY "Sellers can select their own services"
ON services FOR SELECT
USING (
  seller_id IN (SELECT id FROM seller_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Sellers can insert their own services"
ON services FOR INSERT
WITH CHECK (
  seller_id IN (SELECT id FROM seller_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Sellers can update their own services"
ON services FOR UPDATE
USING (
  seller_id IN (SELECT id FROM seller_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Sellers can delete their own services"
ON services FOR DELETE
USING (
  seller_id IN (SELECT id FROM seller_profiles WHERE user_id = auth.uid())
);

-- ============================================================
-- 4. Also fix products RLS (same seller_id-via-profile pattern)
-- ============================================================
DROP POLICY IF EXISTS "Allow sellers to insert products"    ON products;
DROP POLICY IF EXISTS "Sellers can insert products"         ON products;
DROP POLICY IF EXISTS "sellers_insert_products"             ON products;
DROP POLICY IF EXISTS "Allow sellers to update products"    ON products;
DROP POLICY IF EXISTS "Sellers can update products"         ON products;
DROP POLICY IF EXISTS "sellers_update_products"             ON products;
DROP POLICY IF EXISTS "Allow sellers to delete products"    ON products;
DROP POLICY IF EXISTS "Sellers can delete products"         ON products;
DROP POLICY IF EXISTS "sellers_delete_products"             ON products;
DROP POLICY IF EXISTS "Sellers can insert their own products" ON products;
DROP POLICY IF EXISTS "Sellers can update their own products" ON products;
DROP POLICY IF EXISTS "Sellers can delete their own products" ON products;

CREATE POLICY "Sellers can insert their own products"
ON products FOR INSERT
WITH CHECK (
  seller_id IN (SELECT id FROM seller_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Sellers can update their own products"
ON products FOR UPDATE
USING (
  seller_id IN (SELECT id FROM seller_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Sellers can delete their own products"
ON products FOR DELETE
USING (
  seller_id IN (SELECT id FROM seller_profiles WHERE user_id = auth.uid())
);

-- ============================================================
-- 5. Verify: confirm columns & policies
-- ============================================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'services'
  AND column_name IN ('latitude', 'longitude', 'seller_id', 'base_rate', 'is_active', 'status')
ORDER BY column_name;

SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('products', 'services')
ORDER BY tablename, cmd;
