# Empirical Adversarial Analysis: Milestone 1 Verification

**Agent**: `challenger_m1_1`  
**Role**: Code-Executing Empirical Challenger & Adversarial Verifier  
**Target Milestone**: Milestone 1 (Permanent Token Architecture, Supabase Migration Preparedness, URL Normalization)  
**Date**: 2026-09-20  
**Status**: **Defect Identified — REQUEST_CHANGES**

---

## Executive Summary

As an empirical code-executing challenger, we independently developed, executed, and verified comprehensive stress harnesses and adversarial test suites against the Milestone 1 deliverables.

### Test Execution Scorecard
| Suite | Scope | Executed Tests | Passed | Failed | Status |
|---|---|---|---|---|---|
| **Suite 1: Baseline Adversarial** | `apps/web/test/adversarial-stress-r1-r4.ts` (Suite 1) | 4 | 4 | 0 | **PASS** |
| **Suite 2: Baseline Regressions** | `npm test` (`profile-update`, `edge-cases`) | 10 | 10 | 0 | **PASS** |
| **Suite 3: Worker M1 Unit Suite** | `apps/web/test/milestone1.test.ts` | 8 | 8 | 0 | **PASS** |
| **Suite 4: Adversarial Stress Suite** | `apps/web/test/challenger-m1-adversarial.test.ts` | 25 | 24 | 1 | **1 DEFECT DETECTED** |

---

## 1. Suite 1 Execution: `adversarial-stress-r1-r4.ts`

**Command**: `npx tsx test/adversarial-stress-r1-r4.ts` in `d:/Prayas_hackathon-/apps/web`

### Results:
```text
--------------------------------------------------------------------------------
SUITE 1: Requirement R1 — Emergency URL Navigation & QRBox Component
--------------------------------------------------------------------------------
  ✓ [PASS] EmergencyQRBox component source verification (1ms)
  ✓ [PASS] URL normalization logic with diverse inputs (0ms)
  ✓ [PASS] Emergency root page (/emergency) redirect behavior (0ms)
  ✓ [PASS] Emergency responder view page (/emergency/[token]) exists (0ms)
```
- **Finding**: All 4 tests of Suite 1 pass cleanly.
- **Milestone Boundary Note**: Suite 2 (`Unauthenticated GET /api/emergency/emg-live-8921-xyz`) halts with HTTP 400 because `apps/web/app/api/emergency/[token]/route.ts` still enforces a 64-hex regex (`/^[a-f0-9]{64}$/`). Per `PROJECT.md`, `[token]/route.ts` is explicitly assigned to Milestone 2 (`worker_m2`).

---

## 2. Empirical Probing: `normalizeEmergencyUrl`

**Implementation Inspected**: `apps/web/components/dashboard/EmergencyQRBox.tsx:21-30`

### Empirical Test Vectors:
| Input Vector | Expected Output | Actual Output | Status |
|---|---|---|---|
| `null` | `"/emergency/emg-live-8921-xyz"` | `"/emergency/emg-live-8921-xyz"` | PASS |
| `undefined` | `"/emergency/emg-live-8921-xyz"` | `"/emergency/emg-live-8921-xyz"` | PASS |
| `""` (empty string) | `"/emergency/emg-live-8921-xyz"` | `"/emergency/emg-live-8921-xyz"` | PASS |
| `"   \t\n"` (whitespace) | `"/emergency/emg-live-8921-xyz"` | `"/emergency/emg-live-8921-xyz"` | PASS |
| `12345` (number) | `"/emergency/emg-live-8921-xyz"` | `"/emergency/emg-live-8921-xyz"` | PASS |
| `{}` / `[]` / `true` | `"/emergency/emg-live-8921-xyz"` | `"/emergency/emg-live-8921-xyz"` | PASS |
| `"/emergency/token/abc123"` | `"/emergency/abc123"` | `"/emergency/abc123"` | PASS |
| `"https://medilocker.vault/emergency/token/live-abc"` | `"https://medilocker.vault/emergency/live-abc"` | `"https://medilocker.vault/emergency/live-abc"` | PASS |
| `"/emergency/my-token"` (canonical) | `"/emergency/my-token"` | `"/emergency/my-token"` | PASS |
| `"/emergency/token/abc?ref=qr#vitals"` | `"/emergency/abc?ref=qr#vitals"` | `"/emergency/abc?ref=qr#vitals"` | PASS |
| `"/emergency/token/tok%20special+1"` | `"/emergency/tok%20special+1"` | `"/emergency/tok%20special+1"` | PASS |
| `"/emergency/token/part1/emergency/token/part2"` | `"/emergency/part1/emergency/part2"` | `"/emergency/part1/emergency/part2"` | PASS |

