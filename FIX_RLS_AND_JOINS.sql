-- ================================================================
-- FIX POSTGREST JOINS AND CHECKOUT RLS
-- Run in Supabase SQL Editor
-- ================================================================

-- 1. Restore FK relationships for PostgREST to join auth.users AND public.profiles
-- The issue was that PostgREST needs the foreign key to explicitly point to public.profiles
-- if using `profiles:user_id(...)` in joined queries.
DO $$
BEGIN
    -- For kyc_submissions
    ALTER TABLE public.kyc_submissions DROP CONSTRAINT IF EXISTS kyc_submissions_user_id_fkey;
    ALTER TABLE public.kyc_submissions ADD CONSTRAINT kyc_submissions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- For seller_profiles
    ALTER TABLE public.seller_profiles DROP CONSTRAINT IF EXISTS seller_profiles_user_id_fkey;
    ALTER TABLE public.seller_profiles ADD CONSTRAINT seller_profiles_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipped FK recreation: %', SQLERRM;
END $$;

-- 2. Ensure delivery_events exists and has RLS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'delivery_events') THEN
        CREATE TABLE public.delivery_events (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
            status TEXT NOT NULL,
            actor_id UUID,
            actor_type TEXT NOT NULL,
            lat NUMERIC,
            lng NUMERIC,
            note TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
        
        ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Drop existing policies
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.delivery_events;
    DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.delivery_events;
    DROP POLICY IF EXISTS "Authenticated users can insert delivery events" ON public.delivery_events;
    DROP POLICY IF EXISTS "Admins can manage delivery events" ON public.delivery_events;
    
    -- Create new comprehensive policies
    CREATE POLICY "Enable read access for all users"
        ON public.delivery_events FOR SELECT USING (true);
        
    CREATE POLICY "Enable insert access for authenticated users"
        ON public.delivery_events FOR INSERT 
        WITH CHECK (auth.role() = 'authenticated');
        
    CREATE POLICY "Enable update access for authenticated users"
        ON public.delivery_events FOR UPDATE 
        USING (auth.role() = 'authenticated');
END $$;

-- 3. Also make sure order_items can be inserted!
DO $$
BEGIN
    DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.order_items;
    DROP POLICY IF EXISTS "Authenticated users can insert order items" ON public.order_items;
    
    CREATE POLICY "Enable insert access for authenticated users"
        ON public.order_items FOR INSERT 
        WITH CHECK (auth.role() = 'authenticated');
END $$;
