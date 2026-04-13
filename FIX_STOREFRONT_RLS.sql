-- ============================================================
-- FIX: Storefront Profile RLS Policy
-- Run this in your Supabase SQL Editor
-- This ensures that anonymous users can view seller profiles
-- and their associated stores. Without this, the frontend 
-- query fails silently and returns null for the store.
-- ============================================================

DROP POLICY IF EXISTS "Public can view seller profiles" ON seller_profiles;
CREATE POLICY "Public can view seller profiles" 
ON seller_profiles 
FOR SELECT 
USING (true);

-- Ensure stores table is also readable
DROP POLICY IF EXISTS "Public can view stores" ON stores;
CREATE POLICY "Public can view stores" 
ON stores 
FOR SELECT 
USING (true);
