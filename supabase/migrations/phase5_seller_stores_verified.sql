-- Phase 5: Add is_verified to seller_stores for Home fetch
alter table public.seller_stores add column if not exists is_verified boolean default false;

-- Update existing stores as verified if needed
-- update public.seller_stores set is_verified = true where status = 'active';j