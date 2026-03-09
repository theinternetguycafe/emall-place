-- Add new profile fields
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists gender text check (gender in ('male', 'female', 'other', null));
alter table public.profiles add column if not exists municipality text;
alter table public.profiles add column if not exists province text;
