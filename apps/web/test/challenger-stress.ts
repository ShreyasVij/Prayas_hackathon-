import assert from "assert";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { ObjectId } from "mongodb";
import { NextRequest } from "next/server";

// Load .env
try {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const [k, ...v] = line.split("=");
      if (k && v && !process.env[k.trim()]) {
        process.env[k.trim()] = v.join("=").trim();
      }
    }
  }
} catch {}

import {
  createEmergencyToken,
  findTokenByHash,
  revokeToken,
  detectSuspiciousActivity,
} from "../packages/db";

import { GET as emergencyTokenGetHandler } from "../app/api/emergency/[token]/route";

interface EmpiricalCheck {
  category: string;
  testCase: string;
  passed: boolean;
  status?: number;
  details?: string;
  durationMs: number;
}

const report: EmpiricalCheck[] = [];

async function runCheck(category: string, testCase: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    report.push({ category, testCase, passed: true, durationMs });
    console.log(`  [PASS] [${category}] ${testCase} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    report.push({ category, testCase, passed: false, durationMs, details: err.message });
    console.error(`  [FAIL] [${category}] ${testCase} (${durationMs}ms): ${err.message}`);
  }
}

async function main() {
  console.log("================================================================================");
  console.log("EMPIRICAL CHALLENGER ADVERSARIAL VERIFICATION HARNESS");
  console.log("Target: apps/web/app/api/emergency/[token]/route.ts");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // 1. Rate Limiting & Isolation Tests
  // ---------------------------------------------------------------------------
  console.log(">>> 1. Rate Limiting Burst & Headerless Isolation Testing");

  await runCheck("Rate Limiting", "60-burst IP limit enforcement and 61st rejection", async () => {
    const testIp = `198.18.0.${Math.floor(Math.random() * 200) + 10}`;
    const token = `burst-test-${Date.now()}`;

    // Requests 1 to 60 must not return 429
    for (let i = 1; i <= 60; i++) {
      const req = new NextRequest(`http://localhost:3000/api/emergency/${token}`, {
        headers: { "x-forwarded-for": testIp },
      });
      const res = await emergencyTokenGetHandler(req, {
        params: Promise.resolve({ token }),
      });
      assert.notStrictEqual(res.status, 429, `Request ${i} should not be rate-limited`);
    }

    // Request 61 must return 429
    const req61 = new NextRequest(`http://localhost:3000/api/emergency/${token}`, {
      headers: { "x-forwarded-for": testIp },
    });
    const res61 = await emergencyTokenGetHandler(req61, {
      params: Promise.resolve({ token }),
    });
    assert.strictEqual(res61.status, 429, `Request 61 must trigger HTTP 429`);
    const data = await res61.json();
    assert.strictEqual(data.locked, false, "429 must return locked: false");
    assert.strictEqual(data.error, "Rate limit exceeded. Please try again shortly.");
  });

  await runCheck("Rate Limiting", "Headerless (no IP) token isolation", async () => {
    const token1 = `hdrless-a-${Date.now()}`;
    const token2 = `hdrless-b-${Date.now()}`;

    // Exhaust token1
    for (let i = 1; i <= 60; i++) {
      const req = new NextRequest(`http://localhost:3000/api/emergency/${token1}`);
      const res = await emergencyTokenGetHandler(req, {
        params: Promise.resolve({ token: token1 }),
      });
      assert.notStrictEqual(res.status, 429, `Token 1 attempt ${i} within limit`);
    }

    // Attempt 61 on token1 should 429
    const req1_61 = new NextRequest(`http://localhost:3000/api/emergency/${token1}`);
    const res1_61 = await emergencyTokenGetHandler(req1_61, {
      params: Promise.resolve({ token: token1 }),
    });
    assert.strictEqual(res1_61.status, 429, "Token 1 request 61 should be 429");

    // Token 2 without headers should still be accessible (independent bucket token_token2)
    const req2 = new NextRequest(`http://localhost:3000/api/emergency/${token2}`);
    const res2 = await emergencyTokenGetHandler(req2, {
      params: Promise.resolve({ token: token2 }),
    });
    assert.notStrictEqual(res2.status, 429, "Token 2 must not be locked out by Token 1 headerless exhaustion");
    assert.strictEqual(res2.status, 404, "Token 2 returns 404 non-existent as expected");
  });

  await runCheck("Rate Limiting", "Loopback IP (127.0.0.1) token isolation", async () => {
    const token1 = `loopback-a-${Date.now()}`;
    const token2 = `loopback-b-${Date.now()}`;

    for (let i = 1; i <= 60; i++) {
      const req = new NextRequest(`http://localhost:3000/api/emergency/${token1}`, {
        headers: { "x-forwarded-for": "127.0.0.1" },
      });
      const res = await emergencyTokenGetHandler(req, {
        params: Promise.resolve({ token: token1 }),
      });
      assert.notStrictEqual(res.status, 429);
    }

    const req1_61 = new NextRequest(`http://localhost:3000/api/emergency/${token1}`, {
      headers: { "x-forwarded-for": "127.0.0.1" },
    });
    const res1_61 = await emergencyTokenGetHandler(req1_61, {
      params: Promise.resolve({ token: token1 }),
    });
    assert.strictEqual(res1_61.status, 429);

    // Loopback with different token must be isolated (loopback_token2)
    const req2 = new NextRequest(`http://localhost:3000/api/emergency/${token2}`, {
      headers: { "x-forwarded-for": "127.0.0.1" },
    });
    const res2 = await emergencyTokenGetHandler(req2, {
      params: Promise.resolve({ token: token2 }),
    });
    assert.notStrictEqual(res2.status, 429);
  });

  // ---------------------------------------------------------------------------
  // 2. Adversarial Injection & Boundary Payloads
  // ---------------------------------------------------------------------------
  console.log("\n>>> 2. Adversarial Injection, Traversal, and Buffer Overflow Testing");

  const injectionPayloads = [
    // SQLi payloads
    { name: "SQLi classic ' OR '1'='1", payload: "' OR '1'='1" },
    { name: "SQLi statement termination ; DROP TABLE", payload: "emg-live-1; DROP TABLE users;--" },
    { name: "SQLi union select", payload: "1' UNION SELECT * FROM users--" },
    { name: "SQLi admin auth bypass", payload: "admin'--" },
    // XSS payloads
    { name: "XSS script tag", payload: "<script>alert('xss')</script>" },
    { name: "XSS img onerror", payload: "<img src=x onerror=alert(1)>" },
    { name: "XSS javascript pseudo-protocol", payload: "javascript:alert(1)" },
    { name: "XSS SVG payload", payload: "<svg/onload=alert(1)>" },
    // Path Traversal payloads
    { name: "Path traversal ../../etc/passwd", payload: "../../etc/passwd" },
    { name: "Path traversal ..\\..\\windows\\win.ini", payload: "..\\..\\windows\\win.ini" },
    { name: "Path traversal encoded %2e%2e%2f", payload: "%2e%2e%2fetc%2fpasswd" },
    // Null byte / control characters
    { name: "Null byte literal \\0", payload: "token\0attack" },
    { name: "Null byte encoded %00", payload: "emg-live-%00-payload" },
    // Buffer overflow / length violations
    { name: "Length 129 chars (1 past 128 limit)", payload: "a".repeat(129) },
    { name: "Length 500 chars", payload: "b".repeat(500) },
    { name: "Length 5,000 chars", payload: "c".repeat(5000) },
    { name: "Length 65,536 chars (64KB buffer)", payload: "d".repeat(65536) },
    // Special symbols / non-allowed chars
    { name: "Special chars spaces and pipes", payload: "token | cat /etc/passwd" },
    { name: "Special chars braces and dollar", payload: "${7*7}" },
    { name: "Newline injection", payload: "token\nmalicious-header: evil" },
  ];

  for (const { name, payload } of injectionPayloads) {
    await runCheck("Adversarial Payloads", name, async () => {
      const clientIp = `198.19.0.${Math.floor(Math.random() * 200) + 10}`;
      const req = new NextRequest(`http://localhost:3000/api/emergency/${encodeURIComponent(payload)}`, {
        headers: { "x-forwarded-for": clientIp },
      });
      const res = await emergencyTokenGetHandler(req, {
        params: Promise.resolve({ token: payload }),
      });

      // Crucial: Must NEVER crash with 500. Must return 404 (safely rejected) or 429 if rate limited.
      assert.notStrictEqual(res.status, 500, `Payload '${name}' caused HTTP 500 internal server error crash!`);
      assert.strictEqual(res.status, 404, `Payload '${name}' should be rejected with 404, got ${res.status}`);
      const body = await res.json();
      assert.strictEqual(body.locked, false, "Rejected payload must have locked: false");
      assert.strictEqual(body.error, "Invalid or expired QR code");
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Token Status Codes: Demo vs Non-Existent vs Revoked
  // ---------------------------------------------------------------------------
  console.log("\n>>> 3. Token Status Code Differentiation & Payload Integrity Testing");

  // Demo tokens: 200 OK with full profiles and documents
  const demoTokens = [
    "emg-live-8921-xyz",
    "dry-run-token-abc123",
    "emg-live-token",
    "dry-run",
    "emg-live-custom-responder-99",
  ];

  for (const demoTok of demoTokens) {
    await runCheck("Status Code", `Demo token '${demoTok}' returns 200 with full contract`, async () => {
      const req = new NextRequest(`http://localhost:3000/api/emergency/${demoTok}`);
      const res = await emergencyTokenGetHandler(req, {
        params: Promise.resolve({ token: demoTok }),
      });

      assert.strictEqual(res.status, 200, `Demo token must return 200`);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.token, demoTok);
      assert.ok(body.accessTimestamp);

      // Verify profile
      const p = body.profile;
      assert.ok(p, "Profile must be present");
      assert.strictEqual(typeof p.displayName, "string");
      assert.strictEqual(typeof p.bloodGroup, "string");
      assert.ok(Array.isArray(p.allergies) && p.allergies.length > 0);
      assert.ok(Array.isArray(p.chronicConditions) && p.chronicConditions.length > 0);
      assert.ok(Array.isArray(p.currentMedications) && p.currentMedications.length > 0);
      assert.ok(Array.isArray(p.emergencyContacts) && p.emergencyContacts.length > 0);
      assert.ok(Array.isArray(p.vitals) && p.vitals.length > 0);

      // Verify documents
      assert.ok(Array.isArray(body.documents), "Documents array must be present");
      assert.ok(body.documents.length > 0, "Must contain at least 1 document");
      for (const doc of body.documents) {
        assert.ok(doc.id, "Document must have id");
        assert.ok(doc.title, "Document must have title");
        assert.ok(doc.viewUrl, "Document must have viewUrl");
        assert.ok(doc.category, "Document must have category");
      }
    });
  }

  // Non-existent token: 404 Not Found, locked: false
  await runCheck("Status Code", "Non-existent token returns 404 with locked: false", async () => {
    const bogus = `valid-looking-but-nonexistent-${Date.now()}`;
    const req = new NextRequest(`http://localhost:3000/api/emergency/${bogus}`);
    const res = await emergencyTokenGetHandler(req, {
      params: Promise.resolve({ token: bogus }),
    });

    assert.strictEqual(res.status, 404, "Non-existent token must return 404");
    const body = await res.json();
    assert.strictEqual(body.locked, false, "Must return locked: false");
    assert.strictEqual(body.error, "Invalid or expired QR code");
  });

  // Revoked token: 403 Forbidden, locked: true, revoked: true
  await runCheck("Status Code", "Revoked token returns 403 with revoked: true, locked: true", async () => {
    const userId = new ObjectId();
    const profileId = new ObjectId();
    const rawToken = "challenger-revoked-" + crypto.randomBytes(12).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const tokenId = await createEmergencyToken(
      userId,
      profileId,
      tokenHash,
      true,
      { url: `/emergency/${rawToken}`, token: rawToken }
    );
    assert.ok(tokenId, "Token must be created in DB");

    // Revoke token
    await revokeToken(tokenId);

    const req = new NextRequest(`http://localhost:3000/api/emergency/${rawToken}`);
    const res = await emergencyTokenGetHandler(req, {
      params: Promise.resolve({ token: rawToken }),
    });

    assert.strictEqual(res.status, 403, "Revoked token must return 403 Forbidden");
    const body = await res.json();
    assert.strictEqual(body.revoked, true, "Must contain revoked: true");
    assert.strictEqual(body.locked, true, "Must contain locked: true");
    assert.ok(body.error.includes("revoked by the owner"), "Must explain revocation");
  });

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("CHALLENGER VERIFICATION SUMMARY");
  console.log("================================================================================");
  const total = report.length;
  const passed = report.filter((r) => r.passed).length;
  const failed = report.filter((r) => !r.passed).length;

  console.log(`Total checks executed: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.error(`\n❌ ${failed} check(s) failed!`);
    for (const f of report.filter((r) => !r.passed)) {
      console.error(`  - [${f.category}] ${f.testCase}: ${f.details}`);
    }
    process.exit(1);
  } else {
    console.log(`\n🎉 ALL ${total} CHALLENGER VERIFICATION CHECKS PASSED CLEANLY!`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error in challenger harness:", err);
  process.exit(1);
});
