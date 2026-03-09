-- 08_payments_unique_and_backfill.sql

-- 1) Fix ON CONFLICT upsert error by ensuring a unique constraint exists
ALTER TABLE public.payments
  ADD CONSTRAINT payments_order_id_key UNIQUE (order_id);

-- 2) Optional: backfill any “paid but still unpaid/pending looking” orders
-- (If your orders table uses payment_status and status exactly like your logs)
UPDATE public.orders o
SET
  payment_status = 'paid',
  status = CASE
    WHEN o.status = 'pending' THEN 'processing'
    ELSE o.status
  END
FROM public.payments p
WHERE p.order_id = o.id
  AND p.status = 'paid'
  AND (o.payment_status IS DISTINCT FROM 'paid' OR o.status = 'pending');
