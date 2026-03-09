-- ============================================================================
-- ORDER STATUS CHECK CONSTRAINT FIX
-- ============================================================================
-- Fix for PostgreSQL Error 23514 (CHECK constraint violation)
-- When attempting to set orders.status = 'failed'
--
-- BEFORE: status IN ('pending', 'processing', 'completed', 'cancelled')
-- AFTER:  status IN ('pending', 'processing', 'completed', 'cancelled', 'failed')
-- ============================================================================

-- Start transaction
BEGIN;

-- Step 1: Verify current constraint exists
-- This shows what constraint is currently restricting the status column
-- Expected to find: orders_status_check
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'orders' AND constraint_type = 'CHECK'
ORDER BY constraint_name;

-- Step 2: Remove the old constraint (without 'failed')
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_status_check;

-- Step 3: Add the new constraint (with 'failed')
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'failed'));

-- Step 4: Verify the constraint was created correctly
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints
WHERE table_name = 'orders' AND constraint_type = 'CHECK'
ORDER BY constraint_name;

-- Step 5: Verify payment_status constraint (should already have 'failed')
-- Expected: payment_status IN ('unpaid', 'paid', 'failed')
--(Unable to view check_clause in standard information_schema, 
-- but constraint should already be correct from 00_schema.sql)

-- Step 6: Test that 'failed' status can now be set
-- Uncomment to test (replace 'test-order-id' with actual order ID):
-- UPDATE public.orders 
-- SET status = 'failed', payment_status = 'failed'
-- WHERE id = 'test-order-id';

-- Commit transaction
COMMIT;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- This migration:
--   ✓ Adds 'failed' as allowed value for orders.status
--   ✓ Enables PATCH /orders to set status='failed' when payment fails
--   ✓ Resolves error 23514 (CHECK constraint violation)
--   ✓ Maintains backward compatibility (no data loss)
--   ✓ payment_status already supports 'failed' (no changes needed)
--
-- Affected:
--   - Table: public.orders
--   - Column: status
--   - Constraint: orders_status_check (CHECK)
--
-- Impact:
--   - Checkout failure handling can now persist failed status
--   - Database consistency with application logic
--   - Error handling complete for payment failures
-- ============================================================================
