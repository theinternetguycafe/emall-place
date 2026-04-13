-- ================================================================
-- FIX: "Database error saving new user" (500 on /auth/v1/signup)
-- Root cause: broken handle_new_user() trigger
-- Run this ENTIRE script in Supabase SQL Editor
-- ================================================================

-- STEP 1: Drop and recreate the handle_new_user trigger function
-- with full error isolation so it NEVER blocks auth.users insertion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role        text;
  v_display     text;
  v_store_name  text;
  v_slug        text;
  v_seller_id   uuid;
BEGIN
  -- Extract metadata safely
  v_role       := COALESCE(NEW.raw_user_meta_data->>'role', 'buyer');
  v_display    := COALESCE(
                    NEW.raw_user_meta_data->>'full_name',
                    NEW.raw_user_meta_data->>'name',
                    split_part(NEW.email, '@', 1)
                  );
  v_store_name := COALESCE(NEW.raw_user_meta_data->>'store_name', 'My Store');

  -- ── 1. Insert into public.profiles (base identity) ──────────────
  BEGIN
    INSERT INTO public.profiles (id, full_name, role, email)
    VALUES (NEW.id, v_display, v_role, NEW.email)
    ON CONFLICT (id) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          email     = EXCLUDED.email,
          role      = EXCLUDED.role;
  EXCEPTION WHEN OTHERS THEN
    -- Try without email column (older schema)
    BEGIN
      INSERT INTO public.profiles (id, full_name, role)
      VALUES (NEW.id, v_display, v_role)
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'handle_new_user: profiles insert failed for % — %', NEW.id, SQLERRM;
      -- Return here so we don't cascade failures; auth.users row still created
      RETURN NEW;
    END;
  END;

  -- ── 2. Seller-specific setup ─────────────────────────────────────
  IF v_role = 'seller' THEN
    BEGIN
      -- Generate unique slug
      v_slug := lower(
                  regexp_replace(trim(v_store_name), '[^a-zA-Z0-9]+', '-', 'g')
                ) || '-' || substring(replace(NEW.id::text, '-', ''), 1, 6);

      -- A. Insert into seller_profiles
      INSERT INTO public.seller_profiles (
        user_id,
        store_name,
        store_slug,
        seller_email,
        seller_type,
        onboarding_completed,
        kyc_status
      )
      VALUES (
        NEW.id,
        v_store_name,
        v_slug,
        NEW.email,
        'product',
        false,
        'not_started'
      )
      ON CONFLICT (user_id) DO NOTHING
      RETURNING id INTO v_seller_id;

      -- B. Create stores branding row
      IF v_seller_id IS NOT NULL THEN
        INSERT INTO public.stores (seller_id, description)
        VALUES (v_seller_id, 'Welcome to my store!')
        ON CONFLICT (seller_id) DO NOTHING;
      END IF;

      -- C. Create legacy seller_stores row (backward compat)
      --    owner_id references public.profiles(id) — which NOW exists
      INSERT INTO public.seller_stores (owner_id, store_name, status)
      VALUES (NEW.id, v_store_name, 'pending')
      ON CONFLICT (owner_id) DO NOTHING;

    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'handle_new_user: seller setup failed for % — %', NEW.id, SQLERRM;
      -- Still return NEW; the buyer profile was created, seller can be fixed
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- STEP 2: Re-attach the trigger (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- STEP 3: Ensure seller_profiles.user_id FK points to auth.users, NOT profiles
-- (FIX_ORPHAN_PROFILES.sql changed this incorrectly)
ALTER TABLE public.seller_profiles
  DROP CONSTRAINT IF EXISTS seller_profiles_user_id_fkey;

ALTER TABLE public.seller_profiles
  ADD CONSTRAINT seller_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- STEP 4: Ensure kyc_submissions.user_id FK points to auth.users, NOT profiles
ALTER TABLE public.kyc_submissions
  DROP CONSTRAINT IF EXISTS kyc_submissions_user_id_fkey;

ALTER TABLE public.kyc_submissions
  ADD CONSTRAINT kyc_submissions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- STEP 5: Ensure profiles table has INSERT RLS policy that allows 
-- the security definer trigger to insert (it bypasses RLS, but let's be sure)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow service_role / security definer functions to insert
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
-- (security definer bypasses RLS, so this is just a safety net for direct inserts)

-- Ensure users can insert their own profile (needed for any manual inserts)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- STEP 6: Verification — check for common constraint issues
DO $$
DECLARE
  v_count integer;
BEGIN
  -- Check that seller_profiles FK is correct
  SELECT COUNT(*) INTO v_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
  JOIN information_schema.table_constraints tc2 ON rc.unique_constraint_name = tc2.constraint_name
  WHERE tc.table_name = 'seller_profiles'
    AND kcu.column_name = 'user_id'
    AND tc2.table_name = 'users';  -- should reference auth.users

  RAISE LOG 'seller_profiles user_id FK to auth.users: % constraint(s) found', v_count;
END $$;

-- STEP 7: Output current trigger state for verification
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
  AND event_object_table = 'users';
