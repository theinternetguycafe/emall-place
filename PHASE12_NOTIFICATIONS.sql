-- PHASE 12: Notification Engine & Likes

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- person who triggered it
    type VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (read)"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- System can forcefully insert notifications via triggers, triggers bypass RLS.
-- But occasionally client needs to insert (e.g. buyer manually sending ping), so let's allow inserts:
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.role() = 'authenticated');


-- 2. Create Product Likes Table
CREATE TABLE IF NOT EXISTS public.product_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

ALTER TABLE public.product_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes"
ON public.product_likes FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own likes"
ON public.product_likes FOR ALL
USING (auth.uid() = user_id);


-- 3. Trigger Function: Notify Seller on Product Like
CREATE OR REPLACE FUNCTION notify_seller_on_like()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
    v_product_name TEXT;
    v_actor_name TEXT;
BEGIN
    -- Get product info and seller
    SELECT seller_id, title INTO v_seller_id, v_product_name FROM public.products WHERE id = NEW.product_id;
    -- Get actor name
    SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = NEW.user_id;

    -- Only notify if seller exists and isn't the one liking their own product
    IF v_seller_id IS NOT NULL AND v_seller_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, actor_id, type, title, message, link)
        VALUES (
            v_seller_id, 
            NEW.user_id, 
            'like', 
            'New Like!', 
            COALESCE(v_actor_name, 'Someone') || ' liked your product: ' || v_product_name,
            '/seller'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_seller_on_like ON public.product_likes;
CREATE TRIGGER trg_notify_seller_on_like
AFTER INSERT ON public.product_likes
FOR EACH ROW EXECUTE FUNCTION notify_seller_on_like();


-- 4. Trigger Function: Notify Buyers on Product Sale / Price Drop
CREATE OR REPLACE FUNCTION notify_buyers_on_product_change()
RETURNS TRIGGER AS $$
DECLARE
    v_liker RECORD;
BEGIN
    -- Only trigger if it went ON sale, or significant price drop
    IF (NEW.is_on_sale = true AND OLD.is_on_sale = false) OR (NEW.price < OLD.price) THEN
        FOR v_liker IN SELECT user_id FROM public.product_likes WHERE product_id = NEW.id
        LOOP
            INSERT INTO public.notifications (user_id, actor_id, type, title, message, link)
            VALUES (
                v_liker.user_id, 
                NEW.seller_id, 
                'sale', 
                'Price Drop Alert!', 
                'A product you liked (' || NEW.title || ') is now on sale for R' || COALESCE(NEW.sale_price, NEW.price) || '!',
                '/product/' || NEW.id
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_buyers_on_product_change ON public.products;
CREATE TRIGGER trg_notify_buyers_on_product_change
AFTER UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION notify_buyers_on_product_change();


-- 5. Trigger Function: Notify Seller on Order Item (Bought)
CREATE OR REPLACE FUNCTION notify_seller_on_purchase()
RETURNS TRIGGER AS $$
DECLARE
    v_product_name TEXT;
    v_buyer_name TEXT;
    v_buyer_id UUID;
BEGIN
    SELECT title INTO v_product_name FROM public.products WHERE id = NEW.product_id;
    
    -- We need to fetch buyer_id from orders table
    SELECT buyer_id INTO v_buyer_id FROM public.orders WHERE id = NEW.order_id;
    
    IF v_buyer_id IS NOT NULL THEN
        SELECT full_name INTO v_buyer_name FROM public.profiles WHERE id = v_buyer_id;
    END IF;

    IF NEW.seller_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, actor_id, type, title, message, link)
        VALUES (
            NEW.seller_id, 
            v_buyer_id, 
            'order', 
            'New Order Received!', 
            COALESCE(v_buyer_name, 'A customer') || ' purchased ' || NEW.qty || 'x ' || COALESCE(v_product_name, 'Product'),
            '/seller'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_seller_on_purchase ON public.order_items;
CREATE TRIGGER trg_notify_seller_on_purchase
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION notify_seller_on_purchase();


-- 6. Trigger Function: Notify Seller on KYC Update
CREATE OR REPLACE FUNCTION notify_seller_on_kyc_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.kyc_status != OLD.kyc_status AND NEW.kyc_status IN ('approved', 'verified') THEN
        INSERT INTO public.notifications (user_id, actor_id, type, title, message, link)
        VALUES (
            NEW.user_id, 
            NULL, 
            'verification', 
            'Account Verified! 🎉', 
            'Your Seller KYC documents have been verified. You can now sell locally!',
            '/seller'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_seller_on_kyc_update ON public.seller_profiles;
CREATE TRIGGER trg_notify_seller_on_kyc_update
AFTER UPDATE OF kyc_status ON public.seller_profiles
FOR EACH ROW EXECUTE FUNCTION notify_seller_on_kyc_update();

-- (Optional) If reviews exist, we'd add it here, let's just make the SQL fault tolerant
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reviews') THEN
        EXECUTE '
        CREATE OR REPLACE FUNCTION notify_seller_on_review()
        RETURNS TRIGGER AS $f$
        DECLARE
            v_seller_id UUID;
            v_product_name TEXT;
            v_reviewer_name TEXT;
        BEGIN
            SELECT seller_id, title INTO v_seller_id, v_product_name FROM public.products WHERE id = NEW.product_id;
            SELECT full_name INTO v_reviewer_name FROM public.profiles WHERE id = NEW.user_id;
            
            IF v_seller_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, actor_id, type, title, message, link)
                VALUES (
                    v_seller_id, 
                    NEW.user_id, 
                    ''review'', 
                    ''New Review! ⭐'' || NEW.rating, 
                    COALESCE(v_reviewer_name, ''Someone'') || '' reviewed your product: '' || v_product_name,
                    ''/product/'' || NEW.product_id
                );
            END IF;
            RETURN NEW;
        END;
        $f$ LANGUAGE plpgsql SECURITY DEFINER;
        
        DROP TRIGGER IF EXISTS trg_notify_seller_on_review ON public.reviews;
        CREATE TRIGGER trg_notify_seller_on_review
        AFTER INSERT ON public.reviews
        FOR EACH ROW EXECUTE FUNCTION notify_seller_on_review();
        ';
    END IF;
END $$;
