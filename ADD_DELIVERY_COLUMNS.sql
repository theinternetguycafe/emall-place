-- ================================================================
-- ADD DELIVERY FIELDS TO ORDERS TABLE
-- Run in Supabase SQL Editor
-- These columns support the new checkout delivery system
-- ================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_fee     NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_mode    TEXT DEFAULT 'delivery'
    CHECK (delivery_mode IN ('delivery', 'pickup')),
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS buyer_phone      TEXT,
  ADD COLUMN IF NOT EXISTS buyer_lat        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS buyer_lng        DOUBLE PRECISION;

-- Index for analytics / dispatch queries
CREATE INDEX IF NOT EXISTS idx_orders_delivery_mode ON public.orders(delivery_mode);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('delivery_fee','delivery_mode','delivery_address','buyer_phone','buyer_lat','buyer_lng')
ORDER BY column_name;
