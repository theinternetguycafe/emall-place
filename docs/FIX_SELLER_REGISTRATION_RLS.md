🔧 FIX FOR SELLER REGISTRATION ISSUE
====================================

PROBLEM: 
When sellers sign up, the profile is created but the seller_stores entry is NOT created.
This happens because RLS policies block the trigger from inserting.

SOLUTION:
Run this SQL in your Supabase SQL Editor.

STEPS:
======

1. Go to: https://app.supabase.com/project/_/sql
   (Replace _ with your project ID)

2. Click "New query"

3. Paste this SQL and click "Run":

---START SQL---

-- Drop old policies
do $$
begin
  execute 'drop policy if exists "System can create seller store on signup" on public.seller_stores';
  execute 'drop policy if exists "System can create store during signup" on public.seller_stores';
exception when others then
  null;
end $$;

-- Ensure RLS is enabled
alter table public.seller_stores enable row level security;

-- Allow system to create stores during signup
create policy "Allow system to insert seller stores" on public.seller_stores
  for insert with check (true);

-- Allow sellers to view their own store
create policy "Sellers can view own store" on public.seller_stores
  for select using (owner_id = auth.uid());

-- Allow sellers to update their own store
create policy "Sellers can update own store" on public.seller_stores
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

---END SQL---

4. After running, test with:
   node test_seller_reg_complete.js

Expected output:
   ✅ Seller store found:
      ├─ Store ID: ...
      ├─ Store Name: "Test Registration Store"
      └─ Status: "pending"

5. Then test in browser:
   - Go to http://localhost:5174/emall-place/#/auth?signup=true
   - Sign up as seller
   - You should see "Seller Hub" in the navigation immediately after signup
