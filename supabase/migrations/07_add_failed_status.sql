-- Migration: Add 'failed' status to orders table
-- This allows marking orders as failed when payment processing fails
-- Error 23514 occurs when trying to set status='failed' without this migration

BEGIN;

-- 1. Drop the existing CHECK constraint on orders.status
-- The old constraint only allows: ('pending', 'processing', 'completed', 'cancelled')
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 2. Add new CHECK constraint with 'failed' included
-- New constraint allows: ('pending', 'processing', 'completed', 'cancelled', 'failed')
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'failed'));

-- 3. Verify payment_status constraint
-- Status: payment_status already has 'failed' constraint
-- Constraint: check (payment_status in ('unpaid', 'paid', 'failed'))
-- Action: No changes needed - already supports 'failed'

COMMIT;

-- Migration Notes:
-- ================
-- 
-- BEFORE:
--   orders.status allowed:     ('pending', 'processing', 'completed', 'cancelled')
--   orders.payment_status:     ('unpaid', 'paid', 'failed') ✓
--
-- AFTER:
--   orders.status allowed:     ('pending', 'processing', 'completed', 'cancelled', 'failed') ✓
--   orders.payment_status:     ('unpaid', 'paid', 'failed') ✓
--
-- This enables checkout handlers to set status='failed' when payment fails
-- Prevents error 23514 (CHECK constraint violation)
