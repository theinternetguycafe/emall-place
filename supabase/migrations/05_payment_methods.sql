-- Add payment_method column to orders table if it doesn't exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method text default 'payfast' check (payment_method in ('payfast', 'yoco', 'snapscan'));

-- Create payments table for tracking payment transactions
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  payment_method text not null check (payment_method in ('payfast', 'yoco', 'snapscan')),
  provider_reference text unique,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  amount decimal(12,2) not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_reference ON public.payments(provider_reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Payments RLS policies
CREATE POLICY "Users can view their own payments" on public.payments
  FOR SELECT using (
    order_id IN (
      SELECT id FROM public.orders WHERE buyer_id = auth.uid()
    )
  );

-- Allow service role to insert/update payments (for webhooks)
CREATE POLICY "Service role manages payments" on public.payments
  FOR ALL using (auth.jwt() ->> 'role' = 'service_role');
