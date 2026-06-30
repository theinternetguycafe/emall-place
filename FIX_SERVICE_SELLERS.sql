-- STEP 1: Move them to services table
INSERT INTO services (seller_id, category_id, title, description, base_rate, status, is_active, created_at, updated_at)
SELECT 
  p.seller_id,
  p.category_id,
  p.title,
  p.description,
  p.price,
  p.status,
  true,
  p.created_at,
  now()
FROM products p
JOIN seller_profiles sp ON p.seller_id = sp.id
WHERE (sp.store_name ILIKE '%buddy%hair%' 
   OR sp.store_name ILIKE '%alpharoy%' 
   OR sp.store_name ILIKE '%freshstep%')
  AND p.status = 'approved';

-- STEP 2: Delete from products
DELETE FROM products p
USING seller_profiles sp
WHERE p.seller_id = sp.id
  AND (sp.store_name ILIKE '%buddy%hair%' 
   OR sp.store_name ILIKE '%alpharoy%' 
   OR sp.store_name ILIKE '%freshstep%');

-- STEP 3: Verify
SELECT 
  sp.store_name,
  COUNT(CASE WHEN s.id IS NOT NULL THEN 1 END) as service_count,
  COUNT(CASE WHEN pr.id IS NOT NULL THEN 1 END) as product_count
FROM seller_profiles sp
LEFT JOIN services s ON sp.id = s.seller_id
LEFT JOIN products pr ON sp.id = pr.seller_id
WHERE sp.store_name ILIKE '%buddy%hair%' 
   OR sp.store_name ILIKE '%alpharoy%' 
   OR sp.store_name ILIKE '%freshstep%'
GROUP BY sp.store_name;
