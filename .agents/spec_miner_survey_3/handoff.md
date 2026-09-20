# Handoff Report: Specification Mining & Test Suite Audit (Emergency QR System)

**Agent**: `spec_miner_survey_3`  
**Role**: Test & Specification Miner  
**Target Recipient**: Orchestrator (`1435b04e-0aae-4093-82ac-a3dc4017f7ac`) / Peer Workers  
**Handoff Type**: Hard (Task Complete)  
**Date**: 2026-09-20T08:31:00+05:30

---

## 1. Observation

1. **Test Execution Observations**:
   - Running `npm test` in `d:/Prayas_hackathon-/apps/web`:
     - Command: `npm test`
     - Definition in `apps/web/package.json` (Line 13): `"test": "tsx test/profile-update.test.ts && tsx test/edge-cases.test.ts"`
     - Result: Exited cleanly with code 0. Passed all 4 tests in `profile-update.test.ts` and all 6 tests in `edge-cases.test.ts`.
   - Running `npx tsx test/adversarial-stress-r1-r4.ts` in `d:/Prayas_hackathon-/apps/web`:
     - Result: Exited with code 1.
     - Verbatim error output:
       ```
       ================================================================================
       ▶ EMPIRICAL ADVERSARIAL STRESS SUITE: REQUIREMENTS R1 & R4
       ================================================================================

       --------------------------------------------------------------------------------
       SUITE 1: Requirement R1 — Emergency URL Navigation & QRBox Component
       --------------------------------------------------------------------------------
         ✗ [FAIL] EmergencyQRBox component source verification (9ms): Must implement normalizeEmergencyUrl
       Adversarial suite terminated with error: AssertionError [ERR_ASSERTION]: Must implement normalizeEmergencyUrl
           at <anonymous> (D:\Prayas_hackathon-\apps\web\test\adversarial-stress-r1-r4.ts:83:5)
       ```
2. **Implementation vs. Test Assertions**:
   - `apps/web/components/dashboard/EmergencyQRBox.tsx`:
     - Line 31: `url: "/emergency/token/emg-live-8921-xyz"` (legacy URL pattern with `/token/`).
     - Lacks `normalizeEmergencyUrl` function required by `adversarial-stress-r1-r4.ts` line 83.
   - `apps/web/app/emergency/page.tsx`:
     - Line 11: Uses client-side `router.push('/emergency/settings')`.
     - `adversarial-stress-r1-r4.ts` line 117 asserts server-side `redirect('/emergency/settings')`.
   - `apps/web/app/api/emergency/[token]/route.ts`:
     - Line 72: `if (!/^[a-f0-9]{64}$/i.test(token)) return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });` blocks non-hex demo tokens (`emg-live-8921-xyz`, `dry-run-token-abc123`, `emg-live-token`, `dry-run`, `emg-live-custom-responder-99`) tested in `adversarial-stress-r1-r4.ts` line 143.
     - Line 61: `checkAccessRateLimit(ip, 20, 60000)` restricts requests to 20 per minute; test expects 60 requests to pass before throttling on request 61 with `locked: false` (currently returns `locked: true`).
     - Line 35: `ip` defaults to `'unknown'`, merging all headerless clients into one bucket rather than isolating by token (`token_${token}`).
     - Line 90: Returns `{ error: 'Invalid QR code', locked: true }` on missing token; test asserts status 404 with `{ locked: false }` and text containing `"Invalid or expired"`.
     - Lines 216–230: Constructs `emergencyData.profile` without a `vitals` array; test asserts `Array.isArray(p.vitals)` and `p.vitals.length > 0`.
     - Lines 213–234: Completely omits patient medical documents, which is a core requirement of R2 in `ORIGINAL_REQUEST.md`.
   - `apps/web/app/emergency/[token]/page.tsx`:
     - Lines 244–457: Renders patient details and quick action buttons, but provides no UI elements for displaying or previewing stored medical documents.
   - `apps/web/app/api/emergency/token/route.ts`:
     - Line 194: `const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;` throws if missing and ignores `req.headers.get('host')`.
   - `apps/web/packages/db/supabase.sql`:
     - Defines tables for `profiles`, `doctors`, and `medical_records`, but contains no `emergency_tokens` table.

---

## 2. Logic Chain

