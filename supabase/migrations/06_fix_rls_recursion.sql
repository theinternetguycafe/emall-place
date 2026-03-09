-- Fix infinite recursion in RLS policies
-- Drop the policy that causes circular dependency
DROP POLICY IF EXISTS "Stores with approved products are viewable" ON public.seller_stores;

-- Allow buyers to update their own orders
create policy "Users can update own orders"
on public.orders
for update
using (auth.uid() = buyer_id)
with check (auth.uid() = buyer_id);
