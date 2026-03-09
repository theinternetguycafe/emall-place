-- Create a bucket for product images
insert into storage.buckets (id, name, public) values ('marketplace', 'marketplace', true);

-- Storage policies
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'marketplace' );

create policy "Seller Upload"
on storage.objects for insert
with check (
  bucket_id = 'marketplace' and
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'seller'
  )
);
