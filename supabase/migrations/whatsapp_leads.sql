-- ============================================================
-- eMall Place — WhatsApp Leads Migration (Phase 1)
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL, -- Optional (might be generic store lead)
  seller_id uuid REFERENCES seller_profiles(id) ON DELETE CASCADE NOT NULL,
  buyer_session_id text,      -- Used to track anonymous clicks
  intent text DEFAULT 'buy',  -- 'buy', 'enquire', 'service'
  source text DEFAULT 'product_page',
  clicked boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE whatsapp_leads ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Anyone (even anon) can insert a lead (clicking the button)
DROP POLICY IF EXISTS "Anyone can insert a whatsapp lead" ON whatsapp_leads;
CREATE POLICY "Anyone can insert a whatsapp lead"
  ON whatsapp_leads FOR INSERT
  WITH CHECK (true);

-- 2. Sellers can view their own leads
DROP POLICY IF EXISTS "Sellers can view own whatsapp leads" ON whatsapp_leads;
CREATE POLICY "Sellers can view own whatsapp leads"
  ON whatsapp_leads FOR SELECT
  USING (
    seller_id IN (
      SELECT id FROM seller_profiles WHERE user_id = auth.uid()
    )
  );

-- We need seller's whatsapp number. It should be in seller_profiles.
-- Ensure we have seller_phone or whatsapp_number in seller_profiles.
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS whatsapp_number text;

-- If seller_phone exists and whatsapp_number is fresh, we can migrate it,
-- but the frontend can just fall back to seller_phone.
