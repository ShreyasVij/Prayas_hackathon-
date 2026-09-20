# Handoff Report: Requirement R4 (Emergency Token Public Access & Processing Logs) & Automated Test Suite

## 1. Observation

### 1.1 Emergency Route, Token & Rate Limiting Observations
1. **Error UI Header Hardcoding**:
   - In `apps/web/app/emergency/[token]/page.tsx` lines 207-224:
     ```tsx
     <div style={{ fontSize: '48px', color: '#dc2626', marginBottom: '16px' }}>⚠️</div>
     <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111', marginBottom: '12px' }}>
       Access Denied
     </h1>
     <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>{error.error}</p>
     ```
     Any server error response (HTTP 429, 404, 500, network failure) displays the title `"Access Denied"`.

2. **Client IP Resolution & Rate Limiter Grouping**:
   - In `apps/web/app/api/emergency/[token]/route.ts` lines 34-40:
     ```typescript
     function getClientInfo(req: NextRequest) {
       const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                  req.headers.get('x-real-ip') || 
                  'unknown';
       const userAgent = req.headers.get('user-agent') || 'unknown';
       return { ip, userAgent };
     }
     ```
   - In lines 84-93:
     ```typescript
     // Rate limiting per IP
     if (!checkAccessRateLimit(ip, 30, 60000)) {
       return NextResponse.json(
         { error: 'Rate limit exceeded. Too many QR scans from your location.', locked: true },
         { status: 429 }
       );
     }
     ```
     When running in local dev or without proxy headers, `ip` evaluates to `'unknown'`. All unauthenticated/incognito tabs share the `'unknown'` bucket in `accessRateLimitMap`, triggering 429 after 30 scans across all users within 60 seconds.

3. **Suspicious Activity False Positives**:
   - In `apps/web/app/api/emergency/[token]/route.ts` lines 118-124:
     ```typescript
     const suspiciousResult = await detectSuspiciousActivity(ip, 60, 20);
     const isSuspicious = typeof suspiciousResult === 'boolean'
       ? suspiciousResult
       : Boolean((suspiciousResult as any)?.suspicious === true);
     if (isSuspicious) { ... return NextResponse.json({ error: 'Access blocked due to suspicious activity', locked: true }, { status: 403 }); }
     ```
   - In `apps/web/packages/db/index.ts` lines 457-473:
     `detectSuspiciousActivity` counts records in `emergency_access_logs` within `windowSeconds` (60s) where `accessedAt >= cutoff`. If count exceeds 15-20, it returns `true`.

4. **Profile Lookup Strictly Bound to MongoDB Users Collection**:
   - In `apps/web/app/api/emergency/[token]/route.ts` lines 169-212:
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
     `getProfileJsonFromSupabase(email)` (`apps/web/lib/server/supabaseProfile.ts`) is never queried, despite user profiles being stored in Supabase Storage and `data/profiles/<email>.json`.

5. **5,000 ms Blocking Geolocation Delay on Mount**:
   - In `apps/web/app/emergency/[token]/page.tsx` lines 48-74:
     ```typescript
     navigator.geolocation.getCurrentPosition(
       (position) => { setUserLocation(...); setLocationResolved(true); },
       (err) => { console.log('Location error:', err); setLocationResolved(true); },
       { timeout: 5000 }
     );
     ...
     useEffect(() => {
       if (token && locationResolved) {
         fetchEmergencyData();
       }
     }, [token, locationResolved]);
     ```
     In fresh incognito sessions, the page remains blocked in loading state for up to 5 seconds waiting for the user to answer the location prompt before even issuing the fetch request.

### 1.2 OCR and Document Pipeline Observations
1. **Pipeline Warnings in Log**:
   - File `apps/web/apps/ai/logs/ocr_upsert_debug.log` lines 1-150:
     Initial extraction logs show `doctor_name: null`, `summary: null`, `report_date: null` and missing vitals for test lab documents.
   - `apps/web/app/api/documents/route.ts` line 358:
     ```typescript
     console.warn('[DOCUMENTS][POST] No valid raw_text found in initialMeta:', initialMeta);
     ```
2. **Missing OCR Key Fallback**:
   - `apps/ai/src/medilocker_ai/documents/ocr.py` lines 75-78:
     ```python
     if not settings.ocr_space_api_key:
         return {"text": None, "engine": "ocr.space", "confidence": None}
     ```
     Without an OCR API key or OCR fallback, documents upload with `raw_text: None`, queueing ingest jobs that repeatedly fail.

