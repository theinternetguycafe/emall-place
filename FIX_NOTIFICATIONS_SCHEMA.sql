-- ================================================================
-- FIX NOTIFICATIONS SCHEMA
-- Run in Supabase SQL Editor
-- This adds the missing fields from the PHASE12 notification engine
-- that were skipped because the table already existed.
-- ================================================================

DO $$
BEGIN
    -- Add actor_id
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'actor_id'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Add link
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'link'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN link TEXT;
    END IF;
    
    -- In case user_id is missing its foreign key or wrong
    -- We can gracefully ignore errors here if it already exists
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped table constraints error: %', SQLERRM;
END $$;

-- After adding the columns, reload the schema cache so PostgREST sees actor_id and link
NOTIFY pgrst, 'reload schema';
