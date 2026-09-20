# Comprehensive Specification & Test Suite Analysis: Emergency QR System

**Author**: `spec_miner_survey_3` (Test & Specification Miner)  
**Date**: 2026-09-20  
**Working Directory**: `d:/Prayas_hackathon-/.agents/spec_miner_survey_3`  
**Identity Mode**: Read-Only Specification Investigator (No source modifications permitted)

---

## 1. Executive Summary & Specification Authorities

This report delivers a rigorous specification probe, test suite inspection, and requirements gap analysis for the **MediLocker Emergency QR System and Associated Data Pipelines**. 

### 1.1 Specification Sources of Truth
1. **`ORIGINAL_REQUEST.md` (Section `## 2026-09-20T02:56:52Z`)** — The authoritative latest directive establishing four primary requirements:
   - **R1. Permanent Emergency QR Token Lifecycle**: Permanent default tokens, no premature expiration, manual regeneration revoking the prior token and issuing a new permanent token.
   - **R2. Responder View with Stored Documents & Profile Information**: Unauthenticated access, critical medical metadata (blood group, allergies, conditions, medications, contacts with direct call actions), AND stored patient medical documents (titles, dates, categories, readable view/preview/download links).
   - **R3. Environment-Aware URL Resolution (Local vs. Production)**: Dynamic host resolution generating local URLs (`http://localhost:3000` or request host) in development and production domain in production.
   - **R4. Supabase Migration Compatibility & Storage Strategy**: Seamless persistence abstraction transitioning from MongoDB to Supabase, compatible schema/table definitions for `emergency_tokens` and documents, with robust local vs. remote DB failovers.
2. **`ORIGINAL_REQUEST.md` (Section `## Initial Request — 2026-09-20T01:55:48+05:30`)** — Baseline UX & performance requirements:
   - Dashboard AI Health Brief and Emergency QR loading without UI delay.
   - Smooth emergency navigation without 404/redirection errors.
   - Document aspect ratio calculation, unclipped badges, vitals table alignment, dark backdrop modal viewer.
   - Unauthenticated emergency access and OCR pipeline log cleanup.
3. **`PROJECT.md`** — Architecture overview, interface contracts, milestone mapping (M1–M5), and code layout.
4. **Test Suite in `apps/web/test/`** — `adversarial-stress-r1-r4.ts`, `edge-cases.test.ts`, and `profile-update.test.ts`.

### 1.2 Current State of Test Execution
- **`npm test` in `apps/web`**: Runs `"tsx test/profile-update.test.ts && tsx test/edge-cases.test.ts"`. Both files pass cleanly with Exit Code 0 (10 tests total).
- **`npx tsx test/adversarial-stress-r1-r4.ts`**: Fails immediately on Test 1.1 with `AssertionError [ERR_ASSERTION]: Must implement normalizeEmergencyUrl`. As detailed below, there are at least 6 subsequent fatal blockers in the implementation that prevent this suite from passing once Test 1.1 is resolved.
- **Test Coverage Gap**: No existing test currently exercises R2's newly mandated stored document display on the emergency responder route, R3's environment-aware URL generation, or R4's Supabase table storage for emergency tokens.

---

## 2. Detailed Line-by-Line Audit of Existing Test Suites in `apps/web/test/`

### 2.1 File: `apps/web/test/adversarial-stress-r1-r4.ts` (453 lines)

This file is an empirical adversarial stress suite designed to probe Requirement R1 (Emergency URL Navigation & QRBox Component) and Requirement R4 (Unauthenticated Emergency Public Access & Rate Limiting). It uses Node's native `assert` module, in-memory execution of Next.js Route Handler `GET` from `app/api/emergency/[token]/route`, and direct database abstraction calls.

#### Suite 1: Requirement R1 — Emergency URL Navigation & QRBox Component (Lines 61–135)
1. **Test 1.1 — "EmergencyQRBox component source verification" (Lines 68–86)**:
   - *Target*: `apps/web/components/dashboard/EmergencyQRBox.tsx`.
   - *Assertions*:
     - File exists (`assert(fs.existsSync(qrBoxPath))`).
     - Content includes fallback token `'emg-live-8921-xyz'`.
     - Open button links to `qrData.url` or fallback (`href={qrData?.url || "/emergency/emg-live-8921-xyz"}`).
     - Component implements URL normalization (`content.includes("normalizeEmergencyUrl")`).
     - Component does not render with undefined target (`!content.includes("href={`/emergency/${undefined}`}")`).
   - *Failure Point*: **FAILS** because `EmergencyQRBox.tsx` uses legacy path `url: "/emergency/token/emg-live-8921-xyz"` and does NOT define or import `normalizeEmergencyUrl`.
