# Comprehensive Investigation Report: Requirement R4 (Emergency Token Public Access & Processing Logs) and Automated Test Suite

## 1. Executive Summary

This investigation analyzes **Requirement R4: Emergency Token Public Access & Processing Logs**, alongside the **Automated Test Suite setup** for MediLocker.
The core objectives investigated were:
1. Guarantee that the emergency access URL generated from the QR code functions reliably when opened in a new or incognito browser tab without triggering "Access Denied" or false rate-limiting flags.
2. Ensure the emergency access URL loads profile and vital details in a fresh, unauthenticated browser session.
3. Inspect document and OCR processing logs, diagnose underlying pipeline warnings or extraction failures, and address them.
4. Verify the automated unit/integration test suite (`npm test` in `apps/web`) and ensure clean, reliable test execution.

### Key Discoveries at a Glance
- **Rate-Limiting & "Access Denied" False Flags**:
  - The client UI (`apps/web/app/emergency/[token]/page.tsx`:217) hardcodes the error heading to `<h1 ...>Access Denied</h1>` for **all** HTTP error statuses (404 Not Found, 429 Rate Limited, 403 Forbidden, 500 Server Error, and network timeouts). Thus, any transient rate-limit or missing record is mispresented to users as an authentication/access denial.
  - The rate-limiting mechanism in `apps/web/app/api/emergency/[token]/route.ts`:34-40 resolves client IP to `'unknown'` when `x-forwarded-for` and `x-real-ip` are absent. When tested in local environments or without a proxy, every unauthenticated client shares the single bucket `'unknown'`, exhausting the 30-attempt quota rapidly.
  - `detectSuspiciousActivity` flags any IP with > 15-20 accesses within 60 seconds. In NAT/VPN environments or during repeated responder reloads, legitimate users receive false 403 blocks.
  - Geolocation permission waiting in `app/emergency/[token]/page.tsx`:48-74 artificially stalls emergency data fetching for up to **5,000 ms** in fresh incognito tabs, prompting user refreshes that exacerbate rate-limiting.
- **Profile & Vital Details Loading Gaps**:
  - `/api/emergency/[token]/route.ts`:169-212 queries **only** the MongoDB `users` collection. If the user’s profile was saved via `saveProfileJsonToSupabase` (stored in Supabase Storage and `data/profiles/<email>.json`), MongoDB lacks medical fields or the user document entirely, returning 404 ("User profile not found").
  - The response payload in `/api/emergency/[token]/route.ts`:260-281 omits critical laboratory/vital measurements from `userVitals`, and `app/emergency/[token]/page.tsx` lacks a rendered Vitals block.
