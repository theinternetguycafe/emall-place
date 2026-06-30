-- ============================================================
-- BIDDING ENGINE: Phase A Completion
-- Replaces "fastest finger" accept with a proper bid-and-choose flow
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. SERVICE BIDS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_bids (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  seller_id       UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  amount          NUMERIC(10, 2),          -- Optional price quote
  message         TEXT,                    -- Seller pitch / description
  status          TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'accepted' | 'rejected'
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (request_id, seller_id)           -- One bid per seller per request
);

CREATE INDEX IF NOT EXISTS idx_service_bids_request_id ON public.service_bids (request_id);
CREATE INDEX IF NOT EXISTS idx_service_bids_seller_id  ON public.service_bids (seller_id);

-- ─────────────────────────────────────────────────────────────
-- 2. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.service_bids ENABLE ROW LEVEL SECURITY;

-- Drop existing (idempotent)
DROP POLICY IF EXISTS "sellers_can_insert_bids"        ON public.service_bids;
DROP POLICY IF EXISTS "sellers_can_view_own_bids"      ON public.service_bids;
DROP POLICY IF EXISTS "buyers_can_view_bids_on_their_requests" ON public.service_bids;
DROP POLICY IF EXISTS "system_role_can_manage_bids"    ON public.service_bids;

-- Sellers can submit a bid on any broadcasting request
CREATE POLICY "sellers_can_insert_bids" ON public.service_bids
  FOR INSERT TO authenticated
  WITH CHECK (
    -- The bidder must own this seller_id
    seller_id = (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid())
    -- The request must still be broadcasting
    AND EXISTS (
      SELECT 1 FROM public.service_requests
      WHERE id = request_id
        AND status = 'broadcasting'
        AND expires_at > now()
    )
  );

-- Sellers can view their own bids
CREATE POLICY "sellers_can_view_own_bids" ON public.service_bids
  FOR SELECT TO authenticated
  USING (
    seller_id = (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid())
  );

-- Buyers can view all bids on their own requests
CREATE POLICY "buyers_can_view_bids_on_their_requests" ON public.service_bids
  FOR SELECT TO authenticated
  USING (
    request_id IN (
      SELECT id FROM public.service_requests WHERE buyer_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "system_role_can_manage_bids" ON public.service_bids
  FOR ALL TO service_role
  USING (true);

-- ─────────────────────────────────────────────────────────────
-- 3. ENABLE REALTIME FOR SERVICE_BIDS
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'service_bids'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_bids;
    RAISE NOTICE 'service_bids added to supabase_realtime';
  ELSE
    RAISE NOTICE 'service_bids already in supabase_realtime';
  END IF;
END $$;

-- Also ensure service_requests is in realtime (belt-and-suspenders)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'service_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. RPC: accept_service_bid
-- Atomically:
--   a) Mark winning bid as 'accepted'
--   b) Mark all other bids as 'rejected'
--   c) Update service_request → status='in_progress', assigned_seller_id
-- Returns JSON with the accepted bid + seller info
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_service_bid(p_bid_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bid           public.service_bids%ROWTYPE;
  v_request       public.service_requests%ROWTYPE;
  v_seller        public.seller_profiles%ROWTYPE;
  v_store_slug    TEXT;
  v_store_name    TEXT;
BEGIN
  -- 1. Lock and fetch the bid
  SELECT * INTO v_bid
  FROM public.service_bids
  WHERE id = p_bid_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bid not found';
  END IF;

  IF v_bid.status <> 'pending' THEN
    RAISE EXCEPTION 'Bid is no longer pending (status: %)', v_bid.status;
  END IF;

  -- 2. Fetch the request and verify ownership by caller
  SELECT * INTO v_request
  FROM public.service_requests
  WHERE id = v_bid.request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service request not found';
  END IF;

  IF v_request.buyer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the buyer can accept a bid';
  END IF;

  IF v_request.status <> 'broadcasting' THEN
    RAISE EXCEPTION 'Request is no longer accepting bids (status: %)', v_request.status;
  END IF;

  -- 3. Accept the winning bid
  UPDATE public.service_bids
  SET status = 'accepted'
  WHERE id = p_bid_id;

  -- 4. Reject all other bids for this request
  UPDATE public.service_bids
  SET status = 'rejected'
  WHERE request_id = v_bid.request_id
    AND id <> p_bid_id
    AND status = 'pending';

  -- 5. Update the request
  UPDATE public.service_requests
  SET
    status = 'in_progress',
    assigned_seller_id = v_bid.seller_id
  WHERE id = v_bid.request_id;

  -- 6. Fetch seller profile + store info for the response
  SELECT sp.* INTO v_seller
  FROM public.seller_profiles sp
  WHERE sp.id = v_bid.seller_id;

  SELECT s.store_slug, s.store_name
  INTO v_store_slug, v_store_name
  FROM public.seller_stores s
  WHERE s.seller_id = v_bid.seller_id
  LIMIT 1;

  -- 7. Return enriched result
  RETURN jsonb_build_object(
    'bid_id',       v_bid.id,
    'seller_id',    v_bid.seller_id,
    'amount',       v_bid.amount,
    'message',      v_bid.message,
    'store_slug',   v_store_slug,
    'store_name',   COALESCE(v_store_name, v_seller.store_name),
    'seller_phone', v_seller.seller_phone,
    'request_id',   v_bid.request_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_service_bid(UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. RPC: complete_service_job
-- Called by buyer to mark job done. Allows subsequent review insert.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.complete_service_job(
  p_request_id  UUID,
  p_rating      INT,
  p_comment     TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request   public.service_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_request
  FROM public.service_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_request.buyer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the buyer can complete this job';
  END IF;

  IF v_request.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Job is not in progress (status: %)', v_request.status;
  END IF;

  -- Mark completed
  UPDATE public.service_requests
  SET status = 'completed'
  WHERE id = p_request_id;

  -- Insert review (upsert on conflict)
  INSERT INTO public.store_reviews (
    seller_id,
    reviewer_id,
    rating,
    comment
  ) VALUES (
    v_request.assigned_seller_id,
    auth.uid(),
    p_rating,
    p_comment
  )
  ON CONFLICT (seller_id, reviewer_id) DO UPDATE
    SET rating = EXCLUDED.rating,
        comment = EXCLUDED.comment,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_service_job(UUID, INT, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 6. Policy: allow buyers to UPDATE their accepted request status
--    (needed for cancel/complete from the buyer side)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "buyers_can_update_own_requests" ON public.service_requests;
CREATE POLICY "buyers_can_update_own_requests" ON public.service_requests
  FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 7. VERIFICATION
-- ─────────────────────────────────────────────────────────────
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('service_bids', 'service_requests');

SELECT policyname, tablename, cmd
FROM pg_policies
WHERE tablename IN ('service_bids', 'service_requests')
ORDER BY tablename, policyname;

SELECT pubname, tablename
FROM pg_publication_tables
WHERE tablename IN ('service_bids', 'service_requests');

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('accept_service_bid', 'complete_service_job');
