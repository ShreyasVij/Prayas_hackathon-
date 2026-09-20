# Project: MediLocker Emergency QR & Public Responder System

## Architecture
- **Framework**: Next.js 14 (App Router), React 18, Tailwind CSS, TypeScript.
- **Backend & Storage**:
  - Multi-tier storage abstraction: In-memory store + Supabase client (`supabaseAdmin()`, `medical_records`, `emergency_tokens`) + MongoDB client (`getDbClient()`).
  - Route handlers:
    - `POST /api/emergency/token`: Generate / regenerate permanent emergency tokens, dynamic environment-aware URL resolution.
    - `GET /api/emergency/token`: Retrieve active permanent token for settings resumption.
    - `GET /api/emergency/[token]`: Public unauthenticated responder endpoint returning profile, vitals, stored medical documents, and logging access.
- **Client & Responder UI**:
  - `/emergency/[token]`: Public responder view with patient vitals, emergency contacts (`tel:`), and stored medical records.
  - `/emergency/settings` & `EmergencyTokenGenerator.tsx`: Patient emergency settings with permanent QR code display and explicit manual regeneration.
  - `EmergencyQRBox.tsx`: Dashboard emergency card with `normalizeEmergencyUrl` and direct navigation.
  - `/emergency`: Server redirect to `/emergency/settings`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Permanent QR Token Lifecycle | Default permanent tokens persisting across sessions/reboots without auto-expiry | M1 | R1 |
| 2 | Manual Token Regeneration & Revocation | Explicit regeneration revokes prior token and issues new permanent token | M1 | R1 |
| 3 | Supabase Table Schema & Persistence | `emergency_tokens` and `emergency_access_logs` DDL in `supabase.sql` and helpers in `supabase.ts` | M1 | R4 |
| 4 | Multi-Tier DB Abstraction | Resilient storage across in-memory cache, Supabase, and MongoDB | M1 | R4 |
| 5 | Environment-Aware URL Resolution | Dynamic host resolution (`localhost:3000` in dev vs production base URL in prod) | M1 | R3 |
| 6 | URL Normalization & Dashboard Navigation | Export `normalizeEmergencyUrl` in `EmergencyQRBox.tsx` and fix fallback URL | M1 | R1 |
| 7 | Emergency Root Server Redirect | Server-side `redirect('/emergency/settings')` in `app/emergency/page.tsx` | M1 | R1 |
| 8 | Unauthenticated Public Access & Token Support | Allow demo tokens and 64-hex tokens in `GET /api/emergency/[token]` | M2 | R2 |
| 9 | High-Capacity Rate Limiting & Isolation | 60 req/min, `locked: false` on 429, loopback bypass, token-scoped headerless isolation | M2 | R2 |
| 10 | Complete Profile & Vitals Response | Return identity, blood group, allergies, conditions, medications, contacts, and vitals array | M2 | R2 |
| 11 | Stored Medical Documents in Responder API | Query and return patient stored documents (titles, dates, categories, readable view links) | M2 | R2 |
| 12 | Stored Medical Documents Display on UI | Render medical documents list and preview/download links on `/emergency/[token]` | M2 | R2 |
| 13 | Active Token Resumption in Settings UI | Hydrate and display existing permanent QR code on reload in `/emergency/settings` | M2 | R1 |
| 14 | Decoupled Geolocation Fetching | Fetch emergency data immediately without waiting for geolocation resolution | M2 | R2 |
| 15 | Adversarial Stress & E2E Testing Suite | Pass all 5 suites in `adversarial-stress-r1-r4.ts` and integrate into `npm test` | M3 | Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Permanent Token Lifecycle, Supabase Storage & URL Normalization | `packages/db/index.ts`, `packages/db/supabase.sql`, `packages/db/supabase.ts`, `lib/utils/url.ts`, `app/api/emergency/token/route.ts`, `components/dashboard/EmergencyQRBox.tsx`, `app/emergency/page.tsx` | none | DONE |
| M2 | Public Responder API & UI with Stored Documents & Vitals | `app/api/emergency/[token]/route.ts`, `app/emergency/[token]/page.tsx`, `app/emergency/settings/page.tsx`, `components/EmergencyTokenGenerator.tsx` | M1 | IN_PROGRESS |
| M3 | E2E Testing Suite & Coverage Hardening | `apps/web/test/`, `apps/web/package.json` | M1, M2 | PLANNED |

## Interface Contracts
### Token Generation & Settings
- `POST /api/emergency/token`:
  - Body: `{ profileId: string, regenerate?: boolean, oldToken?: string, label?: string }`
  - Response: `{ success: true, token: string, tokenId: string, qrCode: string, url: string, isPermanent: true, createdAt: string }`
- `GET /api/emergency/token?profileId=[id]`:
  - Response: `{ success: true, tokens: Array<{ id, createdAt, lastAccessedAt, accessCount, isPermanent, revoked }>, activeToken: { token, qrCode, url, isPermanent } | null }`

### Public Emergency Responder API
- `GET /api/emergency/[token]?lat=&lon=&loc=`:
  - Success (200): `{ success: true, token: string, accessTimestamp: string, profile: { displayName, age, dob, bloodGroup, allergies: string[], chronicConditions: string[], currentMedications: string[], emergencyNotes: string, emergencyContacts: Array<{ name, phone, relationship }>, vitals: Array<{ label, value }> }, documents: Array<{ id, title, date, category, docType, viewUrl, fileSize }> }`
  - Missing/Expired (404): `{ error: 'Invalid or expired QR code', locked: false }`
  - Revoked (403): `{ error: 'Emergency access revoked by the owner', revoked: true, locked: true }`
  - Rate Limited (429): `{ error: 'Rate limit exceeded. Please try again shortly.', locked: false }`

### URL Normalization & Dynamic Host
- `normalizeEmergencyUrl(url?: string): string`:
  - Returns canonical `/emergency/[token]` or full URL with `/emergency/[token]`.
  - Fallback: `/emergency/emg-live-8921-xyz`.
- `resolveBaseUrl(req: NextRequest): string`:
  - Dynamically extracts host from `x-forwarded-host` or `host` header.
  - Resolves `http` for local hosts (`localhost`, `127.0.0.1`), `https` for production, with env variable fallback.

## Code Layout
- `apps/web/packages/db/index.ts`: Token DB helpers, multi-tier storage
- `apps/web/packages/db/supabase.sql`: DDL for emergency tokens and access logs
- `apps/web/packages/db/supabase.ts`: Supabase emergency token client helpers
- `apps/web/lib/utils/url.ts`: URL resolution utility
- `apps/web/app/api/emergency/token/route.ts`: Token creation & retrieval handler
- `apps/web/components/dashboard/EmergencyQRBox.tsx`: Dashboard QR card & normalizeEmergencyUrl
- `apps/web/app/emergency/page.tsx`: Server redirect
- `apps/web/app/api/emergency/[token]/route.ts`: Public responder handler
- `apps/web/app/emergency/[token]/page.tsx`: Public emergency responder view
- `apps/web/app/emergency/settings/page.tsx`: Patient emergency settings view
- `apps/web/components/EmergencyTokenGenerator.tsx`: Token generator and QR code display
- `apps/web/test/adversarial-stress-r1-r4.ts`: Adversarial test suite
- `apps/web/package.json`: Automated test command
