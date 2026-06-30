-- Check City Ride My Car seller status
SELECT 
  sp.id,
  sp.store_name,
  sp.onboarding_completed,
  sp.kyc_status,
  sp.seller_type,
  COUNT(p.id) as product_count
FROM seller_profiles sp
LEFT JOIN products p ON sp.id = p.seller_id
WHERE sp.store_name ILIKE '%city%ride%' OR sp.store_name ILIKE '%city ride%'
GROUP BY sp.id, sp.store_name, sp.onboarding_completed, sp.kyc_status, sp.seller_type;

-- Check products from City Ride My Car
SELECT 
  p.id,
  p.title,
  p.status,
  p.stock,
  sp.store_name,
  sp.onboarding_completed,
  sp.kyc_status
FROM products p
JOIN seller_profiles sp ON p.seller_id = sp.id
WHERE sp.store_name ILIKE '%city%ride%' OR sp.store_name ILIKE '%city ride%'
ORDER BY p.created_at DESC;

-- Check what the marketplace query returns
SELECT 
  p.id,
  p.title,
  p.status,
  p.stock,
  sp.store_name,
  sp.onboarding_completed,
  sp.kyc_status
FROM products p
INNER JOIN seller_profiles sp ON p.seller_id = sp.id
WHERE p.status = 'approved'
  AND sp.onboarding_completed = true
  AND sp.kyc_status = 'approved'
  AND p.stock < 999
  AND (sp.store_name ILIKE '%city%ride%' OR sp.store_name ILIKE '%city ride%')
ORDER BY p.created_at DESC;