1. **Specification Trace**: The user request and `ORIGINAL_REQUEST.md` (section `## 2026-09-20T02:56:52Z`) demand four core enhancements: R1 (Permanent Emergency QR Token Lifecycle), R2 (Responder View with Stored Documents & Profile Information), R3 (Environment-Aware URL Resolution), and R4 (Supabase Migration Compatibility).
2. **Test Suite Divergence**: While `npm test` passes 10/10 tests in `apps/web`, it solely covers profile JSON storage edge cases (`profile-update.test.ts` and `edge-cases.test.ts`). The critical security and regression test suite (`adversarial-stress-r1-r4.ts`) was decoupled from `npm test` because it fails on its first assertion.
3. **Cascading Failure Identification**: Direct source inspection proves that fixing `normalizeEmergencyUrl` alone will not allow `adversarial-stress-r1-r4.ts` to pass. There are 6 downstream breaking discrepancies in `app/emergency/page.tsx` and `app/api/emergency/[token]/route.ts` (64-hex regex, rate limit threshold 20 vs 60, rate limit lock flag, headerless IP bucket grouping, missing vitals, and missing token error payload shape).
4. **New Requirements Coverage Gap**: The authoritative specification mandates that `/emergency/[token]` render previously stored medical documents alongside critical profile info (R2). Neither the route handler nor the responder page implements document retrieval or display, and `adversarial-stress-r1-r4.ts` lacks test cases asserting document payloads. Similarly, R3 URL generation and R4 Supabase token table integration lack implementation and test verification.
5. **Conclusion Derivation**: Therefore, the system requires a synchronized update: refactoring route handlers and UI components to satisfy existing adversarial test contracts, extending endpoints and responder views to incorporate stored documents, implementing environment-aware host resolution, and authoring Supabase schema and tests for `emergency_tokens`.

---

## 3. Caveats

- **Active Database Connections**: `adversarial-stress-r1-r4.ts` connects to live MongoDB Atlas via credentials in `apps/web/.env`. When MongoDB connection fails or network drops, tests fall back to DB mocks in `apps/web/packages/db/index.ts`.
- **Scope Restriction**: As a read-only specification miner, no application source code was modified. Code fixes must be executed by downstream implementation subagents.

---

## 4. Conclusion

The specification probe confirms:
1. **Existing Baseline Tests Pass**: Profile updates and Supabase storage edge cases pass cleanly (`npm test` in `apps/web`).
2. **Stress Test Suite is Blocked**: `adversarial-stress-r1-r4.ts` fails due to 7 clear, deterministic implementation defects.
3. **Feature Gaps on New Spec**:
   - **R1**: Emergency QR token generation needs explicit permanent default validation.
   - **R2**: Emergency endpoint and responder UI must be updated to retrieve and render stored medical documents.
   - **R3**: Base URL resolution must dynamically infer `host` header in local development.
   - **R4**: `supabase.sql` requires `emergency_tokens` table definition, and DB abstraction needs Supabase dual-storage helpers.
4. **Full analysis is documented in `d:/Prayas_hackathon-/.agents/spec_miner_survey_3/analysis.md`**.

---

## 5. Verification Method

To independently reproduce and verify these findings:
1. **Verify Passing Baseline Tests**:
   ```bash
   cd d:/Prayas_hackathon-/apps/web
   npm test
   ```
   *Expected*: Passes cleanly with 10 checks across `profile-update.test.ts` and `edge-cases.test.ts`.
2. **Reproduce Adversarial Suite Failure**:
   ```bash
   cd d:/Prayas_hackathon-/apps/web
   npx tsx test/adversarial-stress-r1-r4.ts
   ```
   *Expected*: Fails on Test 1.1 (`AssertionError: Must implement normalizeEmergencyUrl`).
3. **Inspect Implementation Divergence**:
   - `apps/web/components/dashboard/EmergencyQRBox.tsx` (absence of `normalizeEmergencyUrl`).
   - `apps/web/app/api/emergency/[token]/route.ts` line 72 (hex regex preventing demo tokens).
   - `apps/web/app/api/emergency/[token]/route.ts` line 213 (omission of documents and vitals).
   - `apps/web/packages/db/supabase.sql` (absence of `emergency_tokens` schema).
