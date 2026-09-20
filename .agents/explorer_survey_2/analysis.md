# Technical Survey: Emergency QR & Public Responder Frontend System

**Explorer**: `explorer_survey_2` (Frontend & UI Explorer)  
**Date**: 2026-09-20  
**Scope**: Frontend components, pages, URL generation, QR display, document viewer, and navigation flows for the Emergency QR & public responder system.

---

## 1. Executive Summary

A comprehensive investigation was conducted into the frontend pages, UI components, client-side routing, and API integration backing the Emergency QR and public responder workflows. The survey identified several critical architectural and UX defects:
1. **Public Responder View (`/emergency/[token]`):** Successfully renders basic demographic data (blood group, allergies, conditions, contacts with `tel:` triggers), but **completely omits stored medical documents and records** (violating Requirement R2). Furthermore, initial data fetching is **blocked by a synchronous 5,000ms geolocation timeout**, causing substantial first-load latency for first responders.
2. **Dashboard QR Card (`EmergencyQRBox.tsx`):** Fails to supply required profile parameters to `/api/emergency/token`, consistently falling back to a static mock object (`FALLBACK_QR`). The fallback URL (`/emergency/token/emg-live-8921-xyz`) routes to a non-existent path, triggering a **404 Not Found** upon clicking "Open". It also lacks the `normalizeEmergencyUrl` method required by `adversarial-stress-r1-r4.ts`.
3. **Emergency Settings (`/emergency/settings` & `EmergencyTokenGenerator.tsx`):** The active permanent QR code is kept exclusively in transient React component state. Upon page navigation or reload, the QR preview, URL, print, and download actions disappear, leaving the user with an empty "Generate QR Code" button even when permanent active tokens already exist in the database.
4. **Environment-Aware Resolution:** QR URL generation relies entirely on static environment variables (`NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL`). In local development or multi-host staging, missing or static env variables produce broken or unnavigable QR codes rather than dynamically resolving against request host headers.

---

## 2. Public Responder Page Investigation (`/emergency/[token]`)

### 2.1 File Location & Component Architecture
- **Target File**: `apps/web/app/emergency/[token]/page.tsx`
- **Route**: `/emergency/[token]` (Next.js 15 Client Component)
- **Primary Data Source**: `GET /api/emergency/[token]?lat=...&lon=...`
- **Secondary Action**: `POST /api/emergency/notify` (logs access and notifies primary contact)

### 2.2 Field-by-Field Rendering Analysis
| Field | UI Rendering Implementation | Issues / Deficiencies |
|---|---|---|
| **Patient Identity** | Lines 276–282: `displayName` rendered in `<div><strong>Name:</strong> {profile.displayName}</div>` | Functional, but uses plain unstyled inline CSS (`#000`, Arial). |
| **DOB / Age** | Lines 279–280: `Age: {profile.age} years` and `DOB: {profile.dob}` | Calculated server-side in API route; displays cleanly if present. |
| **Blood Group** | Lines 285–290: Prominent 28px bold red (`#c00`) text | High visibility as expected for emergency responders. |
| **Allergies** | Lines 293–311: Light yellow container (`#fff8dc`) with border (`#f90`). Lists items with bullet points (`•`). | Shows "None recorded" when empty. Functional. |
| **Chronic Conditions** | Lines 314–323: Underlined section with bulleted list | Only rendered if array length > 0. Functional. |
| **Medications** | Lines 326–335: Underlined section with bulleted list | Only rendered if array length > 0. Functional. |
| **Insurance ID** | Lines 338–345: Monospace font, masked (e.g. `****1234`) | Masking handled by API endpoint. Functional. |
| **Emergency Contacts** | Lines 348–367: Name, relationship, and `<a href="tel:${contact.phone}">` link | Direct phone dial action available. |
| **Quick Action Buttons** | Lines 370–442: Full-width action buttons: `Call Emergency Contact`, `Call Ambulance (112)`, `Find Nearest Hospital`, `Share Location`. | Direct calling works on mobile devices. Hospital search opens Google Maps. |
| **Medical Documents & Records** | **MISSING**: Nowhere in `page.tsx` or `EmergencyData` interface are documents referenced. | **Critical Failure of Requirement R2**. Responders cannot view lab reports, discharge summaries, or prescriptions. |
| **Vitals Table** | **MISSING**: No vitals (heart rate, blood pressure, SpO2, temperature) rendered. | Violates adversarial test expectations in `test/adversarial-stress-r1-r4.ts` (lines 183–190). |

