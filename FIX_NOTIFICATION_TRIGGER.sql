-- ================================================================
-- FIX NOTIFICATION TRIGGER (seller_id vs user_id mismatch)
-- Run in Supabase SQL Editor
-- ================================================================

CREATE OR REPLACE FUNCTION notify_seller_on_purchase()
RETURNS TRIGGER AS $$
DECLARE
    v_product_name TEXT;
    v_buyer_name TEXT;
    v_buyer_id UUID;
    v_seller_user_id UUID;
BEGIN
    SELECT title INTO v_product_name FROM public.products WHERE id = NEW.product_id;
    
    -- We need to fetch buyer_id from orders table
    SELECT buyer_id INTO v_buyer_id FROM public.orders WHERE id = NEW.order_id;
    
    IF v_buyer_id IS NOT NULL THEN
        SELECT full_name INTO v_buyer_name FROM public.profiles WHERE id = v_buyer_id;
    END IF;

    -- NEW.seller_id points to seller_profiles, but notifications needs the auth.users id
    IF NEW.seller_id IS NOT NULL THEN
        -- Lookup the actual user_id for the seller
        SELECT user_id INTO v_seller_user_id FROM public.seller_profiles WHERE id = NEW.seller_id;
        
        IF v_seller_user_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, actor_id, type, title, message, link)
            VALUES (
                v_seller_user_id, 
                v_buyer_id, 
                'order', 
                'New Order Received!', 
                COALESCE(v_buyer_name, 'A customer') || ' purchased ' || NEW.qty || 'x ' || COALESCE(v_product_name, 'Product'),
                '/seller'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
