-- Move City Ride services from products to services table
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
WHERE p.seller_id IN (SELECT id FROM seller_profiles WHERE store_name ILIKE '%city%ride%')
  AND p.id IN (
    '49708f62-0239-4cd5-a52e-7411c2494f4e',
    '0ce018f0-1f0f-4efc-9526-08790a8c6091',
    '99c8632d-76e7-4441-a637-a4adaa5f3a0a'
  );

-- Then delete from products
DELETE FROM products 
WHERE id IN (
  '49708f62-0239-4cd5-a52e-7411c2494f4e',
  '0ce018f0-1f0f-4efc-9526-08790a8c6091',
  '99c8632d-76e7-4441-a637-a4adaa5f3a0a'
);

-- Verify
SELECT COUNT(*) as services_count FROM services WHERE seller_id IN (SELECT id FROM seller_profiles WHERE store_name ILIKE '%city%ride%');
SELECT COUNT(*) as products_count FROM products WHERE seller_id IN (SELECT id FROM seller_profiles WHERE store_name ILIKE '%city%ride%');
