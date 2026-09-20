# Handoff Report: Technical Survey of Emergency QR & Public Responder Frontend System

**Agent**: `explorer_survey_2` (Frontend & UI Explorer)  
**Parent**: `parent` (1435b04e-0aae-4093-82ac-a3dc4017f7ac)  
**Type**: Hard Handoff (Investigation Complete)  
**Date**: 2026-09-20  
**Target Module**: Frontend UI Pages, Dashboard Components, QR Resolution, and Document Viewing  

---

## 1. Observation

1. **Dashboard Emergency Card Broken URL & Missing Function**:
   - In `apps/web/components/dashboard/EmergencyQRBox.tsx`, line 31:
     ```ts
     const FALLBACK_QR: QRToken = {
       token: "emg-live-8921-xyz",
       tokenId: "tok-emg-001",
       qrCode: "data:image/svg+xml;utf8,...",
       url: "/emergency/token/emg-live-8921-xyz",
     };
     ```
   - Running `npx tsx test/adversarial-stress-r1-r4.ts` produces verbatim error:
     ```text
     SUITE 1: Requirement R1 — Emergency URL Navigation & QRBox Component
       ✗ [FAIL] EmergencyQRBox component source verification (4ms): Must implement normalizeEmergencyUrl
     Adversarial suite terminated with error: AssertionError [ERR_ASSERTION]: Must implement normalizeEmergencyUrl
         at <anonymous> (D:\Prayas_hackathon-\apps\web\test\adversarial-stress-r1-r4.ts:83:5)
     ```
   - Next.js route structure contains `apps/web/app/emergency/[token]/page.tsx`. There is no route matching `/emergency/token/...`. Clicking "Open" on the dashboard navigates to a 404 error.

2. **Emergency Settings State Loss on Reload**:
   - In `apps/web/components/EmergencyTokenGenerator.tsx`, lines 31, 275, 299:
     ```ts
     const [generatedToken, setGeneratedToken] = useState<TokenResponse | null>(null);
     ```
     `generatedToken` is never populated from `fetchActiveTokens()`.
     When the page reloads, `generatedToken` is `null`.
     Lines 275–284 show `{!generatedToken && <button onClick={generateToken}>Generate QR Code</button>}`.
     The active QR code image, emergency URL, Print QR, Download, and Regenerate buttons (lines 299–403) are completely hidden from the user, even if an active permanent token exists in the database.

3. **Public Responder Page Geolocation Blocking**:
   - In `apps/web/app/emergency/[token]/page.tsx`, lines 48–74:
     ```ts
     useEffect(() => {
       if (navigator.geolocation) {
         navigator.geolocation.getCurrentPosition(..., { timeout: 5000 });
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
     `fetchEmergencyData()` is gated on `locationResolved`, introducing up to 5,000ms delay before fetching critical patient profile data if geolocation is pending or unhandled.

4. **Missing Stored Medical Documents on Emergency View**:
   - In `apps/web/app/emergency/[token]/page.tsx`, lines 7–29:
     ```ts
     interface EmergencyProfile {
       displayName: string;
       age?: number;
       dob?: string;
       bloodGroup: string;
       allergies: string[];
       chronicConditions: string[];
       currentMedications: string[];
       emergencyNotes: string;
       emergencyContacts: Array<{ name: string; relationship: string; phone: string; }>;
       insuranceId?: string;
     }
     ```
     Zero document fields or medical record arrays are defined, received, or rendered in JSX.
   - In `apps/web/app/emergency/settings/page.tsx`, lines 203–205:
     ```tsx
     <p className="text-sm text-amber-900 font-semibold">
       ⚠️ Note: No medical history, documents, or files are included in emergency access.
     </p>
     ```
     The settings UI explicitly states that no documents are shared, contrary to Requirement R2.

5. **Static Environment URL Resolution**:
   - In `apps/web/app/api/emergency/token/route.ts`, lines 194–198:
     ```ts
     const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
     if (!baseUrl) {
       throw new Error('Base URL not configured');
     }
     const emergencyUrl = `${baseUrl}/emergency/${token}`;
     ```
     Throws an unhandled 500 error if neither variable is set, and does not derive origin dynamically from `req.headers` (`host` / `x-forwarded-host`) or local dev origin (`http://localhost:3000`).

---

## 2. Logic Chain

1. **Dashboard 404 Error Chain**:
   - Observation 1 shows `EmergencyQRBox.tsx` fallback URL is `/emergency/token/emg-live-8921-xyz`.
   - Observation 1 confirms no route exists at `/emergency/token/...` (only `/emergency/[token]`).
   - Therefore, clicking "Open" on the dashboard emergency card navigates to `/emergency/token/...`, resulting in a browser 404 error.
   - Observation 1 also confirms `adversarial-stress-r1-r4.ts` fails because `normalizeEmergencyUrl` is not implemented.