### 2.3 Critical Latency Defect: Geolocation Blocking
In `apps/web/app/emergency/[token]/page.tsx`, lines 48–74:
```ts
useEffect(() => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lon: position.coords.longitude });
        setLocationResolved(true);
      },
      (err) => { setLocationResolved(true); },
      { timeout: 5000 } // ⚠️ 5-second blocking timeout
    );
    return;
  }
  setLocationResolved(true);
}, []);

useEffect(() => {
  if (token && locationResolved) { // ⚠️ Blocked until location resolves!
    fetchEmergencyData();
  }
}, [token, locationResolved]);
```
- **Observed Behavior**: When a responder opens `/emergency/[token]`, the browser triggers a location permission prompt. If the responder does not immediately interact with the prompt, `fetchEmergencyData()` is blocked for **up to 5 full seconds**.
- **Impact**: In emergency conditions where seconds count, an incapacitated patient's critical data is delayed by 5 seconds.
- **Required Fix**: `fetchEmergencyData()` must execute **immediately on mount** in parallel with geolocation. Once geolocation resolves, coordinates can be transmitted in the background via the existing `/api/emergency/notify` call or as an optional location update.

---

## 3. Stored Medical Documents / Records Display Survey

### 3.1 Requirement R2 Specifications
- Emergency responders must be able to view previously stored medical documents and records.
- Metadata must include: **Document title**, **Date**, **Category / Type** (Prescription, Lab Report, Scan, Discharge Summary).
- Actions must include: **Readable view / preview / download links** for offline or on-screen review.

### 3.2 Current Codebase Document Implementations
1. **Document Data Model (`packages/db/index.ts` & `supabase.sql`)**:
   - MongoDB `documents` collection: `{ id, profileId, ownerUserId, title, originalName, docType, storageKey, createdAt, status }`.
   - Supabase `medical_records` table: `{ id, patient_id, document_url, document_type, disease_id, status, created_at }`.
2. **Existing Document Viewer Pages**:
   - `apps/web/app/dashboard/documents/[documentId]/page.tsx`: Full document viewer using an `iframe` with `aspectRatio: '4/5'` and download links.
   - `apps/web/app/documents/page.tsx`: Scanned document modal (lines 1078–1180) with a darkened backdrop (`background: 'rgba(0,0,0,0.5)'`, `zIndex: 1050`), split view (document iframe/image on left, extracted clinical vitals on right), and zoom/close controls.
   - `apps/web/app/emergency/public/nfc/[token/]/full/page.tsx`: Renders a simple list of `recentDocuments` (`{ docName, type, uploadDate }`), but lacks clickable view/preview links.

### 3.3 Proposed Responder Page Document Section Specification
On `/emergency/[token]/page.tsx`, beneath the Quick Actions and Medical Information:
```tsx
{/* Stored Medical Documents & Records */}
<div className="mt-6 border-t pt-4">
  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
    📄 Medical Documents & Records ({data.documents?.length || 0})
  </h3>
  {data.documents && data.documents.length > 0 ? (
    <div className="space-y-3">
      {data.documents.map((doc) => (
        <div key={doc.id} className="p-3 bg-gray-50 border rounded-lg flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900 text-sm">{doc.title || doc.fileName || 'Medical Record'}</p>
            <p className="text-xs text-gray-500">
              <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium mr-2">
                {doc.category || doc.docType || 'General'}
              </span>
              {doc.date ? new Date(doc.date).toLocaleDateString() : 'Date N/A'}
            </p>
          </div>
          <div className="flex gap-2">
            {doc.url && (
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View
              </a>
            )}
            {doc.downloadUrl && (
              <a
                href={doc.downloadUrl}
                download
                className="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded hover:bg-gray-100"
              >
                Download
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-sm text-gray-500 italic">No stored medical documents available.</p>
  )}
</div>
```

---

## 4. Emergency Settings UI (`/emergency/settings` & `EmergencyTokenGenerator.tsx`)

### 4.1 Component Flow
1. `apps/web/app/emergency/settings/page.tsx` checks user session via `supabase.auth.getUser()`, calls `/api/profiles` to obtain the primary `profileId`, and renders `<EmergencyTokenGenerator profileId={profileId} />`.
2. `EmergencyTokenGenerator.tsx` mounts and calls `fetchActiveTokens()`.
3. `fetchActiveTokens()` requests `GET /api/emergency/token?profileId=${profileId}`, which returns `data.tokens` (sanitized list of token metadata: `id, createdAt, revoked, accessCount, lastAccessedAt`).

### 4.2 Critical Defect: State Loss on Page Refresh
- **Observation**: `generatedToken` is held in local React state:
  ```ts
  const [generatedToken, setGeneratedToken] = useState<TokenResponse | null>(null);
  ```
  `generatedToken` is ONLY populated during the active session when the user clicks "Generate QR Code" or "Regenerate".
