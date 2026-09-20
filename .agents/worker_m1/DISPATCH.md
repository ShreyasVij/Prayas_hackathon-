## 2026-09-20T03:05:09Z
You are worker_m1, a Backend & Token Architecture Worker.
Working directory: d:/Prayas_hackathon-/.agents/worker_m1
Identity: Implementation worker.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission: Implement Milestone 1: Permanent Emergency QR Token Lifecycle, Supabase Storage Layer, Environment-Aware URL Resolution, and Navigation Normalization.

Authoritative source of truth:
- d:/Prayas_hackathon-/.agents/ORIGINAL_REQUEST.md (specifically ## 2026-09-20T02:56:52Z)
- d:/Prayas_hackathon-/.agents/orchestrator_2/PROJECT.md
- d:/Prayas_hackathon-/.agents/explorer_survey_1/analysis.md and handoff.md
- d:/Prayas_hackathon-/.agents/explorer_survey_2/analysis.md and handoff.md
- d:/Prayas_hackathon-/.agents/spec_miner_survey_3/analysis.md and handoff.md

Files you own exclusively:
- apps/web/packages/db/index.ts
- apps/web/packages/db/supabase.sql
- apps/web/packages/db/supabase.ts
- apps/web/lib/utils/url.ts (create if needed, export resolveBaseUrl)
- apps/web/app/api/emergency/token/route.ts
- apps/web/components/dashboard/EmergencyQRBox.tsx
- apps/web/app/emergency/page.tsx

Detailed Requirements to implement:
1. `apps/web/packages/db/index.ts`:
   - Implement genuine multi-tier token persistence:
     - In-memory store `emergencyTokenMemoryStore: Map<string, any>` for instantaneous lookups, test resilience, and caching across demo/live tokens.
     - Supabase persistence via `supabaseAdmin()` when configured.
     - MongoDB persistence via `getDbClient()` when configured.
   - Implement and export:
     - `createEmergencyToken(params: { profileId: string; tokenHash: string; label?: string; isPermanent?: boolean; metadata?: any })`: sets `isPermanent: true` by default, `revoked: false`, stores in memory and DB.
     - `findTokenByHash(tokenHash: string)`: checks memory store, then Supabase, then MongoDB.
     - `regenerateToken(oldTokenHash: string, newParams: any)`: revokes `oldTokenHash` and creates new permanent token.
     - `revokeToken(tokenIdOrHash: string)`: marks `revoked: true`.
     - `revokeAllActiveTokensForProfile(profileId: string)`: marks prior active tokens as revoked.
     - `logTokenAccess(params: { tokenId: string; tokenHash: string; ip: string; userAgent: string; coordinates?: any; location?: string })`: logs access event in memory and DB.
     - `detectSuspiciousActivity(ip: string, maxRequests?: number, windowMinutes?: number)`: loopback IPs `127.0.0.1`, `::1`, `localhost` always return `suspicious: false`.
2. `apps/web/packages/db/supabase.sql`:
   - Add clean table definitions and RLS policies for `public.emergency_tokens` and `public.emergency_access_logs`.
3. `apps/web/packages/db/supabase.ts`:
   - Add helper functions: `createSupabaseEmergencyToken`, `getSupabaseEmergencyTokenByHash`, `revokeSupabaseEmergencyToken`, `logSupabaseEmergencyAccess`.
4. `apps/web/lib/utils/url.ts`:
   - Implement and export `resolveBaseUrl(req?: Request | NextRequest | null): string`:
     - Checks `req?.headers.get('x-forwarded-host')` or `req?.headers.get('host')`.
     - If host is localhost/127.0.0.1 or contains `:3000`, protocol is `http://`, otherwise `https://`.
     - Fallback: `process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'`.
     - Strip trailing slashes.
5. `apps/web/app/api/emergency/token/route.ts`:
   - In POST: Use `resolveBaseUrl(req)` to generate QR URL. Ensure `isPermanent: true` is standard. When `regenerate: true` or `oldToken` is passed, revoke previous token.
   - In GET: When querying `GET /api/emergency/token?profileId=...`, retrieve and return the active permanent token details (`token`, `qrCode`, `url`, `isPermanent`) alongside token history so settings UI can resume active display without generating again on reload.
6. `apps/web/components/dashboard/EmergencyQRBox.tsx`:
   - Implement and export `normalizeEmergencyUrl(url?: string): string` which handles undefined, empty, legacy `/emergency/token/` paths, and returns canonical `/emergency/${token}` (fallback: `/emergency/emg-live-8921-xyz`).
   - Update `FALLBACK_QR` to use `url: "/emergency/emg-live-8921-xyz"`.
   - Ensure the "Open" button links directly to `normalizeEmergencyUrl(qrData?.url || "/emergency/emg-live-8921-xyz")`.
7. `apps/web/app/emergency/page.tsx`:
   - Convert to server component with `import { redirect } from 'next/navigation';` calling `redirect('/emergency/settings');`.
