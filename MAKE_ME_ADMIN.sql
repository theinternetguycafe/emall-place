-- Run this in the Supabase SQL Editor to make an account an official Admin!
-- Replace 'YOUR_ADMIN_EMAIL@EXAMPLE.COM' with the actual email you are logging in with.

UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'emallplace.shopping@gmail.com' LIMIT 1
);

SELECT 'You are now officially an admin on the backend! Refresh the dashboard.' as result;
