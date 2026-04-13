-- ================================================================
-- FIX PRODUCT LIKES FOREIGN KEY
-- Run in Supabase SQL Editor
-- This allows PostgREST to join user_id to public.profiles
-- ================================================================

DO $$
BEGIN
    ALTER TABLE public.product_likes DROP CONSTRAINT IF EXISTS product_likes_user_id_fkey;
    ALTER TABLE public.product_likes ADD CONSTRAINT product_likes_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped FK recreation: %', SQLERRM;
END $$;

NOTIFY pgrst, 'reload schema';
