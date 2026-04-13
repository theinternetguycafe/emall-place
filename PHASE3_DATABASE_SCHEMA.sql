-- ============================================================
-- PHASE 3: ORDERS + PAYMENTS
-- Complete database schema for WhatsApp → Order → Payment flow
-- Run this in Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ORDERS TABLE (Core transactional table)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES public.seller_profiles(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Buyer contact info
    buyer_phone TEXT NOT NULL,  -- WhatsApp phone number
    buyer_email TEXT,
    buyer_address TEXT,         -- Delivery address (collected after payment)
    buyer_lat NUMERIC(10, 8),   -- GPS coordinates for delivery
    buyer_lng NUMERIC(11, 8),
    
    -- Order metadata
    quantity INT DEFAULT 1,
    unit_price NUMERIC(10, 2),  -- Price at time of order
    subtotal NUMERIC(10, 2),    -- Quantity × Unit Price
    delivery_fee NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2), -- Subtotal + delivery
    
    -- Status tracking
    status TEXT DEFAULT 'pending',
    -- pending → paid → dispatched → delivered → completed
    
    payment_status TEXT DEFAULT 'unpaid',
    -- unpaid → paid → failed
    
    delivery_mode TEXT, -- 'delivery' or 'pickup'
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    dispatched_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Notes
    notes TEXT  -- Seller notes or special instructions
);

-- Indexes for faster queries
CREATE INDEX idx_orders_buyer_phone ON public.orders(buyer_phone);
CREATE INDEX idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

-- RLS Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own orders"
ON public.orders FOR SELECT
USING (
  auth.uid() = buyer_id OR
  -- Sellers can view orders for their products
  seller_id = (
    SELECT id FROM public.seller_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all orders"
ON public.orders FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "System can create orders"
ON public.orders FOR INSERT
WITH CHECK (true);  -- Service role can insert

CREATE POLICY "Service can update orders"
ON public.orders FOR UPDATE
USING (true);


-- ────────────────────────────────────────────────────────────
-- 2. PAYMENTS TABLE (Payment transaction history)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to order
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    
    -- Payment provider info
    provider TEXT NOT NULL,  -- 'payfast', 'yoco', 'snapscan', etc.
    provider_reference TEXT, -- Transaction ID from provider
    
    -- Payment details
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    
    -- Status tracking
    status TEXT DEFAULT 'pending',
    -- pending → success → failed
    
    payment_method TEXT,     -- 'card', 'bank_transfer', 'eft', etc.
    payment_url TEXT,        -- Link sent to buyer
    
    -- Webhook info
    webhook_received BOOLEAN DEFAULT FALSE,
    webhook_signature TEXT,  -- For verification
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    error_message TEXT,
    retry_count INT DEFAULT 0,
    
    -- Metadata
    metadata JSONB  -- Provider-specific data
);

-- Indexes
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_provider_reference ON public.payments(provider_reference);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);

-- RLS Policies
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their payment history"
ON public.payments FOR SELECT
USING (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE buyer_id = auth.uid()
  )
);

