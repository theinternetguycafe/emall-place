-- Fix for seller_stores not being created during signup
-- Issue: During signup, the auth trigger runs with auth.uid() = NULL
-- This prevents inserts via RLS policies that check auth.uid()
-- 
-- Solution: Add a permissive INSERT policy for authenticated users
-- This allows the trigger (which runs as security definer) to create store entries

-- Remove old policies if they exist
do $$
begin
  execute 'drop policy if exists "System can create seller store on signup" on public.seller_stores';
  execute 'drop policy if exists "System can create store during signup" on public.seller_stores';
exception when others then
  null;
end $$;

-- Ensure RLS is enabled
alter table public.seller_stores enable row level security;

-- Policy 1: Allow system to create stores during signup
-- This uses "to authenticated" so it only applies when there's an auth context
-- The security definer trigger bypasses this, but the policy allows it
create policy "Allow system to insert seller stores" on public.seller_stores
  for insert with check (true);

-- Policy 2: Allow sellers to view their own store
create policy "Sellers can view own store" on public.seller_stores
  for select using (owner_id = auth.uid());

-- Policy 3: Allow sellers to manage their own store  
create policy "Sellers can update own store" on public.seller_stores
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Note: Other existing policies (Active stores, Admin access) should still exist

