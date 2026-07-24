-- ============================================================
-- PHASE 2: COMMERCE EVENTS LOG
-- This is an immutable event journal. 
-- It is NOT a full Event Sourcing "Event Store" because domains
-- still own their state tables (e.g. auctions, bids).
-- Instead, it serves as the platform's audit trail, observability 
-- backbone, and replay source for projections.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.commerce_events (
  id UUID PRIMARY KEY, -- Recommending UUIDv7 for chronological sorting

  -- Classification
  type TEXT NOT NULL,                  -- e.g., 'BidPlaced'
  category TEXT NOT NULL,              -- 'BUSINESS', 'SYSTEM', 'SECURITY', 'AUDIT'
  domain TEXT NOT NULL,                -- e.g., 'auction', 'payment'
  severity TEXT NOT NULL,              -- 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
  tags TEXT[] DEFAULT '{}',            -- e.g., ['security', 'customer']

  -- Timestamps
  occurred_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Technical Context & Tracing
  schema_version INT NOT NULL,
  producer TEXT NOT NULL,              -- e.g., 'BiddingCapability'
  correlation_id UUID NOT NULL,        -- Ties transactions together (e.g. Auction ID)
  causation_id UUID NOT NULL,          -- Direct cause of this event
  trace_id TEXT,                       -- Optional distributed trace ID
  
  -- Execution Context
  ip_address TEXT,
  user_agent TEXT,
  platform TEXT,
  request_id TEXT,
  session_id TEXT,

  -- Business Fact
  payload JSONB NOT NULL DEFAULT '{}',

  -- Integrity
  checksum TEXT                        -- Prevents tampering with the audit log
);

-- Optimize for time-series queries (Observability Dashboards)
CREATE INDEX IF NOT EXISTS idx_commerce_events_time 
  ON public.commerce_events (occurred_at DESC);

-- Optimize for transaction tracing (Timeline View)
CREATE INDEX IF NOT EXISTS idx_commerce_events_correlation 
  ON public.commerce_events (correlation_id);

-- Optimize for domain-specific analytics (e.g. "All payment events")
CREATE INDEX IF NOT EXISTS idx_commerce_events_domain 
  ON public.commerce_events (domain, occurred_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.commerce_events ENABLE ROW LEVEL SECURITY;

-- The events log is strictly append-only by the service_role (Platform Intelligence).
-- Nobody, not even authenticated users, can read or write directly.
-- Read access is granted via specific Projection views.

CREATE POLICY "Service role appends to events log" ON public.commerce_events
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role reads events log" ON public.commerce_events
  FOR SELECT TO service_role
  USING (true);
