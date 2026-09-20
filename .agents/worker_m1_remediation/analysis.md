# Remediation Analysis: Map Iteration Aliasing Bug in `logTokenAccess`

## 1. Defect Identification & Root Cause

### Context
In `apps/web/packages/db/index.ts`, `createEmergencyToken` registers the exact same token object reference under three separate keys in `emergencyTokenMemoryStore`:
```ts
emergencyTokenMemoryStore.set(tokenHash, tokenRecord);
emergencyTokenMemoryStore.set(id.toString(), tokenRecord);
if (metadata?.token) {
  emergencyTokenMemoryStore.set(metadata.token, tokenRecord);
}
```
This is intentional to facilitate rapid lookups by raw token, hash, or stringified ID.

### The Defect
When `logTokenAccess` was called:
```ts
// Flawed implementation in packages/db/index.ts:592
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
Because `emergencyTokenMemoryStore.values()` iterates over all values in the `Map`, and the same `tokenRecord` object is stored under 3 keys, the iterator yields `tokenRecord` 3 times.
In each iteration, `item` satisfies the conditional matching criteria. Consequently, `item.accessCount = (item.accessCount || 0) + 1` executed 3 times for a single scan, inflating `accessCount` by 300% (3 increments per 1 scan).

### Empirical Confirmation
The challenger adversarial suite `test/challenger-m1-adversarial.test.ts` (Suite 4: Defect Isolation) isolated this defect:
```
  ✗ [FAIL] Defect Isolation > logTokenAccess aliasing defect test (empirical demonstration of 3x inflation) (7ms): DEFECT DETECTED: 1 access scan resulted in accessCount = 3 instead of 1 (inflated by factor of 3) due to iterating non-deduplicated Map.values() in packages/db/index.ts:592
```

---

## 2. Remediation Implementation

We introduced an in-loop deduplication set (`seenIds = new Set<string>()`) in `logTokenAccess` to guarantee each distinct token object is processed exactly once per invocation:

```ts
  // 1. In-memory
  inMemoryAccessLogs.push(logEntry);
  const seenIds = new Set<string>();
  for (const item of emergencyTokenMemoryStore.values()) {
    const key = (item.id || item._id?.toString() || item.tokenId || item.tokenHash)?.toString();
    if (key) {
      if (seenIds.has(key)) continue;
      seenIds.add(key);
    }
    if (
      (logEntry.tokenHash && (item.tokenHash === logEntry.tokenHash || item.token === logEntry.tokenHash || item.metadata?.token === logEntry.tokenHash)) ||
      (logEntry.tokenId && (item.id === logEntry.tokenId || item._id?.toString() === logEntry.tokenId || item.tokenId === logEntry.tokenId))
    ) {
      item.accessCount = (item.accessCount || 0) + 1;
      item.lastAccessedAt = new Date().toISOString();
    }
  }
```

### Key Technical Safeguards:
1. **Deduplication by Unique Identifier**: We extract `item.id || item._id?.toString() || item.tokenId || item.tokenHash` and check `seenIds.has(key)`. Any duplicate object references registered under alternative keys (e.g., hash, raw token string, ID) are skipped.
2. **Guaranteed Single Increment**: `item.accessCount` increments by strictly 1 per `logTokenAccess` call.
3. **Standardized ISO Timestamp**: `item.lastAccessedAt` is set to `new Date().toISOString()`, maintaining consistency with Supabase timestamp formats.

---

## 3. Verification & Empirical Results

1. **Challenger Adversarial Test Suite (`npx tsx test/challenger-m1-adversarial.test.ts`)**:
   - Total Tests: 25
   - Passed: 25 (100%)
   - Failed: 0
   - **Suite 4: Defect Isolation**: `logTokenAccess aliasing defect test (empirical demonstration of 3x inflation)` **PASSED** cleanly in 8ms.

2. **Full Challenger Adversarial Suite (`npx tsx test/challenger-adversarial-m1.ts`)**:
   - Total Tests: 20
   - Passed: 20 (100%)
   - Failed: 0

3. **Adversarial Stress Suite (`npx tsx test/adversarial-stress-r1-r4.ts`)**:
   - Suite 1: Requirement R1 (Emergency URL Navigation & QRBox Component) — 4/4 Passed cleanly.

4. **Milestone 1 Verification Suite (`npx tsx test/milestone1.test.ts`)**:
   - 8/8 Tests Passed cleanly.
