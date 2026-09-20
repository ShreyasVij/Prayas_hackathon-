# Technical Survey: Emergency QR & Public Responder Backend Architecture

**Author**: `explorer_survey_1` (Backend & Architecture Explorer)  
**Date**: 2026-09-20  
**Target Milestone**: Enhanced Emergency QR & Public Responder System (Milestone 1 / Survey)  
**Reference Document**: `d:/Prayas_hackathon-/.agents/ORIGINAL_REQUEST.md` (specifically `## 2026-09-20T02:56:52Z`)

---

## 1. Executive Summary

This investigation analyzed the backend architecture, database abstractions, public responder endpoints, environment resolution mechanisms, and Supabase migration strategy for MediLocker's Emergency QR system.

### Key Architectural Findings
1. **Branch Divergence Context**:
   - `main` branch is at commit `f0cbb4f` (includes Supabase auth migration and decider merges), but contains **stub implementations** for emergency tokens in `apps/web/packages/db/index.ts` and missing helper methods in `apps/web/components/dashboard/EmergencyQRBox.tsx`.
   - Branch `fix/dashboard-emergency-docs-issues` (commits `b0988f6` and `b127b3e`) implemented an in-memory fallback store + MongoDB persistence layer, demo token handling, and vitals parsing, but branched before the Supabase auth merge and did **not** address the new document linkage or Supabase migration requirements.
2. **Critical Functional Gap (Medical Documents in Emergency Responder View)**:
   - Currently, neither `/api/emergency/[token]` nor `/emergency/[token]/page.tsx` fetches or displays the patient's previously stored medical documents. In fact, `apps/web/app/emergency/settings/page.tsx` line 204 explicitly states the legacy restriction: `"⚠️ Note: No medical history, documents, or files are included in emergency access."`
   - Meeting requirement **R2** requires extending `/api/emergency/[token]` to query patient documents (from MongoDB `documents` collection and Supabase `medical_records` / storage, with fallback to `MOCK_DOCUMENTS` in demo/dry-run mode) and rendering unauthenticated readable/preview links on `/emergency/[token]`.
3. **Token Permanence & UI Resumption**:
   - While token generation in `apps/web/app/api/emergency/token/route.ts` specifies `isPermanent: true`, the GET `/api/emergency/token` endpoint currently returns only sanitized metadata (`id, createdAt, lastAccessedAt, accessCount, isPermanent, revoked`) without returning the active token string, QR code data URL, or active URL. As a result, when a patient reloads the settings page, the UI resets and asks them to generate a QR code rather than showing their existing permanent QR code.
