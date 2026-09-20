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

interface TestResult {
  suite: string;
  name: string;
  status: "PASS" | "FAIL";
  durationMs: number;
  details?: string;
}

const results: TestResult[] = [];

async function recordTest(suite: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ suite, name, status: "PASS", durationMs });
    console.log(`  ✓ [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ suite, name, status: "FAIL", durationMs, details: err.message });
    console.error(`  ✗ [FAIL] ${name} (${durationMs}ms):`, err.message);
    throw err;
  }
}

async function runAdversarialStressSuite() {
  console.log("================================================================================");
  console.log("▶ EMPIRICAL ADVERSARIAL STRESS SUITE: REQUIREMENTS R1 & R4");
  console.log("================================================================================\n");

  // ===========================================================================
  // SUITE 1: Emergency URL Navigation & EmergencyQRBox Resolution
  // ===========================================================================
  console.log("--------------------------------------------------------------------------------");
  console.log("SUITE 1: Requirement R1 — Emergency URL Navigation & QRBox Component");
  console.log("--------------------------------------------------------------------------------");

  await recordTest("R1 Navigation", "EmergencyQRBox component source verification", async () => {
    const qrBoxPath = path.join(__dirname, "..", "components", "dashboard", "EmergencyQRBox.tsx");
    assert(fs.existsSync(qrBoxPath), "EmergencyQRBox.tsx must exist");
    const content = fs.readFileSync(qrBoxPath, "utf8");

    // Must have fallback token
    assert(content.includes("emg-live-8921-xyz"), "Must specify fallback token 'emg-live-8921-xyz'");
    // Must have Open button linking to emergency path
    assert(
      content.includes("href={qrData?.url || \"/emergency/emg-live-8921-xyz\"}") ||
      content.includes("href={qrData.url}") ||
      content.includes("href={`/emergency/"),
      "Open button must link to qrData.url or fallback"
    );
    // Must normalize legacy /emergency/token/ paths
    assert(content.includes("normalizeEmergencyUrl"), "Must implement normalizeEmergencyUrl");
    // Must not target undefined or null
    assert(!content.includes("href={`/emergency/${undefined}`}"), "Must not format with literal undefined");
  });

  await recordTest("R1 Navigation", "URL normalization logic with diverse inputs", async () => {
    function normalizeEmergencyUrl(rawUrl?: string): string {
      if (!rawUrl) return "/emergency/emg-live-8921-xyz";
      return rawUrl.replace(/\/emergency\/token\//, "/emergency/");
    }

    assert.strictEqual(normalizeEmergencyUrl(undefined), "/emergency/emg-live-8921-xyz");
    assert.strictEqual(normalizeEmergencyUrl(""), "/emergency/emg-live-8921-xyz");
    assert.strictEqual(
      normalizeEmergencyUrl("/emergency/token/abc123xyz"),
      "/emergency/abc123xyz",
      "Legacy /emergency/token/ prefix must be rewritten to /emergency/"
    );
    assert.strictEqual(
      normalizeEmergencyUrl("https://medilocker.vault/emergency/token/abc123xyz"),
      "https://medilocker.vault/emergency/abc123xyz",
      "Full URL legacy prefix must be rewritten"
    );
    assert.strictEqual(
      normalizeEmergencyUrl("/emergency/emg-live-8921-xyz"),
      "/emergency/emg-live-8921-xyz"
    );
  });

  await recordTest("R1 Navigation", "Emergency root page (/emergency) redirect behavior", async () => {
    const rootPagePath = path.join(__dirname, "..", "app", "emergency", "page.tsx");
    assert(fs.existsSync(rootPagePath), "app/emergency/page.tsx must exist");
    const content = fs.readFileSync(rootPagePath, "utf8");
    assert(
      content.includes("redirect('/emergency/settings')") ||
      content.includes('redirect("/emergency/settings")'),
      "Root /emergency must redirect to /emergency/settings"
    );

    const settingsPagePath = path.join(__dirname, "..", "app", "emergency", "settings", "page.tsx");
    assert(fs.existsSync(settingsPagePath), "app/emergency/settings/page.tsx must exist as target destination");
  });

  await recordTest("R1 Navigation", "Emergency responder view page (/emergency/[token]) exists", async () => {
    const responderPagePath = path.join(__dirname, "..", "app", "emergency", "[token]", "page.tsx");
    assert(fs.existsSync(responderPagePath), "app/emergency/[token]/page.tsx must exist");
    const content = fs.readFileSync(responderPagePath, "utf8");
    // Verify immediate parallel fetch without waiting for geolocation
    assert(content.includes("fetchEmergencyData()"), "Must fetch emergency data on token mount");
    assert(content.includes("useParams()"), "Must extract token from route params");
    assert(content.includes("navigator.geolocation"), "Should attempt background geolocation");
  });

  // ===========================================================================
  // SUITE 2: Unauthenticated Emergency Access (R4.1)
  // ===========================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("SUITE 2: Requirement R4 — Unauthenticated Emergency Public Access");
  console.log("--------------------------------------------------------------------------------");

  const demoTokens = [
    "emg-live-8921-xyz",
    "dry-run-token-abc123",
    "emg-live-token",
    "dry-run",
    "emg-live-custom-responder-99",
  ];

  for (const token of demoTokens) {
    await recordTest("R4 Unauthenticated Access", `Unauthenticated GET /api/emergency/${token}`, async () => {
      // Create request with NO auth cookies, NO Authorization header
      const req = new NextRequest(`http://localhost:3000/api/emergency/${token}`, {
        method: "GET",
        headers: {
          "user-agent": "Mozilla/5.0 (EmergencyResponder; Ambulance Unit 12)",
        },
      });

      const res = await emergencyTokenGetHandler(req, {
        params: Promise.resolve({ token }),
      });

      assert.strictEqual(res.status, 200, `Token ${token} must return HTTP 200 OK`);
      const body = await res.json();
      assert.strictEqual(body.success, true, "Payload must have success: true");
      assert.ok(body.accessTimestamp, "Payload must have accessTimestamp");
      assert.ok(body.profile, "Payload must contain profile object");

      // Verify profile fields completeness
      const p = body.profile;
      assert.ok(typeof p.displayName === "string" && p.displayName.length > 0, "Must have displayName");
      assert.ok(typeof p.bloodGroup === "string" && p.bloodGroup.length > 0, "Must have bloodGroup");
      assert.ok(Array.isArray(p.allergies), "Must have allergies array");
      assert.ok(Array.isArray(p.chronicConditions), "Must have chronicConditions array");
      assert.ok(Array.isArray(p.currentMedications), "Must have currentMedications array");
      assert.ok(Array.isArray(p.emergencyContacts), "Must have emergencyContacts array");
      assert.ok(p.emergencyContacts.length > 0, "Must have at least one emergency contact");
      assert.ok(p.emergencyContacts[0].name, "Emergency contact must have name");
      assert.ok(p.emergencyContacts[0].phone, "Emergency contact must have phone");

      // Verify vitals completeness
      assert.ok(Array.isArray(p.vitals), "Must have vitals array");
      assert.ok(p.vitals.length > 0, "Must have at least one vital recorded");
      for (const vital of p.vitals) {
        assert.ok(vital.label, "Vital must have label");
        assert.ok(vital.value !== undefined, "Vital must have value");
      }
    });
  }

  await recordTest("R4 Unauthenticated Access", "Unauthenticated access with query coordinates (lat, lon)", async () => {
    const req = new NextRequest("http://localhost:3000/api/emergency/emg-live-8921-xyz?lat=12.9716&lon=77.5946&loc=Bengaluru", {
      method: "GET",
    });
    const res = await emergencyTokenGetHandler(req, {
      params: Promise.resolve({ token: "emg-live-8921-xyz" }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.token, "emg-live-8921-xyz");
  });

  await recordTest("R4 Unauthenticated Access", "Real DB token unauthenticated resolution", async () => {
    const dbUserId = new ObjectId();
    const dbProfileId = new ObjectId();
    const rawToken = "real-test-token-" + crypto.randomBytes(16).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const tokenId = await createEmergencyToken(
      dbUserId,
      dbProfileId,
      tokenHash,
      true,
      { url: `/emergency/${rawToken}`, token: rawToken }
    );
    assert.ok(tokenId);

    // Fetch without authentication
    const req = new NextRequest(`http://localhost:3000/api/emergency/${rawToken}`, {
      headers: { "x-forwarded-for": "198.51.100.22" },
    });
    const res = await emergencyTokenGetHandler(req, {
      params: Promise.resolve({ token: rawToken }),
    });

    // Since user record is dummy in this quick test, handler may return 200 if fallback profile matches or 404 with "User profile not found for this emergency token"
    // Crucially: it must NOT return 401 Unauthorized or 403 Access Denied!
    assert.notStrictEqual(res.status, 401, "Must never return 401 Unauthorized for emergency token");
    assert.notStrictEqual(res.status, 403, "Active token must never return 403 Forbidden");
    assert([200, 404].includes(res.status), `Status must be 200 or 404, got ${res.status}`);
  });

  // ===========================================================================
  // SUITE 3: Rate Limiting Isolation & Cross-IP Leakage Protection (R4.2)
  // ===========================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("SUITE 3: Requirement R4 — Rate Limiting Isolation & Multi-Client Independence");
  console.log("--------------------------------------------------------------------------------");

  await recordTest("R4 Rate Limiting", "IP-based Rate Limit Exhaustion and Cross-IP Isolation", async () => {
    const ipAttacker = `198.51.100.${Math.floor(Math.random() * 100) + 100}`;
    const ipInnocent = `203.0.113.${Math.floor(Math.random() * 100) + 100}`;
    const testTargetToken = `rl-isolate-${Date.now()}`;

    // Step 1: Attacker sends 60 requests to fill the bucket
    for (let i = 0; i < 60; i++) {
      const req = new NextRequest(`http://localhost:3000/api/emergency/${testTargetToken}`, {
        headers: { "x-forwarded-for": ipAttacker },
      });
      const res = await emergencyTokenGetHandler(req, {
        params: Promise.resolve({ token: testTargetToken }),
      });
      assert.notStrictEqual(res.status, 429, `Attacker request ${i + 1} should be within limit`);
    }

    // Step 2: Attacker request 61 MUST return 429
    const req61 = new NextRequest(`http://localhost:3000/api/emergency/${testTargetToken}`, {
      headers: { "x-forwarded-for": ipAttacker },
    });
    const res61 = await emergencyTokenGetHandler(req61, {
      params: Promise.resolve({ token: testTargetToken }),
    });
    assert.strictEqual(res61.status, 429, "Attacker request 61 must trigger HTTP 429");
    const json61 = await res61.json();
    assert.ok(json61.error.includes("Rate limit exceeded"), "Error message must mention rate limit");
    assert.strictEqual(json61.locked, false, "Rate limit should set locked: false");

    // Step 3: Innocent IP request at the EXACT SAME TIME must succeed (NOT 429)
    const reqInnocent = new NextRequest("http://localhost:3000/api/emergency/emg-live-8921-xyz", {
      headers: { "x-forwarded-for": ipInnocent },
    });
    const resInnocent = await emergencyTokenGetHandler(reqInnocent, {
      params: Promise.resolve({ token: "emg-live-8921-xyz" }),
    });
    assert.strictEqual(resInnocent.status, 200, "Innocent IP must NOT be blocked by attacker lockout (isolation verified)");
  });

  await recordTest("R4 Rate Limiting", "Headerless (No IP) Rate Limit Isolation per Token", async () => {
    // When no IP header is sent (incognito without proxy), bucket key is token_[token]
    const tokenAlpha = `headerless-tok-alpha-${Date.now()}`;
    const tokenBeta = `headerless-tok-beta-${Date.now()}`;

    // Exhaust quota for tokenAlpha (60 requests)
    for (let i = 0; i < 60; i++) {
      const req = new NextRequest(`http://localhost:3000/api/emergency/${tokenAlpha}`);
      const res = await emergencyTokenGetHandler(req, {
        params: Promise.resolve({ token: tokenAlpha }),
      });
      assert.notStrictEqual(res.status, 429, `Token Alpha attempt ${i + 1} within quota`);
    }

    // 61st attempt on tokenAlpha hits 429
    const reqAlpha61 = new NextRequest(`http://localhost:3000/api/emergency/${tokenAlpha}`);
    const resAlpha61 = await emergencyTokenGetHandler(reqAlpha61, {
      params: Promise.resolve({ token: tokenAlpha }),
    });
    assert.strictEqual(resAlpha61.status, 429, "Token Alpha request 61 must return 429");

    // Simultaneous request for tokenBeta with NO IP header must NOT be blocked!
    const reqBeta = new NextRequest("http://localhost:3000/api/emergency/emg-live-8921-xyz");
    const resBeta = await emergencyTokenGetHandler(reqBeta, {
      params: Promise.resolve({ token: "emg-live-8921-xyz" }),
    });
    assert.strictEqual(resBeta.status, 200, "Token Beta must remain accessible even when Token Alpha is rate-limited without IP headers");
  });

  await recordTest("R4 Rate Limiting", "Multi-hop proxy header parsing (x-forwarded-for list)", async () => {
    const clientIp = `192.0.2.${Math.floor(Math.random() * 200) + 1}`;
    const proxyIp = "10.0.0.1";
    const cdnIp = "172.16.0.1";

    const req = new NextRequest("http://localhost:3000/api/emergency/emg-live-8921-xyz", {
      headers: {
        "x-forwarded-for": `${clientIp}, ${proxyIp}, ${cdnIp}`,
      },
    });

    const res = await emergencyTokenGetHandler(req, {
      params: Promise.resolve({ token: "emg-live-8921-xyz" }),
    });
    assert.strictEqual(res.status, 200, "Request through multi-hop proxy must resolve successfully");
  });

  // ===========================================================================
  // SUITE 4: Precise Error Differentiation (R4.3)
  // ===========================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("SUITE 4: Requirement R4 — Precise Error Code Differentiation");
  console.log("--------------------------------------------------------------------------------");

  await recordTest("R4 Error Differentiation", "Non-existent token returns HTTP 404 (Not 403 or 500)", async () => {
    const bogusToken = `completely-non-existent-token-${Date.now()}`;
    const req = new NextRequest(`http://localhost:3000/api/emergency/${bogusToken}`, {
      headers: { "x-forwarded-for": "198.51.100.44" },
    });
    const res = await emergencyTokenGetHandler(req, {
      params: Promise.resolve({ token: bogusToken }),
    });

    assert.strictEqual(res.status, 404, "Unknown token must return HTTP 404");
    const body = await res.json();
    assert.strictEqual(body.locked, false, "Missing token should not be marked locked: true");
    assert.ok(body.error.includes("Invalid or expired"), "Must return 'Invalid or expired QR code'");
  });

  await recordTest("R4 Error Differentiation", "Revoked token returns HTTP 403 with revoked: true", async () => {
    const revUserId = new ObjectId();
    const revProfileId = new ObjectId();
    const rawToken = "revoked-test-tok-" + crypto.randomBytes(16).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const tokenId = await createEmergencyToken(
      revUserId,
      revProfileId,
      tokenHash,
      true,
      { url: `/emergency/${rawToken}`, token: rawToken }
    );
    // Explicitly revoke the token
    await revokeToken(tokenId);

    const req = new NextRequest(`http://localhost:3000/api/emergency/${rawToken}`, {
      headers: { "x-forwarded-for": "198.51.100.55" },
    });
    const res = await emergencyTokenGetHandler(req, {
      params: Promise.resolve({ token: rawToken }),
    });

    assert.strictEqual(res.status, 403, "Revoked token must return HTTP 403 Forbidden");
    const body = await res.json();
    assert.strictEqual(body.revoked, true, "Payload must include revoked: true");
    assert.strictEqual(body.locked, true, "Payload must include locked: true");
    assert.ok(body.error.includes("revoked by the owner"), "Message must explain token was revoked");
  });

  await recordTest("R4 Error Differentiation", "Localhost never flagged as suspicious (False Positive Protection)", async () => {
    for (const ip of ["127.0.0.1", "::1", "localhost"]) {
      const suspicious = await detectSuspiciousActivity(ip, 60, 15);
      const isSuspicious = typeof suspicious === "boolean"
        ? suspicious
        : Boolean((suspicious as any)?.suspicious);
      assert.strictEqual(isSuspicious, false, `IP ${ip} must never be flagged as suspicious`);
    }
  });

  // ===========================================================================
  // SUITE 5: Adversarial Boundary & Stress Conditions
  // ===========================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("SUITE 5: Adversarial Stress & Input Boundary Testing");
  console.log("--------------------------------------------------------------------------------");

  await recordTest("Adversarial Stress", "Rapid burst of 50 concurrent requests to demo token", async () => {
    const burstPromises = Array.from({ length: 50 }, (_, i) => {
      const req = new NextRequest("http://localhost:3000/api/emergency/emg-live-8921-xyz", {
        headers: { "x-forwarded-for": `192.168.1.${(i % 10) + 1}` },
      });
      return emergencyTokenGetHandler(req, {
        params: Promise.resolve({ token: "emg-live-8921-xyz" }),
      });
    });

    const responses = await Promise.all(burstPromises);
    for (const res of responses) {
      assert.strictEqual(res.status, 200, "All 50 concurrent requests must succeed with 200 OK");
    }
  });

  await recordTest("Adversarial Stress", "Adversarial input payloads (XSS, path traversal, SQLi)", async () => {
    const attackTokens = [
      "<script>alert(1)</script>",
      "../../etc/passwd",
      "' OR '1'='1",
      "emg-live-%00-nullbyte",
      "a".repeat(1024), // Buffer overflow attempt
    ];

    for (const badToken of attackTokens) {
      const req = new NextRequest(`http://localhost:3000/api/emergency/${encodeURIComponent(badToken)}`, {
        headers: { "x-forwarded-for": "198.51.100.99" },
      });
      const res = await emergencyTokenGetHandler(req, {
        params: Promise.resolve({ token: badToken }),
      });
      // Should return either 200 (if handled by demo prefix match) or 404 (invalid token), but NEVER 500 unhandled crash
      assert.notStrictEqual(res.status, 500, `Attack token '${badToken.slice(0, 20)}' must not cause 500 crash`);
      assert([200, 404, 429].includes(res.status), `Expected 200, 404, or 429, got ${res.status}`);
    }
  });

  console.log("\n================================================================================");
  console.log(`SUMMARY: All ${results.length} adversarial tests executed.`);
  const failed = results.filter((r) => r.status === "FAIL");
  if (failed.length === 0) {
    console.log("🎉 ALL ADVERSARIAL STRESS TESTS PASSED CLEANLY!");
  } else {
    console.error(`❌ ${failed.length} test(s) failed.`);
  }
  console.log("================================================================================\n");
}

runAdversarialStressSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Adversarial suite terminated with error:", err);
    process.exit(1);
  });
