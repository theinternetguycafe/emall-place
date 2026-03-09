-- Create onboarding_progress table if it doesn't exist
create table if not exists public.onboarding_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('seller', 'buyer')),
  step_id text not null,
  completed_at timestamp with time zone,
  skipped boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, step_id)
);

-- Enable RLS
alter table public.onboarding_progress enable row level security;

-- Create policies
create policy "Users can view own onboarding progress" on public.onboarding_progress
  for select using (auth.uid() = user_id);

create policy "Users can insert own onboarding progress" on public.onboarding_progress
  for insert with check (auth.uid() = user_id);

create policy "Users can update own onboarding progress" on public.onboarding_progress
  for update using (auth.uid() = user_id);
