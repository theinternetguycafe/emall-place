-- ============================================================
-- eMall Place — WhatsApp Messages Migration (Phase 2)
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  message text,
  direction text CHECK (direction IN ('incoming', 'outgoing')) NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL, -- Extracted via Edge Function
  sender_whatsapp_id text, -- unique message ID from Meta
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Edge functions (service role) can insert/select (bypasses RLS)
-- 2. Sellers can view messages related to their products
DROP POLICY IF EXISTS "Sellers can view own whatsapp messages" ON whatsapp_messages;
CREATE POLICY "Sellers can view own whatsapp messages"
  ON whatsapp_messages FOR SELECT
  USING (
    product_id IN (
      SELECT id FROM products WHERE seller_id IN (
        SELECT id FROM seller_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Allow authenticated admins to view everything (optional)
DROP POLICY IF EXISTS "Admins can view everything" ON whatsapp_messages;
CREATE POLICY "Admins can view everything"
  ON whatsapp_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
