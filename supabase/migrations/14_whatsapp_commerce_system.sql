-- ============================================================
-- WhatsApp Commerce + Dispatch System (Phase 4)
-- Complete schema for unified WhatsApp marketplace
-- FIXED: Proper dependency ordering for Postgres
-- ============================================================

-- ============================================================
-- NOTE: Columns for orders table should be added manually first:
-- Run this BEFORE running the full migration:
--
-- ALTER TABLE public.orders
--     ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) DEFAULT 0,
--     ADD COLUMN IF NOT EXISTS delivery_mode TEXT CHECK (delivery_mode IN ('delivery', 'pickup')),
--     ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
--     ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
--     ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
-- ============================================================
-- (conversation_id will be added in a separate migration after these tables are created)

-- ============================================================
-- STEP 2: CREATE CONVERSATIONS TABLE (NO foreign keys - data only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_phone TEXT NOT NULL,
    seller_id UUID,
    product_id UUID,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'resolved')),
    state TEXT NOT NULL DEFAULT 'START' CHECK (state IN (
        'START',
        'VIEWING_PRODUCT',
        'CHOOSING_ACTION',
        'WAITING_FOR_BUYER',
        'WAITING_FOR_SELLER',
        'ORDER_PENDING',
        'AWAITING_PAYMENT',
        'DISPATCHING',
        'DELIVERY_ASSIGNED',
        'COMPLETED'
    )),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_conversations_buyer_phone ON public.conversations(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON public.conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_product_id ON public.conversations(product_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);

-- ============================================================
-- STEP 3: CREATE MESSAGES TABLE (depends on conversations)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('buyer', 'seller', 'bot')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- ============================================================
-- STEP 4: CREATE PAYMENTS TABLE (depends on orders)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('payfast', 'snapscan', 'yoco')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    payment_url TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    payment_reference TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON public.payments(provider);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_reference ON public.payments(payment_reference);

-- ============================================================
-- STEP 5: CREATE DELIVERIES TABLE (depends on orders)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    driver_phone TEXT,
    driver_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'assigned',
        'picked_up',
        'in_transit',
        'delivered',
        'failed',
        'cancelled'
    )),
    pickup_address TEXT NOT NULL,
    dropoff_address TEXT NOT NULL,
    pickup_time TIMESTAMPTZ,
    delivery_time TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON public.deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_phone ON public.deliveries(driver_phone);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);

-- ============================================================
-- STEP 6: CREATE DISPATCH_REQUESTS TABLE (depends on orders)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dispatch_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'accepted', 'expired', 'cancelled')),
    pickup_address TEXT NOT NULL,
    dropoff_address TEXT NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 hour'),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dispatch_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dispatch_requests_status ON public.dispatch_requests(status);
CREATE INDEX IF NOT EXISTS idx_dispatch_requests_order_id ON public.dispatch_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_requests_expires_at ON public.dispatch_requests(expires_at);

-- ============================================================
-- STEP 7: CREATE SYSTEM_LOGS TABLE (safe FKs with ON DELETE SET NULL)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL CHECK (event_type IN (
        'conversation_created',
        'message_sent',
        'order_created',
        'order_updated',
        'payment_initiated',
        'payment_received',
        'payment_failed',
        'delivery_assigned',
        'delivery_started',
        'delivery_completed',
        'delivery_failed',
        'dispatch_request_created',
        'driver_accepted',
        'error',
        'admin_action'
    )),
    reference_id UUID,
    reference_type TEXT,
    message TEXT NOT NULL,
    actor_type TEXT DEFAULT 'system' CHECK (actor_type IN ('system', 'admin', 'seller', 'buyer', 'driver', 'bot')),
    actor_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_system_logs_event_type ON public.system_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_reference_id ON public.system_logs(reference_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_actor_id ON public.system_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_reference_type ON public.system_logs(reference_type);

-- ============================================================
-- STEP 8: ADD RLS POLICIES (all tables now exist)
-- ============================================================

-- CONVERSATIONS RLS
DROP POLICY IF EXISTS "Buyers can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Sellers can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Buyers can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Conversations service role" ON public.conversations;
CREATE POLICY "Conversations service role" ON public.conversations FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- MESSAGES RLS
DROP POLICY IF EXISTS "Conversation participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Messages service role" ON public.messages;
CREATE POLICY "Messages service role" ON public.messages FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- PAYMENTS RLS
DROP POLICY IF EXISTS "Users can view their order payments" ON public.payments;
DROP POLICY IF EXISTS "Payments service role" ON public.payments;
CREATE POLICY "Payments service role" ON public.payments FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- DELIVERIES RLS
DROP POLICY IF EXISTS "Drivers can view their deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Order participants can view deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Deliveries service role" ON public.deliveries;
CREATE POLICY "Deliveries service role" ON public.deliveries FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- DISPATCH_REQUESTS RLS
DROP POLICY IF EXISTS "Drivers can view dispatch requests" ON public.dispatch_requests;
DROP POLICY IF EXISTS "Dispatch requests service role" ON public.dispatch_requests;
CREATE POLICY "Dispatch requests service role" ON public.dispatch_requests FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- SYSTEM_LOGS RLS
DROP POLICY IF EXISTS "Admins can view system logs" ON public.system_logs;
DROP POLICY IF EXISTS "System logs service role" ON public.system_logs;
CREATE POLICY "System logs service role" ON public.system_logs FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================
-- STEP 9: HELPER FUNCTIONS
-- ============================================================

-- Function to log system events
CREATE OR REPLACE FUNCTION public.log_system_event(
    p_event_type TEXT,
    p_reference_id UUID,
    p_reference_type TEXT,
    p_message TEXT,
    p_actor_type TEXT DEFAULT 'system',
    p_actor_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.system_logs (
        event_type,
        reference_id,
        reference_type,
        message,
        actor_type,
        actor_id,
        metadata
    ) VALUES (
        p_event_type,
        p_reference_id,
        p_reference_type,
        p_message,
        p_actor_type,
        p_actor_id,
        p_metadata
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update conversation state
CREATE OR REPLACE FUNCTION public.update_conversation_state(
    p_conversation_id UUID,
    p_new_state TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.conversations
    SET state = p_new_state, updated_at = now()
    WHERE id = p_conversation_id;

    PERFORM public.log_system_event(
        'conversation_updated',
        p_conversation_id,
        'conversation',
        'State changed to: ' || p_new_state,
        'bot'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- VERIFICATION QUERY (run after migration succeeds)
-- ============================================================
-- SELECT tablename FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('conversations', 'messages', 'payments', 'deliveries', 'dispatch_requests', 'system_logs');
--
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'orders' 
-- AND column_name IN ('conversation_id', 'delivery_fee', 'delivery_mode', 'paid_at', 'dispatched_at', 'delivered_at');

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- All tables created with correct dependency ordering
-- RLS policies applied (service_role only for now)
-- Helper functions ready for edge functions to call
-- ============================================================