2. **Test 1.2 — "URL normalization logic with diverse inputs" (Lines 88–110)**:
   - *Logic Tested*: An inline reference normalization function:
     - `normalizeEmergencyUrl(undefined)` -> `"/emergency/emg-live-8921-xyz"`
     - `normalizeEmergencyUrl("")` -> `"/emergency/emg-live-8921-xyz"`
     - `normalizeEmergencyUrl("/emergency/token/abc123xyz")` -> `"/emergency/abc123xyz"`
     - `normalizeEmergencyUrl("https://medilocker.vault/emergency/token/abc123xyz")` -> `"https://medilocker.vault/emergency/abc123xyz"`
     - `normalizeEmergencyUrl("/emergency/emg-live-8921-xyz")` -> `"/emergency/emg-live-8921-xyz"`
3. **Test 1.3 — "Emergency root page (/emergency) redirect behavior" (Lines 112–124)**:
   - *Target*: `apps/web/app/emergency/page.tsx` and `apps/web/app/emergency/settings/page.tsx`.
   - *Assertions*:
     - Target destination `app/emergency/settings/page.tsx` exists.
     - `app/emergency/page.tsx` contains `redirect('/emergency/settings')` or `redirect("/emergency/settings")`.
   - *Failure Point*: **FAILS** because `app/emergency/page.tsx` currently uses client-side `useRouter().push('/emergency/settings')` inside `useEffect`, rather than Next.js server-side `redirect('/emergency/settings')`.
4. **Test 1.4 — "Emergency responder view page (/emergency/[token]) exists" (Lines 126–134)**:
   - *Target*: `apps/web/app/emergency/[token]/page.tsx`.
   - *Assertions*:
     - Verifies file exists.
     - Verifies immediate fetch on token mount (`content.includes("fetchEmergencyData()")`).
     - Verifies route parameter extraction (`content.includes("useParams()")`).
     - Verifies background geolocation attempt (`content.includes("navigator.geolocation")`).

#### Suite 2: Requirement R4 — Unauthenticated Emergency Public Access (Lines 137–234)
1. **Test 2.1 — "Unauthenticated GET /api/emergency/${token}" across 5 Demo Tokens (Lines 143–191)**:
   - *Tokens Tested*: `["emg-live-8921-xyz", "dry-run-token-abc123", "emg-live-token", "dry-run", "emg-live-custom-responder-99"]`.
   - *Request*: `new NextRequest('http://localhost:3000/api/emergency/${token}')` with NO session cookie and NO authorization header. User-Agent set to `"Mozilla/5.0 (EmergencyResponder; Ambulance Unit 12)"`.
   - *Assertions*:
     - HTTP Status 200 OK.
     - `body.success === true`.
     - `body.accessTimestamp` is truthy.
     - `body.profile.displayName` is a non-empty string.
     - `body.profile.bloodGroup` is a non-empty string.
     - `body.profile.allergies`, `chronicConditions`, `currentMedications` are arrays.
     - `body.profile.emergencyContacts` is a non-empty array with `name` and `phone`.
     - `body.profile.vitals` is a non-empty array where each vital has `label` and `value`.
   - *Failure Point*: **FAILS** because `apps/web/app/api/emergency/[token]/route.ts` line 72 strictly enforces `/^[a-f0-9]{64}$/i.test(token)` and returns HTTP 400 (`Invalid token format`) for all non-hex demo tokens! Furthermore, `route.ts` does not construct or return a `vitals` array.
2. **Test 2.2 — "Unauthenticated access with query coordinates (lat, lon)" (Lines 193–204)**:
   - *Request*: `GET /api/emergency/emg-live-8921-xyz?lat=12.9716&lon=77.5946&loc=Bengaluru`.
   - *Assertions*: HTTP 200, `body.success === true`, `body.token === "emg-live-8921-xyz"`.
   - *Failure Point*: **FAILS** on non-hex format regex in `route.ts`.
3. **Test 2.3 — "Real DB token unauthenticated resolution" (Lines 206–234)**:
   - *Mechanism*: Generates a 32-byte hex token, hashes with SHA-256, calls `createEmergencyToken()`, then performs unauthenticated `GET /api/emergency/${rawToken}` with `x-forwarded-for: 198.51.100.22`.
   - *Assertions*: Must NEVER return HTTP 401 (Unauthorized) or HTTP 403 (Forbidden). Status must be in `[200, 404]`.

