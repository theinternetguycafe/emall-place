-- ================================================================
-- ADD SELLER_ID TO ORDER_ITEMS
-- Run in Supabase SQL Editor
-- This supports the new seller_profiles architecture.
-- ================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'order_items' 
        AND column_name = 'seller_id'
    ) THEN
        ALTER TABLE public.order_items 
        ADD COLUMN seller_id UUID REFERENCES public.seller_profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- After adding the column, we must tell PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
