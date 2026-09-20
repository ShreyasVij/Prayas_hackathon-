## 2026-09-19T20:42:07Z
You are a teamwork_preview_challenger.
Your identity: teamwork_preview_challenger_1.
Your working directory is: d:/Prayas_hackathon-/.agents/teamwork_preview_challenger_1
Read:
- d:/Prayas_hackathon-/ORIGINAL_REQUEST.md
- d:/Prayas_hackathon-/PROJECT.md

MISSION:
Adversarially stress-test and empirically verify Requirements R1 and R4:
1. Test Emergency URL navigation: Verify that the dashboard EmergencyQRBox "Open" button always resolves to a valid emergency path (`/emergency/[token]`) and never 404s.
2. Test unauthenticated emergency access: Emulate requests without session cookies or authorization headers to `/api/emergency/[token]` with demo tokens (`emg-live-8921-xyz`, `dry-run-token-abc123`) and verify 200 OK with complete profile and vitals.
3. Test rate limiting isolation: Verify that unauthenticated requests from different IPs (or without headers) do not lock each other out.
4. Test error handling: Verify that non-existent tokens return 404, rate limits return 429, and only revoked/blocked tokens return 403.
5. Run test verification in `apps/web`.
Write your empirical verification report and verdict (**CONFIRMED** or **FAILED**) to `d:/Prayas_hackathon-/.agents/teamwork_preview_challenger_1/handoff.md`.
Send completion message to orchestrator.
