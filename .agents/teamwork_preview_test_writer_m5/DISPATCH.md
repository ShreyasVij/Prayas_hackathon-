## 2026-09-20T02:02:59Z
You are a teamwork_preview_test_writer.
Your identity: teamwork_preview_test_writer_m5.
Your working directory: d:/Prayas_hackathon-/.agents/teamwork_preview_test_writer_m5
Read:
- d:/Prayas_hackathon-/ORIGINAL_REQUEST.md
- d:/Prayas_hackathon-/PROJECT.md
- d:/Prayas_hackathon-/.agents/teamwork_preview_explorer_survey_3/analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All tests must genuinely verify functionality against requirements. DO NOT create dummy tests or tautological assertions.

EXCLUSIVE FILE OWNERSHIP:
You exclusively own and may edit:
- apps/web/package.json
- apps/web/test/
DO NOT modify any production source code files.

TASKS (Milestone M5: E2E Test Suite & Test Script Integration):
1. In apps/web/package.json, update the `"test"` script so `npm test` runs all automated test suites:
   - `test/profile-update.test.ts`
   - `test/edge-cases.test.ts`
   - `test/emergency-token-and-viewer.test.ts`
   - and any newly created E2E verification tests.
2. In apps/web/test/ (or updating `test/emergency-token-and-viewer.test.ts`), add explicit automated verification for:
   - R1: Dashboard emergency card "Open" target URL formatting (`/emergency/[token]`, no 404).
   - R2: Natural aspect ratio calculation logic and DocumentReviewForm table column alignments.
   - R3: Scanned document modal backdrop styling (`bg-black/85`), close button existence, colon formatted patient info (`Patient Name: Kagstro Woods`).
   - R4: Emergency public token unauthenticated resolution, IP rate limit separation, and error differentiation.
3. Execute `npm test` in `apps/web` and verify that all test suites pass cleanly with exit code 0.
4. Document all test suites and results in `d:/Prayas_hackathon-/.agents/teamwork_preview_test_writer_m5/handoff.md`.
5. Send a message to orchestrator upon completion.
