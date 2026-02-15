-- 1. Profiles
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- 2. Seller Stores
create policy "Active stores are viewable by everyone" on public.seller_stores
  for select using (status = 'active');

create policy "Users can view any store if they are admin" on public.seller_stores
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Sellers can manage own store" on public.seller_stores
  for all using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Admins can manage all stores" on public.seller_stores
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 3. Categories
create policy "Categories are viewable by everyone" on public.categories
  for select using (true);

create policy "Admins can manage categories" on public.categories
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 4. Products
create policy "Approved products are viewable by everyone" on public.products
  for select using (status = 'approved');

create policy "Sellers can view own products even if not approved" on public.products
  for select using (
    exists (
      select 1 from public.seller_stores
      where id = products.seller_store_id and owner_id = auth.uid()
    )
  );

create policy "Sellers can manage own products" on public.products
  for all using (
    exists (
      select 1 from public.seller_stores
      where id = products.seller_store_id and owner_id = auth.uid()
    )
  );

create policy "Admins can manage all products" on public.products
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 5. Product Images
create policy "Product images viewable by everyone" on public.product_images
  for select using (true);

create policy "Sellers can manage own product images" on public.product_images
  for all using (
    exists (
      select 1 from public.products p
      join public.seller_stores s on p.seller_store_id = s.id
      where p.id = product_images.product_id and s.owner_id = auth.uid()
    )
  );

-- 6. Carts
create policy "Users can manage own cart" on public.carts
  for all using (auth.uid() = user_id);

-- 7. Cart Items
create policy "Users can manage own cart items" on public.cart_items
  for all using (
    exists (select 1 from public.carts where id = cart_items.cart_id and user_id = auth.uid())
  );

-- 8. Orders
create policy "Users can view own orders" on public.orders
  for select using (auth.uid() = buyer_id);

create policy "Users can create orders" on public.orders
  for insert with check (auth.uid() = buyer_id);

create policy "Admins can manage all orders" on public.orders
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 9. Order Items
create policy "Buyers can view own order items" on public.order_items
  for select using (
    exists (select 1 from public.orders where id = order_items.order_id and buyer_id = auth.uid())
  );

create policy "Buyers can create order items" on public.order_items
  for insert with check (
    exists (select 1 from public.orders where id = order_items.order_id and buyer_id = auth.uid())
  );

create policy "Sellers can view and update own order items" on public.order_items
  for select using (
    exists (
      select 1 from public.seller_stores
      where id = order_items.seller_store_id and owner_id = auth.uid()
    )
  );

create policy "Sellers can update own order items status" on public.order_items
  for update using (
    exists (
      select 1 from public.seller_stores
      where id = order_items.seller_store_id and owner_id = auth.uid()
    )
  );

create policy "Admins can manage all order items" on public.order_items
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
