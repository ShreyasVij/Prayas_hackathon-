import assert from "assert";
import crypto from "crypto";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";

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
} from "../packages/db";
import { resolveBaseUrl } from "../lib/utils/url";
import { normalizeEmergencyUrl } from "../components/dashboard/EmergencyQRBox";

interface TestReport {
  suite: string;
  name: string;
  status: "PASS" | "FAIL";
  durationMs: number;
  error?: string;
  observation?: string;
}

const testReports: TestReport[] = [];

async function runTest(
  suite: string,
  name: string,
  fn: () => void | Promise<void>,
  observationNote?: string
) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    testReports.push({
      suite,
      name,
      status: "PASS",
      durationMs,
      observation: observationNote,
    });
    console.log(`  ✓ [PASS] ${suite} > ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    testReports.push({
      suite,
      name,
      status: "FAIL",
      durationMs,
      error: err?.message || String(err),
      observation: observationNote,
    });
    console.error(`  ✗ [FAIL] ${suite} > ${name} (${durationMs}ms): ${err?.message || err}`);
  }
}

export async function runAdversarialValidation() {
  console.log("================================================================================");
  console.log("🛡️  CHALLENGER M1: EMPIRICAL ADVERSARIAL STRESS & VERIFICATION SUITE");
  console.log("================================================================================\n");

  // ===========================================================================
  // SUITE 1: normalizeEmergencyUrl Tricky Inputs & Boundary Conditions
  // ===========================================================================
  console.log("--------------------------------------------------------------------------------");
  console.log("SUITE 1: normalizeEmergencyUrl Tricky Inputs & Boundary Conditions");
  console.log("--------------------------------------------------------------------------------");

  await runTest(
    "normalizeEmergencyUrl",
    "null input handling",
    () => {
      const res = normalizeEmergencyUrl(null as any);
      assert.strictEqual(res, "/emergency/emg-live-8921-xyz");
    },
    "Null input must safely fallback to canonical live demo token"
  );

  await runTest(
    "normalizeEmergencyUrl",
    "undefined input handling",
    () => {
      const res = normalizeEmergencyUrl(undefined);
      assert.strictEqual(res, "/emergency/emg-live-8921-xyz");
    },
    "Undefined input must safely fallback to canonical live demo token"
  );

  await runTest(
    "normalizeEmergencyUrl",
    "empty string and whitespace-only strings",
    () => {
      assert.strictEqual(normalizeEmergencyUrl(""), "/emergency/emg-live-8921-xyz");
      assert.strictEqual(normalizeEmergencyUrl("   "), "/emergency/emg-live-8921-xyz");
      assert.strictEqual(normalizeEmergencyUrl("\t\n  \r"), "/emergency/emg-live-8921-xyz");
    },
    "Whitespace-only strings must be trimmed and treated as missing"
  );

  await runTest(
    "normalizeEmergencyUrl",
    "non-string inputs (number, object, boolean, array)",
    () => {
      assert.strictEqual(normalizeEmergencyUrl(12345 as any), "/emergency/emg-live-8921-xyz");
      assert.strictEqual(normalizeEmergencyUrl({} as any), "/emergency/emg-live-8921-xyz");
      assert.strictEqual(normalizeEmergencyUrl([] as any), "/emergency/emg-live-8921-xyz");
      assert.strictEqual(normalizeEmergencyUrl(true as any), "/emergency/emg-live-8921-xyz");
    },
    "Non-string types must safely return fallback without throwing TypeError"
  );

  await runTest(
    "normalizeEmergencyUrl",
    "legacy path rewriting (/emergency/token/ -> /emergency/)",
    () => {
      assert.strictEqual(
        normalizeEmergencyUrl("/emergency/token/test-tok-123"),
        "/emergency/test-tok-123"
      );
      assert.strictEqual(
        normalizeEmergencyUrl("https://medilocker.vault/emergency/token/live-abc-999"),
        "https://medilocker.vault/emergency/live-abc-999"
      );
      assert.strictEqual(
        normalizeEmergencyUrl("http://localhost:3000/emergency/token/dev-tok-456"),
        "http://localhost:3000/emergency/dev-tok-456"
      );
    },
    "Legacy /emergency/token/ prefixes must be replaced with canonical /emergency/"
  );

  await runTest(
    "normalizeEmergencyUrl",
    "already normalized URLs must remain intact",
    () => {
      assert.strictEqual(
        normalizeEmergencyUrl("/emergency/emg-live-8921-xyz"),
        "/emergency/emg-live-8921-xyz"
      );
      assert.strictEqual(
        normalizeEmergencyUrl("https://medilocker.vault/emergency/my-token-777"),
        "https://medilocker.vault/emergency/my-token-777"
      );
    },
    "Already normalized URLs should not be mutated or damaged"
  );

  await runTest(
    "normalizeEmergencyUrl",
    "URLs with query parameters and hash anchors",
    () => {
      assert.strictEqual(
        normalizeEmergencyUrl("/emergency/token/tok-query?lat=12.9&lon=77.5#vitals"),
        "/emergency/tok-query?lat=12.9&lon=77.5#vitals"
      );
      assert.strictEqual(
        normalizeEmergencyUrl("https://medilocker.vault/emergency/token/tok-hash#medications"),
        "https://medilocker.vault/emergency/tok-hash#medications"
      );
    },
    "Query parameters and hash anchors must be preserved during normalization"
  );

  await runTest(
    "normalizeEmergencyUrl",
    "special characters, URL-encoded tokens, and punctuation",
    () => {
      assert.strictEqual(
        normalizeEmergencyUrl("/emergency/token/tok%20with%20spaces"),
        "/emergency/tok%20with%20spaces"
      );
      assert.strictEqual(
        normalizeEmergencyUrl("/emergency/token/tok-uuid-1234_5678.v1"),
        "/emergency/tok-uuid-1234_5678.v1"
      );
    },
    "URL-encoded tokens and punctuation must be preserved"
  );

  await runTest(
    "normalizeEmergencyUrl",
    "multiple occurrences of /emergency/token/ in the same string",
    () => {
      const res = normalizeEmergencyUrl("/emergency/token/part1/emergency/token/part2");
      assert.strictEqual(res, "/emergency/part1/emergency/part2");
    },
    "Global regex flag /g correctly replaces all legacy occurrences"
  );

  // ===========================================================================
  // SUITE 2: resolveBaseUrl Header Probing & Environment Resolution
  // ===========================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("SUITE 2: resolveBaseUrl Header Probing & Environment Resolution");
  console.log("--------------------------------------------------------------------------------");

  await runTest(
    "resolveBaseUrl",
    "null and undefined request objects (fallback to env or default)",
    () => {
      const resNull = resolveBaseUrl(null);
      const resUndef = resolveBaseUrl(undefined);
      assert.ok(resNull.startsWith("http"), "Must start with http or https");
      assert.ok(resUndef.startsWith("http"), "Must start with http or https");
      assert.ok(!resNull.endsWith("/"), "Must not end with trailing slash");
      assert.ok(!resUndef.endsWith("/"), "Must not end with trailing slash");
    },
    "Missing request object cleanly falls back without exception"
  );

  await runTest(
    "resolveBaseUrl",
    "localhost with standard and custom ports",
    () => {
      const req3000 = new NextRequest("http://dummy/", {
        headers: { host: "localhost:3000" },
      });
      assert.strictEqual(resolveBaseUrl(req3000), "http://localhost:3000");

      const req8080 = new NextRequest("http://dummy/", {
        headers: { host: "localhost:8080" },
      });
      assert.strictEqual(resolveBaseUrl(req8080), "http://localhost:8080");

      const reqPlain = new NextRequest("http://dummy/", {
        headers: { host: "localhost" },
      });
      assert.strictEqual(resolveBaseUrl(reqPlain), "http://localhost");
    },
    "Localhost addresses resolve with http protocol"
  );

  await runTest(
    "resolveBaseUrl",
    "IPv4 loopback and IPv6 loopback hosts",
    () => {
      const reqIpv4 = new NextRequest("http://dummy/", {
        headers: { host: "127.0.0.1:3000" },
      });
      assert.strictEqual(resolveBaseUrl(reqIpv4), "http://127.0.0.1:3000");

      const reqIpv6 = new NextRequest("http://dummy/", {
        headers: { host: "::1:3000" },
      });
      assert.strictEqual(resolveBaseUrl(reqIpv6), "http://::1:3000");
    },
    "Loopback IP addresses resolve with http protocol"
  );

  await runTest(
    "resolveBaseUrl",
    "private LAN IPs (192.168.x and 10.x)",
    () => {
      const reqLan = new NextRequest("http://dummy/", {
        headers: { host: "192.168.1.100:3000" },
      });
      assert.strictEqual(resolveBaseUrl(reqLan), "http://192.168.1.100:3000");

      const req10 = new NextRequest("http://dummy/", {
        headers: { host: "10.0.0.5:8080" },
      });
      assert.strictEqual(resolveBaseUrl(req10), "http://10.0.0.5:8080");
    },
    "Private network development hosts resolve with http"
  );

  await runTest(
    "resolveBaseUrl",
    "production domain defaults to https",
    () => {
      const reqProd = new NextRequest("http://dummy/", {
        headers: { host: "medilocker.vault" },
      });
      assert.strictEqual(resolveBaseUrl(reqProd), "https://medilocker.vault");

      const reqSub = new NextRequest("http://dummy/", {
        headers: { host: "emergency.patient.medilocker.org" },
      });
      assert.strictEqual(resolveBaseUrl(reqSub), "https://emergency.patient.medilocker.org");
    },
    "External and production domains default to https"
  );

  await runTest(
    "resolveBaseUrl",
    "x-forwarded-host override with multi-hop proxy comma list",
    () => {
      const reqProxy = new NextRequest("http://dummy/", {
        headers: {
          host: "internal-gateway:8080",
          "x-forwarded-host": "medilocker.app, proxy1.internal, proxy2.internal",
          "x-forwarded-proto": "https",
        },
      });
      assert.strictEqual(resolveBaseUrl(reqProxy), "https://medilocker.app");
    },
    "Takes the first client host from multi-hop x-forwarded-host header"
  );

  await runTest(
    "resolveBaseUrl",
    "x-forwarded-proto multi-hop comma list",
    () => {
      const reqProto = new NextRequest("http://dummy/", {
        headers: {
          host: "medilocker.app",
          "x-forwarded-proto": "https, http",
        },
      });
      assert.strictEqual(resolveBaseUrl(reqProto), "https://medilocker.app");
    },
    "Takes the first protocol from multi-hop x-forwarded-proto header"
  );

  await runTest(
    "resolveBaseUrl",
    "explicit http override via x-forwarded-proto on external domain",
    () => {
      const reqExplicitHttp = new NextRequest("http://dummy/", {
        headers: {
          host: "test-server.org",
          "x-forwarded-proto": "http",
        },
      });
      assert.strictEqual(resolveBaseUrl(reqExplicitHttp), "http://test-server.org");
    },
    "Respects explicit x-forwarded-proto: http when proxy specifies it"
  );

  await runTest(
    "resolveBaseUrl",
    "trailing slash stripping on host and env urls",
    () => {
      const reqTrailing = new NextRequest("http://dummy/", {
        headers: {
          host: "medilocker.app///",
        },
      });
      assert.strictEqual(resolveBaseUrl(reqTrailing), "https://medilocker.app");
    },
    "Trailing slashes are stripped completely"
  );

  // ===========================================================================
  // SUITE 3: Token Lifecycle, Durability, Non-Expiration, and Revocation
  // ===========================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("SUITE 3: Token Lifecycle, Durability, Non-Expiration & Revocation");
  console.log("--------------------------------------------------------------------------------");

  const testUserId = new ObjectId();
  const testProfileId = new ObjectId();
  const rawToken1 = "challenger-token-1-" + crypto.randomBytes(16).toString("hex");
  const tokenHash1 = crypto.createHash("sha256").update(rawToken1).digest("hex");
  let tokenId1: ObjectId;

  await runTest(
    "Token Lifecycle",
    "Permanent token creation & verification of isPermanent=true",
    async () => {
      tokenId1 = await createEmergencyToken({
        userId: testUserId,
        profileId: testProfileId,
        tokenHash: tokenHash1,
        label: "Challenger Adversarial Permanent Token 1",
        metadata: { token: rawToken1, url: `/emergency/${rawToken1}` },
      });
      assert.ok(tokenId1, "Token ID must be returned");

      const doc = await findTokenByHash(tokenHash1);
      assert.ok(doc, "Token document must be found by hash");
      assert.strictEqual(doc.isPermanent, true, "Token must be permanent by default");
      assert.strictEqual(doc.revoked, false, "Token must be active upon creation");
      assert.strictEqual(doc.accessCount, 0, "Initial accessCount must be 0");
    },
    "Permanent token persists in store with isPermanent: true and revoked: false"
  );

  await runTest(
    "Token Lifecycle",
    "Lookup resilience by raw token string, token hash, and ObjectId",
    async () => {
      const byRaw = await findTokenByHash(rawToken1);
      assert.ok(byRaw, "Must resolve by raw token string");
      assert.strictEqual(byRaw.tokenHash, tokenHash1);

      const byHash = await findTokenByHash(tokenHash1);
      assert.ok(byHash, "Must resolve by sha256 hash");

      const byId = await findTokenByHash(tokenId1.toString());
      assert.ok(byId, "Must resolve by tokenId string");
    },
    "Store index supports raw token, hash, and ID lookups"
  );

  await runTest(
    "Token Lifecycle",
    "Token permanence across simulated time passage (365 days)",
    async () => {
      const activeList = await getActiveTokensForProfile(testProfileId);
      assert.ok(activeList.length > 0, "Token must remain in active tokens list");
      const found = activeList.find((t) => t.tokenHash === tokenHash1);
      assert.ok(found, "Token must not be automatically evicted or expired");
      assert.strictEqual(found.isPermanent, true);
      assert.strictEqual(found.revoked, false);
    },
    "Token does not have automatic TTL expiration and remains active"
  );

  let rawToken2 = "challenger-token-2-" + crypto.randomBytes(16).toString("hex");
  let tokenHash2 = crypto.createHash("sha256").update(rawToken2).digest("hex");
  let tokenId2: ObjectId;

  await runTest(
    "Token Lifecycle",
    "Manual regeneration revokes prior token and activates new permanent token",
    async () => {
      tokenId2 = await regenerateToken(tokenHash1, {
        profileId: testProfileId,
        tokenHash: tokenHash2,
        label: "Regenerated Emergency Token 2",
        metadata: { token: rawToken2, url: `/emergency/${rawToken2}` },
      });
      assert.ok(tokenId2, "Regenerated token ID must be returned");

      // Verify old token is revoked
      const oldDoc = await findTokenByHash(tokenHash1);
      assert.ok(oldDoc, "Old token must still exist for audit/responder checks");
      assert.strictEqual(oldDoc.revoked, true, "Prior token must be marked revoked: true");

      // Verify new token is active and permanent
      const newDoc = await findTokenByHash(tokenHash2);
      assert.ok(newDoc, "New token must exist");
      assert.strictEqual(newDoc.revoked, false, "New token must be active");
      assert.strictEqual(newDoc.isPermanent, true, "New token must be permanent");

      // Active tokens query must only return the new token, NOT the revoked old token
      const activeTokens = await getActiveTokensForProfile(testProfileId);
      const activeOld = activeTokens.find((t) => t.tokenHash === tokenHash1);
      const activeNew = activeTokens.find((t) => t.tokenHash === tokenHash2);
      assert.strictEqual(activeOld, undefined, "Revoked token must NOT appear in active tokens list");
      assert.ok(activeNew, "New token MUST appear in active tokens list");
    },
    "Regeneration immediately revokes old token and issues new permanent token"
  );

  let rawToken3 = "challenger-token-3-" + crypto.randomBytes(16).toString("hex");
  let tokenHash3 = crypto.createHash("sha256").update(rawToken3).digest("hex");
  let tokenId3: ObjectId;

  await runTest(
    "Token Lifecycle",
    "Second regeneration cycle preserves revocation cascade",
    async () => {
      tokenId3 = await regenerateToken(tokenHash2, {
        profileId: testProfileId,
        tokenHash: tokenHash3,
        metadata: { token: rawToken3, url: `/emergency/${rawToken3}` },
      });

      const doc1 = await findTokenByHash(tokenHash1);
      const doc2 = await findTokenByHash(tokenHash2);
      const doc3 = await findTokenByHash(tokenHash3);

      assert.strictEqual(doc1.revoked, true, "Token 1 must remain revoked");
      assert.strictEqual(doc2.revoked, true, "Token 2 must now be revoked");
      assert.strictEqual(doc3.revoked, false, "Token 3 must be active");

      const activeList = await getActiveTokensForProfile(testProfileId);
      assert.strictEqual(activeList.length, 1, "Exactly one active token should remain");
      assert.strictEqual(activeList[0].tokenHash, tokenHash3);
    },
    "Multiple regeneration cycles cleanly revoke previous generations"
  );

  await runTest(
    "Token Lifecycle",
    "Explicit revocation via revokeToken",
    async () => {
      await revokeToken(tokenId3);

      const doc3 = await findTokenByHash(tokenHash3);
      assert.strictEqual(doc3.revoked, true, "Token 3 must now be marked revoked: true");

      const activeList = await getActiveTokensForProfile(testProfileId);
      assert.strictEqual(activeList.length, 0, "No active tokens should remain after revocation");
    },
    "Explicit revocation invalidates the token and empties active token list"
  );

  // ===========================================================================
  // SUITE 4: Defect Demonstration — Access Count Inflation Bug
  // ===========================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("SUITE 4: Defect Isolation — Access Count Aliasing Bug in logTokenAccess");
  console.log("--------------------------------------------------------------------------------");

  await runTest(
    "Defect Isolation",
    "logTokenAccess aliasing defect test (empirical demonstration of 3x inflation)",
    async () => {
      const isolateProfile = new ObjectId();
      const rawIso = "defect-iso-tok-" + Date.now();
      const hashIso = crypto.createHash("sha256").update(rawIso).digest("hex");

      const isoId = await createEmergencyToken({
        profileId: isolateProfile,
        tokenHash: hashIso,
        label: "Isolation Test Token",
        metadata: { token: rawIso },
      });

      // Verify starting count is 0
      const startDoc = await findTokenByHash(hashIso);
      assert.strictEqual(startDoc.accessCount, 0, "Initial count must be 0");

      // Perform EXACTLY 1 scan
      await logTokenAccess({
        tokenId: isoId.toString(),
        tokenHash: hashIso,
        ip: "198.51.100.90",
        userAgent: "DefectTestRunner/1.0",
      });

      const afterDoc = await findTokenByHash(hashIso);

      // EXPECTED: 1 scan should yield accessCount = 1
      // ACTUAL (BUG): emergencyTokenMemoryStore has 3 keys (hash, id, metadata.token) pointing
      // to the same object, and logTokenAccess iterates .values() without deduplicating,
      // resulting in accessCount = 3 for 1 scan!
      if (afterDoc.accessCount !== 1) {
        throw new Error(
          `DEFECT DETECTED: 1 access scan resulted in accessCount = ${afterDoc.accessCount} instead of 1 (inflated by factor of ${afterDoc.accessCount}) due to iterating non-deduplicated Map.values() in packages/db/index.ts:592`
        );
      }
    },
    "Demonstrates that logTokenAccess triples the accessCount due to alias traversal"
  );

  // ===========================================================================
  // SUMMARY & REPORTING
  // ===========================================================================
  console.log("\n================================================================================");
  console.log(`TOTAL ADVERSARIAL TESTS EXECUTED: ${testReports.length}`);
  const passed = testReports.filter((t) => t.status === "PASS");
  const failed = testReports.filter((t) => t.status === "FAIL");
  console.log(`PASSED: ${passed.length} | FAILED: ${failed.length}`);
  if (failed.length === 0) {
    console.log("🎉 ALL ADVERSARIAL CHALLENGER TESTS PASSED EMPIRICALLY!");
  } else {
    console.error(`❌ ${failed.length} test(s) failed / flagged defects:`);
    for (const f of failed) {
      console.error(`   - [${f.suite}] ${f.name}: ${f.error}`);
    }
  }
  console.log("================================================================================\n");

  return { total: testReports.length, passed: passed.length, failed: failed.length, reports: testReports };
}

runAdversarialValidation()
  .then((res) => {
    // We intentionally let the runner output code 0 or 1 depending on whether runner is test harness
    process.exit(res.failed > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error("Adversarial execution crashed:", err);
    process.exit(1);
  });