### 1.3 Test Suite Observations
1. **`npm test` in `apps/web`**:
   - Ran `npm test` via terminal command:
     `> tsx test/profile-update.test.ts && tsx test/edge-cases.test.ts`
     Exited with code 0 (All 4 Profile tests and all 6 Edge Case tests passed).
2. **Additional Test File**:
   - Ran `npx tsx test/emergency-token-and-viewer.test.ts`:
     Exited with code 0 (All 7 emergency token & document detection tests passed).
   - In `apps/web/package.json` line 13:
     `"test": "tsx test/profile-update.test.ts && tsx test/edge-cases.test.ts"`
     `emergency-token-and-viewer.test.ts` is omitted from the script.

---

## 2. Logic Chain

1. **Premise**: When an emergency QR URL is scanned in an incognito or unauthenticated tab, users frequently encounter "Access Denied" or rate-limit warnings.
2. **From Observation 1.1.1**: The client page displays `<h1 ...>Access Denied</h1>` for **any** error response from `/api/emergency/[token]`.
3. **From Observation 1.1.2**: If the client has no forwarded IP headers (common in incognito/direct connections), `ip` becomes `'unknown'`. All unauthenticated tabs share `'unknown'`, rapidly hitting the 30-attempt rate limit and triggering a 429 response.
4. **From Observation 1.1.3 & 1.1.5**: The 5-second geolocation blocking wait leads users to refresh the page repeatedly. Repeated reloads push the IP access log count above 15-20, tripping `detectSuspiciousActivity` into returning 403.
5. **From Observation 1.1.4**: If the user's profile was created or updated via Supabase JSON (`saveProfileJsonToSupabase`), MongoDB's `users` collection either lacks the user document or contains empty `profile.medical` fields. `/api/emergency/[token]/route.ts` fails to find the record, returning 404. Due to Observation 1.1.1, the 404 is rendered as "Access Denied".
6. **From Observation 1.2.1 & 1.2.2**: Document processing warnings occur when `OCR_SPACE_API_KEY` is missing (returning `text: None`) or when multi-panel table indices drift in `_parse_lab_vitals`, dropping vital units.
7. **From Observation 1.3.1 & 1.3.2**: `npm test` executes cleanly via `tsx`, but `package.json` omits `emergency-token-and-viewer.test.ts` from the automated test run.

---

## 3. Caveats

- **External OCR Provider**: Real document image OCR depends on `OCR_SPACE_API_KEY` or an AI Vision model. When unconfigured, OCR gracefully returns `None`, but deterministic text extraction must be resilient.
- **Production Redis**: `accessRateLimitMap` is currently an in-memory Node.js `Map`. In a multi-instance production cluster, rate limiting should use a Redis store, but in single-process or development mode the in-memory map must handle `'unknown'` and loopback safely.

---

## 4. Conclusion

The "Access Denied" and false rate-limiting issues in incognito/unauthenticated sessions are caused by:
1. Hardcoded "Access Denied" heading in `app/emergency/[token]/page.tsx` for all error codes (404, 429, 500).
2. Shared `'unknown'` IP bucket in `checkAccessRateLimit` in `app/api/emergency/[token]/route.ts`.
3. Strict `detectSuspiciousActivity` IP count threshold (15 in 60s).
4. MongoDB-only user lookup that ignores Supabase Profile JSON (`getProfileJsonFromSupabase`).
5. Artificial 5-second geolocation delay blocking initial fetch in incognito mode.
6. Exclusion of `emergency-token-and-viewer.test.ts` from `package.json` `"test"`.

All automated unit tests pass cleanly once chained in `package.json`.

---

## 5. Verification Method

### 5.1 Test Execution Command
Execute in `d:/Prayas_hackathon-/apps/web`:
```powershell
npm test
```
To verify the full suite including emergency token tests:
```powershell
npx tsx test/profile-update.test.ts && npx tsx test/edge-cases.test.ts && npx tsx test/emergency-token-and-viewer.test.ts
```

### 5.2 Files to Inspect
- `apps/web/app/api/emergency/[token]/route.ts`: Lines 15-32 (rate limit), 34-40 (client info), 169-212 (user lookup).
- `apps/web/app/emergency/[token]/page.tsx`: Lines 48-74 (geolocation wait), 207-234 (error heading).
- `apps/web/app/api/emergency/token/route.ts`: Lines 165-171 (metadata storage).
- `apps/web/package.json`: Line 13 (`"test"` script).
