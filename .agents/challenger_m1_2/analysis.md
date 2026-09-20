# Empirical Adversarial Analysis Report: Milestone 1

**Agent**: `challenger_m1_2`  
**Role**: Empirical Challenger & Adversarial Verifier  
**Target Scope**: Multi-tier token persistence layer, Supabase migration schema & query resilience, URL normalization, loopback rate-limit bypass.  
**Date**: 2026-09-20T08:48:00+05:30  

---

## 1. Executive Summary

- **Total Adversarial Tests Executed**: 20 test cases in custom adversarial stress suite (`test/challenger-adversarial-m1.ts`) + 10 tests in baseline regression suite (`npm test`) + 8 tests in Milestone 1 suite (`test/milestone1.test.ts`) + 4 tests in Suite 1 of `test/adversarial-stress-r1-r4.ts`.
- **Adversarial Suite Result**: **20/20 PASSED (100%)**
- **Baseline Test Suite Result**: **10/10 PASSED (100%)**
- **Milestone 1 Test Suite Result**: **8/8 PASSED (100%)**
- **Adversarial Stress Suite 1 Result**: **4/4 PASSED (100%)**
- **Overall Verdict**: **APPROVE**

---

## 2. Test Execution & Empirical Findings

### 2.1 Baseline Regression Suite (`npm test`)
- **Command**: `npm test` in `apps/web`
- **Output**:
  - `Profile Update & Supabase JSON Verification Tests`: 4/4 Passed (Profile JSON save/fetch, theme dark mode, diet sentences).
  - `Edge Case Verification Tests`: 6/6 Passed (Empty Step 3, special characters, non-existent query, partial drafts, whitespace, theme toggle cycle).
- **Result**: Clean exit code 0, zero regressions introduced.

### 2.2 Milestone 1 Verification Suite (`test/milestone1.test.ts`)
- **Command**: `npx tsx test/milestone1.test.ts`
- **Results**:
  - `Test 1`: Environment-Aware URL Resolution (`resolveBaseUrl`) handles local dev (`http://localhost:3000`), forwarded hosts (`https://medilocker.health`), and production hosts (`https://app.medilocker.com`).
  - `Test 2`: URL normalization (`normalizeEmergencyUrl`) converts legacy `/emergency/token/...` paths to `/emergency/...` and defaults undefined/empty to `/emergency/emg-live-8921-xyz`.
  - `Test 3`: Pre-seeded demo tokens (`emg-live-8921-xyz`) resolve instantaneously with `isPermanent: true` and `revoked: false`.
  - `Test 4`: Permanent emergency token creation persisted and retrievable.
  - `Test 5`: Explicit token revocation marks `revoked: true`.
  - `Test 6`: Token regeneration revokes prior token and creates new permanent token.
  - `Test 7`: Bulk revocation (`revokeAllActiveTokensForProfile`) cleanly revokes all active tokens for a given profile.
  - `Test 8`: Access logging recorded and loopback false positive protection verified.
- **Result**: Clean exit code 0.

### 2.3 Adversarial Stress Harness (`test/challenger-adversarial-m1.ts`)
- **Command**: `npx tsx test/challenger-adversarial-m1.ts`
- **Detailed Findings by Adversarial Vector**:

#### Section 1: Disconnected / Mock / Faulty Backend Resilience
| Test ID | Test Description | Input Conditions | Observed Behavior | Verdict |
|---|---|---|---|---|
| 1.1 | Token creation when Supabase endpoint unreachable | `NEXT_PUBLIC_SUPABASE_URL='https://mock.supabase.co'` (DNS/fetch failure) | Falls back cleanly to in-memory store, returns valid token ID; token retrievable by hash; zero unhandled rejections | **PASS** |
| 1.2 | Direct Supabase helper functions handle network failure without throwing | Direct invocation of `createSupabaseEmergencyToken`, `getSupabaseEmergencyTokenByHash`, `revokeSupabaseEmergencyToken`, `logSupabaseEmergencyAccess` with unreachable endpoint | `create` returns `null`, `get` returns `null`, `revoke` returns `false`, `log` returns `false`; zero thrown exceptions | **PASS** |
| 1.3 | Lookup non-existent token | 64-hex non-existent hash | Returns `null` without throwing or stalling | **PASS** |
| 1.4 | Null, undefined, empty string inputs to `findTokenByHash` | `""`, `null`, `undefined` | All return `null` safely without exception | **PASS** |

#### Section 2: `detectSuspiciousActivity` Loopback vs External Rate Limiting
| Test ID | Test Description | Input Conditions | Observed Behavior | Verdict |
|---|---|---|---|---|
| 2.1 | Loopback IPv4 (`127.0.0.1`) flood immunity | 500 requests logged in 15 min window | Returns `false` (completely immune to rate-limit lock) | **PASS** |
| 2.2 | Loopback IPv6 (`::1`) flood immunity | 200 requests logged in 15 min window | Returns `false` | **PASS** |
| 2.3 | Hostname `localhost` & `unknown` flood immunity | 100 requests each | Returns `false` | **PASS** |
| 2.4 | Parameter format flexibility & null safety | Passed object `{ ip: '127.0.0.1' }`, `null`, `undefined` | Returns `false` without throwing | **PASS** |
| 2.5 | External IP rate limiting boundary | Exactly 60 requests vs 61 requests from `203.0.113.x` | 60 requests -> `false`; 61 requests -> `true` (strict boundary verification) | **PASS** |
| 2.6 | Time-window expiration | 100 requests at `t - 20min`, 10 requests fresh | Returns `false` (old requests older than 15 minutes correctly disregarded) | **PASS** |
| 2.7 | IP Isolation | 50 requests from IP A, 50 requests from IP B (total 100) | Neither IP flagged (isolated counters verified) | **PASS** |