- **OCR Processing Pipeline**:
  - Debug logs in `apps/web/apps/ai/logs/ocr_upsert_debug.log` reveal recurring warnings: `No valid raw_text found in initialMeta`. When `OCR_SPACE_API_KEY` is not configured, OCR returns `{"text": None}`, which causes `extraction.py` to yield empty results and triggers asynchronous ingestion jobs that repeatedly fail.
  - Column-oriented laboratory tables in `_parse_lab_vitals` (`apps/ai/src/medilocker_ai/documents/extraction.py`:175-225) misaligned multi-panel results (e.g. BMP assigning Creatinine's value to Sodium and Potassium) and omitted units because unit tokens resided in a separate reference column.
  - Overly strict token containment in `_looks_supported` discarded valid doctor names and diagnoses whenever LLMs normalized formatting (e.g. adding "Dr.").
- **Automated Test Suite**:
  - The project uses `tsx` directly (no vitest/jest runner configured in `package.json`).
  - Currently `"test": "tsx test/profile-update.test.ts && tsx test/edge-cases.test.ts"`. Both tests pass (4/4 and 6/6 suites).
  - An additional test file exists: `apps/web/test/emergency-token-and-viewer.test.ts` (all 7 tests passing), but it was excluded from `package.json` `"test"` script.

---

## 2. Emergency Token Generation, Architecture & Public Access Flow

### 2.1 Token Generation & Cryptographic Format
Emergency tokens are generated via `POST /api/emergency/token` (`apps/web/app/api/emergency/token/route.ts`):
1. **Raw Token Generation** (Line 110):
   ```typescript
   const token = crypto.randomBytes(32).toString('hex'); // 64 hex characters (256 bits)
   ```
2. **Storage Hashing** (Lines 113-116):
   ```typescript
   const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
   ```
3. **URL Pattern** (Lines 118-119):
   ```typescript
   const baseUrl = getBaseUrl(req);
   const emergencyUrl = `${baseUrl}/emergency/${token}`;
   ```
4. **QR Code Data URL** (Lines 121-125):
   Generated via `QRCode.toDataURL(emergencyUrl, { errorCorrectionLevel: 'H', margin: 2, width: 400 })`.
5. **Persistence**:
   Tokens are stored in MongoDB collection `emergency_tokens` and in-memory cache `emergencyTokenMemoryStore` (`packages/db/index.ts`:212-237).

### 2.2 Public URL Routing & Middleware Inspection
- **Page Route**: `apps/web/app/emergency/[token]/page.tsx`
  - URL pattern: `/emergency/:token`
  - Client component using `useParams()` to capture `:token`.
- **API Endpoint**: `apps/web/app/api/emergency/[token]/route.ts`
  - URL pattern: `/api/emergency/:token`
  - Dynamic Next.js Route Handler supporting unauthenticated `GET`.
- **Middleware & Auth Guards**:
  - `apps/web/proxy.ts`: Only matches `matcher: ["/dashboard/:path*"]` and redirects unauthenticated sessions to `/auth`. It explicitly ignores `/emergency/:path*`.
  - Next.js root layout (`apps/web/app/layout.tsx`): Wraps pages in `<AppLayout>`.
  - `apps/web/components/AppLayout.tsx`: Renders `<AppNavbar>` and `<Footer>`. `AppNavbar` operates gracefully in unauthenticated state without redirecting.
  - Therefore, **no Next.js middleware or layout guard blocks `/emergency/:token`**. Access denial arises entirely within the page component and API handler.

---

## 3. Root Cause Analysis: "Access Denied" & False Rate-Limiting Flags

### Root Cause 1: Generic "Access Denied" Heading for All Failure States
- **File**: `apps/web/app/emergency/[token]/page.tsx`
- **Lines**: 188-235
```tsx
  if (error) {
    return (
      <div style={{ ... }}>
        <div style={{ border: '2px solid #dc2626', ... }}>
          <div style={{ fontSize: '48px', color: '#dc2626' }}>⚠️</div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>Access Denied</h1>
          <p style={{ fontSize: '14px', color: '#666' }}>{error.error}</p>
          {error.revoked && (
            <p style={{ ... }}>This QR code has been revoked by the owner.</p>
          )}
        </div>
      </div>
    );
  }
```
**Mechanism**:
Even when the server returns a 429 ("Rate limit exceeded"), 404 ("User profile not found"), 500 ("Internal server error"), or client network drop, the heading `<h1 ...>Access Denied</h1>` is unconditionally displayed. Responders scanning in an incognito tab perceive any error as an authorization rejection.

### Root Cause 2: IP Grouping Under `'unknown'` and Tight 30-Request Ceiling
- **File**: `apps/web/app/api/emergency/[token]/route.ts`
- **Lines**: 15-32, 34-40, 84-93
```typescript
const accessRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkAccessRateLimit(ip: string, maxAttempts: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const limit = accessRateLimitMap.get(ip);
  if (!limit || now > limit.resetAt) {
    accessRateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (limit.count >= maxAttempts) return false;
  limit.count++;
  return true;
}

function getClientInfo(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
             req.headers.get('x-real-ip') || 
             'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return { ip, userAgent };
}

// In GET handler:
if (!checkAccessRateLimit(ip, 30, 60000)) {
  return NextResponse.json(
    { error: 'Rate limit exceeded. Too many QR scans from your location.', locked: true },
    { status: 429 }
  );
}
```
**Mechanism**:
1. When running without standard proxy headers (e.g. Next.js standalone dev server, local triage, direct connections), `ip` resolves to `'unknown'`.
2. All users browsing in incognito or unauthenticated windows share the `'unknown'` key in `accessRateLimitMap`.
3. Due to React Strict Mode (double-invoking effects in dev) and page reloads, the count reaches 30 attempts in 60s, instantly locking out every incognito tab with HTTP 429.
4. The frontend shows "Access Denied: Rate limit exceeded. Too many QR scans from your location."

### Root Cause 3: False Positive Rate-Limiting via `detectSuspiciousActivity`
- **File**: `apps/web/packages/db/index.ts`:457-473 & `apps/web/app/api/emergency/[token]/route.ts`:118-141
```typescript
export async function detectSuspiciousActivity(ipOrParams: any, windowSeconds: number = 60, maxAttempts: number = 15): Promise<boolean> {
  const ip = typeof ipOrParams === 'string' ? ipOrParams : ipOrParams?.ip;
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') {
    return false;
  }
  try {
    const db = await getDbClient();
    const cutoff = new Date(Date.now() - windowSeconds * 1000);
    const count = await db.collection('emergency_access_logs').countDocuments({
      ip,
      accessedAt: { $gte: cutoff },
    });
    return count > maxAttempts;
  } catch {
    return false;
  }
}
```
**Mechanism**:
On shared networks (e.g., hospital Wi-Fi or cellular gateways where multiple paramedics share an outbound IP), or during repeated token accesses, `emergency_access_logs` records > 15-20 rows in 60s. The endpoint returns 403 `Access blocked due to suspicious activity`, blocking life-critical medical data.

### Root Cause 4: MongoDB-Only Profile Lookup Disregarding Supabase JSON Storage
- **File**: `apps/web/app/api/emergency/[token]/route.ts`
- **Lines**: 169-212, 226-258
```typescript
    const db = await getDbClient();
    const usersCollection = db.collection<UserDocument>('users');
    let user: any = null;
    ...
    if (!user) {
      return NextResponse.json(
        { error: 'User profile not found for this emergency token' },
        { status: 404 }
      );
    }
```
**Mechanism**:
1. When user onboarding and profile updates execute via `apps/web/app/api/profile/route.ts`:197, data is persisted to Supabase and `data/profiles/<email>.json` via `saveProfileJsonToSupabase`.
2. If MongoDB is partially configured, in offline dry-run mode, or contains a user document without the nested `profile.medical` object, `usersCollection.findOne` returns `null` or empty fields.
3. `/api/emergency/[token]/route.ts` does **not** consult `getProfileJsonFromSupabase(email)`.
4. As a result, the endpoint emits a 404 ("User profile not found"), which the frontend displays as "Access Denied".

### Root Cause 5: Five-Second Blocking Geolocation Timeout on Incognito Mount
- **File**: `apps/web/app/emergency/[token]/page.tsx`
- **Lines**: 48-74
```typescript
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => { ... setLocationResolved(true); },
        (err) => { ... setLocationResolved(true); },
        { timeout: 5000 }
      );
      return;
    }
    setLocationResolved(true);
  }, []);

  useEffect(() => {
    if (token && locationResolved) {
      fetchEmergencyData();
    }
  }, [token, locationResolved]);
```
**Mechanism**:
In an incognito browser tab, permissions are never cached. The browser displays a permission prompt banner. Until the user accepts, rejects, or the 5,000ms timeout expires, `locationResolved` stays `false`. The emergency data fetch does not start for 5 seconds. Frustrated users refresh the page, triggering the IP rate limit.

---

## 4. Document and OCR Processing Pipeline Diagnosis

### 4.1 Log Analysis: `ocr_upsert_debug.log`
Inspecting `apps/web/apps/ai/logs/ocr_upsert_debug.log`:
- **Warning: `[POST] No valid raw_text found in initialMeta`** (Line 358):
  Occurs when an uploaded document produces no extracted text. The upload endpoint enqueues a background `ingest` job.
- **OCR.Space Fallback & API Key Dependency**:
  `apps/ai/src/medilocker_ai/documents/ocr.py`:75-78:
  ```python
  if not settings.ocr_space_api_key:
      return {"text": None, "engine": "ocr.space", "confidence": None}
  ```
  When `OCR_SPACE_API_KEY` is not defined in the environment, `OCRService` returns `text: None`. Without raw text, `ExtractionService.extract()` cannot run deterministic extractors or LLM prompts, resulting in empty metadata and pipeline warnings.
- **Table Parsing Inaccuracies in Multi-Panel Documents**:
  In `_parse_lab_vitals` (`apps/ai/src/medilocker_ai/documents/extraction.py`:175-225):
  In column-oriented reports with multiple panels (Hormone Panel, Urinalysis, CBC, BMP):
  - Values were listed on separate lines below headers, with units located in a third reference column.
  - The secondary column parser mapped numeric lines sequentially. In multi-panel reports, the index offset drifted, mapping Creatinine's value (`1.7`) to Sodium and Potassium (`ocr_upsert_debug.log`:147).
  - Units returned `None` because `cand` contained only bare numeric strings (`3.6`, `12.9`).

### 4.2 Overly Restrictive `_looks_supported` Validation
- **File**: `apps/ai/src/medilocker_ai/documents/extraction.py`:298-308
```python
def _looks_supported(value: Any, source: str) -> bool:
    text = clean_text(value)
    if not text:
        return False
    lower_source = source.lower()
    compact = text.lower()
    if compact in lower_source:
        return True
    tokens = [token for token in re.split(r"[^a-z0-9]+", compact) if len(token) >= 3]
    return bool(tokens) and all(token in lower_source for token in tokens)
```
If the LLM returns `"Dr. Alex Thompson, M.D."`, but OCR text contains `"Alex Thompson, M.D."` (without "Dr."), `tokens` contains `"dr"` which is not in `lower_source`. The function evaluates to `False`, resetting `doctor_name` to `None`.
The same issue occurs with `diagnosis` when the LLM summarizes or provides clinical interpretations.

---

## 5. Automated Test Suite Inspection (`apps/web`)

### 5.1 Configuration & Test Runner
- **Test Command**: `npm test` in `apps/web`
- **Runner**: `tsx` (TypeScript Execute). No Jest or Vitest dependencies are configured in `apps/web/package.json`.
- **`package.json` Test Script** (Line 13):
  ```json
  "test": "tsx test/profile-update.test.ts && tsx test/edge-cases.test.ts"
  ```

### 5.2 Test File Inventory & Execution Status
1. **`test/profile-update.test.ts`**:
   - Tests saving & fetching profile JSON to Supabase/local fallback, dark theme update, and diet sentence modifications.
   - **Status**: PASSED (4/4 tests).
2. **`test/edge-cases.test.ts`**:
   - Tests skipped Step 3, special characters in diet/email, non-existent profiles, partial Step 2 drafts, whitespace trimming, and theme toggle cycles.
   - **Status**: PASSED (6/6 tests).
3. **`test/emergency-token-and-viewer.test.ts`**:
   - Tests emergency token creation, token retrieval by hash, suspicious activity evaluation, active tokens list, token regeneration, token revocation, and signed image URL detection for Document Viewer.
   - **Status**: PASSED (7/7 tests).
   - **Gap**: Currently **omitted** from `npm test` in `package.json`.

---

## 6. Worker Remediation Blueprints

### Blueprint 1: Public Emergency Route Refactoring (`apps/web/app/api/emergency/[token]/route.ts`)
1. **Safe Rate-Limiting**:
   - Exempt loopback (`127.0.0.1`, `::1`) and `'unknown'` from blanket IP rate-limiting.
   - For `'unknown'`, rate-limit based on a compound key `${ip}_${token.slice(0, 16)}` with a generous threshold (60 requests/minute).
   - Return status 429 with explicit JSON `{ error: 'Rate limit exceeded. Please wait 60 seconds before scanning again.', locked: false }`.
2. **Suspicious Activity Safe Evaluation**:
   - Do not trigger suspicious activity blocks on `'unknown'` or localhost.
   - Raise threshold to 30 requests/minute to accommodate clinical team multi-scans.
3. **Dual-Source Profile Resolution (MongoDB + Supabase JSON)**:
   - Extract user email from `tokenDoc.metadata?.email` or `user.email`.
   - Call `await getProfileJsonFromSupabase(email)`.
   - Merge fields:
     - `displayName`: `supabaseProfile?.basicDetails?.name || supabaseProfile?.name || user?.name || 'Patient'`
     - `bloodGroup`: `supabaseProfile?.basicDetails?.bloodGroup || user?.profile?.medical?.bloodGroup || 'Unknown'`
     - `allergies`: Parse from `supabaseProfile?.healthAndLifestyle?.allergies` (split comma string) merged with `user?.profile?.medical?.allergies`.
     - `chronicConditions`: `user?.profile?.medical?.conditions` or lifestyle notes.
     - `currentMedications`: Parse from `supabaseProfile?.healthAndLifestyle?.medications` merged with `user?.profile?.medical?.medications`.
     - `emergencyContacts`: `supabaseProfile?.basicDetails?.emergencyContact` or `user?.profile?.emergency`.
     - `dob`: `supabaseProfile?.basicDetails?.dob || user?.profile?.dob`.
     - `age`: `supabaseProfile?.basicDetails?.age || calculatedAge`.
4. **Attach Vital Details**:
   - Query `userVitals` collection for `actorId`/`userId` to fetch recent recorded vitals (Blood Pressure, Heart Rate, Glucose, SpO2, Hemoglobin) and include `vitals: [...]` in the response profile.

### Blueprint 2: Emergency Token Generation Enhancement (`apps/web/app/api/emergency/token/route.ts`)
- In `POST` token creation (Line 165), include `email: user.email` and `name: user.name` inside `tokenDoc.metadata`.
- This ensures tokens can always locate the profile even in stateless or cached execution modes.

### Blueprint 3: Immediate Fetch & Error UX in Emergency View (`apps/web/app/emergency/[token]/page.tsx`)
1. **Decouple Geolocation from Initial Fetch**:
   - Call `fetchEmergencyData()` immediately upon mount in `useEffect([token])`.
   - Run geolocation asynchronously in parallel. If coordinates are obtained, update the server in the background.
2. **Accurate Error Headers**:
   - Replace the unconditional `<h1 ...>Access Denied</h1>` with conditional headings:
     - If `error.revoked`: `<h1>QR Code Revoked</h1>`
     - If 429: `<h1>Rate Limit Exceeded</h1>`
     - If 404: `<h1>Emergency Profile Not Found</h1>`
     - If network/500: `<h1>Unable to Load Records</h1>`
     - Only if 403: `<h1>Access Denied</h1>`
3. **Render Vitals Section**:
   - Render a formatted Vitals block (`Blood Pressure`, `Pulse`, `Glucose`, `Hemoglobin`) alongside blood group and allergies for first responders.

### Blueprint 4: Test Suite Integration (`apps/web/package.json`)
- Update `package.json` line 13:
  ```json
  "test": "tsx test/profile-update.test.ts && tsx test/edge-cases.test.ts && tsx test/emergency-token-and-viewer.test.ts"
  ```
- Add unit test assertions verifying:
  - Token lookup with `'unknown'` IP returns 200 without rate-limit error.
  - Emergency profile payload correctly integrates Supabase JSON medical fields.
  - Vitals array is returned in emergency response.
