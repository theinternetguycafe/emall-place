-- Seed Categories
insert into public.categories (name, slug) values
('Electronics', 'electronics'),
('Fashion', 'fashion'),
('Home & Garden', 'home-garden'),
('Sports', 'sports'),
('Beauty', 'beauty');

-- Note: Profiles and Stores would usually be created via Auth flow.
-- These are just examples for manual insertion if testing without Auth.
-- In a real scenario, you'd use supabase.auth.signUp() then trigger profile creation.

-- Trigger for profile creation on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'buyer'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
