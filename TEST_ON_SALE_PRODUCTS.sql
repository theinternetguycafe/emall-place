-- Test adding an on-sale product to verify the visibility features
-- Run this script to see the on-sale features in action

-- First, find an existing approved product to use as a template
-- Then update it to be on sale

UPDATE products 
SET 
  is_on_sale = true,
  sale_price = price * 0.7,  -- 30% off
  sale_label = 'FLASH DEAL',
  sale_starts_at = NOW(),
  sale_ends_at = NOW() + INTERVAL '7 days'
WHERE 
  status = 'approved' 
  AND seller_id IN (
    SELECT id FROM seller_profiles 
    WHERE onboarding_completed = true 
    AND kyc_status = 'approved'
  )
  AND is_on_sale = false
LIMIT 3;

-- If no products got updated, let's insert a test product instead:
-- (Uncomment and run if the above UPDATE returns 0 rows)

/*
INSERT INTO products (
  seller_id,
  category_id,
  title,
  description,
  price,
  sale_price,
  sale_label,
  sale_starts_at,
  sale_ends_at,
  is_on_sale,
  stock,
  status,
  created_at
)
SELECT 
  sp.id,
  c.id,
  'SALE TEST: Premium Item - 30% Off!',
  'This is a test item to showcase the on-sale features on the marketplace.',
  1000,
  700,
  'FLASH DEAL',
  NOW(),
  NOW() + INTERVAL '7 days',
  true,
  50,
  'approved',
  NOW()
FROM seller_profiles sp, categories c
WHERE sp.onboarding_completed = true
  AND sp.kyc_status = 'approved'
  AND c.name IS NOT NULL
LIMIT 1;
*/

-- Verify the on-sale products:
SELECT 
  id, 
  title, 
  price, 
  sale_price, 
  sale_label,
  sale_starts_at,
  sale_ends_at,
  is_on_sale 
FROM products 
WHERE is_on_sale = true 
AND status = 'approved'
LIMIT 10;