#### Suite 3: Requirement R4 — Rate Limiting Isolation & Multi-Client Independence (Lines 237–326)
1. **Test 3.1 — "IP-based Rate Limit Exhaustion and Cross-IP Isolation" (Lines 243–279)**:
   - *Mechanism*:
     - `ipAttacker` sends 60 requests in a loop to `/api/emergency/${testTargetToken}` -> asserts all < 429.
     - Request 61 from `ipAttacker` -> asserts HTTP 429, `body.error.includes("Rate limit exceeded")`, and `body.locked === false`.
     - Concurrent request from `ipInnocent` to `/api/emergency/emg-live-8921-xyz` -> asserts HTTP 200 (proves IP isolation).
   - *Failure Point*: **FAILS** because `route.ts` line 61 uses `checkAccessRateLimit(ip, 20, 60000)` (cap is 20, not 60!), and returns `locked: true` on 429 rather than `locked: false`.
2. **Test 3.2 — "Headerless (No IP) Rate Limit Isolation per Token" (Lines 281–308)**:
   - *Mechanism*: Tests incognito clients without IP proxy headers. Token Alpha is hit 60 times; 61st hits 429. Simultaneous request for Token Beta without IP headers MUST return 200.
   - *Failure Point*: **FAILS** because `route.ts` defaults missing IP to `'unknown'`, sharing a single rate-limiting bucket across all headerless requests regardless of token!
3. **Test 3.3 — "Multi-hop proxy header parsing (x-forwarded-for list)" (Lines 310–325)**:
   - *Mechanism*: `x-forwarded-for: "${clientIp}, ${proxyIp}, ${cdnIp}"`. Asserts client IP is extracted from first CSV element and request succeeds with HTTP 200.

#### Suite 4: Requirement R4 — Precise Error Code Differentiation (Lines 328–388)
1. **Test 4.1 — "Non-existent token returns HTTP 404 (Not 403 or 500)" (Lines 334–347)**:
   - *Token*: `completely-non-existent-token-${Date.now()}`.
   - *Assertions*: Status 404, `body.locked === false`, `body.error.includes("Invalid or expired")`.
   - *Failure Point*: **FAILS** because `route.ts` returns `400 Invalid token format` if token is non-hex, or returns `{ error: 'Invalid QR code', locked: true }` (sets `locked: true` and missing "expired" phrasing).
2. **Test 4.2 — "Revoked token returns HTTP 403 with revoked: true" (Lines 349–377)**:
   - *Mechanism*: Creates token via `createEmergencyToken`, revokes via `revokeToken(tokenId)`.
   - *Assertions*: Status 403 Forbidden, `body.revoked === true`, `body.locked === true`, `body.error.includes("revoked by the owner")`.
3. **Test 4.3 — "Localhost never flagged as suspicious (False Positive Protection)" (Lines 379–387)**:
   - *IPs*: `127.0.0.1`, `::1`, `localhost`.
   - *Assertions*: `detectSuspiciousActivity(ip, 60, 15)` returns `suspicious === false`.

#### Suite 5: Adversarial Stress & Input Boundary Testing (Lines 390–443)
1. **Test 5.1 — "Rapid burst of 50 concurrent requests to demo token" (Lines 396–410)**:
   - *Mechanism*: `Promise.all()` issuing 50 simultaneous requests across rotating client IPs to `/api/emergency/emg-live-8921-xyz`. Asserts all 50 return HTTP 200.
2. **Test 5.2 — "Adversarial input payloads (XSS, path traversal, SQLi, Buffer Overflow)" (Lines 412–432)**:
   - *Attack Payloads*:
     - `<script>alert(1)</script>` (Reflected XSS)
     - `../../etc/passwd` (Directory Traversal)
     - `' OR '1'='1` (SQL Injection)
     - `emg-live-%00-nullbyte` (Null Byte Injection)
     - `'a'.repeat(1024)` (Buffer Overflow Attempt)
   - *Assertions*: Must NEVER return HTTP 500 unhandled crash. Status must be in `[200, 404, 429]`.

---

### 2.2 File: `apps/web/test/edge-cases.test.ts` (225 lines)

This test file verifies edge cases for profile data persistence across Supabase Storage, Supabase `profiles` table, and local file storage (`apps/web/data/profiles/*.json`).

1. **Edge Case 1 — Skipped Step 3 (Optional health & lifestyle)**:
   - *Inputs*: Profile with empty diet arrays (`breakfast: []`, `lunch: []`, `dinner: []`), `dailyRoutine: null`, `allergies: null`, `medications: null`.
   - *Assertions*: `saveProfileJsonToSupabase()` returns `success: true`. Fetched profile preserves empty arrays and null fields; `onboarding.completed === true`.
