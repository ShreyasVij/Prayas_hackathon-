# Handoff Report: Backend Architecture & Technical Survey (Emergency QR & Public Responder)

**Agent**: `explorer_survey_1` (Backend & Architecture Explorer)  
**Date**: 2026-09-20  
**Target Recipient**: Orchestrator (`1435b04e-0aae-4093-82ac-a3dc4017f7ac`) / Implementing Engineers  
**Scope**: Backend Architecture, Token Lifecycle, Public Responder API, Supabase Migration Strategy, URL Resolution

---

## 1. Observation

1. **Adversarial Test Failure on `main`**:
   - Running `npx tsx test/adversarial-stress-r1-r4.ts` inside `apps/web` failed at:
     ```
     AssertionError [ERR_ASSERTION]: Must implement normalizeEmergencyUrl
         at apps/web/test/adversarial-stress-r1-r4.ts:83:5
     ```
   - In `apps/web/components/dashboard/EmergencyQRBox.tsx` lines 1-50 on `main`, `normalizeEmergencyUrl` is undefined, and fallback URL hardcodes `/emergency/token/emg-live-8921-xyz` instead of `/emergency/emg-live-8921-xyz`.
2. **Stub Implementations in Database Layer on `main`**:
   - `apps/web/packages/db/index.ts` lines 181-203 contain non-functional mock stubs:
     ```ts
     export async function createEmergencyToken(params: any): Promise<any> {
       return { id: 'mock-em-token', token: 'mock-token-string', ...params };
     }
     export async function findTokenByHash(tokenHash: string): Promise<any> {
       return null;
     }
     ```
3. **Prior Implementation on Branch `fix/dashboard-emergency-docs-issues`**:
   - Git log and diff between `main` and `fix/dashboard-emergency-docs-issues` (commit `b0988f6` and `b127b3e`) show an in-memory store (`emergencyTokenMemoryStore`) and MongoDB persistence layer was authored for `createEmergencyToken`, `findTokenByHash`, `regenerateToken`, `revokeToken`, and `detectSuspiciousActivity`.
   - However, that branch was created prior to commit `4adf476` ("Fix all build and lint errors from Supabase auth migration") and does not incorporate Supabase persistence or medical document linkage.
4. **Complete Absence of Medical Documents in Public Emergency Endpoints**:
   - `apps/web/app/api/emergency/[token]/route.ts` lines 213-234: The returned `emergencyData` payload contains only `accessTimestamp` and `profile` (`displayName, age, dob, bloodGroup, allergies, chronicConditions, currentMedications, emergencyNotes, emergencyContacts, insuranceId, vitals`). It does **not** return `documents`.
   - `apps/web/app/emergency/[token]/page.tsx` lines 7-29: `EmergencyData` interface and JSX rendering omit any document list or preview links.
   - `apps/web/app/emergency/settings/page.tsx` line 204 explicitly states:
     ```tsx
     <p className="text-sm text-amber-900 font-semibold">
       ⚠️ Note: No medical history, documents, or files are included in emergency access.
     </p>
     ```
5. **Supabase Schema Gap**:
   - `apps/web/packages/db/supabase.sql` lines 1-131 defines tables `public.profiles`, `public.doctors`, and `public.medical_records`.
   - There are **no table definitions** or RLS policies for `public.emergency_tokens` or `public.emergency_access_logs`.
6. **Environment URL Resolution Fragility**:
   - `apps/web/app/api/emergency/token/route.ts` lines 194-198:
     ```ts
     const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
     if (!baseUrl) {
       throw new Error('Base URL not configured');
     }
     const emergencyUrl = `${baseUrl}/emergency/${token}`;
     ```
   - Throws HTTP 500 when neither environment variable is explicitly configured. Does not inspect `req.headers` (`host`, `x-forwarded-host`, `x-forwarded-proto`), nor does it adapt between local development hosts and production domains dynamically.
7. **Active Token UI Resumption Gap**:
   - `apps/web/app/api/emergency/token/route.ts` lines 283-294: `GET` returns only sanitized metadata (`id, createdAt, lastAccessedAt, accessCount, isPermanent, revoked`). It does not return `token`, `qrCode`, or `url`.
   - In `apps/web/components/EmergencyTokenGenerator.tsx` lines 31-43, `generatedToken` remains `null` on page reload, rendering "Generate QR Code" rather than displaying the existing permanent QR code.

---

## 2. Logic Chain

