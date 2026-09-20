## 2026-09-20T02:02:59Z

You are a teamwork_preview_worker.
Your identity: teamwork_preview_worker_m3.
Your working directory: d:/Prayas_hackathon-/.agents/teamwork_preview_worker_m3
Read:
- d:/Prayas_hackathon-/ORIGINAL_REQUEST.md
- d:/Prayas_hackathon-/PROJECT.md
- d:/Prayas_hackathon-/.agents/teamwork_preview_explorer_survey_3/analysis.md
- d:/Prayas_hackathon-/.agents/teamwork_preview_explorer_survey_3/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE FILE OWNERSHIP:
You exclusively own and may edit:
- apps/web/app/api/emergency/[token]/route.ts
- apps/web/app/emergency/[token]/page.tsx
- apps/web/packages/db/index.ts
- apps/ai/src/medilocker_ai/documents/extraction.py
- apps/web/app/api/documents/route.ts
DO NOT modify any other files.

TASKS (Requirement R4: Emergency Token Public Access & Processing Logs):
1. Guarantee that the emergency access URL generated from the QR code functions reliably when opened in a new or incognito browser tab without triggering "Access Denied" or false rate-limiting flags:
   - In apps/web/app/api/emergency/[token]/route.ts, fix IP extraction for rate limiting: do NOT lump all incognito/unauthenticated requests into a single `'unknown'` string (which hits the 30-attempt ceiling and emits 429). Fall back to unique client identifier or per-token bucket.
   - Ensure demo/live tokens (`dry-run-token-abc123`, `emg-live-8921-xyz`, `emg-live-token`, `dry-run`) always resolve cleanly.
   - Support fallback to Supabase JSON profile store (`getProfileJsonFromSupabase` in `supabaseProfile.ts`) if MongoDB user record is not found.
   - In apps/web/app/emergency/[token]/page.tsx, do NOT block profile display for up to 5,000ms waiting for geolocation. Fetch emergency profile immediately in parallel with location resolution.
   - In apps/web/app/emergency/[token]/page.tsx, distinguish error responses: show appropriate messages for 429 (Rate Limit), 404 (Token Not Found/Expired), 500 (Server Error), and only show "Access Denied" if status is 403 (revoked/unauthorized).
2. Inspect document and OCR processing logs, diagnose pipeline warnings or extraction failures, and address them:
   - In apps/ai/src/medilocker_ai/documents/extraction.py and apps/web/app/api/documents/route.ts, ensure missing OCR keys or raw_text do not produce unhandled warnings, and fix table extraction alignment.
3. Run test verification: `npx tsx test/emergency-token-and-viewer.test.ts` and `npm test` in `apps/web`.
4. Document all changes and verification results in `d:/Prayas_hackathon-/.agents/teamwork_preview_worker_m3/handoff.md`.
5. Send a message to orchestrator upon completion.
