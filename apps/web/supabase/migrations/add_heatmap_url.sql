-- Add heatmap_url column to medical_records table
-- This stores the Supabase Storage public URL of the AI Grad-CAM heatmap image
-- so it can be displayed when patients review past records and doctors view scans.

ALTER TABLE medical_records
  ADD COLUMN IF NOT EXISTS heatmap_url TEXT;

-- Optional: create an index for quick lookups by patient
-- CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
