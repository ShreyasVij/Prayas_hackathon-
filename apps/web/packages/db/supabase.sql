-- Create profiles table linked to Supabase Auth
create table public.profiles (
  id uuid references auth.users (id) on delete cascade not null primary key,
  email text,
  role text check (role in ('patient', 'doctor')),
  data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Row Level Security)
alter table public.profiles enable row level security;

-- Create policies for RLS
create policy "Users can view their own profile."
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Function to handle new user signup automatically
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, data)
  values (new.id, new.email, 'patient', '{}'::jsonb);
  return new;
end;
$$;

-- Trigger to call the function on new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- INDEXES
-- ==========================================
-- Index for quick lookups by email
create index if not exists profiles_email_idx on public.profiles (email);

-- Index for quick lookups by role (e.g. filtering all doctors)
create index if not exists profiles_role_idx on public.profiles (role);

-- GIN index for fast querying inside the JSONB data column
create index if not exists profiles_data_gin_idx on public.profiles using gin (data);
