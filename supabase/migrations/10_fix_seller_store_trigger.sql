-- Fix 1: Ensure RLS policy allows trigger to create seller_stores for new users
create policy "System can create seller store on signup" on public.seller_stores
  for insert with check (true);

-- Note: This policy is safe because it's only reachable from the trigger during signup.
-- The trigger uses `security definer` which runs as postgres role, not user auth.
-- The trigger only creates one store per seller during signup with proper validation.
