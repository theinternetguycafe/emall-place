-- ================================================================
-- FIX LIKE NOTIFICATION TRIGGER (seller_id vs user_id mismatch)
-- Run in Supabase SQL Editor
-- ================================================================

CREATE OR REPLACE FUNCTION notify_seller_on_like()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
    v_seller_user_id UUID;
    v_product_name TEXT;
    v_actor_name TEXT;
BEGIN
    -- Get product info and seller_profile ID
    SELECT seller_id, title INTO v_seller_id, v_product_name FROM public.products WHERE id = NEW.product_id;
    -- Get actor name
    SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = NEW.user_id;

    IF v_seller_id IS NOT NULL THEN
        -- Translate the seller_profile ID into the auth.users ID
        SELECT user_id INTO v_seller_user_id FROM public.seller_profiles WHERE id = v_seller_id;
        
        -- Only notify if seller exists and isn't the one liking their own product
        IF v_seller_user_id IS NOT NULL AND v_seller_user_id != NEW.user_id THEN
            INSERT INTO public.notifications (user_id, actor_id, type, title, message, link)
            VALUES (
                v_seller_user_id, 
                NEW.user_id, 
                'like', 
                'New Like!', 
                COALESCE(v_actor_name, 'Someone') || ' liked your product: ' || v_product_name,
                '/seller'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