2. **Edge Case 2 — Special Characters & Multi-sentence Descriptions**:
   - *Inputs*: Email `patient+special.test_01@medilocker.org`, name `Dr. O'Connor-Smith`, diet descriptions containing punctuation, dashes, quotes, and degrees symbol (`—`, `'`, `&`, `80°C`, `(180g)`), daily routine with arrow notations (`->`).
   - *Assertions*: Preserves all special characters and punctuation across serialization/deserialization.
3. **Edge Case 3 — Non-existent Profile Query**:
   - *Inputs*: `ghost_${Date.now()}@vault.none`.
   - *Assertions*: Returns strictly `null` without throwing an error.
4. **Edge Case 4 — Step 2 to Step 3 Draft Persistence**:
   - *Inputs*: Incomplete onboarding draft (`onboarding.completed = false`, `completedAt: null`).
   - *Assertions*: Persists draft state and preserves `completed: false` and `bloodGroup: "B+"`.
5. **Edge Case 5 — Diet Sentence Whitespace Handling & Trimming**:
   - *Inputs*: Leading and trailing spaces in diet entries (`"  2 slices whole grain bread with avocado  ".trim()`).
   - *Assertions*: Correctly trimmed strings are preserved in respective meal columns.
6. **Edge Case 6 — Theme Mode Toggling Cycle (Light -> Dark -> Light)**:
   - *Inputs*: Sequentially updates `customization: { theme: 'dark' }` then `customization: { theme: 'light' }`.
   - *Assertions*: Correctly toggles and persists theme state between reads.

---

### 2.3 File: `apps/web/test/profile-update.test.ts` (131 lines)

This test suite verifies basic CRUD operations for patient profiles using `saveProfileJsonToSupabase` and `getProfileJsonFromSupabase`:
1. **Test 1 — Saving Profile JSON**: Validates saving full patient object (`Alex Parker`, DOB, Blood Group `O+`, emergency contacts, diet, routine, allergies).
2. **Test 2 — Fetching Profile JSON**: Asserts exact match of all structured fields.
3. **Test 3 — Theme Customization Update**: Updates theme to `dark` and verifies persistence.
4. **Test 4 — Diet Modification**: Modifies diet arrays (e.g. Avocado toast) and verifies updated retrieval.

---

## 3. Test Infrastructure, Execution Mechanics, and Environment Variables

### 3.1 Execution Commands
- **Current `npm test` script** (defined in `apps/web/package.json`):
  ```json
  "test": "tsx test/profile-update.test.ts && tsx test/edge-cases.test.ts"
  ```
  - Execution runtime: `tsx` (TypeScript Execute).
  - Both pass with zero errors in ~1.2 seconds.
- **Excluded Test Script**: `apps/web/test/adversarial-stress-r1-r4.ts` is NOT part of `"npm test"`.
  - When invoked via `npx tsx test/adversarial-stress-r1-r4.ts`, it fails at line 83 due to the missing `normalizeEmergencyUrl` implementation.
  - To fulfill Acceptance Criterion `All automated unit/integration tests pass cleanly (npm test in apps/web)`, `package.json` must eventually include this test, but only AFTER all implementation blockers are resolved.

### 3.2 Assertion Frameworks & Mocking
- **Assertion Framework**: Node.js built-in `assert` (`assert.strictEqual`, `assert.deepStrictEqual`, `assert.ok`, `assert.notStrictEqual`).
- **Mocks & Stubs**:
  - `apps/web/lib/dry-run/mock-data.ts`: Provides `MOCK_USER`, `MOCK_VITALS`, `MOCK_DOCUMENTS`, `MOCK_EMERGENCY_TOKEN`, and `MOCK_ACTIVE_TOKENS`.
  - `apps/web/packages/db/index.ts`: Contains stubbed functions (`createEmergencyToken`, `findTokenByHash`, `revokeToken`, `detectSuspiciousActivity`, etc.) which return dummy mock objects when MongoDB is bypassed.
  - `apps/web/lib/server/supabaseProfile.ts`: Uses local filesystem fallback (`apps/web/data/profiles/`) when remote Supabase connections fail or are unconfigured.

### 3.3 Environment Variables Required
All three test files implement a manual `.env` reader reading from `apps/web/.env`:
- `NEXT_PUBLIC_DRY_RUN`: Controls whether backend endpoints return mock data.
- `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL`: Base URLs used to construct emergency QR links.
- `MONGODB_URI` / `MONGODB_DB`: MongoDB Atlas connection credentials.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_BUCKET`: Supabase credentials for storage and table sync.

---

## 4. Comprehensive Requirements Breakdown & Mapping (R1–R4)

The requirements from `ORIGINAL_REQUEST.md` (section `## 2026-09-20T02:56:52Z`) are mapped below against existing test cases and gaps.

