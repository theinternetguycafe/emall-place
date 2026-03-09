-- Add new marketplace categories
-- Using INSERT ... ON CONFLICT DO NOTHING for idempotency
-- Conflict on either name OR slug (both are unique constraints)
insert into public.categories (name, slug) values
('Services', 'services'),
('Building & DIY', 'building-diy'),
('Foods & Drinks', 'foods-drinks'),
('Fruits & Veggies', 'fruits-veggies')
on conflict (name) do nothing;
