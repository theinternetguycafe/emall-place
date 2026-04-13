
-- Function to handle new user signups
-- REFACTORED PHASE 11: Supports modern architecture (profiles, seller_profiles, stores)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_role text;
  new_seller_id uuid;
  store_slug text;
  display_name text;
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'buyer');
  display_name := coalesce(new.raw_user_meta_data->>'full_name', substring(new.email from '(.*)@'));
  
  -- 1. Insert into base profiles table (Identity)
  -- Add email to profiles table if it exists
  begin
    insert into public.profiles (id, full_name, role, email)
    values (
      new.id,
      display_name,
      user_role,
      new.email
    );
  exception when others then
    -- Fallback for if 'email' column doesn't exist yet or other constraint
    begin
      insert into public.profiles (id, full_name, role)
      values (new.id, display_name, user_role);
    exception when others then
      raise log 'Error inserting into profiles: %', sqlerrm;
    end;
  end;

  -- 2. If user is a seller, set up the full seller stack
  if user_role = 'seller' then
    begin
      -- Generate unique slug
      store_slug := lower(regexp_replace(trim(coalesce(new.raw_user_meta_data->>'store_name', 'Store')), '[^a-zA-Z0-9]+', '-', 'g'))
                    || '-' || substring(replace(new.id::text, '-', ''), 1, 6);

      -- A. Create seller_profiles (Identity/Settings)
      insert into public.seller_profiles (
        user_id, 
        store_name, 
        store_slug, 
        seller_email,
        seller_type,
        onboarding_completed,
        kyc_status
      )
      values (
        new.id,
        coalesce(new.raw_user_meta_data->>'store_name', 'My Store'),
        store_slug,
        new.email,
        'product',
        false,
        'not_started'
      )
      returning id into new_seller_id;

      -- B. Create stores (Branding/Presentation)
      if new_seller_id is not null then
        insert into public.stores (seller_id, description)
        values (new_seller_id, 'Welcome to my store!');
      end if;

      -- C. Create legacy seller_stores (Backward Compatibility)
      insert into public.seller_stores (owner_id, store_name, status)
      values (
        new.id,
        coalesce(new.raw_user_meta_data->>'store_name', 'My Store'),
        'pending'
      );
      
    exception when others then
      -- Log error but don't fail the trigger - user account must still be created
      raise log 'Warning: Failed to set up full seller profile for user %. Error: %', new.id, sqlerrm;
    end;
  end if;

  return new;
end;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
