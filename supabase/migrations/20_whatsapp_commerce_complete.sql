-- ============================================================
-- WhatsApp Commerce Complete Schema Migration
-- Adds all necessary tables for buyer↔seller↔driver↔admin flows
-- ============================================================

-- 1. CONVERSATIONS TABLE
-- Tracks buyer-seller interactions initiated via WhatsApp product share
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_phone text NOT NULL,
    seller_id uuid REFERENCES public.seller_profiles(id) ON DELETE SET NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
    state text NOT NULL DEFAULT 'START' CHECK (state IN (
        'START', 'VIEWING_PRODUCT', 'CHOOSING_ACTION', 'WAITING_FOR_BUYER', 
        'WAITING_FOR_SELLER', 'ORDER_PENDING', 'AWAITING_PAYMENT', 'DISPATCHING', 
        'DELIVERY_ASSIGNED', 'COMPLETED'
    )),
    metadata jsonb DEFAULT '{}'::jsonb,
    buyer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    last_message_at timestamp WITH TIME ZONE,
    created_at timestamp WITH TIME ZONE DEFAULT now(),
    updated_at timestamp WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_buyer_phone ON public.whatsapp_conversations(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON public.whatsapp_conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_product_id ON public.whatsapp_conversations(product_id);
CREATE INDEX IF NOT EXISTS idx_conversations_state ON public.whatsapp_conversations(state);

-- 2. MESSAGES TABLE
-- All messages in conversations (buyer, seller, bot)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
    sender text NOT NULL CHECK (sender IN ('buyer', 'seller', 'bot', 'driver')),
    message text NOT NULL,
    message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'location')),
    media_url text,
    is_read boolean DEFAULT false,
    created_at timestamp WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.whatsapp_messages(sender);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.whatsapp_messages(created_at);

-- 3. DELIVERIES TABLE
-- Track delivery/pickup information for orders
CREATE TABLE IF NOT EXISTS public.whatsapp_deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
    driver_phone text,
    driver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled'
    )),
    pickup_address text,
    dropoff_address text,
    pickup_coordinates jsonb DEFAULT NULL,
    dropoff_coordinates jsonb DEFAULT NULL,
    estimated_delivery_time timestamp WITH TIME ZONE,
    actual_delivery_time timestamp WITH TIME ZONE,
    notes text,
    created_at timestamp WITH TIME ZONE DEFAULT now(),
    updated_at timestamp WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON public.whatsapp_deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_id ON public.whatsapp_deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.whatsapp_deliveries(status);

-- 4. DISPATCH_REQUESTS TABLE
-- Tracks delivery requests waiting for driver acceptance
CREATE TABLE IF NOT EXISTS public.whatsapp_dispatch_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
    delivery_id uuid REFERENCES public.whatsapp_deliveries(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'accepted', 'rejected', 'expired')),
    broadcast_count integer DEFAULT 0,
    last_broadcast_at timestamp WITH TIME ZONE,
    accepted_by_driver_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    accepted_at timestamp WITH TIME ZONE,
    created_at timestamp WITH TIME ZONE DEFAULT now(),
    updated_at timestamp WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_requests_order_id ON public.whatsapp_dispatch_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_requests_status ON public.whatsapp_dispatch_requests(status);

-- 5. SYSTEM_LOGS TABLE
-- Comprehensive audit trail for all commerce actions
CREATE TABLE IF NOT EXISTS public.whatsapp_system_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    log_type text NOT NULL CHECK (log_type IN (
        'conversation_created', 'message_sent', 'order_created', 'payment_received',
        'driver_assigned', 'delivery_started', 'delivery_completed', 'error', 'other'
    )),
    reference_id uuid,
    reference_type text,
    actor_type text CHECK (actor_type IN ('buyer', 'seller', 'driver', 'admin', 'bot')),
    actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_phone text,
    message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_type ON public.whatsapp_system_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_reference ON public.whatsapp_system_logs(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.whatsapp_system_logs(created_at DESC);

-- 6. ENHANCE EXISTING ORDERS TABLE (if not already done)
-- Ensure all WhatsApp-related fields exist
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

-- 7. ENABLE RLS ON ALL TABLES
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_dispatch_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_system_logs ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES FOR CONVERSATIONS
-- Buyers: can view their own conversations
DROP POLICY IF EXISTS "Buyers view own conversations" ON public.whatsapp_conversations;
CREATE POLICY "Buyers view own conversations"
ON public.whatsapp_conversations FOR SELECT
USING (buyer_id = auth.uid());

-- Sellers: can view conversations about their products
DROP POLICY IF EXISTS "Sellers view conversations about their products" ON public.whatsapp_conversations;
CREATE POLICY "Sellers view conversations about their products"
ON public.whatsapp_conversations FOR SELECT
USING (
    seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid())
);