CREATE POLICY "Sellers can view payment info for their orders"
ON public.payments FOR SELECT
USING (
  order_id IN (
    SELECT id FROM public.orders o
    WHERE o.seller_id = (
      SELECT id FROM public.seller_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Service role can insert payments"
ON public.payments FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update payments"
ON public.payments FOR UPDATE
USING (true);


-- ────────────────────────────────────────────────────────────
-- 3. ORDER ITEMS TABLE (For future multi-item orders)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES public.seller_profiles(id) ON DELETE SET NULL,
    
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,  -- Product price at time of order
    item_total NUMERIC(10, 2) NOT NULL,  -- quantity × unit_price
    
    -- Commission tracking
    commission_percentage NUMERIC(5, 2) DEFAULT 10.0,  -- Platform commission %
    commission_amount NUMERIC(10, 2),                  -- Calculated amount
    seller_payout NUMERIC(10, 2),                      -- item_total - commission
    
    -- Status (independent of order status)
    item_status TEXT DEFAULT 'pending',
    -- pending → packed → dispatched → in_transit → delivered
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_seller_id ON public.order_items(seller_id);
CREATE INDEX idx_order_items_item_status ON public.order_items(item_status);

-- RLS Policies
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage order items"
ON public.order_items
USING (true);


-- ────────────────────────────────────────────────────────────
-- 4. TRANSACTION HISTORY TABLE (Audit trail)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL,  -- 'created', 'payment_sent', 'payment_received', 'dispatched', 'delivered', 'cancelled'
    event_description TEXT,
    
    actor_type TEXT,  -- 'system', 'buyer', 'seller', 'admin'
    actor_id UUID,    -- User who performed action
    
    metadata JSONB,   -- Event-specific data
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for audit trail
CREATE INDEX idx_order_transactions_order_id ON public.order_transactions(order_id);
CREATE INDEX idx_order_transactions_event_type ON public.order_transactions(event_type);
CREATE INDEX idx_order_transactions_created_at ON public.order_transactions(created_at DESC);


-- ────────────────────────────────────────────────────────────
-- 5. HELPER FUNCTIONS
-- ────────────────────────────────────────────────────────────

-- Function: Calculate commission amount
CREATE OR REPLACE FUNCTION calculate_commission(
  item_total NUMERIC,
  commission_pct NUMERIC DEFAULT 10.0
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND(item_total * (commission_pct / 100.0), 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Create audit log entry
CREATE OR REPLACE FUNCTION log_order_transaction(
  p_order_id UUID,
  p_event_type TEXT,
  p_description TEXT,
  p_actor_type TEXT DEFAULT 'system',
  p_actor_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  INSERT INTO public.order_transactions (
    order_id,
    event_type,
    event_description,
    actor_type,
    actor_id,
    metadata
  )
  VALUES (
    p_order_id,
    p_event_type,
    p_description,
    p_actor_type,
    p_actor_id,
    p_metadata
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update order status and log
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_description TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.orders
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_order_id;
  
  PERFORM log_order_transaction(
    p_order_id,
    p_new_status,
    p_description,
    'system'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────────────────────────────
-- 6. TRIGGERS FOR AUTOMATIC UPDATES
-- ────────────────────────────────────────────────────────────

-- Trigger: Auto-update order updated_at timestamp
CREATE OR REPLACE FUNCTION update_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_order_timestamp ON public.orders;
CREATE TRIGGER trg_update_order_timestamp
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION update_order_timestamp();

-- Trigger: Auto-calculate seller payout when order_items created
CREATE OR REPLACE FUNCTION calculate_order_item_payout()
RETURNS TRIGGER AS $$
BEGIN
  NEW.commission_amount = calculate_commission(NEW.item_total, NEW.commission_percentage);
  NEW.seller_payout = NEW.item_total - COALESCE(NEW.commission_amount, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_order_item_payout ON public.order_items;
CREATE TRIGGER trg_calculate_order_item_payout
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION calculate_order_item_payout();


-- ════════════════════════════════════════════════════════════
-- MIGRATION HELPER: Populate orders from existing data
-- (Run if you have legacy orders to migrate)
-- ════════════════════════════════════════════════════════════

-- Example (adjust based on your actual legacy data):
/*
INSERT INTO public.orders (
  product_id,
  seller_id,
  buyer_phone,
  quantity,
  unit_price,
  subtotal,
  total_amount,
  status,
  payment_status,
  created_at
)
SELECT
  -- adjust these columns to match your actual data schema
  product_id,
  seller_id,
  phone,
  1,
  price,
  price * 1,
  price,
  'completed',
  'paid',
  created_at
FROM legacy_orders;  -- adjust table name
*/


-- ════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ════════════════════════════════════════════════════════════

-- Check tables were created
SELECT COUNT(*) as orders_count FROM public.orders;
SELECT COUNT(*) as payments_count FROM public.payments;
SELECT COUNT(*) as order_items_count FROM public.order_items;
SELECT COUNT(*) as transactions_count FROM public.order_transactions;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('orders', 'payments', 'order_items', 'order_transactions');


-- ════════════════════════════════════════════════════════════
-- GRANTS (for Edge Functions / Service Role)
-- ════════════════════════════════════════════════════════════
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.orders TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.payments TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.order_items TO service_role;
GRANT SELECT, INSERT ON public.order_transactions TO service_role;
GRANT EXECUTE ON FUNCTION log_order_transaction TO service_role;
GRANT EXECUTE ON FUNCTION update_order_status TO service_role;
GRANT EXECUTE ON FUNCTION calculate_commission TO service_role;

