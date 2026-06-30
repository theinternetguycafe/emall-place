-- ============================================================
-- FIX: Service Requests Table - Relax Constraints for Broadcasts
-- Issue: service_id was marked NOT NULL, blocking buyer broadcasts
-- Solution: Make service_id nullable for generic service requests
-- ============================================================

-- 1. Make service_id optional (nullable)
ALTER TABLE public.service_requests ALTER COLUMN service_id DROP NOT NULL;

-- 2. Also ensure these are optional (common broadcast issue)
ALTER TABLE public.service_requests ALTER COLUMN service_mode DROP NOT NULL;
ALTER TABLE public.service_requests ALTER COLUMN seller_store_id DROP NOT NULL;

-- 3. Verify the changes
SELECT column_name, is_nullable, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'service_requests'
  AND column_name IN ('service_id', 'service_mode', 'seller_store_id', 'buyer_id', 'title', 'status')
ORDER BY column_name;
