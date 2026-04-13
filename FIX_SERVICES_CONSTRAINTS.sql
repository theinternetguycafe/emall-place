-- ============================================================
-- FIX: Services Table constraints for One Seller Profile migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Relax NOT NULL constraints on legacy columns
--    The new architecture uses 'seller_id' and 'base_rate' primarily.
--    'seller_store_id' is legacy and must be nullable to support new listings.

ALTER TABLE public.services ALTER COLUMN seller_store_id DROP NOT NULL;

-- 2. (Optional but Safe) Relax other potentially problematic legacy columns
--    In case they are also marked as NOT NULL in older schemas.
ALTER TABLE public.services ALTER COLUMN service_category_id DROP NOT NULL;
ALTER TABLE public.services ALTER COLUMN base_price DROP NOT NULL;

-- 3. Verify the fix
--    Check the column definitions after running the script.
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'services'
  AND column_name IN ('seller_store_id', 'service_category_id', 'base_price', 'seller_id', 'base_rate')
ORDER BY column_name;
