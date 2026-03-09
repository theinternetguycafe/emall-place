-- Add image_url column to categories table
alter table public.categories add column image_url text;

-- Update categories with locally-generated SVG images
update public.categories set image_url = '/category-images/electronics.svg' where name = 'Electronics';
update public.categories set image_url = '/category-images/fashion.svg' where name = 'Fashion';
update public.categories set image_url = '/category-images/home-decor.svg' where name = 'Home & Decor';
update public.categories set image_url = '/category-images/art-crafts.svg' where name = 'Art & Crafts';
update public.categories set image_url = '/category-images/beauty.svg' where name = 'Beauty & Personal Care';
update public.categories set image_url = '/category-images/services.svg' where name = 'Services';
update public.categories set image_url = '/category-images/building-diy.svg' where name = 'Building & DIY';
update public.categories set image_url = '/category-images/foods-drinks.svg' where name = 'Foods & Drinks';
update public.categories set image_url = '/category-images/fruits-veggies.svg' where name = 'Fruits & Veggies';
