-- RESTORE_STORE_IMAGES.sql
-- This script safely copies the legacy banner and logo URLs from the old seller_stores
-- table back into the active stores table. Because the frontend bug overwrote the active
-- fields with NULL, we use COALESCE to restore the images while preserving any new uploads.

UPDATE stores
SET
  logo_url = COALESCE(stores.logo_url, ss.logo_url),
  banner_url = COALESCE(stores.banner_url, ss.banner_url),
  tagline = COALESCE(stores.tagline, ss.tagline),
  description = COALESCE(stores.description, ss.description)
FROM seller_stores ss
JOIN seller_profiles sp ON sp.user_id = ss.owner_id
WHERE stores.seller_id = sp.id;
