-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  full_name text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Seller Stores table
create table public.seller_stores (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  store_name text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(owner_id)
);

-- 3. Categories table
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  slug text not null unique
);

-- 4. Products table
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  seller_store_id uuid references public.seller_stores(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  description text,
  price decimal(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Product Images table
create table public.product_images (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  url text not null,
  sort_order integer default 0
);

-- 6. Carts table
create table public.carts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Cart Items table
create table public.cart_items (
  id uuid default uuid_generate_v4() primary key,
  cart_id uuid references public.carts(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  qty integer not null default 1 check (qty > 0),
  unique(cart_id, product_id)
);

-- 8. Orders table
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  buyer_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'cancelled')),
  total_amount decimal(12,2) not null,
  total_commission decimal(12,2) not null,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Order Items table
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  seller_store_id uuid references public.seller_stores(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  qty integer not null check (qty > 0),
  unit_price decimal(12,2) not null,
  item_total decimal(12,2) not null,
  commission_amount decimal(12,2) not null,
  item_status text not null default 'pending' check (item_status in ('pending', 'packed', 'shipped', 'delivered', 'cancelled'))
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.seller_stores enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