### R1. Permanent Emergency QR Token Lifecycle
- **Requirement Summary**:
  - Emergency QR tokens generated from patient settings must remain permanent by default (`isPermanent: true`), persisting indefinitely without automatic expiry.
  - Revocation must only occur upon manual patient regeneration, which immediately invalidates the prior token and issues a new permanent token.
- **Existing Test Coverage**:
  - `adversarial-stress-r1-r4.ts` Suite 1 Test 1.1 checks for fallback token `emg-live-8921-xyz`.
  - `adversarial-stress-r1-r4.ts` Suite 4 Test 4.2 tests that revoking a token causes `GET /api/emergency/[token]` to return 403 Forbidden with `{ revoked: true, locked: true }`.
- **Missing Test Coverage / Gaps**:
  - No automated test currently invokes `POST /api/emergency/token` with `{ profileId }` to assert that the returned token payload has `isPermanent === true`.
  - No automated test simulates the full manual regeneration cycle: calling `POST /api/emergency/token` with `{ profileId, regenerate: true, oldToken }`, followed by verifying that the old token returns 403 Revoked while the new token returns 200 OK.
  - No test verifies UI state in `EmergencyTokenGenerator.tsx` displaying the active permanent badge and regeneration button.

### R2. Responder View with Stored Documents & Profile Information
- **Requirement Summary**:
  - Scanning/opening `/emergency/[token]` must load unauthenticatedly without login barriers or false security rate locks.
  - Must display critical profile details: identity, age/DOB, blood group, allergies, chronic conditions, current medications, emergency contacts with direct call actions (`tel:`).
  - Must display previously stored medical documents: titles, dates, categories, and readable view/preview/download links.
- **Existing Test Coverage**:
  - `adversarial-stress-r1-r4.ts` Suite 2 Test 2.1 tests unauthenticated access for demo tokens and validates profile fields (`displayName`, `bloodGroup`, `allergies`, `conditions`, `medications`, `emergencyContacts`).
- **Missing Test Coverage / Gaps**:
  - **CRITICAL GAP**: Neither `adversarial-stress-r1-r4.ts` nor any other test asserts that `GET /api/emergency/[token]` returns stored medical documents.
  - In `apps/web/app/api/emergency/[token]/route.ts`, documents are completely missing from the response payload.
  - In `apps/web/app/emergency/[token]/page.tsx`, the responder UI has no section or table rendering stored documents or preview/download links.

### R3. Environment-Aware URL Resolution (Local vs. Production)
- **Requirement Summary**:
  - In development, QR code links must resolve to local server origin (`http://localhost:3000` or host header).
  - In production, QR code links must resolve to the production domain without hardcoded local origins.
- **Existing Test Coverage**:
  - None.
- **Missing Test Coverage / Gaps**:
  - In `apps/web/app/api/emergency/token/route.ts` line 194, `baseUrl` is read strictly from `process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL`. If missing, it throws an unhandled error. It does not inspect request headers (e.g. `req.headers.get('host')`) for dynamic local development resolution.
  - No test asserts URL formatting under varying environment configurations (`NODE_ENV=development` vs `production`).

### R4. Supabase Migration Compatibility & Storage Strategy
- **Requirement Summary**:
  - Abstract storage layer for tokens, QR URLs, and documents to support migration from MongoDB to Supabase.
  - Schema/table definitions for `emergency_tokens` and documents in Supabase.
  - Graceful fallback and dual-support between local and remote stores.
- **Existing Test Coverage**:
  - `profile-update.test.ts` and `edge-cases.test.ts` verify Supabase profile JSON syncing and local filesystem fallback.
- **Missing Test Coverage / Gaps**:
  - `apps/web/packages/db/supabase.sql` lacks an `emergency_tokens` table definition.
  - `apps/web/packages/db/supabase.ts` contains helper functions only for `profiles` (`getSupabaseProfile`, `updateSupabaseProfileData`, `updateSupabaseProfileRole`), with no methods for emergency tokens or emergency document lookups.
  - No test verifies emergency token persistence inside Supabase.

---

## 5. Requirements Traceability Matrix