- **Problem**: When the user reloads `/emergency/settings` or returns later:
  - `activeTokens` contains the active permanent token.
  - BUT `generatedToken` is `null`.
  - The UI condition `{!generatedToken && <button onClick={generateToken}>Generate QR Code</button>}` is true.
  - The UI condition `{generatedToken && (...)}` is false!
  - As a result, the QR code image, the emergency URL input, the Copy button, Print QR, Download, and Regenerate buttons **DISAPPEAR**.
  - If the user clicks "Generate QR Code" again, the API attempts to generate a new token rather than displaying their permanent active QR code.
- **Required Fix**:
  - The backend `GET /api/emergency/token?profileId=${profileId}` must return the active token's public metadata, QR data URL, and emergency URL.
  - Alternatively, if an active token exists, `EmergencyTokenGenerator` must automatically reconstruct or request the QR data URL and set `generatedToken`, rendering the permanent active QR code and regeneration controls immediately.

### 4.3 Outdated & Contradictory Messaging
In `apps/web/app/emergency/settings/page.tsx` (lines 157–163, 203–205):
- UI states: *"Generate tokens only when immediately needed"* — contradicts Requirement R1 (tokens are permanent by default).
- UI states: *"Revoke tokens as soon as the emergency is over"* — contradicts permanent wallet/bracelet use cases.
- UI states: *"⚠️ Note: No medical history, documents, or files are included in emergency access."* — directly contradicts Requirement R2 (stored documents must be available to responders).

---

## 5. Dashboard Emergency QR Card (`EmergencyQRBox.tsx`)

### 5.1 Component Analysis
- **File**: `apps/web/components/dashboard/EmergencyQRBox.tsx`
- **Purpose**: Compact widget embedded on the primary patient dashboard displaying the active QR code with a quick "Open" link.

### 5.2 Failure 1: Missing `profileId` Parameter
```ts
async function fetchExistingToken() {
  setLoading(true);
  try {
    const res = await fetch("/api/emergency/token"); // ⚠️ Missing profileId query param!
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.tokens) && data.tokens.length > 0) {
        await fetchQRForToken(data.tokens[0].id);
        return;
      }
    }
    await generateToken();
  } catch {
    setQrData(FALLBACK_QR);
  }
}
```
- In `api/emergency/token/route.ts`:
  ```ts
  const profileId = searchParams.get('profileId');
  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
  }
  ```
- Because `/api/emergency/token` requires `profileId`, `res.ok` is always `false` (400 Bad Request).
- Next, `generateToken()` calls `POST /api/emergency/token` with `{}` (empty body), which ALSO fails with 400 Bad Request (`profileId is required`).
- Execution catches and sets `setQrData(FALLBACK_QR)`.

### 5.3 Failure 2: Broken Navigation (404 Not Found)
In `EmergencyQRBox.tsx`, line 31:
```ts
const FALLBACK_QR: QRToken = {
  token: "emg-live-8921-xyz",
  tokenId: "tok-emg-001",
  qrCode: "data:image/svg+xml;utf8,...",
  url: "/emergency/token/emg-live-8921-xyz", // ⚠️ Invalid route!
};
```
- Next.js defines the route as `apps/web/app/emergency/[token]/page.tsx` (`/emergency/[token]`).
- There is NO route at `/emergency/token/[token]`.
- Clicking "Open" directs the browser to `/emergency/token/emg-live-8921-xyz`, which returns a **404 Not Found**.

### 5.4 Failure 3: Missing `normalizeEmergencyUrl` Helper
`apps/web/test/adversarial-stress-r1-r4.ts` (lines 83, 89–110) explicitly requires:
```ts
assert(content.includes("normalizeEmergencyUrl"), "Must implement normalizeEmergencyUrl");
```
A normalization function converting `/emergency/token/([a-zA-Z0-9_-]+)` to `/emergency/$1` is required to ensure compatibility with legacy token links.

---

## 6. Environment-Aware URL Generation Analysis

### 6.1 Current Implementation in Route Handlers
In `apps/web/app/api/emergency/token/route.ts` (lines 194–198):
```ts
const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
if (!baseUrl) {
  throw new Error('Base URL not configured');
}
const emergencyUrl = `${baseUrl}/emergency/${token}`;
```

### 6.2 Architectural Weaknesses
1. **Unconfigured Environment Crash**: If neither env var is defined, token generation throws an unhandled error and returns HTTP 500.
2. **Local Development Mismatch**: When running locally (`localhost:3000`), if `NEXT_PUBLIC_APP_URL` points to production (e.g. `https://medora.buzz`), the generated QR code directs the local developer or tester away from their local build to the production domain.
3. **Dynamic Host Derivation**: Next.js route handlers have full access to `req.headers` (`host`, `x-forwarded-host`, `x-forwarded-proto`) and `req.nextUrl.origin`.

