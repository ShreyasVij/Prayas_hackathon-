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

-- ==========================================
-- DOCTORS TABLE
-- ==========================================
create table public.doctors (
  id uuid references public.profiles (id) on delete cascade not null primary key,
  specialty text not null,
  verified boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.doctors enable row level security;

create policy "Anyone can view verified doctors"
  on public.doctors for select
  using ( verified = true );

create policy "Users can view their own doctor record"
  on public.doctors for select
  using ( auth.uid() = id );

create policy "Doctors can update their own record"
  on public.doctors for update
  using ( auth.uid() = id );

-- ==========================================
-- MEDICAL RECORDS TABLE
-- ==========================================
create table public.medical_records (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references public.profiles (id) on delete cascade not null,
  document_url text not null,
  document_type text not null,
  disease_id text not null,
  ai_prediction jsonb,
  status text check (status in ('pending', 'reviewed')) default 'pending' not null,
  doctor_id uuid references public.doctors (id) on delete set null,
  doctor_review text,
  is_accurate boolean,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.medical_records enable row level security;

create policy "Patients can insert their own medical records"
  on public.medical_records for insert
  with check ( auth.uid() = patient_id );

create policy "Patients can view their own medical records"
  on public.medical_records for select
  using ( auth.uid() = patient_id );

create policy "Doctors can view pending records"
  on public.medical_records for select
  using ( 
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role = 'doctor'
    )
  );

create policy "Doctors can view records they reviewed"
  on public.medical_records for select
  using ( doctor_id = auth.uid() );

create policy "Doctors can update medical records for review"
  on public.medical_records for update
  using ( 
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role = 'doctor'
    )
  );