| Req # | Requirement Name | Authoritative Spec Section | Existing Test Cases | Test Status | Identified Gaps |
|---|---|---|---|---|---|
| **R1.1** | Permanent Token by Default | Spec `2026-09-20T02:56:52Z` §R1 | `adversarial-stress-r1-r4.ts` Test 1.1 | ❌ FAILING | Missing `normalizeEmergencyUrl`. No test verifying `isPermanent: true` on token generation. |
| **R1.2** | Manual Regeneration Revocation | Spec `2026-09-20T02:56:52Z` §R1 | `adversarial-stress-r1-r4.ts` Test 4.2 | ⚠️ PARTIAL | Tests direct DB `revokeToken()`, but does not test `POST /api/emergency/token` regeneration lifecycle. |
| **R2.1** | Unauthenticated Public Access | Spec `2026-09-20T02:56:52Z` §R2 | `adversarial-stress-r1-r4.ts` Test 2.1–2.3 | ❌ FAILING | Route blocks demo tokens with 400 regex failure. Rate limiter throttles at 20 requests instead of 60. |
| **R2.2** | Critical Profile Metadata Display | Spec `2026-09-20T02:56:52Z` §R2 | `adversarial-stress-r1-r4.ts` Test 2.1 | ❌ FAILING | Fails on regex format check; route does not provide `vitals` array expected by test. |
| **R2.3** | Stored Documents in Responder View | Spec `2026-09-20T02:56:52Z` §R2 | *None* | ❌ MISSING | Neither route handler nor responder page returns or displays stored patient documents. |
| **R3.1** | Local Development URL Resolution | Spec `2026-09-20T02:56:52Z` §R3 | *None* | ❌ MISSING | Hardcoded env fallback without request header inspection. No automated test. |
| **R3.2** | Production Domain Resolution | Spec `2026-09-20T02:56:52Z` §R3 | *None* | ❌ MISSING | No dynamic domain switching test. |
| **R4.1** | Supabase Token Schema & Storage | Spec `2026-09-20T02:56:52Z` §R4 | *None* | ❌ MISSING | `supabase.sql` has no `emergency_tokens` table. No DB helper for Supabase tokens. |
| **R4.2** | Dual-Store & Migration Fallback | Spec `2026-09-20T02:56:52Z` §R4 | `profile-update.test.ts`, `edge-cases.test.ts` | ✅ PASSING (Profiles only) | Only profiles have 3-tier fallback; emergency tokens lack Supabase integration. |

---

## 6. Features Discovered & Probed

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Navigation | URL Normalization | Rewrites legacy `/emergency/token/[token]` to canonical `/emergency/[token]` | `rawUrl?: string` | Canonical URL string | Returns fallback `/emergency/emg-live-8921-xyz` if input empty/null | `adversarial-stress-r1-r4.ts` Line 88 |
| 2 | Navigation | Emergency Root Redirection | Immediate redirection from `/emergency` to `/emergency/settings` | HTTP GET `/emergency` | HTTP 307/308 Redirect | None (always redirects) | `adversarial-stress-r1-r4.ts` Line 112 |
| 3 | Responder API | Demo & Dry-Run Token Access | Public responder endpoint recognizing pre-seeded demo tokens | Demo tokens (`emg-live-8921-xyz`, `dry-run`, etc.) | HTTP 200 with full emergency profile | Throws 400 in current code due to hex regex check | `adversarial-stress-r1-r4.ts` Line 143 |
| 4 | Responder API | Geolocation Query Tagging | Appends latitude, longitude, and approximate location to emergency access logs | `?lat=12.97&lon=77.59&loc=Bengaluru` | Access logged with coords, HTTP 200 | Graceful handling if coords omitted | `adversarial-stress-r1-r4.ts` Line 193 |
| 5 | Security | IP-based Rate Limit Isolation | Per-IP token access throttling ensuring attacker lockout does not affect legitimate responders | High-frequency GET requests (60/min) | HTTP 429 `{ error: 'Rate limit exceeded', locked: false }` | HTTP 429 when threshold exceeded | `adversarial-stress-r1-r4.ts` Line 243 |
| 6 | Security | Headerless (Proxy-less) Token Isolation | Isolates rate limits per token when clients omit IP headers | Requests with no `x-forwarded-for` or `x-real-ip` | Independent per-token rate limit counters | 429 on exhausted token; other tokens unaffected | `adversarial-stress-r1-r4.ts` Line 281 |
| 7 | Security | Multi-hop Proxy Parsing | Extracts client IP from comma-separated `x-forwarded-for` list | `clientIp, proxyIp, cdnIp` | Parsed client IP | Uses first valid token in header | `adversarial-stress-r1-r4.ts` Line 310 |
| 8 | Security | Revocation Lockdown | Revoking an emergency token blocks subsequent scans | Revoked token hash in DB | HTTP 403 `{ error: 'revoked by the owner', revoked: true, locked: true }` | HTTP 403 Forbidden | `adversarial-stress-r1-r4.ts` Line 349 |
| 9 | Security | Localhost Suspicious Activity Bypass | Whitelists loopback IPs so development scanning is never blocked as suspicious | `127.0.0.1`, `::1`, `localhost` | `suspicious: false` | None | `adversarial-stress-r1-r4.ts` Line 379 |
| 10 | Security | Adversarial Attack Payload Resilience | Hardens route against SQLi, XSS, Path Traversal, Null Bytes, and Buffer Overflows | Attack payloads in token param | Safe 404 or 429 response, NEVER 500 | Prevents unhandled server crashes | `adversarial-stress-r1-r4.ts` Line 412 |
| 11 | Profile Storage | Step 3 Skipping & Null Preservation | Handles omitted lifestyle/diet fields in patient profile | Profile with nulls/empty arrays | Preserves schema shape and sets `onboarding.completed: true` | None | `edge-cases.test.ts` Line 30 |
| 12 | Profile Storage | Special Characters & Diacritics | Stores special characters, symbols, and medical punctuation | Complex text strings | Verbatim persistence without escaping corruption | None | `edge-cases.test.ts` Line 73 |
| 13 | Profile Storage | Partial Draft Persistence | Saves Step 2 onboarding progress without marking completion | Profile with `onboarding.completed: false` | Stores draft in local and Supabase stores | None | `edge-cases.test.ts` Line 130 |
| 14 | Profile Storage | Theme Mode Toggle Cycle | Allows cyclic toggling between light and dark UI themes | Theme string updates (`light` <-> `dark`) | Immediate persisted customization state | None | `edge-cases.test.ts` Line 195 |

