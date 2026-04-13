-- ============================================================
-- PATCH: Drop old whatsapp_messages table before running
--        20_whatsapp_commerce_complete.sql
--
-- The original whatsapp_messages.sql (Phase 2) created a simple
-- log table with: phone_number, direction, sender_whatsapp_id
-- The new schema (Phase 4) uses: conversation_id, sender, message_type
--
-- Safe to do ONLY if there is no live production data in the table.
-- Run this FIRST, then run 20_whatsapp_commerce_complete.sql
-- ============================================================

-- Drop old table (CASCADE removes dependent policies/indexes)
DROP TABLE IF EXISTS public.whatsapp_messages CASCADE;

-- Confirm it's gone
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'whatsapp_messages'
    ) THEN
        RAISE NOTICE '✅ Old whatsapp_messages table dropped. Now run 20_whatsapp_commerce_complete.sql';
    END IF;
END $$;
