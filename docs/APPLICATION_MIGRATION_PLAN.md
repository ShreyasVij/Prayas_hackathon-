# Supabase-only application cutover

The application now uses Supabase as its runtime persistence boundary. New
accounts are created through Supabase Auth, the Auth trigger creates `profiles`,
and patient/dependent rows are created in `patient_profiles`.

New document binaries go to the private `medilocker` bucket. Document metadata,
versions, OCR, classifications, summaries, vitals, appointments, family data,
sharing, emergency state, and audit events are stored in PostgreSQL.

MongoDB is not queried by the runtime. Historical migration and reconciliation
commands intentionally fail closed and do not connect to MongoDB.

Required environment variables are Supabase/Auth/NextAuth variables plus active
Google Calendar and AI provider variables. `MONGODB_URI` and `MONGODB_DB` are
not required for normal runtime.

Before deployment, apply the reviewed schema in staging and test a brand-new
patient and doctor account through signup, patient profile creation, document
upload, Storage persistence, versioning, OCR, summaries, vitals, health
summary, diagnostics, appointments, family/sharing, emergency access, and
audit logging.
