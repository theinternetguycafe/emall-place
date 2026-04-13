-- ================================================================
-- FIX CHECKOUT RLS POLICIES
-- The checkout creates an order_items which cascades to a trigger
-- or inserts into delivery_events. We need to enable inserts for 
-- authenticated users.
-- ================================================================

-- 1. Fix order_items RLS if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'order_items'
    ) THEN
        DROP POLICY IF EXISTS "Authenticated users can insert order items" ON public.order_items;
        CREATE POLICY "Authenticated users can insert order items"
            ON public.order_items FOR INSERT
            WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- 2. Fix delivery_events RLS
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'delivery_events'
    ) THEN
        DROP POLICY IF EXISTS "Authenticated users can insert delivery events" ON public.delivery_events;
        CREATE POLICY "Authenticated users can insert delivery events"
            ON public.delivery_events FOR INSERT
            WITH CHECK (auth.role() = 'authenticated');
            
        -- Also ensure the handle_new_order trigger has permissions
        -- The initial status event might be created by a trigger
    END IF;
END $$;

-- 3. The initial PostgREST joins query issue (PGRST200):
-- It's trying to query seller_profiles AND join profiles:user_id
-- We need to check the constraints on seller_profiles. IF FIX_ORPHAN_PROFILES.sql
-- was run, it might have BOTH fk_user_id -> auth.users AND -> profiles.

-- This is a temporary fix script to get checkout working. Run in Supabase SQL editor.
