-- ==============================================================================
-- Phase 1: Database Hardening (The Bouncer)
-- Domain Integrity Migration
-- ==============================================================================

-- 1. Add domain_type to categories
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS domain_type text DEFAULT 'product' 
CHECK (domain_type IN ('product', 'service', 'rental', 'vehicle', 'property', 'digital', 'job', 'experience', 'auction', 'subscription', 'both'));

-- 2. Restrict Products Table
-- Drop existing insert/update policies that might be too permissive
DO $$ 
BEGIN
    -- This attempts to drop common policy names if they exist, to replace them with strict ones.
    -- (Catch exceptions if they don't exist to prevent migration failure)
    BEGIN DROP POLICY IF EXISTS "Sellers can manage own products" ON public.products; EXCEPTION WHEN OTHERS THEN END;
    BEGIN DROP POLICY IF EXISTS "Users can insert own products" ON public.products; EXCEPTION WHEN OTHERS THEN END;
    BEGIN DROP POLICY IF EXISTS "Users can update own products" ON public.products; EXCEPTION WHEN OTHERS THEN END;
END $$;

-- Create strict Product policies checking seller_type
CREATE POLICY "Strict: Sellers with product type can insert products" 
ON public.products
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.seller_profiles 
    WHERE id = seller_id AND user_id = auth.uid() 
    AND seller_type IN ('product', 'both')
  )
  OR
  -- Legacy fallback
  EXISTS (
    SELECT 1 FROM public.seller_stores
    WHERE id = seller_store_id AND owner_id = auth.uid()
  )
);

CREATE POLICY "Strict: Sellers with product type can update own products" 
ON public.products
FOR UPDATE 
USING (
  (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()))
  OR
  (seller_store_id IN (SELECT id FROM public.seller_stores WHERE owner_id = auth.uid()))
)
WITH CHECK (
  (
    seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid() AND seller_type IN ('product', 'both'))
  )
  OR
  (
    seller_store_id IN (SELECT id FROM public.seller_stores WHERE owner_id = auth.uid())
  )
);

-- 3. Restrict Services Table
DO $$ 
BEGIN
    BEGIN DROP POLICY IF EXISTS "Sellers can manage own services" ON public.services; EXCEPTION WHEN OTHERS THEN END;
    BEGIN DROP POLICY IF EXISTS "Users can insert own services" ON public.services; EXCEPTION WHEN OTHERS THEN END;
    BEGIN DROP POLICY IF EXISTS "Users can update own services" ON public.services; EXCEPTION WHEN OTHERS THEN END;
END $$;

-- Create strict Service policies checking seller_type
CREATE POLICY "Strict: Sellers with service type can insert services" 
ON public.services
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.seller_profiles 
    WHERE id = seller_id AND user_id = auth.uid() 
    AND seller_type IN ('service', 'both')
  )
);

CREATE POLICY "Strict: Sellers with service type can update own services" 
ON public.services
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.seller_profiles 
    WHERE id = seller_id AND user_id = auth.uid() 
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.seller_profiles 
    WHERE id = seller_id AND user_id = auth.uid() 
    AND seller_type IN ('service', 'both')
  )
);

-- 4. Data Scrubbing / Remediation
-- Any service that belongs to a seller who is STRICTLY 'product' is a domain violation.
-- We will mark them as hidden so they stop showing up in the ServicesSlider, but we don't delete data.
UPDATE public.services
SET status = 'hidden'
WHERE seller_id IN (
  SELECT id FROM public.seller_profiles 
  WHERE seller_type = 'product'
);
