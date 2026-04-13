-- Resync all banners, logos, and taglines from legacy `seller_stores` 
-- to the new `stores` table so no customized data is lost.

-- Step 1. Ensure a row exists in `stores` for EVERY `seller_profile`
-- This guarantees that updates from the frontend won't silently fail.
INSERT INTO stores (seller_id, created_at, updated_at)
SELECT id, now(), now() FROM seller_profiles
ON CONFLICT (seller_id) DO NOTHING;

-- Step 2. Sync the old seller_stores images & details into the stores row
UPDATE stores s
SET 
  banner_url  = ss.banner_url,
  logo_url    = ss.logo_url,
  tagline     = ss.tagline,
  description = ss.description
FROM seller_profiles sp
JOIN seller_stores ss ON ss.owner_id = sp.user_id
WHERE s.seller_id = sp.id
  AND (ss.banner_url IS NOT NULL OR ss.logo_url IS NOT NULL);
  
-- Step 3. (Optional) Make absolutely sure RLS on storage allows public read
-- This might be why previously uploaded things suddenly broke.
