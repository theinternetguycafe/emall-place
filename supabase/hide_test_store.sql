-- ============================================================
-- eMall Place — Hide "dev test 2" Store
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Take the seller offline and revoke marketplace visibility flags
UPDATE seller_profiles
SET 
    is_online = false,
    kyc_status = 'pending',
    onboarding_completed = false
WHERE store_name ILIKE '%dev test 2%';

-- 2. Hide any products/services attached to this store just to be perfectly safe
UPDATE products
SET status = 'hidden'
WHERE seller_id IN (
    SELECT id FROM seller_profiles WHERE store_name ILIKE '%dev test 2%'
);
