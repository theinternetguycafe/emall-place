-- ============================================================
-- APPROVE ALL PENDING PRODUCTS (run once in Supabase SQL editor)
-- Safe: only changes products with status = 'pending'
-- ============================================================

-- 1. Preview what will be approved first (optional read-only)
SELECT 
  p.id,
  p.title,
  p.price,
  p.status,
  s.store_name
FROM products p
LEFT JOIN seller_stores s ON s.id = p.seller_store_id
WHERE p.status = 'pending'
ORDER BY p.created_at DESC;

-- 2. Approve all pending products
UPDATE products
SET status = 'approved'
WHERE status = 'pending';

-- 3. Also verify stores are active (so their products can be queried)
UPDATE seller_stores
SET status = 'active'
WHERE status = 'pending';

-- Confirm result
SELECT status, COUNT(*) FROM products GROUP BY status;
SELECT status, COUNT(*) FROM seller_stores GROUP BY status;
