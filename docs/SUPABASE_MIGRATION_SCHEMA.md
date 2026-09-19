# MediLocker clean-start Supabase schema

MongoDB is historical only and is not imported. Supabase Auth, PostgreSQL, and
Supabase Storage are the only runtime data services.

```text
auth.users
  -> profiles
      -> patient_profiles -> medical_documents -> document_versions
                                      |             |-> ocr_outputs
                                      |             |-> document_classifications
                                      |             |-> document_summaries
                                      |-> medical_records
  -> doctors
```

Existing `profiles`, `doctors`, and `medical_records` are reused. `profiles.id`
and `doctors.id` remain Auth/profile UUIDs. `medical_records.patient_id` keeps
its existing meaning and `medical_document_id` is nullable for diagnostic
records that are not document-backed.

All new entities use PostgreSQL UUID primary keys. There are no Mongo IDs,
legacy references, migration snapshots, or historical source columns in the
production schema. The current document version is the greatest
`version_number`, then newest `created_at`; `document_versions.medical_document_id`
is the only authoritative document relationship.

The private `medilocker` Storage bucket stores new document binaries. The
relational tables store only storage keys and metadata. The public `pfp` bucket
remains for profile images.

Medical data is protected by ownership-path RLS. Emergency, audit, job, and
provider credential tables are backend-controlled. Google Calendar credentials
are encrypted and server-only.

The former Mongo migration and reconciliation scripts now fail closed and do
not connect to MongoDB. They are retained only to prevent accidental execution
from old deployment instructions.
