-- ============================================================
-- WhatsApp Commerce Hardening Migration (Phase 5)
-- Fixes FK constraints, RLS gaps, conversation upgrades
-- Run this AFTER 20_whatsapp_commerce_complete.sql
-- ============================================================

-- ============================================================
-- 1. ADD conversation_id TO orders + FK → whatsapp_conversations
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS conversation_id UUID;

-- Drop if exists (idempotent)
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS fk_orders_conversation;

ALTER TABLE public.orders
  ADD CONSTRAINT fk_orders_conversation
  FOREIGN KEY (conversation_id)
  REFERENCES public.whatsapp_conversations(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_conversation_id ON public.orders(conversation_id);

-- ============================================================
-- 2. FIX system_logs CHECK CONSTRAINT (if table exists from migration 14)
-- Adds missing 'conversation_updated' and other event types
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'system_logs'
  ) THEN
    ALTER TABLE public.system_logs
      DROP CONSTRAINT IF EXISTS system_logs_event_type_check;

    ALTER TABLE public.system_logs
      ADD CONSTRAINT system_logs_event_type_check
      CHECK (event_type IN (
        'conversation_created',
        'conversation_updated',
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
      ));

    RAISE NOTICE '✅ system_logs CHECK constraint updated';
  ELSE
    RAISE NOTICE 'ℹ️  system_logs table not found (skipped — using whatsapp_system_logs)';
  END IF;
END $$;

-- ============================================================
-- 3. FIX RLS — Add admin read access to ALL whatsapp tables
-- (Service-role-only was blocking dashboard users)
-- ============================================================

-- whatsapp_system_logs: admin read (may already exist but idempotent)
DROP POLICY IF EXISTS "Admins view system logs" ON public.whatsapp_system_logs;
CREATE POLICY "Admins view system logs"
ON public.whatsapp_system_logs FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- order_transactions: admin read
DROP POLICY IF EXISTS "Admins view order transactions" ON public.order_transactions;
CREATE POLICY "Admins view order transactions"
ON public.order_transactions FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- whatsapp_deliveries: admin read (may already exist from migration 20)
DROP POLICY IF EXISTS "Admins view all deliveries" ON public.whatsapp_deliveries;
CREATE POLICY "Admins view all deliveries"
ON public.whatsapp_deliveries FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- whatsapp_dispatch_requests: admin read
DROP POLICY IF EXISTS "Admins view all dispatch requests" ON public.whatsapp_dispatch_requests;
CREATE POLICY "Admins view all dispatch requests"
ON public.whatsapp_dispatch_requests FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- 4. UPGRADE whatsapp_conversations TABLE
-- Add buyer_name, seller_phone for faster routing (fewer joins)
-- (last_message_at already exists from migration 20)
-- ============================================================
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS buyer_name TEXT,
  ADD COLUMN IF NOT EXISTS seller_phone TEXT;

-- Index for inbox sorting by last activity
CREATE INDEX IF NOT EXISTS idx_conversations_last_message
  ON public.whatsapp_conversations(last_message_at DESC NULLS LAST);

-- ============================================================
-- 5. AUTO-UPDATE last_message_at TRIGGER
-- Updates whatsapp_conversations.last_message_at whenever
-- a new message is inserted into whatsapp_messages
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.whatsapp_conversations
  SET last_message_at = now(), updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_conversation_last_message ON public.whatsapp_messages;
CREATE TRIGGER trg_update_conversation_last_message
  AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();

-- ============================================================
-- 6. VERIFICATION
-- ============================================================
DO $$
DECLARE
  v_conv_has_buyer_name BOOLEAN;
  v_conv_has_seller_phone BOOLEAN;
  v_orders_has_conv_id BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_conversations' AND column_name = 'buyer_name'
  ) INTO v_conv_has_buyer_name;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_conversations' AND column_name = 'seller_phone'
  ) INTO v_conv_has_seller_phone;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'conversation_id'
  ) INTO v_orders_has_conv_id;

  RAISE NOTICE '--- Hardening Verification ---';
  RAISE NOTICE 'whatsapp_conversations.buyer_name:   %', CASE WHEN v_conv_has_buyer_name THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'whatsapp_conversations.seller_phone: %', CASE WHEN v_conv_has_seller_phone THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'orders.conversation_id:              %', CASE WHEN v_orders_has_conv_id THEN '✅' ELSE '❌' END;
END $$;