---

## 7. Edge Cases, Boundary Conditions, and Failure Modes

| # | Feature | Input / Condition | Observed / Documented Behavior | Status |
|---|---|---|---|---|
| 1 | URL Normalization | `undefined` or `""` | Normalizes to fallback `/emergency/emg-live-8921-xyz` | ✅ Verified in test logic |
| 2 | URL Normalization | Legacy `/emergency/token/abc` | Strips `/token/` prefix, yielding `/emergency/abc` | ✅ Verified in test logic |
| 3 | Emergency Redirect | Request to `/emergency` | Must execute server `redirect('/emergency/settings')` | ❌ Fails in current page.tsx (uses client router.push) |
| 4 | Token Format Check | Non-hex tokens (`emg-live-8921-xyz`) | Expected HTTP 200 for demo tokens; Currently returns 400 Invalid format | ❌ Fails in route.ts |
| 5 | Token Access Rate Limit | Attacker sends 60 requests | Expected: 60 pass, 61st gets 429 with `locked: false`; Current: throttles at 20 with `locked: true` | ❌ Fails in route.ts |
| 6 | Headerless Rate Limit | Incognito requests without IP header | Expected: isolated bucket per token (`token_[token]`); Current: collapses to shared `'unknown'` bucket | ❌ Fails in route.ts |
| 7 | Multi-hop Proxy IP | `192.0.2.1, 10.0.0.1, 172.16.0.1` | Correctly parses leftmost IP `192.0.2.1` | ✅ Verified in test logic |
| 8 | Missing Token Error | Random non-existent token | Expected: 404 with `locked: false` and `"Invalid or expired"`; Current: returns `locked: true` and `"Invalid QR code"` | ❌ Fails in route.ts |
| 9 | Revoked Token Error | Token revoked by user | Expected: 403 with `revoked: true` and `"revoked by the owner"` | ✅ Matches test specification |
| 10 | Suspicious IP Check | `127.0.0.1`, `::1`, `localhost` | `detectSuspiciousActivity()` always returns `suspicious: false` | ✅ Matches test specification |
| 11 | Concurrent Burst | 50 concurrent requests to demo token | All 50 succeed with HTTP 200 OK | ✅ Matches test specification |
| 12 | Malicious Token Payloads | `<script>`, `../../etc/passwd`, `' OR '1'='1` | HTTP status in `[200, 404, 429]`, zero 500 crashes | ✅ Matches test specification |
| 13 | Profile Step 3 Skipping | Empty diet arrays and null fields | Persists cleanly with `completed: true` | ✅ Verified in edge-cases.test.ts |
| 14 | Profile Special Chars | Names with apostrophes, punctuation, diacritics | Fully preserved across serialization | ✅ Verified in edge-cases.test.ts |
| 15 | Non-existent Profile | Unknown email query | Returns `null` cleanly without error | ✅ Verified in edge-cases.test.ts |
| 16 | Onboarding Draft | Incomplete Step 2 draft | Persists with `completed: false` | ✅ Verified in edge-cases.test.ts |
| 17 | Diet Whitespace | Leading/trailing spaces on diet strings | Trimmed and correctly categorized into meal column | ✅ Verified in edge-cases.test.ts |
| 18 | Theme Cycle | `light` -> `dark` -> `light` | Switches state cleanly and persists | ✅ Verified in edge-cases.test.ts |

