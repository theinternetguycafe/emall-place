-- ============================================================
-- eMall Place — WhatsApp Commerce Schema (Phase 3)
-- Adds auditing and tracking tables for commerce flows
-- ============================================================

-- 👉 SURGICAL PATCH: Add missing columns to orders table
-- This supports the consolidated WhatsApp Commerce Edge Functions
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.seller_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS buyer_phone TEXT,
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_mode TEXT CHECK (delivery_mode IN ('delivery', 'pickup')),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Create order_transactions table for auditing order lifecycle
CREATE TABLE IF NOT EXISTS public.order_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    event_type text NOT NULL, -- e.g., 'created', 'payment_pending', 'paid', 'dispatched'
    event_description text,
    actor_type text DEFAULT 'system', -- 'system', 'admin', 'seller', 'buyer'
    actor_id uuid REFERENCES auth.users(id),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_transactions ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Anyone with access to the order can view transactions (Sellers/Buyers/Admins)
DROP POLICY IF EXISTS "Users can view order transactions" ON public.order_transactions;
CREATE POLICY "Users can view order transactions"
ON public.order_transactions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE id = order_transactions.order_id 
        AND (
            buyer_id = auth.uid() OR 
            seller_id IN (SELECT id FROM seller_profiles WHERE user_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

-- Allow service role to manage everything (for Edge Functions)
DROP POLICY IF EXISTS "Service role manages transactions" ON public.order_transactions;
CREATE POLICY "Service role manages transactions"
ON public.order_transactions FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_order_transactions_order_id ON public.order_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_order_transactions_type ON public.order_transactions(event_type);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON public.orders(product_id);
