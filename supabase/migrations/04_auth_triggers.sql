
-- Function to handle new user signups
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_role text;
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'buyer');
  
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    user_role
  );

  if user_role = 'seller' then
    insert into public.seller_stores (owner_id, store_name, status)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'store_name', 'My Store'),
      'pending'
    );
  end if;

  return new;
end;
$$;

-- Trigger to call the function on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