2. **Settings UI Disappearing QR Code Chain**:
   - Observation 2 demonstrates that `EmergencyTokenGenerator.tsx` stores QR image and URL only in `useState<TokenResponse | null>(null)`.
   - On page mount, `fetchActiveTokens()` queries `/api/emergency/token?profileId=${profileId}`, but the backend returns only an array of metadata IDs (`createdAt, lastAccessedAt, accessCount, isPermanent, revoked`).
   - Because `generatedToken` remains `null`, the UI displays the "Generate QR Code" prompt instead of the active permanent QR code, breaking Requirement R1's requirement to clearly display active permanent QR code status.

3. **5-Second Latency Chain**:
   - Observation 3 shows `fetchEmergencyData()` will not run until `locationResolved` is true.
   - `locationResolved` is delayed by up to 5,000ms by the `navigator.geolocation` timeout if permissions are prompted or pending.
   - Therefore, first responders experience up to 5,000ms latency before viewing critical medical information.

4. **Document Absence Chain**:
   - Observation 4 confirms that neither the frontend interface (`EmergencyProfile`) nor the JSX in `apps/web/app/emergency/[token]/page.tsx` renders medical documents or records.
   - Observation 4 confirms the settings copy incorrectly tells users documents are excluded.
   - Therefore, incapacitated patients' stored records are inaccessible to first responders, directly violating Requirement R2.

5. **Environment Inflexibility Chain**:
   - Observation 5 shows `token/route.ts` hardcodes URL generation to static environment variables without request header inspection.
   - In local development, if `NEXT_PUBLIC_APP_URL` is configured for production, generated QR codes will direct scanners to production instead of localhost. If unset, the route crashes with HTTP 500.

---

## 3. Caveats

1. **Supabase Schema Merge**: The Supabase migration branch is in progress. The document storage schema must remain compatible with both MongoDB `documents` collection and Supabase `medical_records` table.
2. **Adversarial Test Script Scope**: Running `npm test` executes `profile-update.test.ts` and `edge-cases.test.ts`. `adversarial-stress-r1-r4.ts` is currently run standalone via `npx tsx test/adversarial-stress-r1-r4.ts`. Adding it to `package.json` `"scripts": {"test": ...}` requires all R1–R4 fixes in route handlers and components to be in place.
3. **Hardware NFC vs Software QR**: This survey focused strictly on the QR responder system (`/emergency/[token]`) and settings page (`/emergency/settings`), not the hardware NFC card writing flow (`/emergency/nfc`).

---

## 4. Conclusion

The Emergency QR and public responder frontend system has a solid functional foundation but requires 5 critical improvements to meet the requirements of the prompt and pass adversarial testing:
1. **Implement `normalizeEmergencyUrl` and update fallback URL** in `apps/web/components/dashboard/EmergencyQRBox.tsx` to eliminate dashboard 404 errors.
2. **De-couple emergency data fetching from geolocation resolution** in `apps/web/app/emergency/[token]/page.tsx` so patient data renders immediately on mount.
3. **Incorporate Stored Medical Documents display** on `/emergency/[token]/page.tsx` (titles, formatted dates, category badges, and preview/download links).
4. **Persist active permanent QR display across page reloads** in `EmergencyTokenGenerator.tsx` by fetching or reconstructing the active token QR code.
5. **Implement dynamic environment-aware host resolution** in `api/emergency/token/route.ts` using request headers (`x-forwarded-host`, `host`, `x-forwarded-proto`).

---

## 5. Verification Method

To independently verify all findings and test fixes:

1. **Verify Dashboard URL Normalization & Navigation**:
   ```bash
   npx tsx test/adversarial-stress-r1-r4.ts
   ```
   *Expected Current Failure*: `Must implement normalizeEmergencyUrl`.
   *Expected Post-Fix*: Suite 1 PASS.

2. **Verify Public Responder Page Rendering & Geolocation**:
   - Inspect `apps/web/app/emergency/[token]/page.tsx`.
   - Verify `fetchEmergencyData()` is invoked in an initial `useEffect` without waiting for `locationResolved`.
   - Verify presence of Medical Documents section and Vitals table.

3. **Verify Settings Permanent QR UI**:
   - Inspect `apps/web/components/EmergencyTokenGenerator.tsx`.
   - Verify that when `activeTokens` contains an active token, the QR code, URL, and regeneration controls render immediately without requiring the user to click "Generate QR Code" again.

4. **Verify Full Test Suite**:
   ```bash
   npm test
   ```
   *Current Result*: Passes profile and edge-case suites (10 tests total).
