-- ============================================================
-- FIX: Products RLS INSERT policy
-- Problem: The existing policy does auth.uid() = seller_id
--          but seller_id = seller_profiles.id (NOT the auth uid)
-- Fix: Join through seller_profiles table
-- ============================================================

-- 1. Drop any broken INSERT policies on products
DROP POLICY IF EXISTS "Allow sellers to insert products" ON products;
DROP POLICY IF EXISTS "Sellers can insert products" ON products;
DROP POLICY IF EXISTS "sellers_insert_products" ON products;

-- 2. Create the correct INSERT policy
CREATE POLICY "Sellers can insert their own products"
ON products
FOR INSERT
WITH CHECK (
  seller_id IN (
    SELECT id FROM seller_profiles WHERE user_id = auth.uid()
  )
);

-- 3. Also fix UPDATE policy (same issue likely exists)
DROP POLICY IF EXISTS "Allow sellers to update products" ON products;
DROP POLICY IF EXISTS "Sellers can update products" ON products;
DROP POLICY IF EXISTS "sellers_update_products" ON products;

CREATE POLICY "Sellers can update their own products"
ON products
FOR UPDATE
USING (
  seller_id IN (
    SELECT id FROM seller_profiles WHERE user_id = auth.uid()
  )
);

-- 4. Also fix DELETE policy
DROP POLICY IF EXISTS "Allow sellers to delete products" ON products;
DROP POLICY IF EXISTS "Sellers can delete products" ON products;
DROP POLICY IF EXISTS "sellers_delete_products" ON products;

CREATE POLICY "Sellers can delete their own products"
ON products
FOR DELETE
USING (
  seller_id IN (
    SELECT id FROM seller_profiles WHERE user_id = auth.uid()
  )
);

-- 5. Also fix the services table INSERT policy while we're here
DROP POLICY IF EXISTS "Allow sellers to insert services" ON services;
DROP POLICY IF EXISTS "Sellers can insert services" ON services;

CREATE POLICY "Sellers can insert their own services"
ON services
FOR INSERT
WITH CHECK (
  seller_id IN (
    SELECT id FROM seller_profiles WHERE user_id = auth.uid()
  )
);

-- 6. Verify: list all policies on products & services
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('products', 'services')
ORDER BY tablename, cmd;