-- Admins: can view all
DROP POLICY IF EXISTS "Admins view all conversations" ON public.whatsapp_conversations;
CREATE POLICY "Admins view all conversations"
ON public.whatsapp_conversations FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Service role: can manage everything
DROP POLICY IF EXISTS "Service role manages conversations" ON public.whatsapp_conversations;
CREATE POLICY "Service role manages conversations"
ON public.whatsapp_conversations FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- 9. RLS POLICIES FOR MESSAGES
-- Users can view messages in conversations they're part of
DROP POLICY IF EXISTS "Users view messages in their conversations" ON public.whatsapp_messages;
CREATE POLICY "Users view messages in their conversations"
ON public.whatsapp_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.whatsapp_conversations c
        WHERE c.id = conversation_id AND (
            c.buyer_id = auth.uid() OR
            c.seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

-- Service role can insert/update
DROP POLICY IF EXISTS "Service role manages messages" ON public.whatsapp_messages;
CREATE POLICY "Service role manages messages"
ON public.whatsapp_messages FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- 10. RLS POLICIES FOR DELIVERIES
-- Buyers: can view deliveries for their orders
DROP POLICY IF EXISTS "Buyers view their delivery status" ON public.whatsapp_deliveries;
CREATE POLICY "Buyers view their delivery status"
ON public.whatsapp_deliveries FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND o.buyer_id = auth.uid()
    )
);

-- Sellers: can view deliveries for their orders
DROP POLICY IF EXISTS "Sellers view delivery status" ON public.whatsapp_deliveries;
CREATE POLICY "Sellers view delivery status"
ON public.whatsapp_deliveries FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND o.seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid())
    )
);

-- Drivers: can view assigned deliveries
DROP POLICY IF EXISTS "Drivers view assigned deliveries" ON public.whatsapp_deliveries;
CREATE POLICY "Drivers view assigned deliveries"
ON public.whatsapp_deliveries FOR SELECT
USING (driver_id = auth.uid());

-- Admins: can view all
DROP POLICY IF EXISTS "Admins view all deliveries" ON public.whatsapp_deliveries;
CREATE POLICY "Admins view all deliveries"
ON public.whatsapp_deliveries FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Service role: can manage
DROP POLICY IF EXISTS "Service role manages deliveries" ON public.whatsapp_deliveries;
CREATE POLICY "Service role manages deliveries"
ON public.whatsapp_deliveries FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- 11. RLS POLICIES FOR DISPATCH_REQUESTS
-- Drivers: can view and accept open requests
DROP POLICY IF EXISTS "Drivers view open dispatch requests" ON public.whatsapp_dispatch_requests;
CREATE POLICY "Drivers view open dispatch requests"
ON public.whatsapp_dispatch_requests FOR SELECT
USING (status IN ('waiting', 'accepted'));

-- Admins: can view all
DROP POLICY IF EXISTS "Admins view all dispatch requests" ON public.whatsapp_dispatch_requests;
CREATE POLICY "Admins view all dispatch requests"
ON public.whatsapp_dispatch_requests FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Service role: can manage
DROP POLICY IF EXISTS "Service role manages dispatch requests" ON public.whatsapp_dispatch_requests;
CREATE POLICY "Service role manages dispatch requests"
ON public.whatsapp_dispatch_requests FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- 12. RLS POLICIES FOR SYSTEM_LOGS
-- Admins: can view all logs
DROP POLICY IF EXISTS "Admins view system logs" ON public.whatsapp_system_logs;
CREATE POLICY "Admins view system logs"
ON public.whatsapp_system_logs FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Service role: can insert logs
DROP POLICY IF EXISTS "Service role inserts logs" ON public.whatsapp_system_logs;
CREATE POLICY "Service role inserts logs"
ON public.whatsapp_system_logs FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