### Observations & Hardening Notes:
1. **Case-Sensitivity**: The regex `/\/emergency\/token\//g` is lowercase-only. If a URL contains mixed case like `/emergency/Token/xyz` or `/EMERGENCY/TOKEN/xyz`, it will not match. Adding the `/i` flag (`/\/emergency\/token\//gi`) is recommended for defensive hygiene.
2. **Empty Token Handling**: If the input is `/emergency/token/`, it normalizes to `/emergency/`. Since `app/emergency/page.tsx` contains a server redirect `redirect('/emergency/settings')`, clicking this link in the UI navigates cleanly to settings rather than resulting in a 404.

---

## 3. Empirical Probing: `resolveBaseUrl`

**Implementation Inspected**: `apps/web/lib/utils/url.ts:10-48`

### Empirical Test Vectors:
| Scenario | Mock Headers / Inputs | Expected Output | Actual Output | Status |
|---|---|---|---|---|
| Missing Request | `null` / `undefined` | Env fallback / `http://localhost:3000` | `http://localhost:3000` | PASS |
| Dev Standard Port | `host: "localhost:3000"` | `http://localhost:3000` | `http://localhost:3000` | PASS |
| Dev Custom Port | `host: "localhost:8080"` | `http://localhost:8080` | `http://localhost:8080` | PASS |
| Dev IPv4 Loopback | `host: "127.0.0.1:3000"` | `http://127.0.0.1:3000` | `http://127.0.0.1:3000` | PASS |
| Dev IPv6 Loopback | `host: "::1:3000"` | `http://::1:3000` | `http://::1:3000` | PASS |
| Private LAN (192.168.x) | `host: "192.168.1.100:3000"` | `http://192.168.1.100:3000` | `http://192.168.1.100:3000` | PASS |
| Private LAN (10.x) | `host: "10.0.0.5:8080"` | `http://10.0.0.5:8080` | `http://10.0.0.5:8080` | PASS |
| Production Domain | `host: "medilocker.vault"` | `https://medilocker.vault` | `https://medilocker.vault` | PASS |
| Production Subdomain | `host: "emergency.patient.medilocker.org"` | `https://emergency.patient.medilocker.org` | `https://emergency.patient.medilocker.org` | PASS |
| Multi-Hop `x-forwarded-host` | `"medilocker.app, proxy1.internal, proxy2.internal"` | `https://medilocker.app` | `https://medilocker.app` | PASS |
| Multi-Hop `x-forwarded-proto` | `"https, http"` | `https://medilocker.app` | `https://medilocker.app` | PASS |
| Explicit HTTP Override | `"x-forwarded-proto": "http"` | `http://test-server.org` | `http://test-server.org` | PASS |
| Trailing Slash Stripping | `host: "medilocker.app///"` | `https://medilocker.app` | `https://medilocker.app` | PASS |

### Observations & Hardening Notes:
1. **Scheme Casing**: If an upstream reverse proxy passes `x-forwarded-proto: "HTTPS"`, `resolveBaseUrl` produces `"HTTPS://..."` rather than standard `"https://"`. Calling `.toLowerCase()` on the extracted protocol is recommended.
2. **RFC 1918 Class B Subnets**: `url.ts` checks `host.startsWith('192.168.')` and `host.startsWith('10.')`, but does not explicitly check `172.16.` to `172.31.` (the default subnet range for Docker container networks).

---

## 4. Empirical Probing: Token Lifecycle, Permanence & Revocation

**Implementation Inspected**: `apps/web/packages/db/index.ts` & `apps/web/packages/db/supabase.sql`

### Validated Behaviors:
1. **Token Permanence**:
   - `createEmergencyToken` marks all tokens with `isPermanent: true` by default.
   - `supabase.sql` defines `is_permanent boolean default true not null` without an `expires_at` column.
   - Verified that after simulated long periods (365 days), tokens remain active and unevicted.
2. **Multi-Key Lookup Resilience**:
   - Tokens are retrievable by raw token string, SHA-256 hash, and ObjectId string.
3. **Manual Token Regeneration**:
   - Calling `regenerateToken(oldHash, newParams)` immediately sets `oldToken.revoked = true` while creating `newToken.revoked = false` and `newToken.isPermanent = true`.
   - `getActiveTokensForProfile` filters out revoked tokens and returns exclusively the new active permanent token.
