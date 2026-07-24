-- ============================================================
-- SPRINT 2A: BIDDING CAPABILITY - THE BID LEDGER
-- The immutable source of truth for all bids across the OS.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The Target Reference (Agnostic to Domain)
  target_domain TEXT NOT NULL, -- e.g., 'auction'
  target_id UUID NOT NULL,
  
  -- The Bidder
  bidder_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- The Financials
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency_code TEXT NOT NULL DEFAULT 'ZAR',
  
  -- Concurrency & Idempotency
  sequence_number BIGINT GENERATED ALWAYS AS IDENTITY,
  request_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  
  -- Immutability Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optimize for finding the highest bid for a specific target
CREATE INDEX IF NOT EXISTS idx_bids_target ON public.bids (target_domain, target_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON public.bids (bidder_id);

-- ============================================================
-- ROW LEVEL SECURITY: IMMUTABLE LEDGER
-- ============================================================
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- 1. Anyone can read bids (needed for real-time updates and public ledgers)
CREATE POLICY "Public can view bids" ON public.bids
  FOR SELECT TO public
  USING (true);

-- 2. Authenticated users can attempt to insert a bid
-- (Business rules like minimum increment are handled by the Capability layer)
CREATE POLICY "Authenticated users can insert bids" ON public.bids
  FOR INSERT TO authenticated
  WITH CHECK (
    -- The user must be the authenticated bidder
    bidder_id = auth.uid()
    -- Note: We could add a check to ensure they are not suspended here
  );

-- 3. NO UPDATE OR DELETE ALLOWED
-- The ledger is strictly append-only.
