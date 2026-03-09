-- Seller Onboarding Progress Table
create table public.seller_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed boolean default false,
  step_index integer default 0,
  completed_steps jsonb default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.seller_onboarding enable row level security;

create policy "Users can view own onboarding progress" on public.seller_onboarding
  for select using (auth.uid() = user_id);

create policy "Users can update own onboarding progress" on public.seller_onboarding
  for update using (auth.uid() = user_id);

create policy "Users can insert own onboarding progress" on public.seller_onboarding
  for insert with check (auth.uid() = user_id);

create policy "Admins can manage all onboarding progress" on public.seller_onboarding
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
