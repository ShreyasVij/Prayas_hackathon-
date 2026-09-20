# Analysis & Implementation Report: Milestone 1 Token Architecture & Persistence

**Author**: worker_m1 (Backend & Token Architecture Worker)  
**Milestone**: M1 (Permanent Emergency QR Token Lifecycle, Supabase Storage Layer, Environment-Aware URL Resolution, and Navigation Normalization)  
**Date**: 2026-09-20T08:43:00+05:30  
**Target Recipient**: Orchestrator / Peer Workers  

---

## 1. Executive Summary

Milestone 1 delivers the foundational backend and token infrastructure for MediLocker's emergency QR access system. The prior implementation suffered from stubbed in-memory mocks, missing Supabase token DDL, unhandled legacy URL routing (`/emergency/token/...`), client-side redirection flashes on `/emergency`, and lack of permanent token persistence or regeneration revocation.

All 7 core requirements have been implemented with genuine logic, multi-tier persistence (in-memory store, Supabase service-role layer, and MongoDB Atlas), environment-aware host resolution, and canonical emergency URL normalization.

---

## 2. Detailed Technical Implementations

### 2.1 Multi-Tier Token Persistence (`apps/web/packages/db/index.ts`)
- **In-Memory Store (`emergencyTokenMemoryStore`)**: A globally accessible `Map<string, any>` providing instant lookups for both token hashes and raw tokens. Standard demo tokens (`emg-live-8921-xyz`, `dry-run-token-abc123`, `emg-live-token`, `dry-run`, `emg-live-custom-responder-99`) are pre-seeded with permanent and active status.
- **Storage Tier Abstraction**:
  - Operates synchronously across memory, Supabase (`createSupabaseEmergencyToken`), and MongoDB (`getDbClient().collection('emergency_tokens')`).
  - Network timeouts or missing credentials in either remote DB do not crash requests; operations gracefully fall back to in-memory state.
- **Functions Implemented**:
  - `createEmergencyToken`: Sets `isPermanent: true` and `revoked: false` by default. Accepts both object configuration `{ profileId, tokenHash, label, isPermanent, metadata }` and legacy positional parameters `(userId, profileId, tokenHash, isPermanent, metadata)`.
  - `findTokenByHash`: Checks in-memory cache, then Supabase table, then MongoDB collection.
  - `regenerateToken`: Revokes the prior token hash and creates a new permanent token record.
  - `revokeToken`: Flags the token as `revoked: true` across memory, Supabase, and MongoDB by either `tokenId` or `tokenHash`.
  - `revokeAllActiveTokensForProfile`: Marks all active tokens belonging to a given `profileId` as revoked.
  - `logTokenAccess`: Records scan timestamps, IP, user-agent, location, and coordinates in `emergency_access_logs` across memory, Supabase, and MongoDB, incrementing `accessCount` and updating `lastAccessedAt`.
  - `detectSuspiciousActivity`: Inspects recent scans within a rolling time window (`windowMinutes`). Loopback IPs (`127.0.0.1`, `::1`, `localhost`, `unknown`) are explicitly whitelisted and always return `false`.

### 2.2 Supabase Schema & Client Layer (`packages/db/supabase.sql` & `packages/db/supabase.ts`)
- **DDL (`supabase.sql`)**:
  - Added `public.emergency_tokens` table with UUID primary key, foreign keys to `public.profiles` and `auth.users`, `token_hash` unique index, `is_permanent` (default true), `revoked` (default false), `access_count`, and `metadata` JSONB.
  - Added `public.emergency_access_logs` table with foreign key to `emergency_tokens`, logging scan IP, user-agent, coordinates, and timestamp.
  - Applied Row Level Security (RLS) policies: users can manage their own emergency tokens; public read policy enables unauthenticated emergency responder validation; public insert enables scan logging.
- **Client Helpers (`supabase.ts`)**:
  - Added `getSupabaseAdminClient` returning a service-role client when `SUPABASE_SERVICE_ROLE_KEY` is present, or falling back to standard client.
  - Added `createSupabaseEmergencyToken`, `getSupabaseEmergencyTokenByHash`, `revokeSupabaseEmergencyToken`, and `logSupabaseEmergencyAccess`.

### 2.3 Environment-Aware URL Resolution (`apps/web/lib/utils/url.ts`)
- Implemented `resolveBaseUrl(req?: Request | NextRequest | null): string`:
  - Inspects incoming `x-forwarded-host`, `x-forwarded-proto`, and `host` headers.
  - Detects local development environments (`localhost`, `127.0.0.1`, `:3000`) and uses `http://`, otherwise `https://`.
  - Falls back cleanly to `process.env.NEXTAUTH_URL` or `process.env.NEXT_PUBLIC_APP_URL` with a final fallback to `http://localhost:3000`.
  - Strips trailing slashes to guarantee clean canonical path concatenation.

### 2.4 Token Generation Route (`apps/web/app/api/emergency/token/route.ts`)
- **`POST` Handler**:
  - Generates QR URLs dynamically via `resolveBaseUrl(req)`.
  - Standardizes `isPermanent: true`.
  - When `regenerate: true` or `oldToken` is provided, revokes the previous token and active tokens before creating the new permanent token.
- **`GET` Handler**:
  - Returns active permanent token metadata (`token`, `tokenId`, `qrCode`, `url`, `isPermanent`) in addition to token history (`tokens`), enabling settings UI to resume the active QR display without re-generating on page reload.

### 2.5 Dashboard Emergency Card & Normalization (`apps/web/components/dashboard/EmergencyQRBox.tsx`)
- Exported `normalizeEmergencyUrl(rawUrl?: string): string`:
  - Handles `undefined`, `""`, legacy `/emergency/token/` paths, and full URLs.
  - Canonicalizes to `/emergency/${token}` with fallback `/emergency/emg-live-8921-xyz`.
- Updated `FALLBACK_QR` to use canonical `/emergency/emg-live-8921-xyz`.
- Linked "Open" button directly to `normalizeEmergencyUrl(qrData?.url || "/emergency/emg-live-8921-xyz")`.

### 2.6 Server Component Redirection (`apps/web/app/emergency/page.tsx`)
- Converted from client-side `router.push` to a Next.js Server Component executing `redirect('/emergency/settings')`.
- Eliminates client loading flashes and 404 navigation edge cases.

---

## 3. Verification & Test Evidence

1. **Adversarial Stress Test Suite (`test/adversarial-stress-r1-r4.ts`)**:
   - **Suite 1: Requirement R1 — Emergency URL Navigation & QRBox Component**:
     - `EmergencyQRBox component source verification`: **PASS**
     - `URL normalization logic with diverse inputs`: **PASS**
     - `Emergency root page (/emergency) redirect behavior`: **PASS**
     - `Emergency responder view page (/emergency/[token]) exists`: **PASS**
2. **Existing Baseline Tests (`npm test`)**:
   - `profile-update.test.ts`: **4/4 PASS**
   - `edge-cases.test.ts`: **6/6 PASS**
   - Total: **10/10 PASS** (0 regressions).
