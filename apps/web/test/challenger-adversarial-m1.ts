import assert from 'assert';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import {
  createEmergencyToken,
  findTokenByHash,
  revokeToken,
  regenerateToken,
  revokeAllActiveTokensForProfile,
  logTokenAccess,
  detectSuspiciousActivity,
  getActiveTokensForProfile,
  emergencyTokenMemoryStore,
  inMemoryAccessLogs,
} from '../packages/db';
import {
  createSupabaseEmergencyToken,
  getSupabaseEmergencyTokenByHash,
  revokeSupabaseEmergencyToken,
  logSupabaseEmergencyAccess,
  getSupabaseAdminClient,
} from '../packages/db/supabase';

interface AdversarialReport {
  total: number;
  passed: number;
  failed: number;
  details: { test: string; status: 'PASS' | 'FAIL'; error?: string; durationMs: number }[];
}

const report: AdversarialReport = {
  total: 0,
  passed: 0,
  failed: 0,
  details: [],
};

async function runTest(name: string, fn: () => Promise<void>) {
  report.total++;
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    report.passed++;
    report.details.push({ test: name, status: 'PASS', durationMs });
    console.log(`  ✓ [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    report.failed++;
    report.details.push({ test: name, status: 'FAIL', error: err.message, durationMs });
    console.error(`  ✗ [FAIL] ${name} (${durationMs}ms):`, err.message);
  }
}

async function main() {
  console.log('================================================================================');
  console.log('🛡️  CHALLENGER EMPIRICAL ADVERSARIAL HARNESS: MILESTONE 1');
  console.log('================================================================================\n');

  // ============================================================================
  // SECTION 1: Graceful Failure Under Disconnected / Malformed Backend Tiers
  // ============================================================================
  console.log('--------------------------------------------------------------------------------');
  console.log('SECTION 1: Disconnected / Mock / Faulty Credentials Resilience');
  console.log('--------------------------------------------------------------------------------');

  await runTest('1.1 Token creation when Supabase endpoint is unreachable', async () => {
    // Current environment has NEXT_PUBLIC_SUPABASE_URL='https://mock.supabase.co'
    // Ensure createEmergencyToken does not throw even if network fetch fails
    const rawToken = 'stress-unreachable-' + Date.now();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const profileId = 'prof-' + Date.now();

    const tokenId = await createEmergencyToken({
      profileId,
      tokenHash,
      label: 'Unreachable Supabase Test',
      metadata: { token: rawToken },
    });

    assert.ok(tokenId, 'Should return a valid ObjectId/TokenId');
    const found = await findTokenByHash(tokenHash);
    assert.ok(found, 'Should find newly created token in memory tier');
    assert.strictEqual(found.isPermanent, true, 'Must default to permanent');
    assert.strictEqual(found.revoked, false, 'Must be active');
  });

  await runTest('1.2 Supabase helper functions handle unreachable network without crashing', async () => {
    // Calling supabase.ts functions directly with unreachable endpoint
    const dummyHash = 'dummyhash' + Date.now();
    // createSupabaseEmergencyToken
    const resCreate = await createSupabaseEmergencyToken({
      profileId: 'mock-profile-id',
      tokenHash: dummyHash,
    });
    assert.strictEqual(resCreate, null, 'Should return null on network failure instead of throwing');

    // getSupabaseEmergencyTokenByHash
    const resGet = await getSupabaseEmergencyTokenByHash(dummyHash);
    assert.strictEqual(resGet, null, 'Should return null on network failure instead of throwing');

    // revokeSupabaseEmergencyToken
    const resRevoke = await revokeSupabaseEmergencyToken(dummyHash);
    assert.strictEqual(resRevoke, false, 'Should return false on network failure instead of throwing');

    // logSupabaseEmergencyAccess
    const resLog = await logSupabaseEmergencyAccess({ tokenHash: dummyHash });
    assert.strictEqual(resLog, false, 'Should return false on network failure instead of throwing');
  });

  await runTest('1.3 Lookup nonexistent token returns null without throwing', async () => {
    const nonexistentHash = 'nonexistent-hash-000000000000000000000000000000000000000000000000';
    const res = await findTokenByHash(nonexistentHash);
    assert.strictEqual(res, null, 'Nonexistent token must return null');
  });

  await runTest('1.4 Empty / null / undefined inputs to findTokenByHash return null safely', async () => {
    assert.strictEqual(await findTokenByHash(''), null);
    assert.strictEqual(await findTokenByHash(null as any), null);
    assert.strictEqual(await findTokenByHash(undefined as any), null);
  });

  // ============================================================================
  // SECTION 2: detectSuspiciousActivity Adversarial Stress
  // ============================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('SECTION 2: detectSuspiciousActivity Adversarial Stress & Edge Cases');
  console.log('--------------------------------------------------------------------------------');

  await runTest('2.1 Loopback IPv4 (127.0.0.1) immune to rate-limit lock regardless of flood', async () => {
    const testIp = '127.0.0.1';
    // Flood inMemoryAccessLogs with 500 requests
    for (let i = 0; i < 500; i++) {
      inMemoryAccessLogs.push({
        tokenHash: 'dummy',
        ip: testIp,
        userAgent: 'StressTester',
        scannedAt: new Date(),
      });
    }
    const isSuspicious = await detectSuspiciousActivity(testIp, 60, 15);
    assert.strictEqual(isSuspicious, false, '127.0.0.1 must NEVER be marked suspicious even with 500 requests');
  });

  await runTest('2.2 Loopback IPv6 (::1) immune to rate-limit lock', async () => {
    const testIp = '::1';
    for (let i = 0; i < 200; i++) {
      inMemoryAccessLogs.push({
        tokenHash: 'dummy',
        ip: testIp,
        userAgent: 'StressTester',
        scannedAt: new Date(),
      });
    }
    const isSuspicious = await detectSuspiciousActivity(testIp, 60, 15);
    assert.strictEqual(isSuspicious, false, '::1 must NEVER be marked suspicious');
  });

  await runTest('2.3 Localhost string and unknown string immune to rate-limit lock', async () => {
    for (const ip of ['localhost', 'unknown', '']) {
      for (let i = 0; i < 100; i++) {
        inMemoryAccessLogs.push({
          tokenHash: 'dummy',
          ip,
          userAgent: 'StressTester',
          scannedAt: new Date(),
        });
      }
      assert.strictEqual(await detectSuspiciousActivity(ip, 60, 15), false, `${ip} must not be flagged`);
    }
  });

  await runTest('2.4 detectSuspiciousActivity handles object parameter format { ip: "..." }', async () => {
    assert.strictEqual(await detectSuspiciousActivity({ ip: '127.0.0.1' } as any, 60, 15), false);
    assert.strictEqual(await detectSuspiciousActivity({ ip: 'localhost' } as any, 60, 15), false);
    assert.strictEqual(await detectSuspiciousActivity(null as any, 60, 15), false);
    assert.strictEqual(await detectSuspiciousActivity(undefined as any, 60, 15), false);
  });

  await runTest('2.5 External IP rate limiting boundary: <= 60 is NOT suspicious, > 60 IS suspicious', async () => {
    const testExtIp = '203.0.113.' + Math.floor(Math.random() * 200 + 10);
    // Push exactly 60 requests
    for (let i = 0; i < 60; i++) {
      inMemoryAccessLogs.push({
        tokenHash: 'ext-test',
        ip: testExtIp,
        userAgent: 'Ambulance-1',
        scannedAt: new Date(),
      });
    }
    const check60 = await detectSuspiciousActivity(testExtIp, 60, 15);
    assert.strictEqual(check60, false, 'Exactly 60 requests should NOT be suspicious (threshold > 60)');

    // Add 61st request
    inMemoryAccessLogs.push({
      tokenHash: 'ext-test',
      ip: testExtIp,
      userAgent: 'Ambulance-1',
      scannedAt: new Date(),
    });
    const check61 = await detectSuspiciousActivity(testExtIp, 60, 15);
    assert.strictEqual(check61, true, '61 requests MUST be flagged as suspicious');
  });

  await runTest('2.6 Time-window expiration: requests older than windowMinutes do not trigger flag', async () => {
    const testExpiredIp = '198.51.100.' + Math.floor(Math.random() * 200 + 10);
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
    // Push 100 requests from 20 mins ago (outside 15 min window)
    for (let i = 0; i < 100; i++) {
      inMemoryAccessLogs.push({
        tokenHash: 'old-test',
        ip: testExpiredIp,
        userAgent: 'Ambulance-Old',
        scannedAt: twentyMinsAgo,
      });
    }
    const checkExpired = await detectSuspiciousActivity(testExpiredIp, 60, 15);
    assert.strictEqual(checkExpired, false, 'Expired requests outside window must not trigger flag');

    // Add 10 fresh requests
    for (let i = 0; i < 10; i++) {
      inMemoryAccessLogs.push({
        tokenHash: 'fresh-test',
        ip: testExpiredIp,
        userAgent: 'Ambulance-Fresh',
        scannedAt: new Date(),
      });
    }
    const checkFresh = await detectSuspiciousActivity(testExpiredIp, 60, 15);
    assert.strictEqual(checkFresh, false, '10 fresh requests + 100 expired must NOT trigger flag');
  });

  await runTest('2.7 IP Isolation: separate external IPs do not cross-contaminate counters', async () => {
    const ipA = '192.0.2.10';
    const ipB = '192.0.2.20';
    // 50 requests for ipA, 50 requests for ipB (total 100, but neither exceeds 60)
    for (let i = 0; i < 50; i++) {
      inMemoryAccessLogs.push({ tokenHash: 'h', ip: ipA, scannedAt: new Date() });
      inMemoryAccessLogs.push({ tokenHash: 'h', ip: ipB, scannedAt: new Date() });
    }
    assert.strictEqual(await detectSuspiciousActivity(ipA, 60, 15), false, 'ipA (50 reqs) must not be flagged');
    assert.strictEqual(await detectSuspiciousActivity(ipB, 60, 15), false, 'ipB (50 reqs) must not be flagged');
  });

  // ============================================================================
  // SECTION 3: Token Permanence, Regeneration, and Revocation Integrity
  // ============================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('SECTION 3: Token Permanence & Revocation Integrity');
  console.log('--------------------------------------------------------------------------------');

  await runTest('3.1 Token remains active and permanent across multiple scans', async () => {
    const rawToken = 'perm-scan-' + Date.now();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const profileId = 'prof-perm-' + Date.now();

    const tokenId = await createEmergencyToken({
      profileId,
      tokenHash,
      metadata: { token: rawToken },
    });

    // Simulate 25 emergency scans
    for (let i = 0; i < 25; i++) {
      await logTokenAccess(tokenHash, '10.0.0.' + i, 'Scanner/' + i);
    }

    const tokenDoc = await findTokenByHash(tokenHash);
    assert.ok(tokenDoc, 'Token must still exist');
    assert.strictEqual(tokenDoc.isPermanent, true, 'Token must remain permanent');
    assert.strictEqual(tokenDoc.revoked, false, 'Token must remain active');
    assert.strictEqual(tokenDoc.accessCount >= 25, true, 'accessCount must be updated');
    assert.ok(tokenDoc.lastAccessedAt, 'lastAccessedAt must be set');
  });

  await runTest('3.2 Revoked token remains findable by hash with revoked: true (for 403 response)', async () => {
    const rawToken = 'revoked-check-' + Date.now();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await createEmergencyToken({
      profileId: 'rev-prof-1',
      tokenHash,
      metadata: { token: rawToken },
    });

    await revokeToken(tokenHash);
    const tokenDoc = await findTokenByHash(tokenHash);
    assert.ok(tokenDoc, 'Revoked token MUST still be retrievable so route can identify it as revoked!');
    assert.strictEqual(tokenDoc.revoked, true, 'Token must have revoked: true');
  });

  await runTest('3.3 Token regeneration revokes old and activates new permanent token', async () => {
    const oldRaw = 'old-tok-' + Date.now();
    const oldHash = crypto.createHash('sha256').update(oldRaw).digest('hex');
    const newRaw = 'new-tok-' + Date.now();
    const newHash = crypto.createHash('sha256').update(newRaw).digest('hex');
    const profileId = 'regen-prof-' + Date.now();

    await createEmergencyToken({
      profileId,
      tokenHash: oldHash,
      metadata: { token: oldRaw },
    });

    await regenerateToken(oldHash, {
      profileId,
      tokenHash: newHash,
      label: 'Regenerated Token Test',
      metadata: { token: newRaw },
    });

    const oldDoc = await findTokenByHash(oldHash);
    assert.strictEqual(oldDoc.revoked, true, 'Old token must be marked revoked');

    const newDoc = await findTokenByHash(newHash);
    assert.strictEqual(newDoc.revoked, false, 'New token must be active');
    assert.strictEqual(newDoc.isPermanent, true, 'New token must be permanent');
    assert.strictEqual(newDoc.metadata.regeneratedFrom, oldHash, 'Must reference old token hash');

    // getActiveTokensForProfile should only return new token
    const activeTokens = await getActiveTokensForProfile(profileId);
    assert.strictEqual(activeTokens.length, 1, 'Only 1 active token should exist for profile');
    assert.strictEqual(activeTokens[0].tokenHash, newHash, 'Active token must be the new token');
  });

  await runTest('3.4 Revoke by tokenId (ObjectId string) as well as tokenHash', async () => {
    const raw = 'id-rev-' + Date.now();
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const tokenId = await createEmergencyToken({
      profileId: 'id-rev-prof',
      tokenHash: hash,
      metadata: { token: raw },
    });

    // Revoke using the returned ObjectId string
    const ok = await revokeToken(tokenId.toString());
    assert.strictEqual(ok, true, 'revokeToken by ID string should succeed');

    const doc = await findTokenByHash(hash);
    assert.strictEqual(doc.revoked, true, 'Token must be revoked when targeted by ID string');
  });

  await runTest('3.5 Revoke by raw token in metadata.token', async () => {
    const raw = 'raw-rev-' + Date.now();
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    await createEmergencyToken({
      profileId: 'raw-rev-prof',
      tokenHash: hash,
      metadata: { token: raw },
    });

    // Revoke using the raw token string
    const ok = await revokeToken(raw);
    assert.strictEqual(ok, true, 'revokeToken by raw token string should succeed');

    const doc = await findTokenByHash(hash);
    assert.strictEqual(doc.revoked, true, 'Token must be revoked when targeted by raw token');
  });

  // ============================================================================
  // SECTION 4: High-Concurrency & Edge-Case Stress
  // ============================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('SECTION 4: Concurrency & Pathological Inputs');
  console.log('--------------------------------------------------------------------------------');

  await runTest('4.1 Concurrent creation of 100 tokens simultaneously', async () => {
    const promises: Promise<any>[] = [];
    const hashes: string[] = [];
    const sharedProfileId = 'concurrent-profile-' + Date.now();

    for (let i = 0; i < 100; i++) {
      const h = crypto.createHash('sha256').update(`concurrent-${i}-${Date.now()}`).digest('hex');
      hashes.push(h);
      promises.push(
        createEmergencyToken({
          profileId: sharedProfileId,
          tokenHash: h,
          label: `Concurrent Token ${i}`,
        })
      );
    }

    await Promise.all(promises);

    // Verify all 100 tokens exist and are active
    for (const h of hashes) {
      const doc = await findTokenByHash(h);
      assert.ok(doc, `Token ${h} must exist`);
      assert.strictEqual(doc.isPermanent, true);
      assert.strictEqual(doc.revoked, false);
    }

    const activeList = await getActiveTokensForProfile(sharedProfileId);
    assert.strictEqual(activeList.length, 100, 'All 100 tokens must be present in getActiveTokensForProfile');
  });

  await runTest('4.2 Bulk revocation of 100 active tokens simultaneously', async () => {
    const bulkProfileId = 'bulk-rev-profile-' + Date.now();
    const promises: Promise<any>[] = [];
    for (let i = 0; i < 50; i++) {
      const h = crypto.createHash('sha256').update(`bulk-${i}-${Date.now()}`).digest('hex');
      promises.push(
        createEmergencyToken({
          profileId: bulkProfileId,
          tokenHash: h,
        })
      );
    }
    await Promise.all(promises);

    const before = await getActiveTokensForProfile(bulkProfileId);
    assert.strictEqual(before.length, 50, 'Must have 50 active tokens initially');

    await revokeAllActiveTokensForProfile(bulkProfileId);
    const after = await getActiveTokensForProfile(bulkProfileId);
    assert.strictEqual(after.length, 0, 'Must have 0 active tokens after revokeAllActiveTokensForProfile');
  });

  await runTest('4.3 Pathological profileId strings (SQL injection / non-UUID / special chars)', async () => {
    const attackStrings = [
      "'; DROP TABLE emergency_tokens; --",
      '<script>alert(1)</script>',
      '../../etc/passwd',
      'non-uuid-string-with-spaces and symbols !@#$%^&*()',
      '66f001122334455667788990', // Mongo ObjectId
      'a'.repeat(1000), // Very long string
    ];

    for (const attackStr of attackStrings) {
      const h = crypto.createHash('sha256').update(attackStr).digest('hex');
      // Token creation must not throw
      const tokenId = await createEmergencyToken({
        profileId: attackStr,
        tokenHash: h,
      });
      assert.ok(tokenId);

      // getActiveTokensForProfile must not throw
      const active = await getActiveTokensForProfile(attackStr);
      assert.ok(Array.isArray(active));

      // revokeAllActiveTokensForProfile must not throw
      const revOk = await revokeAllActiveTokensForProfile(attackStr);
      assert.strictEqual(revOk, true);
    }
  });

  // ============================================================================
  // SECTION 5: Pre-seeded Demo Tokens Verification
  // ============================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log('SECTION 5: Pre-seeded Standard Demo Tokens');
  console.log('--------------------------------------------------------------------------------');

  await runTest('5.1 All standard demo tokens resolve by hash and by raw token string', async () => {
    const demoTokens = [
      'emg-live-8921-xyz',
      'dry-run-token-abc123',
      'emg-live-token',
      'dry-run',
      'emg-live-custom-responder-99',
    ];

    for (const tok of demoTokens) {
      const hash = crypto.createHash('sha256').update(tok).digest('hex');
      // Lookup by hash
      const docByHash = await findTokenByHash(hash);
      assert.ok(docByHash, `Demo token ${tok} must resolve by SHA-256 hash`);
      assert.strictEqual(docByHash.isPermanent, true);
      assert.strictEqual(docByHash.revoked, false);

      // Lookup by raw token string
      const docByRaw = await findTokenByHash(tok);
      assert.ok(docByRaw, `Demo token ${tok} must resolve by raw token string`);
      assert.strictEqual(docByRaw.isPermanent, true);
      assert.strictEqual(docByRaw.revoked, false);
    }
  });

  // ============================================================================
  // FINAL SUMMARY
  // ============================================================================
  console.log('\n================================================================================');
  console.log(`📊 ADVERSARIAL STRESS RESULTS: Total: ${report.total} | Passed: ${report.passed} | Failed: ${report.failed}`);
  console.log('================================================================================\n');

  if (report.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal crash in adversarial test suite:', err);
  process.exit(1);
});