#### Section 3: Token Permanence & Revocation Integrity
| Test ID | Test Description | Input Conditions | Observed Behavior | Verdict |
|---|---|---|---|---|
| 3.1 | Token permanence across multiple emergency scans | 25 access scans logged | Token remains active (`revoked: false`), `isPermanent: true`, `accessCount: 25`, `lastAccessedAt` updated | **PASS** |
| 3.2 | Revoked token findability | Hash lookup after `revokeToken` | Returns token record with `revoked: true` (critical for API to return 403 Revoked instead of 404 Not Found) | **PASS** |
| 3.3 | Token regeneration contract | `regenerateToken(oldHash, { newHash, profileId })` | Old token marked `revoked: true`; new token marked `revoked: false`, `isPermanent: true`, `regeneratedFrom: oldHash`; `getActiveTokensForProfile` returns only new token | **PASS** |
| 3.4 | Revoke by token ID string | ObjectId string passed to `revokeToken` | Target token revoked successfully | **PASS** |
| 3.5 | Revoke by raw token string | Raw token in `metadata.token` passed to `revokeToken` | Target token revoked successfully | **PASS** |

#### Section 4: Concurrency & Pathological Inputs
| Test ID | Test Description | Input Conditions | Observed Behavior | Verdict |
|---|---|---|---|---|
| 4.1 | 100 concurrent token creations | 100 simultaneous async `createEmergencyToken` calls | All 100 tokens successfully persisted in memory store; all 100 retrievable and marked permanent | **PASS** |
| 4.2 | Bulk revocation under load | 50 active tokens created, `revokeAllActiveTokensForProfile` invoked | Active count drops from 50 to 0 immediately | **PASS** |
| 4.3 | Pathological `profileId` inputs | SQL injection (`'; DROP TABLE...`), XSS (`<script>`), directory traversal (`../../`), non-UUID (Mongo ObjectId), 1000-char string | All handled gracefully without crash; `create`, `getActive`, `revokeAll` all succeed safely | **PASS** |

#### Section 5: Standard Demo Tokens
| Test ID | Test Description | Input Conditions | Observed Behavior | Verdict |
|---|---|---|---|---|
| 5.1 | Seeded demo tokens resolution | `emg-live-8921-xyz`, `dry-run-token-abc123`, `emg-live-token`, `dry-run`, `emg-live-custom-responder-99` | All resolve both by SHA-256 hash AND raw token string, permanent, active | **PASS** |

---

## 3. Supabase Schema & Query Resilience Audit

### 3.1 DDL Inspection (`packages/db/supabase.sql`)
1. **`public.emergency_tokens` table**:
   - `id uuid default gen_random_uuid() primary key`
   - `profile_id uuid references public.profiles (id) on delete cascade not null`
   - `token_hash text not null unique`
   - `is_permanent boolean default true not null` (fulfills Requirement R1)
   - `revoked boolean default false not null`
   - `metadata jsonb default '{}'::jsonb`
   - Indexes on `token_hash` and `profile_id` present for $O(1)$ query speed.
2. **`public.emergency_access_logs` table**:
   - `token_id uuid references public.emergency_tokens (id) on delete set null`
   - `token_hash text not null`
   - `coordinates jsonb`, `metadata jsonb`
   - Indexes on `token_id` and `token_hash` present.
3. **Row-Level Security (RLS)**:
   - `public.emergency_tokens`:
     - Policy `"Public can verify active emergency tokens by hash"` (`using ( true )`) ensures unauthenticated emergency responders can resolve valid emergency tokens without authentication credentials.
     - Policy `"Users can view/insert/update their own emergency tokens"` protects owner operations.
   - `public.emergency_access_logs`:
     - Policy `"Public can insert emergency access logs"` (`with check ( true )`) ensures emergency responders can log scan events anonymously.
     - Policy `"Users can view access logs for their emergency tokens"` restricts access log viewing to token owners.

### 3.2 Query Resilience in DB Abstraction (`packages/db/supabase.ts` & `index.ts`)
- **UUID Type Safety**: In `supabase.ts`, helper functions check whether IDs match the 36-character UUID pattern (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`) before executing UUID-constrained queries. Non-UUID IDs (e.g., 24-character MongoDB ObjectIds or demo IDs) do not cause PostgreSQL syntax errors.
- **Fail-Open Memory Tiering**: Network failures from PostgREST/fetch (`TypeError: fetch failed`) are caught and logged as non-blocking fallbacks. Storage and lookups continue unimpeded via `emergencyTokenMemoryStore`.

---

## 4. Adversarial Findings & Observations

1. **Non-Blocking Network Errors Logged to Console**:
   - During offline execution, Supabase network errors (`TypeError: fetch failed`) are logged via `console.error`. This is the intended non-blocking behavior and does not impact API route execution or test suite success.
2. **Suite 2 in `test/adversarial-stress-r1-r4.ts`**:
   - Suite 2 currently halts at line 165 because `apps/web/app/api/emergency/[token]/route.ts` currently restricts tokens to 64-hex format. Per `PROJECT.md`, `app/api/emergency/[token]/route.ts` is in Milestone 2's scope (`worker_m2`). Milestone 1 scope (`packages/db/index.ts`, `packages/db/supabase.ts`, `packages/db/supabase.sql`, `lib/utils/url.ts`, `app/api/emergency/token/route.ts`, `components/dashboard/EmergencyQRBox.tsx`, `app/emergency/page.tsx`) passed 100% of all Suite 1 and Milestone 1 assertions.

---

## 5. Verdict

**APPROVE**  
The Milestone 1 implementation is resilient, empirically validated, conforms to all interface contracts and architectural requirements, handles network partition and faulty credentials gracefully, and exhibits zero regressions.
