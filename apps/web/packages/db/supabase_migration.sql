-- MediLocker clean-start Supabase schema.
-- Does not import or copy historical MongoDB data.
-- Reuses existing public.profiles, public.doctors, public.medical_records.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Existing tables: additive columns only
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.doctors add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.doctors add column if not exists doctor_code text;
alter table public.medical_records add column if not exists medical_document_id uuid;
alter table public.medical_records add column if not exists model_name text;
alter table public.medical_records add column if not exists model_version text;
alter table public.medical_records add column if not exists model_confidence numeric;
alter table public.medical_records add column if not exists explanation text;
alter table public.medical_records add column if not exists diagnostic_metadata jsonb not null default '{}'::jsonb;
alter table public.medical_records add column if not exists source_storage_key text;

create unique index if not exists doctors_doctor_code_uq
  on public.doctors (doctor_code)
  where doctor_code is not null;

-- Auth profile bootstrap (safe if the trigger already exists)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, data)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'role', 'patient'), '{}'::jsonb)
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- New tables required by current application runtime
-- ---------------------------------------------------------------------------
create table if not exists public.patient_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete no action,
  type text not null default 'self',
  display_name text not null,
  allergies jsonb not null default '[]'::jsonb,
  conditions jsonb not null default '[]'::jsonb,
  medications jsonb not null default '[]'::jsonb,
  guardians jsonb not null default '[]'::jsonb,
  vital_identifiers jsonb not null default '{}'::jsonb,
  emergency_contacts jsonb not null default '[]'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medical_documents (
  id uuid primary key default gen_random_uuid(),
  patient_profile_id uuid not null references public.patient_profiles(id) on delete no action,
  owner_profile_id uuid not null references public.profiles(id) on delete no action,
  document_type text not null default 'other',
  title text,
  storage_key text not null,
  mime_type text,
  size_bytes bigint,
  status text not null default 'active',
  processing_status text,
  metadata jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_versions (
  id text primary key,
  medical_document_id uuid not null references public.medical_documents(id) on delete no action,
  version_number integer not null default 1,
  storage_key text not null,
  mime_type text,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (medical_document_id, version_number)
);

create table if not exists public.ocr_outputs (
  id text primary key,
  medical_document_id uuid references public.medical_documents(id) on delete no action,
  document_version_id text,
  text_content text not null default '',
  raw_text text,
  confidence numeric,
  engine text,
  metadata jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_classifications (
  id text primary key,
  medical_document_id uuid references public.medical_documents(id) on delete no action,
  category text,
  detected_type text,
  confidence numeric,
  payload jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_summaries (
  id text primary key,
  medical_document_id uuid references public.medical_documents(id) on delete no action,
  summary_type text not null default 'document',
  text_content text,
  content jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  status text not null default 'pending',
  priority integer not null default 0,
  attempts integer not null default 0,
  patient_profile_id uuid references public.patient_profiles(id) on delete no action,
  medical_document_id uuid references public.medical_documents(id) on delete no action,
  document_version_id text,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_vitals (
  id text primary key,
  patient_profile_id uuid references public.patient_profiles(id) on delete no action,
  owner_profile_id uuid references public.profiles(id) on delete no action,
  medical_document_id uuid references public.medical_documents(id) on delete no action,
  vital_type text,
  vital_category text,
  label text,
  value_text text,
  value_numeric numeric,
  unit text,
  source text,
  recorded_at timestamptz,
  explanation text,
  advice text,
  status text,
  raw_value jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_health_summaries (
  id text primary key,
  patient_profile_id uuid references public.patient_profiles(id) on delete no action,
  owner_profile_id uuid references public.profiles(id) on delete no action,
  summary_text text,
  sections jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_trends (
  id text primary key,
  patient_profile_id uuid references public.patient_profiles(id) on delete no action,
  owner_profile_id uuid references public.profiles(id) on delete no action,
  metric text,
  values jsonb not null default '[]'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_timeline (
  id text primary key,
  patient_profile_id uuid references public.patient_profiles(id) on delete no action,
  owner_profile_id uuid references public.profiles(id) on delete no action,
  event_time timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.health_scores (
  id text primary key,
  patient_profile_id uuid references public.patient_profiles(id) on delete no action,
  owner_profile_id uuid references public.profiles(id) on delete no action,
  score numeric,
  payload jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_insights (
  id text primary key,
  patient_profile_id uuid references public.patient_profiles(id) on delete no action,
  owner_profile_id uuid references public.profiles(id) on delete no action,
  insight text,
  payload jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references public.doctors(id) on delete no action,
  patient_profile_id uuid references public.patient_profiles(id) on delete no action,
  patient_user_id uuid references public.profiles(id) on delete no action,
  patient_name text not null,
  patient_email text,
  patient_age integer,
  patient_gender text,
  appointment_date date not null,
  appointment_time text not null,
  duration_minutes integer not null default 30,
  status text not null default 'pending',
  reason text,
  notes text,
  diagnosis text,
  prescription text,
  google_event_id text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete no action,
  name text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  patient_profile_id uuid references public.patient_profiles(id) on delete no action,
  member_profile_id uuid references public.profiles(id) on delete no action,
  role text,
  created_at timestamptz not null default now()
);

create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete no action,
  email text not null,
  token_hash text,
  expires_at timestamptz not null,
  used_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.shares (
  id text primary key,
  patient_profile_id uuid references public.patient_profiles(id) on delete no action,
  owner_profile_id uuid references public.profiles(id) on delete no action,
  granted_to_profile_id uuid references public.profiles(id) on delete no action,
  granted_to_email text,
  permissions jsonb not null default '[]'::jsonb,
  scope jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  expires_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.claims (
  id text primary key,
  patient_profile_id uuid references public.patient_profiles(id) on delete no action,
  claim_number text,
  status text,
  payload jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id text primary key,
  patient_profile_id uuid references public.patient_profiles(id) on delete no action,
  severity text,
  message text not null default '',
  event_time timestamptz not null default now(),
  status text not null default 'active',
  payload jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete no action,
  action text not null,
  target_type text,
  resource_id text,
  result text,
  event_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.doctor_files (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete no action,
  medical_document_id uuid references public.medical_documents(id) on delete no action,
  doctor_id uuid references public.doctors(id) on delete no action,
  patient_profile_id uuid references public.patient_profiles(id) on delete no action,
  original_file_id text,
  file_name text,
  file_type text,
  mime_type text,
  storage_key text,
  storage_url text,
  file_size bigint,
  uploaded_at timestamptz,
  transferred_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.doctor_patient_notes (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references public.doctors(id) on delete no action,
  patient_profile_id uuid references public.patient_profiles(id) on delete no action,
  patient_user_id uuid references public.profiles(id) on delete no action,
  note text not null default '',
  payload jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.doctor_provider_credentials (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete no action,
  provider text not null,
  encrypted_access_token text not null,
  encrypted_refresh_token text,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (doctor_id, provider)
);

create table if not exists public.emergency_tokens (
  id text primary key,
  owner_profile_id uuid references public.profiles(id) on delete no action,
  patient_profile_id uuid references public.patient_profiles(id) on delete no action,
  token_hash text not null unique,
  token_type text not null default 'standard',
  active boolean not null default true,
  expires_at timestamptz,
  pre_authorized_access_list jsonb not null default '[]'::jsonb,
  encrypted_fields jsonb not null default '[]'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.emergency_access_logs (
  id text primary key,
  token_id text not null references public.emergency_tokens(id) on delete no action,
  patient_profile_id uuid references public.patient_profiles(id) on delete no action,
  granted_profile_id uuid references public.profiles(id) on delete no action,
  action text not null,
  scanned_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  location jsonb,
  metadata jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.emergency_otp_sessions (
  id text primary key,
  token_id text not null references public.emergency_tokens(id) on delete no action,
  otp_hash text not null,
  attempts integer not null default 0,
  verified_at timestamptz,
  expires_at timestamptz not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id text primary key,
  user_id uuid references public.profiles(id) on delete no action,
  token text,
  expires_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Convert draft UUID primary keys from the previous schema pass to text IDs
-- used by current application document/OCR/vital keys. Safe on empty tables.
alter table public.document_versions alter column id type text using id::text;
alter table public.ocr_outputs alter column id type text using id::text;
alter table public.document_classifications alter column id type text using id::text;
alter table public.document_summaries alter column id type text using id::text;
alter table public.user_vitals alter column id type text using id::text;
alter table public.user_health_summaries alter column id type text using id::text;
alter table public.shares alter column id type text using id::text;
alter table public.claims alter column id type text using id::text;
alter table public.alerts alter column id type text using id::text;
alter table public.emergency_tokens alter column id type text using id::text;
alter table public.emergency_access_logs alter column id type text using id::text;
alter table public.emergency_otp_sessions alter column id type text using id::text;
alter table public.audit_events alter column resource_id type text using resource_id::text;
alter table public.emergency_access_logs alter column ip_address type text using ip_address::text;
alter table public.audit_events alter column ip_address type text using ip_address::text;

alter table public.user_vitals add column if not exists owner_profile_id uuid references public.profiles(id) on delete no action;
alter table public.user_health_summaries add column if not exists owner_profile_id uuid references public.profiles(id) on delete no action;
alter table public.ocr_outputs add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.medical_documents add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.document_versions add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.ai_jobs add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.appointments add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.emergency_tokens add column if not exists owner_profile_id uuid references public.profiles(id) on delete no action;
alter table public.emergency_tokens add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.family_invites add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.doctor_patient_notes add column if not exists patient_user_id uuid references public.profiles(id) on delete no action;
alter table public.doctor_files add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.document_classifications add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.document_classifications add column if not exists updated_at timestamptz not null default now();
alter table public.user_vitals add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.user_health_summaries add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.shares add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.alerts add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.claims add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.audit_events add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.emergency_access_logs add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.emergency_otp_sessions add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.ocr_outputs alter column medical_document_id drop not null;
alter table public.user_vitals alter column patient_profile_id drop not null;
alter table public.user_health_summaries alter column patient_profile_id drop not null;
alter table public.family_invites alter column token_hash drop not null;

create index if not exists patient_profiles_owner_idx on public.patient_profiles(profile_id);
create index if not exists documents_patient_recent_idx on public.medical_documents(patient_profile_id, created_at desc);
create index if not exists documents_owner_idx on public.medical_documents(owner_profile_id);
create index if not exists versions_document_idx on public.document_versions(medical_document_id, version_number desc);
create index if not exists ocr_document_idx on public.ocr_outputs(medical_document_id);
create index if not exists vitals_owner_recent_idx on public.user_vitals(owner_profile_id, recorded_at desc);
create index if not exists vitals_profile_recent_idx on public.user_vitals(patient_profile_id, recorded_at desc);
create index if not exists appointments_schedule_idx on public.appointments(doctor_id, appointment_date, appointment_time);
create unique index if not exists appointments_slot_uq on public.appointments(doctor_id, appointment_date, appointment_time)
  where doctor_id is not null;
create index if not exists emergency_tokens_owner_idx on public.emergency_tokens(owner_profile_id);
create index if not exists ai_jobs_status_idx on public.ai_jobs(status, created_at desc);
create index if not exists family_invites_email_idx on public.family_invites(email);

-- ---------------------------------------------------------------------------
-- RLS: preserve existing policies on profiles/doctors/medical_records
-- ---------------------------------------------------------------------------
alter table public.patient_profiles enable row level security;
alter table public.medical_documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.ocr_outputs enable row level security;
alter table public.document_classifications enable row level security;
alter table public.document_summaries enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.user_vitals enable row level security;
alter table public.user_health_summaries enable row level security;
alter table public.health_trends enable row level security;
alter table public.health_timeline enable row level security;
alter table public.health_scores enable row level security;
alter table public.health_insights enable row level security;
alter table public.appointments enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.shares enable row level security;
alter table public.claims enable row level security;
alter table public.alerts enable row level security;
alter table public.audit_events enable row level security;
alter table public.doctor_files enable row level security;
alter table public.doctor_patient_notes enable row level security;
alter table public.doctor_provider_credentials enable row level security;
alter table public.emergency_tokens enable row level security;
alter table public.emergency_access_logs enable row level security;
alter table public.emergency_otp_sessions enable row level security;
alter table public.sessions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'patient_profiles_owner_select') then
    create policy patient_profiles_owner_select on public.patient_profiles for select
      using (profile_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'patient_profiles_owner_write') then
    create policy patient_profiles_owner_write on public.patient_profiles for all
      using (profile_id = auth.uid()) with check (profile_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'medical_documents_owner_select') then
    create policy medical_documents_owner_select on public.medical_documents for select using (
      owner_profile_id = auth.uid() or exists (
        select 1 from public.patient_profiles p
        where p.id = patient_profile_id and p.profile_id = auth.uid()
      )
    );
  end if;
  if not exists (select 1 from pg_policies where policyname = 'user_vitals_owner_select') then
    create policy user_vitals_owner_select on public.user_vitals for select
      using (owner_profile_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'appointments_participant_select') then
    create policy appointments_participant_select on public.appointments for select
      using (patient_user_id = auth.uid() or doctor_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'families_owner_select') then
    create policy families_owner_select on public.families for select
      using (owner_profile_id = auth.uid() or (data->'members') ? auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'shares_owner_select') then
    create policy shares_owner_select on public.shares for select
      using (owner_profile_id = auth.uid() or granted_to_profile_id = auth.uid());
  end if;
end $$;

-- Provider credentials, emergency OTP, audit, and sessions have no client
-- policies. Next.js uses the service role, which bypasses RLS.
