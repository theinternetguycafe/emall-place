-- ============================================================
-- SPRINT 1: AUCTION FOUNDATION
-- The Auction Domain wrapper for the Commerce OS.
-- No Bidding, no Payments. Just the Domain lifecycle.
-- ============================================================

-- 1. AUCTIONS TABLE
CREATE TABLE IF NOT EXISTS public.auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  
  -- The Neutral Asset Reference
  asset_domain TEXT NOT NULL, -- e.g. 'product', 'service', 'property', 'vehicle'
  asset_id UUID NOT NULL, 
  
  -- Core Auction Settings
  title TEXT NOT NULL,
  description TEXT,
  starting_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  reserve_price DECIMAL(10, 2), -- Nullable: no reserve means highest bid wins
  buy_now_price DECIMAL(10, 2), -- Nullable: reserved for future Instant Buy
  
  -- Future Policies
  policies JSONB DEFAULT '{}'::jsonb,
  
  -- Lifecycle Configuration
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'live', 'ended', 'cancelled')),
  
  -- Lifecycle Tracking (Analytics)
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  live_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Optimistic Locking
  version INT NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auctions_asset_id ON public.auctions (asset_id);
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON public.auctions (seller_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON public.auctions (status);

-- 2. ROW LEVEL SECURITY
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

-- Drop existing if any
DROP POLICY IF EXISTS "Sellers can manage their own auctions" ON public.auctions;
DROP POLICY IF EXISTS "Anyone can view published/live/ended auctions" ON public.auctions;

-- Sellers can insert their own auctions
CREATE POLICY "Sellers can insert their own auctions" ON public.auctions
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()));

-- Sellers can update their own auctions ONLY IF NOT live/ended/cancelled
CREATE POLICY "Sellers can update mutable auctions" ON public.auctions
  FOR UPDATE TO authenticated
  USING (
    seller_id = (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()) 
    AND status IN ('draft', 'published')
  )
  WITH CHECK (
    seller_id = (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid())
    -- Cannot transition backward or arbitrarily to live from draft
  );

-- Sellers can view their own auctions regardless of state
CREATE POLICY "Sellers can view own auctions" ON public.auctions
  FOR SELECT TO authenticated
  USING (seller_id = (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()));

-- Public can view forward-facing auctions
CREATE POLICY "Public can view active auctions" ON public.auctions
  FOR SELECT TO public
  USING (status IN ('published', 'scheduled', 'live', 'ended'));

-- Future Events Expected:
-- AuctionCreated, AuctionPublished, AuctionScheduled, AuctionStarted, AuctionEnded, AuctionCancelled
