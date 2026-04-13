-- Migration V2: Update order_items to use seller_id

-- Add seller_id to order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.seller_profiles(id) ON DELETE CASCADE;

-- Backfill seller_id for existing order_items
UPDATE public.order_items oi
SET seller_id = ss.owner_id
FROM public.seller_stores ss
WHERE oi.seller_store_id = ss.id
AND oi.seller_id IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_items_seller_id ON public.order_items(seller_id);

-- Update RLS policies to point to seller_id instead of seller_store_id
DROP POLICY IF EXISTS "Sellers can view their order items" ON public.order_items;
CREATE POLICY "Sellers can view their order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.seller_profiles sp
      WHERE sp.id = order_items.seller_id
      AND sp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sellers can update their order items" ON public.order_items;
CREATE POLICY "Sellers can update their order items"
  ON public.order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.seller_profiles sp
      WHERE sp.id = order_items.seller_id
      AND sp.user_id = auth.uid()
    )
  );

-- You can safely drop the old legacy view dependency soon
-- ALTER TABLE public.order_items DROP COLUMN seller_store_id;