4. **Cascading Regeneration**:
   - Verified across a 3-generation chain (Token 1 -> Token 2 -> Token 3): Tokens 1 and 2 remain permanently revoked, and Token 3 is active.
5. **Bulk & Explicit Revocation**:
   - `revokeToken(id)` successfully revokes individual tokens.
   - `revokeAllActiveTokensForProfile(profileId)` revokes all active tokens for a given profile in a single operation.

---

## 5. Confirmed Defect: In-Memory `accessCount` 3x Inflation Bug

### Defect Details:
- **Location**: `apps/web/packages/db/index.ts`, lines 590–601 (in `logTokenAccess`)
- **Severity**: **MEDIUM-HIGH** (corrupts audit statistics, inflates token access counts on the user dashboard by 300% on every scan)

### Root Cause Analysis:
1. When `createEmergencyToken` registers a new token in `emergencyTokenMemoryStore` (a JavaScript `Map<string, any>`), it stores the **exact same object reference** under three distinct keys:
   ```typescript
   // apps/web/packages/db/index.ts:300-305
   emergencyTokenMemoryStore.set(tokenHash, tokenRecord);
   emergencyTokenMemoryStore.set(id.toString(), tokenRecord);
   if (metadata?.token) {
     emergencyTokenMemoryStore.set(metadata.token, tokenRecord);
   }
   ```
2. When a scan occurs, `logTokenAccess` iterates through all values of `emergencyTokenMemoryStore`:
   ```typescript
   // apps/web/packages/db/index.ts:592-601
   for (const item of emergencyTokenMemoryStore.values()) {
     if (
       item.tokenHash === logEntry.tokenHash ||
       item.id === logEntry.tokenId ||
       item._id?.toString() === logEntry.tokenId
     ) {
       item.accessCount = (item.accessCount || 0) + 1;
       item.lastAccessedAt = new Date();
     }
   }
   ```
3. Because `emergencyTokenMemoryStore` contains 3 entries with the exact same `tokenRecord` reference, `emergencyTokenMemoryStore.values()` yields `tokenRecord` **3 times**.
4. In each of those 3 iterations, the condition (`item.tokenHash === logEntry.tokenHash`) evaluates to `true`.
5. Therefore, **`item.accessCount` is incremented 3 times per single scan event**.
6. Two scans result in `accessCount = 6`. Ten scans result in `accessCount = 30`.
*(Note: In `getActiveTokensForProfile` at lines 366-379, the worker properly used `seenIds = new Set<string>()` to deduplicate, but missed doing so in `logTokenAccess`.)*

### Empirical Proof (from `apps/web/test/challenger-m1-adversarial.test.ts`):
```text
  ✗ [FAIL] Defect Isolation > logTokenAccess aliasing defect test (empirical demonstration of 3x inflation) (7ms):
  DEFECT DETECTED: 1 access scan resulted in accessCount = 3 instead of 1 (inflated by factor of 3)
  due to iterating non-deduplicated Map.values() in packages/db/index.ts:592
```

### Actionable Mitigation for Worker:
In `apps/web/packages/db/index.ts`, replace the loop in `logTokenAccess` with either:

**Option A (Direct key lookup — optimal & fast)**:
```typescript
  // 1. In-memory
  inMemoryAccessLogs.push(logEntry);
  const item =
    emergencyTokenMemoryStore.get(logEntry.tokenHash) ||
    (logEntry.tokenId ? emergencyTokenMemoryStore.get(logEntry.tokenId) : null);
  if (item) {
    item.accessCount = (item.accessCount || 0) + 1;
    item.lastAccessedAt = new Date();
  }
```

**Option B (Deduplicated loop with Set)**:
```typescript
  // 1. In-memory
  inMemoryAccessLogs.push(logEntry);
  const seenItems = new Set<any>();
  for (const item of emergencyTokenMemoryStore.values()) {
    if (seenItems.has(item)) continue;
    seenItems.add(item);
    if (
      item.tokenHash === logEntry.tokenHash ||
      item.id === logEntry.tokenId ||
      item._id?.toString() === logEntry.tokenId
    ) {
      item.accessCount = (item.accessCount || 0) + 1;
      item.lastAccessedAt = new Date();
    }
  }
```

---

## 6. Verdict

**REQUEST_CHANGES**

Milestone 1 is functionally strong and well-architected across URL resolution, server-side redirection, and Supabase DDL schema. However, because `logTokenAccess` in `packages/db/index.ts` causes a 300% inflation of access counters due to Map aliasing, we request this defect be corrected before final milestone sign-off.
