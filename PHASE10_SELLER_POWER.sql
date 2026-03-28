-- PHASE 10 SELLER HUB EXPANSION

ALTER TABLE public.seller_stores 
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS seller_email TEXT,
ADD COLUMN IF NOT EXISTS seller_phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Update RLS for the new columns
-- (Assuming they are already covered by existing policies, but just in case)
CREATE POLICY "Sellers can update their own branding" ON public.seller_stores
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid());
