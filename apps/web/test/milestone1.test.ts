import assert from 'assert';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { NextRequest } from 'next/server';

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
} from '../packages/db';
import { resolveBaseUrl } from '../lib/utils/url';
import { normalizeEmergencyUrl } from '../components/dashboard/EmergencyQRBox';

async function runMilestone1Tests() {
  console.log('================================================================================');
  console.log('▶ MILESTONE 1 VERIFICATION TEST SUITE');
  console.log('================================================================================\n');

  // Test 1: resolveBaseUrl
  console.log('Test 1: Environment-Aware URL Resolution (resolveBaseUrl)...');
  const reqLocal = new NextRequest('http://127.0.0.1:3000/api/emergency/token', {
    headers: { host: 'localhost:3000' },
  });
  assert.strictEqual(resolveBaseUrl(reqLocal), 'http://localhost:3000');

  const reqForwarded = new NextRequest('http://dummy/api/emergency/token', {
    headers: {
      'x-forwarded-host': 'medilocker.health',
      'x-forwarded-proto': 'https',
    },
  });
  assert.strictEqual(resolveBaseUrl(reqForwarded), 'https://medilocker.health');

  const reqProdHost = new NextRequest('http://dummy/api/emergency/token', {
    headers: { host: 'app.medilocker.com' },
  });
  assert.strictEqual(resolveBaseUrl(reqProdHost), 'https://app.medilocker.com');

  assert.strictEqual(resolveBaseUrl(null).startsWith('http'), true);
  console.log('✓ Test 1 Passed: resolveBaseUrl correctly handles local dev, forwarded hosts, and production HTTPS.');

  // Test 2: normalizeEmergencyUrl
  console.log('\nTest 2: Emergency URL Normalization (normalizeEmergencyUrl)...');
  assert.strictEqual(normalizeEmergencyUrl(undefined), '/emergency/emg-live-8921-xyz');
  assert.strictEqual(normalizeEmergencyUrl(''), '/emergency/emg-live-8921-xyz');
  assert.strictEqual(normalizeEmergencyUrl('/emergency/token/test1234'), '/emergency/test1234');
  assert.strictEqual(
    normalizeEmergencyUrl('https://medilocker.app/emergency/token/live-abc'),
    'https://medilocker.app/emergency/live-abc'
  );
  console.log('✓ Test 2 Passed: normalizeEmergencyUrl rewrites legacy paths and defaults to fallback token.');

  // Test 3: Seeded Demo Tokens in Memory Store
  console.log('\nTest 3: Pre-seeded Demo Tokens in Multi-Tier Store...');
  const demoHash = crypto.createHash('sha256').update('emg-live-8921-xyz').digest('hex');
  const demoDoc = await findTokenByHash(demoHash);
  assert.ok(demoDoc, 'Demo token must resolve by hash');
  assert.strictEqual(demoDoc.isPermanent, true, 'Demo token must be permanent');
  assert.strictEqual(demoDoc.revoked, false, 'Demo token must be active');
  console.log('✓ Test 3 Passed: Seeded demo tokens are instantaneously retrievable and marked permanent.');

  // Test 4: Token Creation Lifecycle
  console.log('\nTest 4: Permanent Token Creation...');
  const testUserId = new ObjectId();
  const testProfileId = new ObjectId();
  const rawToken = 'test-token-m1-' + Date.now();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const tokenId = await createEmergencyToken({
    userId: testUserId,
    profileId: testProfileId,
    tokenHash,
    label: 'M1 Unit Test Token',
    metadata: { token: rawToken },
  });
  assert.ok(tokenId, 'createEmergencyToken must return token ID');

  const foundDoc = await findTokenByHash(tokenHash);
  assert.ok(foundDoc, 'Token must be retrievable by tokenHash');
  assert.strictEqual(foundDoc.isPermanent, true, 'Token must be permanent by default');
  assert.strictEqual(foundDoc.revoked, false, 'Token must be unrevoked by default');
  console.log('✓ Test 4 Passed: Permanent emergency token created and verified.');

  // Test 5: Token Revocation
  console.log('\nTest 5: Explicit Token Revocation...');
  await revokeToken(tokenId);
  const revokedDoc = await findTokenByHash(tokenHash);
  assert.ok(revokedDoc, 'Token must exist after revocation');
  assert.strictEqual(revokedDoc.revoked, true, 'Token must be marked revoked: true');
  console.log('✓ Test 5 Passed: Token marked as revoked.');

  // Test 6: Token Regeneration
  console.log('\nTest 6: Token Regeneration with Prior Token Revocation...');
  const rawTokenOld = 'test-regen-old-' + Date.now();
  const oldHash = crypto.createHash('sha256').update(rawTokenOld).digest('hex');
  const oldTokenId = await createEmergencyToken(testUserId, testProfileId, oldHash, true, { token: rawTokenOld });

  const rawTokenNew = 'test-regen-new-' + Date.now();
  const newHash = crypto.createHash('sha256').update(rawTokenNew).digest('hex');
  const newTokenId = await regenerateToken(oldHash, {
    tokenHash: newHash,
    profileId: testProfileId,
    metadata: { token: rawTokenNew },
  });

  const verifiedOld = await findTokenByHash(oldHash);
  assert.strictEqual(verifiedOld.revoked, true, 'Old token must be revoked upon regeneration');

  const verifiedNew = await findTokenByHash(newHash);
  assert.strictEqual(verifiedNew.revoked, false, 'New regenerated token must be active');
  assert.strictEqual(verifiedNew.isPermanent, true, 'New token must be permanent');
  console.log('✓ Test 6 Passed: Regeneration revokes old token and creates active permanent token.');

  // Test 7: Revoke All Active Tokens for Profile
  console.log('\nTest 7: Revoke All Active Tokens for Profile...');
  const batchProfileId = new ObjectId();
  const tok1Hash = crypto.createHash('sha256').update('batch1-' + Date.now()).digest('hex');
  const tok2Hash = crypto.createHash('sha256').update('batch2-' + Date.now()).digest('hex');
  await createEmergencyToken(testUserId, batchProfileId, tok1Hash, true);
  await createEmergencyToken(testUserId, batchProfileId, tok2Hash, true);

  const activeBefore = await getActiveTokensForProfile(batchProfileId);
  assert.strictEqual(activeBefore.length, 2, 'Must have 2 active tokens');

  await revokeAllActiveTokensForProfile(batchProfileId.toString());
  const activeAfter = await getActiveTokensForProfile(batchProfileId);
  assert.strictEqual(activeAfter.length, 0, 'Must have 0 active tokens after bulk revocation');
  console.log('✓ Test 7 Passed: Bulk revocation correctly revokes all active tokens for a profile.');

  // Test 8: Access Logging and Suspicious Activity Detection
  console.log('\nTest 8: Access Logging and Suspicious Activity...');
  await logTokenAccess({
    tokenId: tokenId.toString(),
    tokenHash,
    ip: '198.51.100.99',
    userAgent: 'EmergencyTest/1.0',
    location: 'Test Hospital',
  });

  // Loopback must never be flagged
  for (const ip of ['127.0.0.1', '::1', 'localhost']) {
    const susp = await detectSuspiciousActivity(ip, 60, 15);
    assert.strictEqual(susp, false, `Loopback IP ${ip} must never be suspicious`);
  }
  console.log('✓ Test 8 Passed: Access logging recorded and loopback false positive protection verified.');

  console.log('\n================================================================================');
  console.log('🎉 ALL MILESTONE 1 VERIFICATION TESTS PASSED CLEANLY!');
  console.log('================================================================================\n');
}

runMilestone1Tests().catch((err) => {
  console.error('Milestone 1 tests failed:', err);
  process.exit(1);
});
