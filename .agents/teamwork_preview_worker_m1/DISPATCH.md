## 2026-09-19T20:33:00Z
You are a teamwork_preview_worker.
Your identity: teamwork_preview_worker_m1.
Your working directory: d:/Prayas_hackathon-/.agents/teamwork_preview_worker_m1
Read:
- d:/Prayas_hackathon-/ORIGINAL_REQUEST.md
- d:/Prayas_hackathon-/PROJECT.md
- d:/Prayas_hackathon-/.agents/teamwork_preview_explorer_survey_1/analysis.md
- d:/Prayas_hackathon-/.agents/teamwork_preview_explorer_survey_1/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE FILE OWNERSHIP:
You exclusively own and may edit:
- apps/web/app/dashboard/page.tsx
- apps/web/components/dashboard/EmergencyQRBox.tsx
- apps/web/app/api/health-summary/route.ts
- apps/web/app/emergency/page.tsx
DO NOT modify any other files.

TASKS (Requirement R1: Dashboard Performance & Emergency Navigation):
1. Eliminate UI loading delays on the Dashboard for both "Your AI Health Brief" and the emergency token icon:
   - In apps/web/app/dashboard/page.tsx (HealthStatusHero), eliminate blocking UI loading delays. Use instant optimistic state, eliminate slow typewriter timers that artificially block reading, avoid hydration mismatch between server and client sessionStorage, and ensure Health Brief renders immediately.
   - In apps/web/components/dashboard/EmergencyQRBox.tsx, eliminate 3-tier client waterfall. Provide instant optimistic rendering of emergency card with default fallback token `emg-live-8921-xyz` and QR preview, eliminating loading spinners that block card rendering. Set `qrData.url` to `/emergency/emg-live-8921-xyz`.
   - Ensure the Emergency access block "Open" button opens the emergency view smoothly without 404 errors or redirection failures:
     Link the "Open" button directly to `qrData.url` (or `/emergency/emg-live-8921-xyz` fallback) so clicking "Open" navigates directly to the emergency responder view (`/emergency/[token]`), NOT `/emergency/settings` and NOT an invalid path like `/emergency/token/...`.
   - In apps/web/app/emergency/page.tsx, ensure smooth redirection to emergency settings or emergency view without client-side lag.
   - In apps/web/app/api/health-summary/route.ts, ensure concurrent queries (Promise.all) and instant responses.
2. Run test verification: run `npx tsx test/emergency-token-and-viewer.test.ts` and `npm test` in `apps/web`.
3. Document all changes and verification results in `d:/Prayas_hackathon-/.agents/teamwork_preview_worker_m1/handoff.md`.
4. Send a message to orchestrator upon completion.