4. **Environment-Aware URL Resolution**:
   - URL resolution in `apps/web/app/api/emergency/token/route.ts` relies strictly on `process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL`. If neither is configured, the route throws an unhandled error (`Error('Base URL not configured')`).
   - Requirement **R3** requires dynamic resolution: resolving to the local environment host (from request headers or default `http://localhost:3000`) in development, and cleanly resolving to the production domain via environment variables (`NEXT_PUBLIC_APP_URL`, `PRODUCTION_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, or `VERCEL_URL`) in production.
5. **Supabase Migration Architecture**:
   - `apps/web/packages/db/supabase.sql` defines `profiles`, `doctors`, and `medical_records`, but lacks table and RLS definitions for `emergency_tokens` and `emergency_access_logs`.
   - `apps/web/packages/db/index.ts` requires a clean DB helper abstraction layer that queries Supabase when configured, falling back seamlessly to MongoDB Atlas and in-memory cache.

---

## 2. Token Generation, Storage Schema, and Permanence Lifecycle

### 2.1 Generation Mechanism
- **File**: `apps/web/app/api/emergency/token/route.ts` (POST)
- **Token Generation Logic**:
  ```ts
  // 32 cryptographically secure random bytes = 64 hexadecimal characters
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  ```
- **QR Code Generation**:
  ```ts
  const qrCode = await QRCode.toDataURL(emergencyUrl, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 400,
  });
  ```
- **Payload Returned**:
  ```json
  {
    "success": true,
    "token": "<64-hex-token>",
    "tokenId": "<mongo-or-uuid>",
    "qrCode": "data:image/png;base64,...",
    "url": "http://localhost:3000/emergency/<64-hex-token>",
    "isPermanent": true,
    "regenerated": false,
    "warning": "This QR code is long-lived and reusable..."
  }
  ```

### 2.2 Storage Schema Analysis
- **Current MongoDB Schema (`emergency_tokens` collection)**:
  | Field | Type | Description |
  |---|---|---|
  | `_id` | `ObjectId` | Primary Key |
  | `userId` | `ObjectId \| string` | Owner User reference |
  | `profileId` | `ObjectId \| string` | Profile reference (in current model, equals userId) |
  | `tokenHash` | `string` | SHA-256 hash of raw token |
  | `isPermanent` | `boolean` | `true` for permanent tokens (no TTL) |
  | `revoked` | `boolean` | `false` when active, `true` when revoked |
  | `revokedAt` | `Date` | Timestamp of revocation |
  | `accessCount` | `number` | Incremented on each responder scan |
  | `lastAccessedAt` | `Date` | Timestamp of most recent scan |
  | `createdAt` | `Date` | Creation timestamp |
  | `metadata` | `object` | `{ createdIp, createdUserAgent, regeneratedFrom, url, token }` |

- **Missing Supabase Schema**:
  In `apps/web/packages/db/supabase.sql`, there is **no table definition** for `emergency_tokens` or `emergency_access_logs`.
  To ensure Supabase migration compatibility, the SQL schema must include:
  ```sql
  CREATE TABLE IF NOT EXISTS public.emergency_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    raw_token TEXT,
    url TEXT,
    qr_code TEXT,
    is_permanent BOOLEAN DEFAULT true NOT NULL,
    revoked BOOLEAN DEFAULT false NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0 NOT NULL,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
  );

  CREATE INDEX IF NOT EXISTS emergency_tokens_hash_idx ON public.emergency_tokens (token_hash);
  CREATE INDEX IF NOT EXISTS emergency_tokens_profile_idx ON public.emergency_tokens (profile_id);
  ```

### 2.3 Expiration vs. Permanence Logic
- **No TTL / Automatic Expiration**: Tokens are created with `isPermanent: true`. In `packages/db/index.ts` and `apps/web/app/api/emergency/[token]/route.ts`, token validity checks only `tokenDoc.revoked === true` and does not enforce any TTL or session expiration.
- **Anomaly in Mock Data**:
  In `apps/web/lib/dry-run/mock-data.ts`, `MOCK_EMERGENCY_TOKEN` had `isPermanent: false`, which contradicts the requirement that tokens are permanent by default.
- **UI State Loss on Refresh**:
  In `EmergencyTokenGenerator.tsx`, `fetchActiveTokens()` calls `GET /api/emergency/token?profileId=${profileId}`. The route sanitizes tokens and strips `token` and `qrCode`, returning only `id, createdAt, lastAccessedAt, accessCount, isPermanent, revoked`. Thus `generatedToken` remains null on page load, forcing the user to regenerate or see an empty card.

---

## 3. Token Revocation and Manual Regeneration Mechanism

### 3.1 Regeneration Workflow
1. User clicks **"Regenerate"** in `EmergencyTokenGenerator.tsx`:
   ```ts
   POST /api/emergency/token
   Body: { profileId, regenerate: true, oldToken: generatedToken.token }
   ```
2. In `apps/web/app/api/emergency/token/route.ts`:
   - Computes `oldTokenHash` from `oldToken`.
   - Generates new token and computes `tokenHash`.
   - Invokes `regenerateToken(oldTokenHash, tokenHash, user._id)`.
3. In `packages/db/index.ts`:
   - Retrieves `oldDoc = await findTokenByHash(oldHash)`.
   - Sets `oldDoc.revoked = true; oldDoc.revokedAt = new Date()`.
   - In MongoDB, runs:
     ```ts
     await db.collection('emergency_tokens').updateOne(
       { tokenHash: oldHash },
       { $set: { revoked: true, revokedAt: new Date() } }
     );
     ```
   - Creates and inserts `newDoc` with `isPermanent: true, revoked: false, accessCount: 0`.
   - Returns `newDoc._id`.
   - Logs `token_created` audit event with `{ regenerated: true, oldTokenHash }`.

### 3.2 Revocation Endpoint (`/api/emergency/revoke`)
- **File**: `apps/web/app/api/emergency/revoke/route.ts`
- **Supported operations**:
  - `revokeAll: true`: Calls `revokeAllActiveTokensForProfile(profileObjectId, user._id)`. Sets `revoked: true, revokedAt: new Date()` on all active tokens for the profile.
  - Specific token revocation: Expects `{ token: string }`.
- **Identified Edge Case**:
  - Line 111: `if (!/^[a-f0-9]{64}$/i.test(token))` strictly rejects any token that is not 64 hex characters. This causes 400 Bad Request on demo/test tokens (e.g. `emg-live-8921-xyz`, `dry-run-token-abc123`).

---

## 4. Emergency Responder API (`/api/emergency/[token]`)

### 4.1 Unauthenticated Access
- Endpoint `GET /api/emergency/[token]` is strictly unauthenticated: no cookies or bearer tokens are required.
- **Rate Limiting Architecture**:
  - IP extraction must inspect multi-hop proxy headers:
    1. `cf-connecting-ip` (Cloudflare)
    2. `x-forwarded-for` (first IP in comma-separated list)
    3. `x-real-ip` / `client-ip`
  - Bucket isolation:
    - Normal client IP: `ip_${ip}` (threshold: 60 requests/minute).
    - Localhost / loopback (`127.0.0.1`, `::1`, `localhost`): `loopback_${token}` to eliminate developer/test lockouts.
    - Headerless / incognito requests where IP is unknown: isolated by token bucket (`token_${token}`) to prevent unrelated scans from blocking each other.
- **Status Code Mapping**:
  - `404 Not Found`: Unknown token (`{ error: 'Invalid or expired QR code', locked: false }`).
  - `403 Forbidden`: Revoked token (`{ error: 'This emergency QR has been revoked by the owner', locked: true, revoked: true }`).
  - `403 Forbidden`: Suspicious burst activity detected.
  - `429 Too Many Requests`: Rate limit bucket exhausted (`{ error: 'Rate limit exceeded...', locked: false }`).
  - `200 OK`: Valid active emergency token.

### 4.2 Patient Profile Details Returned
- Aggregated from dual sources (MongoDB `users` collection + Supabase profile store `getProfileJsonFromSupabase`):
  - `displayName`: Patient's full name.
  - `age`: Number (computed from DOB or extracted from profile).
  - `dob`: ISO date string or formatted date.
  - `bloodGroup`: E.g. `"O+"`, `"AB-"`, etc.
  - `allergies`: Array of strings (parsed from comma-separated string or string array).
  - `chronicConditions`: Array of strings.
  - `currentMedications`: Array of strings.
  - `emergencyNotes`: Critical guidance notes.
  - `emergencyContacts`: Array of `{ name, relationship, phone }` with direct call actions.
  - `insuranceId`: Masked string (e.g. `****1234`).
  - `vitals`: Array of `{ label, value, unit }` from recent vital readings.

### 4.3 Stored Medical Documents Retrieval (Requirement R2)
- **Current Defect**: Current implementation does not retrieve or return stored documents in the emergency response payload.
- **Required Architecture**:
  1. In `/api/emergency/[token]/route.ts`:
     - Determine `profileId` and `ownerUserId` from `tokenDoc`.
     - Query MongoDB `documents` collection:
       ```ts
       const docsCol = db.collection('documents');
       const storedDocs = await docsCol.find({
         $or: [{ profileId: tokenDoc.profileId }, { ownerUserId: tokenDoc.userId }],
         status: { $ne: 'deleted' }
       }).sort({ createdAt: -1 }).limit(20).toArray();
       ```
     - In Supabase environment, query `public.medical_records` where `patient_id = tokenDoc.userId`.
     - In dry-run / demo mode (tokens matching demo pattern), fall back to `MOCK_DOCUMENTS`.
     - For each document, generate an unauthenticated view/preview URL:
       - Direct Supabase storage public URL (`getPublicUrl(bucket, storageKey)`).
       - Or signed URL with 24-hour expiration (`createDownloadUrl(bucket, storageKey, 86400)`).
       - For demo documents, fallback preview link or inline document viewer link.
     - Return documents in response payload:
       ```json
       {
         "documents": [
           {
             "id": "doc-001",
             "title": "Annual Checkup 2026",
             "date": "2026-09-15T00:00:00.000Z",
             "category": "prescription",
             "fileName": "annual_checkup_2026.pdf",
             "fileSize": 204800,
             "viewUrl": "https://.../annual_checkup_2026.pdf"
           }
         ]
       }
       ```
  2. In `/emergency/[token]/page.tsx`:
     - Render a dedicated **"Medical Records & Documents"** section.
     - Display document title, date, category tag, and clickable "View Document" / "Download" buttons.

### 4.4 Access Logging
- `logTokenAccess(tokenHash, ip, userAgent, location)`:
  - Increments `accessCount` and updates `lastAccessedAt`.
  - Inserts entry into `emergency_access_logs`.
- `logEmergencyAction(...)`:
  - Records structured audit events (`token_accessed`, `token_invalid`, `token_revoked`, `token_created`).
  - Executed with try/catch to ensure logging errors never fail the emergency responder's critical path.

---

## 5. Supabase Migration Compatibility & Storage Strategy

### 5.1 Architecture Overview
The MediLocker system is transitioning persistence from MongoDB Atlas to Supabase (PostgreSQL + Supabase Storage + Supabase Auth).

```
                      +-----------------------------+
                      |   Client / Responder View   |
                      +-----------------------------+
                                     |
                                     v
                 +---------------------------------------+
                 |    Next.js API Route Handlers         |
                 |  (/api/emergency/token, [token], ...)  |
                 +---------------------------------------+
                                     |
                                     v
                 +---------------------------------------+
                 |       packages/db Abstraction         |
                 +---------------------------------------+
                     |               |               |
                     v               v               v
               +-----------+   +-----------+   +-----------+
               | In-Memory |   | Supabase  |   |  MongoDB  |
               | MemoryMap |   | Postgres  |   |   Atlas   |
               | (Instant) |   |  (Target) |   |  (Legacy) |
               +-----------+   +-----------+   +-----------+
