-- ============================================================
-- eMall Place — Notification Triggers
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ── 0. Ensure `type` column exists on notifications ────────
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'info';

-- ── 1. Helper: get all admin user IDs ──────────────────────
CREATE OR REPLACE FUNCTION get_admin_user_ids()
RETURNS TABLE(user_id uuid) AS $$
BEGIN
  RETURN QUERY
    SELECT p.id FROM profiles p WHERE p.role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGER 1: KYC submission → notify ALL admins
-- ============================================================
CREATE OR REPLACE FUNCTION notify_admins_kyc()
RETURNS TRIGGER AS $$
DECLARE
  admin_id uuid;
  submitter_name text;
BEGIN
  SELECT full_name INTO submitter_name FROM profiles WHERE id = NEW.user_id;

  FOR admin_id IN SELECT user_id FROM get_admin_user_ids() LOOP
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      admin_id,
      'kyc',
      '🪪 New KYC Submission',
      COALESCE(submitter_name, 'A seller') || ' has submitted identity documents for review.',
      '/admin'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_admins_kyc ON kyc_submissions;
CREATE TRIGGER trg_notify_admins_kyc
  AFTER INSERT ON kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION notify_admins_kyc();

-- ============================================================
-- TRIGGER 2: Product liked → notify SELLER + admins
-- ============================================================
CREATE OR REPLACE FUNCTION notify_product_liked()
RETURNS TRIGGER AS $$
DECLARE
  seller_user_id uuid;
  product_title text;
  liker_name text;
  admin_id uuid;
BEGIN
  -- Get product info + seller's auth user_id
  SELECT p.title, sp.user_id
    INTO product_title, seller_user_id
    FROM products p
    JOIN seller_profiles sp ON sp.id = p.seller_id
    WHERE p.id = NEW.product_id;

  SELECT full_name INTO liker_name FROM profiles WHERE id = NEW.user_id;

  -- Notify seller
  IF seller_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      seller_user_id,
      'like',
      '❤️ New Like on Your Product',
      COALESCE(liker_name, 'Someone') || ' liked "' || COALESCE(product_title, 'your product') || '".',
      '/seller?tab=products'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_product_liked ON product_likes;
CREATE TRIGGER trg_notify_product_liked
  AFTER INSERT ON product_likes
  FOR EACH ROW EXECUTE FUNCTION notify_product_liked();

-- ============================================================
-- TRIGGER 3: Order item placed → notify SELLER + ALL admins
-- ============================================================
CREATE OR REPLACE FUNCTION notify_order_placed()
RETURNS TRIGGER AS $$
DECLARE
  seller_user_id uuid;
  product_title text;
  is_service boolean;
  buyer_name text;
  admin_id uuid;
  notif_title text;
  notif_msg text;
  notif_type text;
BEGIN
  -- Get product info
  SELECT p.title, (p.stock >= 999) AS svc
    INTO product_title, is_service
    FROM products p
    WHERE p.id = NEW.product_id;

  -- Get seller's auth user id
  SELECT sp.user_id INTO seller_user_id
    FROM seller_profiles sp WHERE sp.id = NEW.seller_id;

  -- Get buyer name
  SELECT pr.full_name INTO buyer_name
    FROM orders o
    JOIN profiles pr ON pr.id = o.user_id
    WHERE o.id = NEW.order_id;

  IF is_service THEN
    notif_type  := 'booking';
    notif_title := '⚡ New Service Booking';
    notif_msg   := COALESCE(buyer_name, 'A customer') || ' booked "' || COALESCE(product_title, 'your service') || '". Accept or respond promptly.';
  ELSE
    notif_type  := 'order';
    notif_title := '📦 New Order Received';
    notif_msg   := COALESCE(buyer_name, 'A customer') || ' ordered "' || COALESCE(product_title, 'your product') || '". Pack and ship when ready.';
  END IF;

  -- Notify seller
  IF seller_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (seller_user_id, notif_type, notif_title, notif_msg, '/seller?tab=orders');
  END IF;

  -- Notify all admins
  FOR admin_id IN SELECT user_id FROM get_admin_user_ids() LOOP
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      admin_id,
      notif_type,
      notif_title,
      COALESCE(buyer_name, 'A customer') || ' placed an order for "' || COALESCE(product_title, 'an item') || '".',
      '/admin'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_order_placed ON order_items;
CREATE TRIGGER trg_notify_order_placed
  AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION notify_order_placed();

-- ============================================================
-- TRIGGER 4: Service broadcast → notify ALL ONLINE service
--            sellers within a generous radius + ALL admins
-- ============================================================
CREATE OR REPLACE FUNCTION notify_service_broadcast()
RETURNS TRIGGER AS $$
DECLARE
  seller_rec record;
  admin_id uuid;
  requester_name text;
BEGIN
  SELECT full_name INTO requester_name FROM profiles WHERE id = NEW.user_id;

  -- Notify service / both sellers who are online (simple broadcast — no radius calc in PL/pgSQL)
  FOR seller_rec IN
    SELECT sp.user_id
    FROM seller_profiles sp
    WHERE sp.is_online = true
      AND sp.seller_type IN ('service', 'both')
      AND sp.user_id != NEW.user_id
  LOOP
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      seller_rec.user_id,
      'broadcast',
      '📡 New Service Request Nearby',
      COALESCE(requester_name, 'Someone') || ' is looking for: "' || COALESCE(NEW.description, 'a service') || '". Respond fast!',
      '/seller'
    );
  END LOOP;

  -- Notify all admins
  FOR admin_id IN SELECT user_id FROM get_admin_user_ids() LOOP
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      admin_id,
      'broadcast',
      '📡 Service Broadcast Placed',
      COALESCE(requester_name, 'A buyer') || ' broadcast a request: "' || COALESCE(NEW.description, 'a service') || '".',
      '/admin'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_service_broadcast ON service_requests;
CREATE TRIGGER trg_notify_service_broadcast
  AFTER INSERT ON service_requests
  FOR EACH ROW EXECUTE FUNCTION notify_service_broadcast();

-- ============================================================
-- Done. Grant select on notifications to authenticated users.
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);
