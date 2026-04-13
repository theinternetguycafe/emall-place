-- Auto-approve all existing sellers for testing purposes
-- This ensures they show up on the marketplace map

UPDATE seller_profiles
SET 
    kyc_status = 'approved',
    onboarding_completed = true,
    is_online = true
WHERE kyc_status != 'approved' OR onboarding_completed = false OR is_online = false;

-- Ensure all approved sellers have coordinates (Fallback to Hebron Mall area if NULL)
UPDATE seller_profiles
SET 
    latitude = -25.5585,
    longitude = 28.0183
WHERE kyc_status = 'approved' AND (latitude IS NULL OR longitude IS NULL);

-- Log the changes
SELECT id, store_name, kyc_status, onboarding_completed, is_online, latitude, longitude
FROM seller_profiles
WHERE kyc_status = 'approved'
LIMIT 10;
