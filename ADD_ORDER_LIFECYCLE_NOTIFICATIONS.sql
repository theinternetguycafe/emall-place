-- ============================================================
-- ADD_ORDER_LIFECYCLE_NOTIFICATIONS.sql
-- Run this in Supabase SQL Editor to add order state notifications
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TRIGGER 1: Order Finalized → Notify Seller + Buyer + Admins
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_order_finalized()
RETURNS TRIGGER AS $$
DECLARE
  v_seller_user_id uuid;
  v_buyer_name text;
  v_seller_name text;
  v_product_title text;
  v_order_total numeric;
  admin_id uuid;
BEGIN
  -- Only trigger on status change TO finalized
  IF NEW.item_status != 'finalized' OR OLD.item_status = NEW.item_status THEN
    RETURN NEW;
  END IF;

  -- Get order details
  SELECT 
    o.total_amount,
    o.user_id,
    pr.full_name,
    p.title
  INTO 
    v_order_total,
    v_buyer_name,
    v_product_title,
    v_seller_name
  FROM orders o
  JOIN profiles pr ON pr.id = o.user_id
  LEFT JOIN products p ON p.id = NEW.product_id
  WHERE o.id = NEW.order_id;

  -- Get seller's auth user id
  SELECT sp.user_id, sp.store_name INTO v_seller_user_id, v_seller_name
  FROM seller_profiles sp
  WHERE sp.id = NEW.seller_id;

  -- Notify Seller: "Order Finalized - Prepare for Packing"
  IF v_seller_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, actor_id, type, title, message, link)
    VALUES (
      v_seller_user_id,
      NEW.user_id,
      'finalized',
      '✅ Order #' || NEW.order_id::text || ' - Ready to Pack',
      COALESCE(v_buyer_name, 'A customer') || ' finalized their order. Pack and prepare for dispatch.',
      '/seller?tab=orders&status=pending'
    );
  END IF;

  -- Notify Buyer: "Your order is accepted and being prepared"
  INSERT INTO notifications (user_id, actor_id, type, title, message, link)
  VALUES (
    NEW.user_id,
    v_seller_user_id,
    'finalized',
    '📦 Order Confirmed - Seller Packing',
    COALESCE(v_seller_name, 'Your seller') || ' accepted your order. We''re packing it now!',
    '/orders#' || NEW.order_id::text
  );

  -- Notify ALL Admins
  FOR admin_id IN SELECT user_id FROM public.profiles WHERE role = 'admin' LOOP
    INSERT INTO notifications (user_id, actor_id, type, title, message, link)
    VALUES (
      admin_id,
      v_seller_user_id,
      'finalized',
      '✅ Order #' || NEW.order_id::text || ' Finalized',
      COALESCE(v_seller_name, 'Seller') || ' finalized order for R' || COALESCE(v_order_total, 0)::text || '.',
      '/admin'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_order_finalized ON public.order_items;
CREATE TRIGGER trg_notify_order_finalized
AFTER UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION notify_order_finalized();


-- ────────────────────────────────────────────────────────────
-- TRIGGER 2: Order Dispatched → Notify Seller + Buyer + Admins
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_order_dispatched()
RETURNS TRIGGER AS $$
DECLARE
  v_seller_user_id uuid;
  v_buyer_id uuid;
  v_buyer_name text;
  v_seller_name text;
  v_product_title text;
  admin_id uuid;
BEGIN
  -- Only trigger on status change TO dispatched (shipped)
  IF (NEW.item_status NOT IN ('dispatched', 'shipped') OR 
      OLD.item_status IN ('dispatched', 'shipped')) THEN
    RETURN NEW;
  END IF;

  -- Get order and product details
  SELECT 
    o.user_id,
    pr.full_name,
    p.title
  INTO 
    v_buyer_id,
    v_buyer_name,
    v_product_title
  FROM orders o
  JOIN profiles pr ON pr.id = o.user_id
  LEFT JOIN products p ON p.id = NEW.product_id
  WHERE o.id = NEW.order_id;

  -- Get seller's auth user id
  SELECT sp.user_id, sp.store_name INTO v_seller_user_id, v_seller_name
  FROM seller_profiles sp
  WHERE sp.id = NEW.seller_id;

  -- Notify Seller: "Order shipped successfully"
  IF v_seller_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, actor_id, type, title, message, link)
    VALUES (
      v_seller_user_id,
      v_buyer_id,
      'dispatch',
      '🚚 Order #' || NEW.order_id::text || ' Shipped',
      'Your package is on the way! ' || COALESCE(v_buyer_name, 'Customer') || ' has been notified of the dispatch.',
      '/seller?tab=orders&status=shipped'
    );
  END IF;

  -- Notify Buyer: "Order is on its way"
  IF v_buyer_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, actor_id, type, title, message, link)
    VALUES (
      v_buyer_id,
      v_seller_user_id,
      'dispatch',
      '🚚 Your Order #' || NEW.order_id::text || ' is on the Way!',
      COALESCE(v_seller_name, 'Your seller') || ' shipped "' || COALESCE(v_product_title, 'your item') || '". Arriving soon!',
      '/orders#' || NEW.order_id::text
    );
  END IF;

  -- Notify ALL Admins
  FOR admin_id IN SELECT user_id FROM public.profiles WHERE role = 'admin' LOOP
    INSERT INTO notifications (user_id, actor_id, type, title, message, link)
    VALUES (
      admin_id,
      v_seller_user_id,
      'dispatch',
      '🚚 Order #' || NEW.order_id::text || ' Dispatched',
      COALESCE(v_seller_name, 'Seller') || ' shipped order to customer.',
      '/admin'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_order_dispatched ON public.order_items;
CREATE TRIGGER trg_notify_order_dispatched
AFTER UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION notify_order_dispatched();


-- ────────────────────────────────────────────────────────────
-- TRIGGER 3: Order In-Transit → Notify Buyer + Admins
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_order_in_transit()
RETURNS TRIGGER AS $$
DECLARE
  v_seller_user_id uuid;
  v_buyer_id uuid;
  v_buyer_name text;
  v_seller_name text;
  v_product_title text;
  admin_id uuid;
BEGIN
  -- Only trigger on status change TO in_transit
  IF NEW.item_status != 'in_transit' OR OLD.item_status = NEW.item_status THEN
    RETURN NEW;
  END IF;

  -- Get order and product details
  SELECT 
    o.user_id,
    pr.full_name,
    p.title
  INTO 
    v_buyer_id,
    v_buyer_name,
    v_product_title
  FROM orders o
  JOIN profiles pr ON pr.id = o.user_id
  LEFT JOIN products p ON p.id = NEW.product_id
  WHERE o.id = NEW.order_id;

  -- Get seller's auth user id
  SELECT sp.user_id, sp.store_name INTO v_seller_user_id, v_seller_name
  FROM seller_profiles sp
  WHERE sp.id = NEW.seller_id;

  -- Notify Buyer: "Package is in transit"
  IF v_buyer_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, actor_id, type, title, message, link)
    VALUES (
      v_buyer_id,
      v_seller_user_id,
      'in_transit',
      '📍 Order #' || NEW.order_id::text || ' In-Transit',
      'Your package is on its way to your location. Track your delivery in real-time.',
      '/orders#' || NEW.order_id::text
    );
  END IF;

  -- Notify ALL Admins
  FOR admin_id IN SELECT user_id FROM public.profiles WHERE role = 'admin' LOOP
    INSERT INTO notifications (user_id, actor_id, type, title, message, link)
    VALUES (
      admin_id,
      v_seller_user_id,
      'in_transit',
      '📍 Order #' || NEW.order_id::text || ' In-Transit',
      'Package is moving. Monitor for delivery completion.',
      '/admin'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_order_in_transit ON public.order_items;
CREATE TRIGGER trg_notify_order_in_transit
AFTER UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION notify_order_in_transit();


-- ────────────────────────────────────────────────────────────
-- TRIGGER 4: Order Delivered → Notify Seller + Buyer + Admins
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_order_delivered()
RETURNS TRIGGER AS $$
DECLARE
  v_seller_user_id uuid;
  v_buyer_id uuid;
  v_buyer_name text;
  v_seller_name text;
  v_product_title text;
  admin_id uuid;
BEGIN
  -- Only trigger on status change TO delivered
  IF NEW.item_status != 'delivered' OR OLD.item_status = NEW.item_status THEN
    RETURN NEW;
  END IF;

  -- Get order and product details
  SELECT 
    o.user_id,
    pr.full_name,
    p.title
  INTO 
    v_buyer_id,
    v_buyer_name,
    v_product_title
  FROM orders o
  JOIN profiles pr ON pr.id = o.user_id
  LEFT JOIN products p ON p.id = NEW.product_id
  WHERE o.id = NEW.order_id;

  -- Get seller's auth user id
  SELECT sp.user_id, sp.store_name INTO v_seller_user_id, v_seller_name
  FROM seller_profiles sp
  WHERE sp.id = NEW.seller_id;

  -- Notify Seller: "Order delivered successfully"
  IF v_seller_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, actor_id, type, title, message, link)
    VALUES (
      v_seller_user_id,
      v_buyer_id,
      'delivery',
      '✨ Order #' || NEW.order_id::text || ' Delivered!',
      'Your order reached ' || COALESCE(v_buyer_name, 'customer') || '. Waiting for their rating!',
      '/seller?tab=orders&status=delivered'
    );
  END IF;

  -- Notify Buyer: "Order delivered - rate us"
  IF v_buyer_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, actor_id, type, title, message, link)
    VALUES (
      v_buyer_id,
      v_seller_user_id,
      'delivery',
      '✨ Order #' || NEW.order_id::text || ' Delivered!',
      'Your order has arrived! ⭐ Rate ' || COALESCE(v_seller_name, 'the seller') || ' and the product below.',
      '/orders#' || NEW.order_id::text
    );
  END IF;

  -- Notify ALL Admins
  FOR admin_id IN SELECT user_id FROM public.profiles WHERE role = 'admin' LOOP
    INSERT INTO notifications (user_id, actor_id, type, title, message, link)
    VALUES (
      admin_id,
      v_seller_user_id,
      'delivery',
      '✨ Order #' || NEW.order_id::text || ' Delivered',
      'Order successfully delivered to customer. Awaiting rating.',
      '/admin'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_order_delivered ON public.order_items;
CREATE TRIGGER trg_notify_order_delivered
AFTER UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION notify_order_delivered();


-- ════════════════════════════════════════════════════════════
-- SERVICE REQUEST LIFECYCLE NOTIFICATIONS
-- ════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- TRIGGER 5: Service Accepted → Notify Buyer + Admins
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_service_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_seller_user_id uuid;
  v_seller_name text;
  v_buyer_name text;
  admin_id uuid;
BEGIN
  -- Only trigger on status change TO accepted
  IF NEW.item_status != 'accepted' OR OLD.item_status = NEW.item_status THEN
    RETURN NEW;
  END IF;

  -- Get seller name
  SELECT sp.user_id, sp.store_name INTO v_seller_user_id, v_seller_name
  FROM seller_profiles sp
  WHERE sp.id = NEW.seller_id;

  -- Get buyer name
  SELECT pr.full_name INTO v_buyer_name
  FROM orders o
  JOIN profiles pr ON pr.id = o.user_id
  WHERE o.id = NEW.order_id;

  -- Notify Buyer: "Service provider accepted your request"
  INSERT INTO notifications (user_id, actor_id, type, title, message, link)
  VALUES (
    (SELECT user_id FROM orders WHERE id = NEW.order_id),
    v_seller_user_id,
    'booking',
    '✅ Service Request Accepted!',
    COALESCE(v_seller_name, 'Your service provider') || ' accepted your request. They''re on their way!',
    '/orders#' || NEW.order_id::text
  );

  -- Notify ALL Admins
  FOR admin_id IN SELECT user_id FROM public.profiles WHERE role = 'admin' LOOP
    INSERT INTO notifications (user_id, actor_id, type, title, message, link)
    VALUES (
      admin_id,
      v_seller_user_id,
      'booking',
      '✅ Service #' || NEW.order_id::text || ' Accepted',
      COALESCE(v_seller_name, 'Service provider') || ' accepted service from ' || COALESCE(v_buyer_name, 'customer') || '.',
      '/admin'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_service_accepted ON public.order_items;
CREATE TRIGGER trg_notify_service_accepted
AFTER UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION notify_service_accepted();


-- ────────────────────────────────────────────────────────────
-- TRIGGER 6: Service In-Progress → Notify Buyer + Admins
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_service_in_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_seller_user_id uuid;
  v_seller_name text;
  admin_id uuid;
BEGIN
  -- Only trigger on status change TO in_progress
  IF NEW.item_status != 'in_progress' OR OLD.item_status = NEW.item_status THEN
    RETURN NEW;
  END IF;

  -- Get seller name
  SELECT sp.user_id, sp.store_name INTO v_seller_user_id, v_seller_name
  FROM seller_profiles sp
  WHERE sp.id = NEW.seller_id;

  -- Notify Buyer: "Service is now happening"
  INSERT INTO notifications (user_id, actor_id, type, title, message, link)
  VALUES (
    (SELECT user_id FROM orders WHERE id = NEW.order_id),
    v_seller_user_id,
    'booking',
    '🔧 Service In-Progress',
    COALESCE(v_seller_name, 'Your service provider') || ' is now providing the service. You can message them if needed.',
    '/orders#' || NEW.order_id::text
  );

  -- Notify ALL Admins
  FOR admin_id IN SELECT user_id FROM public.profiles WHERE role = 'admin' LOOP
    INSERT INTO notifications (user_id, actor_id, type, title, message, link)
    VALUES (
      admin_id,
      v_seller_user_id,
      'booking',
      '🔧 Service #' || NEW.order_id::text || ' In-Progress',
      'Service is actively being delivered.',
      '/admin'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_service_in_progress ON public.order_items;
CREATE TRIGGER trg_notify_service_in_progress
AFTER UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION notify_service_in_progress();


-- ════════════════════════════════════════════════════════════
-- DEFER: These can be added later after testing first 4
-- ════════════════════════════════════════════════════════════

-- Future:
-- - notify_order_cancelled() → Refund notification
-- - notify_payment_failed() → Payment retry notifications
-- - notify_seller_unresponsive() → Admin alert if no action in 2h
-- - notify_delivery_delayed() → Admin + buyer if ETA missed