```

### 5.2 Required Database Abstraction in `packages/db`
To support zero breaking changes during the branch merge, `packages/db/index.ts` must encapsulate persistence behind unified functions:
1. `createEmergencyToken(params)`:
   - Stores in `emergencyTokenMemoryStore`.
   - If Supabase client configured, inserts into `emergency_tokens` table.
   - If MongoDB connected, inserts into `emergency_tokens` collection.
2. `findTokenByHash(tokenHash)`:
   - Checks `emergencyTokenMemoryStore`.
   - Checks Supabase `emergency_tokens` table (`eq('token_hash', hash)`).
   - Checks MongoDB `emergency_tokens` collection.
3. `logTokenAccess(tokenHash, ip, userAgent, location)`:
   - Updates access count and inserts into `emergency_access_logs` in Supabase and MongoDB.
4. `revokeToken(tokenIdOrHash)`:
   - Marks token revoked across memory, Supabase, and MongoDB.

### 5.3 Supabase Table & Policy Definitions
To be added to `apps/web/packages/db/supabase.sql`:

```sql
-- ==========================================
-- EMERGENCY TOKENS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.emergency_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  profile_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  raw_token TEXT,
  url TEXT,
  qr_code TEXT,
  is_permanent BOOLEAN DEFAULT true NOT NULL,
  revoked BOOLEAN DEFAULT false NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0 NOT NULL,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.emergency_tokens ENABLE ROW LEVEL SECURITY;

