# Historical MongoDB status

There is no MongoDB-to-Supabase field mapping in the clean-start architecture.
The prior MongoDB database is retained as an old, untouched historical system.

No MongoDB users, profiles, documents, versions, OCR, summaries, vitals,
appointments, family records, emergency records, audit records, jobs, or
diagnostic records are copied into Supabase.

The MongoDB audit remains useful as design reference only. The active
application uses Supabase Auth, PostgreSQL, and Supabase Storage directly.
