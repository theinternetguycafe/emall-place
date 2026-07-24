-- ============================================================
-- SPRINT 5C: ORDERS
-- Orders reference the originating business object through
-- origin_domain + origin_id, making them reusable across
-- every future domain (Auctions, Products, Services, Rentals).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who
  buyer_id UUID NOT NULL REFERENCES auth.users(id),
  seller_id UUID NOT NULL REFERENCES auth.users(id),

  -- Origin: what business transaction created this order?
  origin_domain TEXT NOT NULL,           -- e.g., 'auction', 'product', 'service', 'rental'
  origin_id UUID NOT NULL,              -- e.g., the auction ID or product listing ID

  -- Financials
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency_code TEXT NOT NULL DEFAULT 'ZAR',

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'payment_requested', 'paid', 'fulfilled', 'cancelled', 'disputed', 'refunded')
  ),

  -- Payment deadline tracking
  payment_deadline TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON public.orders (seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_origin ON public.orders (origin_domain, origin_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Buyers and sellers can view their own orders
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Only system (service_role) creates orders from Settlement events
CREATE POLICY "Service role creates orders" ON public.orders
  FOR INSERT TO service_role
  WITH CHECK (true);
