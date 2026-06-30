-- Fix City Ride My Car product stock values
-- Change from 638882929 to realistic values

UPDATE products
SET stock = 469
WHERE seller_id = (
  SELECT id FROM seller_profiles 
  WHERE store_name ILIKE '%city%ride%' OR store_name ILIKE '%city ride%'
)
AND stock = 638882929;

-- Verify the fix
SELECT 
  p.id,
  p.title,
  p.stock,
  sp.store_name
FROM products p
JOIN seller_profiles sp ON p.seller_id = sp.id
WHERE sp.store_name ILIKE '%city%ride%' OR sp.store_name ILIKE '%city ride%'
ORDER BY p.created_at DESC;
