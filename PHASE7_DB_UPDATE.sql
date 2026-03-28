-- PHASE 7: Live Dispatch Domination Engine

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create the competitive dispatch table
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES profiles(id) NOT NULL,
  category_id UUID REFERENCES categories(id),
  title TEXT NOT NULL,
  description TEXT,
  budget NUMERIC,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status TEXT CHECK (status IN ('broadcasting', 'accepted', 'in_progress', 'completed', 'expired')) DEFAULT 'broadcasting',
  assigned_seller_id UUID REFERENCES seller_stores(id),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '2 minutes'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Prevent race conditions with a strict unique constraint if needed, but our UPDATE WHERE logic will handle the lock.
-- We must ensure the `service_requests` table broadcasts to the realtime engine.
BEGIN;
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'service_requests'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;
    END IF;
  END
  $$;
COMMIT;