1. **Observation 1 & 2** show that the current `main` branch lacks both the QR normalization helper and real token database persistence, causing `adversarial-stress-r1-r4.ts` to immediately fail at the first suite.
2. **Observation 3** reveals that the implementations developed on branch `fix/dashboard-emergency-docs-issues` solved initial in-memory and MongoDB storage, but did not address the newer requirements from `## 2026-09-20T02:56:52Z` (permanent token display resumption, stored documents in responder view, Supabase table integration, and environment-aware host resolution).
3. **Observation 4** establishes that the requirement R2 ("The emergency response page must also display the patient's previously stored medical documents and records... with clickable view/preview/download links") is currently unfulfilled in both the backend API and frontend views. The backend must query MongoDB `documents`, Supabase `medical_records`, and demo mocks, returning signed/public viewable URLs.
4. **Observation 5** demonstrates that although the team is migrating to Supabase, `packages/db/supabase.sql` lacks the table schemas for emergency tokens and access logs. Implementing dual-write or fallback adapters in `packages/db/index.ts` alongside SQL definitions ensures seamless forward compatibility when the Supabase migration branch lands.
5. **Observation 6** shows that URL construction will break in production environments if `NEXTAUTH_URL` is omitted (common in serverless or Vercel deployments), or in dev environments using non-default ports. A dynamic resolver inspecting request headers and production env vars (`resolveBaseUrl(req)`) is necessary to satisfy requirement R3.
6. **Observation 7** proves that even though tokens are stored as permanent, the user experience is broken on reload because `GET /api/emergency/token` does not return the active token's QR code and URL. Returning the active token in the GET endpoint allows the settings UI and dashboard to immediately resume and display the active permanent QR code.

---

## 3. Caveats

1. **Database Multi-Tenancy**: The MongoDB collection `users` currently embeds profile data, whereas `profiles` collection contains standalone profiles. The DB helper must check both `user._id` and `profileId` matching to ensure compatibility across dependent records.
2. **Document Access Authentication**: First responders accessing `/emergency/[token]` are unauthenticated. Stored document view links must use direct Supabase Storage public/signed URLs (or an unauthenticated token-validated proxy endpoint) rather than endpoints requiring user session cookies like `/api/family/documents/[documentId]`.
3. **Branch Merging Strategy**: Branch `fix/dashboard-emergency-docs-issues` has useful partial work, but `main` already has subsequent commits. The changes should be cleanly integrated on the target branch without reverting Supabase auth improvements.

---

## 4. Conclusion

To fulfill requirements R1–R4 and achieve 100% pass rate on automated stress testing:
1. **Database Layer (`packages/db/index.ts`)**:
   - Provide a resilient, multi-tiered persistence layer: permanent in-memory map + Supabase client (`supabaseAdmin()`) + MongoDB client (`getDbClient()`).
   - Implement `createEmergencyToken`, `findTokenByHash`, `regenerateToken`, `revokeToken`, `revokeAllActiveTokensForProfile`, `logTokenAccess`, and `detectSuspiciousActivity`.
   - Update `packages/db/supabase.sql` with schema definitions and RLS policies for `public.emergency_tokens` and `public.emergency_access_logs`.
2. **Responder API (`apps/web/app/api/emergency/[token]/route.ts`)**:
   - Extend rate limiter to 60 req/min with token-level isolation for headerless/incognito requests and loopback whitelisting.
   - Query and return stored medical documents (`id, title, date, category, docType, viewUrl, fileSize`) alongside patient profile details and vitals.
   - Support demo tokens (`emg-live-8921-xyz`, `dry-run-token-abc123`, `emg-live-token`, `dry-run`, `emg-live-custom-responder-99`).
3. **Settings & Generation API (`apps/web/app/api/emergency/token/route.ts`)**:
   - In `POST`, dynamically determine base URL via `resolveBaseUrl(req)` (production env vars or request headers `x-forwarded-host`/`host`).
   - In `GET`, return the active token's `token`, `qrCode`, and `url` so the settings UI and dashboard display the active permanent QR code upon initial load and refresh.
   - In regeneration, cleanly revoke previous active tokens.
4. **Responder UI (`apps/web/app/emergency/[token]/page.tsx`)**:
   - Render stored medical documents list with accessible view/preview links.
5. **Dashboard & Navigation (`EmergencyQRBox.tsx`, `app/emergency/page.tsx`)**:
   - Implement `normalizeEmergencyUrl` to rewrite legacy `/emergency/token/` paths.
   - Implement immediate server redirect to `/emergency/settings` on `/emergency`.

---

## 5. Verification Method

1. **Run Adversarial Stress Test Suite**:
   ```bash
   cd apps/web
   npx tsx test/adversarial-stress-r1-r4.ts
   ```
   - **Expected Result**: All 5 test suites pass cleanly with HTTP 200 for demo and real tokens, 404 for non-existent tokens, 403 for revoked tokens, and proper rate-limiting isolation.
2. **Run Standard Test Suite**:
   ```bash
   cd apps/web
   npm test
   ```
   - **Expected Result**: `profile-update.test.ts` and `edge-cases.test.ts` pass cleanly (Exit code 0).
3. **Manual Verification of Responder Documents Payload**:
   ```bash
   curl -i http://localhost:3000/api/emergency/emg-live-8921-xyz
   ```
   - **Verify**: Response JSON includes `profile` with full medical info and `documents` array containing accessible preview links.
4. **Invalidation Conditions**:
   - If any emergency token expires automatically without manual regeneration.
   - If emergency access fails for incognito/fresh browsers or returns 401/403 for active tokens.
   - If medical documents are absent from the responder view.
