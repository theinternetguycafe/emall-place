-- ============================================================
-- SPRINT 5A: TIMER CAPABILITY — SCHEDULED EVENTS
-- A completely generic, domain-agnostic event scheduler.
-- It doesn't know about auctions, payments, or rentals.
-- It only knows: "Fire this event at this time."
-- ============================================================

CREATE TABLE IF NOT EXISTS public.scheduled_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What event to fire
  event_type TEXT NOT NULL,              -- e.g., 'AuctionExpired', 'PaymentDeadlinePassed'

  -- What it targets (generic, domain-agnostic)
  target_domain TEXT NOT NULL,           -- e.g., 'auction', 'order', 'rental'
  target_id UUID NOT NULL,

  -- When to fire
  trigger_at TIMESTAMPTZ NOT NULL,

  -- Arbitrary context passed into the event payload on fire
  payload JSONB DEFAULT '{}',

  -- Execution tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fired', 'cancelled', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  fired_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optimize: find all pending events whose trigger time has passed
CREATE INDEX IF NOT EXISTS idx_scheduled_events_pending
  ON public.scheduled_events (trigger_at)
  WHERE status = 'pending';

-- Optimize: lookup by target
CREATE INDEX IF NOT EXISTS idx_scheduled_events_target
  ON public.scheduled_events (target_domain, target_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.scheduled_events ENABLE ROW LEVEL SECURITY;

-- Only the system (service_role) should read/write scheduled events.
-- No end-user should directly manipulate timers.
CREATE POLICY "Service role manages scheduled events" ON public.scheduled_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
