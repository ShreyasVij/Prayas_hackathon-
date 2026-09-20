## 2026-09-20T03:59:15Z
You are worker_m2, a Public Responder & UI Worker.
Working directory: d:/Prayas_hackathon-/.agents/worker_m2
Identity: Implementation worker.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission: Implement Milestone 2: Public Responder API & UI with Stored Medical Documents, Vitals, and Permanent QR Settings Resumption.

Authoritative source of truth:
- d:/Prayas_hackathon-/.agents/ORIGINAL_REQUEST.md (specifically ## 2026-09-20T02:56:52Z)
- d:/Prayas_hackathon-/.agents/orchestrator_2/PROJECT.md
- d:/Prayas_hackathon-/.agents/explorer_survey_1/analysis.md
- d:/Prayas_hackathon-/.agents/explorer_survey_2/analysis.md
- d:/Prayas_hackathon-/.agents/spec_miner_survey_3/analysis.md

Files you own exclusively:
- apps/web/app/api/emergency/[token]/route.ts
- apps/web/app/emergency/[token]/page.tsx
- apps/web/app/emergency/settings/page.tsx
- apps/web/components/EmergencyTokenGenerator.tsx

Detailed Requirements to implement:
1. `apps/web/app/api/emergency/[token]/route.ts`:
   - Support both demo tokens (`emg-live-8921-xyz`, `dry-run-token-abc123`, `emg-live-token`, `dry-run`, `emg-live-custom-responder-99`) and 64-hex / standard tokens. Do NOT reject demo tokens with 400! Validate length <= 128 and sanitize against malicious injection payloads.
   - Rate limit: 60 requests per minute (use 60 as capacity, not 20).
   - If rate limited (HTTP 429), return `{ error: 'Rate limit exceeded. Please try again shortly.', locked: false }` (`locked: false`).
   - For headerless requests (no IP headers), isolate rate limiting per token (`token_${token}`) so one attacked token does not lock out other tokens.
   - Multi-hop proxy support: parse the first comma-separated IP from `x-forwarded-for`.
   - Loopback IPs (`127.0.0.1`, `::1`, `localhost`) must never be marked suspicious.
   - Missing/non-existent token: return HTTP 404 with `{ error: 'Invalid or expired QR code', locked: false }`.
   - Revoked token: return HTTP 403 with `{ error: 'Emergency access revoked by the owner', revoked: true, locked: true }`.
   - Return payload:
     - `success: true`
     - `token`: requested token string
     - `accessTimestamp`: ISO timestamp
     - `profile`: `{ displayName, age, dob, bloodGroup, allergies: string[], chronicConditions: string[], currentMedications: string[], emergencyNotes: string, emergencyContacts: Array<{ name, phone, relationship }>, vitals: Array<{ label, value }> }`. Ensure `vitals` is a non-empty array for standard/demo tokens.
     - `documents`: Array of stored medical documents: `{ id, title, date, category, docType, viewUrl, fileSize }`. Retrieve documents for the patient from MongoDB `documents` collection, Supabase `medical_records`, or demo mocks (`MOCK_DOCUMENTS`). Provide readable/viewable URLs so emergency responders can view documents unauthenticatedly.
   - Query parameters `?lat=...&lon=...&loc=...`: extract and pass to `logTokenAccess`.
   - Adversarial attack resilience: handle XSS, SQLi, traversal (`../../etc/passwd`), null bytes, and buffer overflow strings gracefully (return 404 or 429, NEVER unhandled 500).

2. `apps/web/app/emergency/[token]/page.tsx`:
   - Start fetching `fetchEmergencyData()` immediately in `useEffect` on mount without waiting for `locationResolved`.
   - Geolocation: if `navigator.geolocation` exists, query in background and log to backend when resolved, without blocking initial rendering.
   - Render full patient profile: Blood Group, Allergies, Chronic Conditions, Current Medications, Emergency Contacts with direct `tel:${phone}` call buttons.
   - Render Vitals table with clean alignment and padding.
   - Render "Stored Medical Documents & Records" section: table/cards displaying Document Title, Date, Category badge, Doc Type, and clickable View/Preview/Download action buttons with links.
   - Render clear, user-friendly error views for 403 (Revoked), 404 (Invalid/Expired), and 429 (Rate Limited).

3. `apps/web/app/emergency/settings/page.tsx` & `apps/web/components/EmergencyTokenGenerator.tsx`:
   - On page load, call `GET /api/emergency/token?profileId=${profileId}`.
   - If an active token is returned (`data.activeToken` or active non-revoked token in `data.tokens`), hydrate `generatedToken` state immediately with `{ token, tokenId, qrCode, url, isPermanent: true }`.
   - Display active permanent QR code card, emergency URL, Print QR, Download, and explicit "Regenerate QR Code" button with confirmation.
   - Update settings copy: remove outdated warning that documents are excluded, and clarify that emergency responders can view emergency medical profile and stored medical records.

Verification:
- Run `npx tsx test/adversarial-stress-r1-r4.ts` inside `apps/web` (verify Suites 1, 2, 3, 4, and 5 pass!).
- Run `npm test` inside `apps/web` (10/10 pass).