-- Responders can read unrevoked tokens without auth
CREATE POLICY "Public can view active emergency tokens"
  ON public.emergency_tokens FOR SELECT
  USING ( revoked = false );

-- Users can view and manage their own emergency tokens
CREATE POLICY "Users can manage own emergency tokens"
  ON public.emergency_tokens FOR ALL
  USING ( auth.uid() = user_id );

-- ==========================================
-- EMERGENCY ACCESS LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.emergency_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID REFERENCES public.emergency_tokens(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  location JSONB,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.emergency_access_logs ENABLE ROW LEVEL SECURITY;

-- Service role or public insert for access logs
CREATE POLICY "Anyone can insert emergency access logs"
  ON public.emergency_access_logs FOR INSERT
  WITH CHECK ( true );
```

---

## 6. Environment URL Generation Logic (Local Dev vs. Production)

### 6.1 Current Problem
In `apps/web/app/api/emergency/token/route.ts`:
```ts
const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
if (!baseUrl) {
  throw new Error('Base URL not configured');
}
```
Defects:
1. Fails with HTTP 500 if neither env var is defined.
2. In production (e.g. Vercel deployment), `NEXTAUTH_URL` is frequently omitted in favor of `VERCEL_URL` or `VERCEL_PROJECT_PRODUCTION_URL`.
3. In local development on non-standard ports (e.g. `http://localhost:3001`), the hardcoded env var `http://localhost:3000` causes QR codes to generate wrong target URLs.

### 6.2 Recommended Dynamic Resolution Utility
Create a centralized helper `resolveBaseUrl(req?: NextRequest): string`:
```ts
export function resolveBaseUrl(req?: NextRequest): string {
  // 1. Explicit production override
  if (process.env.NODE_ENV === 'production') {
    if (process.env.PRODUCTION_URL) return process.env.PRODUCTION_URL.replace(/\/$/, '');
    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
      return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
    }
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
  }

  // 2. Resolve from incoming request headers
  if (req) {
    const proto = req.headers.get('x-forwarded-proto') || 
                  (req.nextUrl?.protocol ? req.nextUrl.protocol.replace(':', '') : 'http');
    const host = req.headers.get('x-forwarded-host') || 
                 req.headers.get('host') || 
                 req.nextUrl?.host;
    if (host) {
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  }

  // 3. Fallbacks
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  return 'http://localhost:3000';
}
```

---

## 7. Comparative Assessment: `main` vs. `fix/dashboard-emergency-docs-issues`

| Feature / Requirement | `main` Branch | `fix/dashboard-emergency-docs-issues` Branch | Target Enhanced State |
|---|---|---|---|
| **`createEmergencyToken`** | Stub returning mock object | Memory store + MongoDB persistence | Memory + Supabase + MongoDB persistence |
| **`findTokenByHash`** | Stub returning `null` | Memory store + MongoDB lookup | Memory + Supabase + MongoDB lookup |
| **Demo Tokens (`emg-live-8921-xyz`)** | Not handled; fails 400 regex | Handled with mock profile | Handled with full profile + mock docs |
| **Stored Documents in Responder View** | Missing (0 documents returned) | Missing (0 documents returned) | Retrieved from DB / storage & rendered |
| **`EmergencyQRBox.tsx`** | Missing `normalizeEmergencyUrl` | Implemented | Implemented + cached QR display |
| **Settings UI Active QR Display** | Disappears on refresh | Disappears on refresh | Active token QR returned by GET API & displayed |
| **Supabase DB Schema** | No `emergency_tokens` table | No `emergency_tokens` table | `emergency_tokens` and logs in `supabase.sql` |
| **Environment-Aware Base URL** | Crashes if env vars missing | Crashes if env vars missing | Dynamically resolved from req headers / prod env |
| **Adversarial Test Suite** | Untracked file in working dir | Partially passing | 100% Passing |

---

## 8. Concrete Architecture Recommendations for Implementation

1. **Implement Supabase & Memory-Backed Storage in `packages/db`**:
   - Update `apps/web/packages/db/index.ts` with permanent in-memory store + Supabase client (`supabaseAdmin()`) + MongoDB client (`getDbClient()`).
   - Add table definitions and RLS policies to `apps/web/packages/db/supabase.sql`.
2. **Extend Emergency Responder API (`apps/web/app/api/emergency/[token]/route.ts`)**:
   - Add stored medical documents retrieval from MongoDB `documents` collection, Supabase `medical_records`, and demo mock data.
   - Return `{ documents: [...] }` containing `id, title, date, category, docType, viewUrl, fileSize`.
   - Ensure demo tokens (`emg-live-8921-xyz`, `dry-run-token-abc123`) return sample documents matching the patient's record.
   - Implement `resolveBaseUrl(req)` to guarantee environment awareness.
3. **Extend Emergency Settings & Token Retrieval (`/api/emergency/token`)**:
   - Update `GET /api/emergency/token` to return `token`, `qrCode`, and `url` for the active token so `EmergencyTokenGenerator.tsx` displays the active permanent QR code immediately without regenerating.
   - Support `regenerate: true` revoking all prior active tokens for that profile even if `oldToken` is not provided.
4. **Update Responder UI (`apps/web/app/emergency/[token]/page.tsx`)**:
   - Add a structured "Stored Medical Documents" section displaying document cards with category badges and unauthenticated view/download links.
5. **Harmonize `EmergencyQRBox.tsx` & Root `/emergency` Redirect**:
   - Integrate `normalizeEmergencyUrl` and server redirect to `/emergency/settings` to satisfy the adversarial test suite.