### 6.3 Standardized Environment-Aware URL Resolution Pattern
```ts
export function resolveBaseUrl(req?: NextRequest): string {
  // 1. Explicit production override when NODE_ENV is production
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://medora.buzz';
  }
  // 2. Dynamic host header from incoming request
  if (req) {
    const forwardedHost = req.headers.get('x-forwarded-host');
    const host = forwardedHost || req.headers.get('host');
    if (host) {
      const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
      return `${proto}://${host}`;
    }
    if (req.nextUrl?.origin && !req.nextUrl.origin.includes('undefined')) {
      return req.nextUrl.origin;
    }
  }
  // 3. Fallback env variables
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
}
```

---

## 7. Verification Test Suite Analysis (`adversarial-stress-r1-r4.ts`)

Direct empirical test execution (`npx tsx test/adversarial-stress-r1-r4.ts`) revealed the following verification barriers:

1. **Suite 1: EmergencyQRBox Component Verification (FAILED)**
   - Line 83: `Must implement normalizeEmergencyUrl` — `EmergencyQRBox.tsx` does not define this function.
   - Line 76: `Open button must link to qrData.url or fallback` — `EmergencyQRBox.tsx` links to un-normalized `qrData.url`.
2. **Suite 1: Emergency Root Redirect (`/emergency`)**
   - Line 117: Expects Next.js `redirect('/emergency/settings')`. `apps/web/app/emergency/page.tsx` currently uses client-side `router.push('/emergency/settings')`.
3. **Suite 1: Immediate Token Fetch**
   - Line 130: Expects `fetchEmergencyData()` to be called without waiting for geolocation.
4. **Suite 2: Unauthenticated Emergency Access**
   - Line 151: Test requests demo tokens (`emg-live-8921-xyz`, `dry-run-token-abc123`, `emg-live-token`, `dry-run`).
   - Route `apps/web/app/api/emergency/[token]/route.ts` line 72 checks `!/^[a-f0-9]{64}$/i.test(token)` and rejects all demo tokens with HTTP 400.
   - Route does not return `vitals` array, causing assertion failures on line 184 (`assert.ok(Array.isArray(p.vitals))`).
5. **Suite 3: Rate Limiting Isolation**
   - Route line 61 has rate limit set to 20 requests/minute. Test sends 60 requests and expects HTTP 429 on request 61.
6. **Suite 4: Error Differentiation**
   - Missing token currently returns `{ error: 'Invalid QR code', locked: true }` with status 404. Test asserts `locked: false` and `error.includes("Invalid or expired")`.

---

## 8. Concrete Implementation Recommendations

| File Path | Recommended Actions |
|---|---|
| `apps/web/components/dashboard/EmergencyQRBox.tsx` | 1. Implement `normalizeEmergencyUrl(rawUrl?: string): string`.<br>2. Update `FALLBACK_QR.url` from `/emergency/token/emg-live-8921-xyz` to `/emergency/emg-live-8921-xyz`.<br>3. In `fetchExistingToken`, resolve current user/profile to pass valid `profileId` or handle session-based fallback gracefully.<br>4. Wrap Open link `href` in `normalizeEmergencyUrl`. |
| `apps/web/app/emergency/page.tsx` | Replace client-side `router.push` with Next.js `redirect('/emergency/settings')`. |
| `apps/web/app/emergency/[token]/page.tsx` | 1. Invoke `fetchEmergencyData()` immediately on mount (do not block on `locationResolved`).<br>2. Extend `EmergencyData` and `EmergencyProfile` interfaces to include `documents` and `vitals`.<br>3. Render Stored Medical Documents section with title, date, category badge, and preview/download links.<br>4. Render vitals table (heart rate, blood pressure, etc.).<br>5. Refactor styling to responsive Tailwind design matching the rest of the application. |
| `apps/web/app/emergency/settings/page.tsx` | 1. Update guidance copy to accurately reflect permanent QR lifecycle.<br>2. Remove inaccurate disclaimer claiming documents cannot be viewed in emergency access.<br>3. Allow permanent QR code and URL to display immediately upon page load if an active token exists. |
| `apps/web/components/EmergencyTokenGenerator.tsx` | 1. When `activeTokens` are loaded, if an active token is present, fetch/render its permanent QR code and URL instead of hiding behind a null `generatedToken`.<br>2. Allow manual regeneration even after page reload by using the current active token ID or hash. |
| `apps/web/app/api/emergency/[token]/route.ts` | 1. Relax token regex to support demo/standard tokens.<br>2. Query and return stored medical documents (`documents` or `medical_records`).<br>3. Return `vitals` array in profile object.<br>4. Align rate limiter to 60 req/min.<br>5. Ensure non-existent tokens return 404 with `locked: false` and `"Invalid or expired QR code"`. |
| `apps/web/app/api/emergency/token/route.ts` | 1. Implement environment-aware base URL resolution using request headers.<br>2. When `profileId` is omitted, attempt to auto-resolve from authenticated user session. |
