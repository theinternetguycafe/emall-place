-- ================================================================
-- STORE REVIEWS SYSTEM
-- Run this in Supabase SQL Editor → New Query → Paste & Run
-- ================================================================

-- 1. Create store_reviews table
CREATE TABLE IF NOT EXISTS public.store_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.seller_stores(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- One review per buyer per store
  UNIQUE(store_id, reviewer_id)
);

-- 2. Enable RLS
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Anyone can read reviews (public trust signal)
DROP POLICY IF EXISTS "Anyone can read store reviews" ON public.store_reviews;
CREATE POLICY "Anyone can read store reviews" ON public.store_reviews
  FOR SELECT USING (true);

-- Authenticated users can insert reviews (app-level checks buyer status)
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.store_reviews;
CREATE POLICY "Authenticated users can insert reviews" ON public.store_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Users can update their own reviews
DROP POLICY IF EXISTS "Users can update own reviews" ON public.store_reviews;
CREATE POLICY "Users can update own reviews" ON public.store_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

-- Users can delete their own reviews
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.store_reviews;
CREATE POLICY "Users can delete own reviews" ON public.store_reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- Admins can manage all reviews
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.store_reviews;
CREATE POLICY "Admins can manage all reviews" ON public.store_reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Function to recalculate store average rating
CREATE OR REPLACE FUNCTION public.update_store_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the seller_stores row with fresh averages
  UPDATE public.seller_stores
  SET
    average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM public.store_reviews
      WHERE store_id = COALESCE(NEW.store_id, OLD.store_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.store_reviews
      WHERE store_id = COALESCE(NEW.store_id, OLD.store_id)
    )
  WHERE id = COALESCE(NEW.store_id, OLD.store_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger: auto-update rating on insert/update/delete
DROP TRIGGER IF EXISTS trg_update_store_rating ON public.store_reviews;
CREATE TRIGGER trg_update_store_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.store_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_store_rating();

-- 6. Add columns to seller_stores if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seller_stores' AND column_name = 'average_rating') THEN
    ALTER TABLE public.seller_stores ADD COLUMN average_rating numeric DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seller_stores' AND column_name = 'review_count') THEN
    ALTER TABLE public.seller_stores ADD COLUMN review_count integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seller_stores' AND column_name = 'category') THEN
    ALTER TABLE public.seller_stores ADD COLUMN category text DEFAULT NULL;
  END IF;
END $$;

-- 7. Ensure store-banners bucket exists and is PUBLIC
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-banners', 'store-banners', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Also ensure store-logos bucket is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-logos', 'store-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 8. Ensure storage policies exist for banners (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access for banners'
  ) THEN
    EXECUTE 'CREATE POLICY "Public Access for banners" ON storage.objects FOR SELECT USING (bucket_id = ''store-banners'')';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated Upload for banners'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated Upload for banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''store-banners'' AND auth.role() = ''authenticated'')';
  END IF;

  -- Also add UPDATE policy for banners (needed for upsert)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated Update for banners'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated Update for banners" ON storage.objects FOR UPDATE USING (bucket_id = ''store-banners'' AND auth.role() = ''authenticated'')';
  END IF;

  -- Same for logos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated Update for logos'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated Update for logos" ON storage.objects FOR UPDATE USING (bucket_id = ''store-logos'' AND auth.role() = ''authenticated'')';
  END IF;
END $$;

SELECT '✅ Store Reviews system created! Banners/logos buckets verified as public.' as result;