---

## 8. Root Cause Analysis: The 7 Implementation Blockers in `adversarial-stress-r1-r4.ts`

When `adversarial-stress-r1-r4.ts` is run against the current codebase, the following 7 defects cause failures:

1. **Missing `normalizeEmergencyUrl` in `EmergencyQRBox.tsx`**:
   - *Line 83*: `assert(content.includes("normalizeEmergencyUrl"))`.
   - *Root Cause*: `EmergencyQRBox.tsx` defines fallback URL `/emergency/token/emg-live-8921-xyz` directly and lacks the `normalizeEmergencyUrl` function.
2. **Client-side Redirect in `app/emergency/page.tsx`**:
   - *Line 117*: `assert(content.includes("redirect('/emergency/settings')"))`.
   - *Root Cause*: `app/emergency/page.tsx` is a client component using `useRouter().push('/emergency/settings')` inside `useEffect`, causing client hydration delay instead of a clean server redirect.
3. **Overly Restrictive Token Validation in `app/api/emergency/[token]/route.ts`**:
   - *Line 72*: `if (!/^[a-f0-9]{64}$/i.test(token)) return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });`.
   - *Root Cause*: Demo tokens (`emg-live-8921-xyz`, `dry-run-token-abc123`, `emg-live-token`, `dry-run`, `emg-live-custom-responder-99`) are not 64-character hex strings, resulting in immediate HTTP 400 failures.
4. **Rate Limiting Threshold and Flag Mismatch**:
   - *Line 61*: `checkAccessRateLimit(ip, 20, 60000)` allows only 20 attempts before returning 429, whereas the test expects 60 attempts. Furthermore, `route.ts` returns `locked: true` on rate limit, whereas the test asserts `json61.locked === false`.
5. **Headerless IP Rate Limiting Collision**:
   - *Line 35*: Defaults `ip` to `'unknown'`, grouping all headerless clients into one bucket. The test requires isolating headerless clients by token (`token_${token}`).
6. **Error Message and `locked` Flag Mismatch on 404**:
   - When a token is missing, `route.ts` returns `{ error: 'Invalid QR code', locked: true }`. The test asserts `body.locked === false` and `body.error.includes("Invalid or expired")`.
7. **Missing `vitals` in Emergency Profile Payload**:
   - `route.ts` constructs `emergencyData.profile` with `displayName`, `age`, `dob`, `bloodGroup`, `allergies`, `chronicConditions`, `currentMedications`, `emergencyContacts`, but completely omits `vitals`. Suite 2 asserts `Array.isArray(p.vitals)` and `p.vitals.length > 0`.

---

## 9. Actionable Recommendations for Implementation & Testing Subagents

1. **Refactor `EmergencyQRBox.tsx`**:
   - Export and implement `normalizeEmergencyUrl` to sanitize any legacy `/emergency/token/` paths.
   - Update fallback URL to `/emergency/emg-live-8921-xyz`.
2. **Refactor `app/emergency/page.tsx`**:
   - Convert to a server component that executes `redirect('/emergency/settings')`.
3. **Update `app/api/emergency/[token]/route.ts`**:
   - Support demo tokens by checking a whitelist or relaxing the regex to allow alphanumeric tokens with hyphens.
   - Adjust rate limiting capacity to 60 req/min with `locked: false`.
   - Implement token-scoped rate limit keys for headerless requests (`token_${token}`).
   - Update 404 response to `{ error: 'Invalid or expired QR code', locked: false }`.
   - Include `vitals` array in profile payload.
   - **Implement R2 Stored Documents**: Query and return stored medical documents (`titles`, `dates`, `categories`, `view/preview/download links`).
4. **Update `app/emergency/[token]/page.tsx`**:
   - Render a dedicated "Stored Medical Documents & Records" section with preview and download controls.
5. **Update `apps/web/app/api/emergency/token/route.ts`**:
   - Ensure `isPermanent: true` is defaulted and returned.
   - Implement dynamic environment-aware URL generation using `req.headers.get('host')` with fallback to configured environment variables.
6. **Supabase Schema & Storage Strategy (R4)**:
   - Add `emergency_tokens` table definition to `apps/web/packages/db/supabase.sql`.
   - Implement Supabase DB helpers in `apps/web/packages/db/supabase.ts` for emergency tokens.
7. **Update `package.json`**:
   - Once the above fixes are implemented, update `"test"` script in `apps/web/package.json` to include `test/adversarial-stress-r1-r4.ts`.
