-- PHASE 6.5: Intelligent Service Dominance
-- Adds real-time tracking foundation and availability toggle to sellers

-- 1. Add 'is_online' flag to toggle "Available Now"
ALTER TABLE seller_stores 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- 2. Add 'last_seen_at' for the live tracking heartbeat
ALTER TABLE seller_stores 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;

-- 3. Ensure latitude and longitude columns exist (they should already exist from Phase 2, but ensuring safety)
ALTER TABLE seller_stores 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

ALTER TABLE seller_stores 
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
