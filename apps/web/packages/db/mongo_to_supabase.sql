-- ======================================================================================
-- MIGRATION SCRIPT: MongoDB to Supabase PostgreSQL
-- ======================================================================================
-- This script creates the relational equivalents for the collections found in the 
-- MongoDB structure (mongo_structure.json).
--
-- Prerequisites:
-- It assumes that `public.profiles` and `public.doctors` already exist 
-- (as defined in apps/web/packages/db/supabase.sql).
-- ======================================================================================

-- 1. APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id uuid REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_name text,
  patient_email text,
  patient_age integer,
  patient_gender text,
  appointment_time timestamp with time zone,
  date date,
  duration integer, -- in minutes
  status text CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  reason text,
  approved_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. AUDITS
CREATE TABLE IF NOT EXISTS public.audits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text,
  target text,
  target_type text,
  resource_id text,
  result text,
  timestamp timestamp with time zone DEFAULT timezone('utc'::text, now()),
  ip_address text,
  user_agent text,
  metadata jsonb,
  archived boolean DEFAULT false
);

-- 3. DOCUMENTS
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  doc_type text,
  storage_key text NOT NULL,
  version_id text,
  processing_status text,
  status text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. DOCUMENT VERSIONS
CREATE TABLE IF NOT EXISTS public.document_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  size integer,
  mime_type text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. EMERGENCY TOKENS
CREATE TABLE IF NOT EXISTS public.emergency_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  is_permanent boolean DEFAULT false,
  revoked boolean DEFAULT false,
  access_count integer DEFAULT 0,
  metadata jsonb,
  revoked_at timestamp with time zone,
  last_accessed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. FAMILIES & FAMILY MEMBERS
CREATE TABLE IF NOT EXISTS public.families (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.family_members (
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (family_id, user_id)
);

-- 7. FAMILY INVITES
CREATE TABLE IF NOT EXISTS public.family_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  used boolean DEFAULT false,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. JOBS
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL,
  status text NOT NULL,
  priority integer DEFAULT 0,
  attempts integer DEFAULT 0,
  payload jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. OCR OUTPUTS
CREATE TABLE IF NOT EXISTS public.ocr_outputs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  version_id text,
  storage_key text,
  engine text,
  confidence numeric,
  text text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. SUMMARIES
CREATE TABLE IF NOT EXISTS public.summaries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  type text,
  content text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. USER HEALTH SUMMARY
CREATE TABLE IF NOT EXISTS public.user_health_summary (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  document_count integer DEFAULT 0,
  last_document_date timestamp with time zone,
  sections jsonb,
  summary text,
  generated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. USER VITALS
CREATE TABLE IF NOT EXISTS public.user_vitals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  vital_type text NOT NULL,
  vital_category text,
  label text,
  value numeric,
  unit text,
  status text,
  advice text,
  explanation text,
  source text,
  document_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ======================================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) FOR ALL NEW TABLES
-- ======================================================================================

-- 13. EMERGENCY ACCESS LOGS
CREATE TABLE IF NOT EXISTS public.emergency_access_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token_hash text NOT NULL,
  ip text,
  user_agent text,
  location text,
  accessed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. EMERGENCY ACTION LOGS
CREATE TABLE IF NOT EXISTS public.emergency_action_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text,
  ip text,
  user_agent text,
  token_hash text,
  details text,
  timestamp timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. EMERGENCY AUDIT
CREATE TABLE IF NOT EXISTS public.emergency_audit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash text,
  action text,
  timestamp timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  ip text,
  user_agent text,
  metadata jsonb
);

-- 16. EMERGENCY NFC TOKENS
CREATE TABLE IF NOT EXISTS public.emergency_nfc_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  nfc_url text,
  device_name text,
  created_from_device text,
  token_type text,
  is_active boolean DEFAULT true,
  is_permanent boolean DEFAULT false,
  otp_required_for_full_access boolean,
  otp_expiry_minutes integer,
  pre_authorized_access_list jsonb,
  total_scans integer DEFAULT 0,
  total_otp_requests integer DEFAULT 0,
  total_otp_verified integer DEFAULT 0,
  total_pre_auth_access integer DEFAULT 0,
  suspicious_access_count integer DEFAULT 0,
  failed_otp_attempts integer DEFAULT 0,
  encryption_version integer,
  encrypted_fields jsonb,
  version integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_health_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_nfc_tokens ENABLE ROW LEVEL SECURITY;

-- Examples of base RLS Policies (these can be tightened according to app rules)
CREATE POLICY "Users can manage their own documents" ON public.documents 
  USING (auth.uid() = owner_user_id);
  
CREATE POLICY "Users can manage their own vitals" ON public.user_vitals 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own health summary" ON public.user_health_summary
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their families" ON public.families 
  USING (auth.uid() = owner_id OR EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = id AND fm.user_id = auth.uid()));
