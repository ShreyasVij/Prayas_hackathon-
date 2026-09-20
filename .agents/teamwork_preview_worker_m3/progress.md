# Progress Tracker

Last visited: 2026-09-20T02:08:30Z

## Current Status
- All Requirement R4 tasks completed and verified:
  1. Fixed IP extraction & rate limiting in `apps/web/app/api/emergency/[token]/route.ts` with per-token and unique client buckets (no shared 'unknown' ceiling).
  2. Guaranteed clean demo & live token resolution (`dry-run-token-abc123`, `emg-live-8921-xyz`, `emg-live-token`, `dry-run`) with vitals attached.
  3. Integrated fallback to Supabase JSON profile store (`getProfileJsonFromSupabase`) and local profile storage when MongoDB user is absent.
  4. Parallelized emergency profile fetch with geolocation in `apps/web/app/emergency/[token]/page.tsx` (zero delay on mount).
  5. Implemented distinct error screens for 429 (Rate Limit), 404 (Not Found/Expired), 500 (Server Error), and 403 (Access Denied / Revoked).
  6. Fixed OCR pipeline warnings and table extraction alignment in `apps/ai/src/medilocker_ai/documents/extraction.py` and `apps/web/app/api/documents/route.ts`.
  7. Automated tests executed and passing: `npx tsx test/emergency-token-and-viewer.test.ts` (7/7 passed) and `npm test` (17/17 passed).
- Next step: Write handoff report and notify orchestrator.
