# E2E Test Infra: MediLocker Emergency QR System

## Test Philosophy
- Opaque-box, requirement-driven.
- Automated testing via `tsx` running standalone and integrated in `npm test`.
- Hard verification of error codes (200, 403, 404, 429, zero 500 crashes).

## Feature Inventory & Test Mapping
| # | Feature | Requirement | Existing Coverage | Gap Coverage Plan |
|---|---------|-------------|-------------------|-------------------|
| 1 | Permanent Token Lifecycle | R1 | Test 1.1 (fallback) | Verify `isPermanent: true` on creation, persistence across queries |
| 2 | Manual Regeneration Revocation | R1 | Test 4.2 (direct DB) | Verify `POST /api/emergency/token` with `regenerate: true` revokes old token |
| 3 | URL Normalization & Navigation | R1 | Test 1.1, 1.2, 1.3 | Normalize legacy paths, eliminate dashboard 404s |
| 4 | Public Unauthenticated Access | R2 | Test 2.1 across demo tokens | Verify 5 demo tokens + real tokens without auth |
| 5 | Critical Profile & Vitals Display | R2 | Test 2.1 | Verify profile fields + vitals array |
| 6 | Stored Medical Documents in Responder API | R2 | None | Verify `documents` array with `viewUrl` returned in `GET /api/emergency/[token]` |
| 7 | Environment-Aware Base URL | R3 | None | Verify dynamic host resolution for dev vs production |
| 8 | Supabase Table & Persistence | R4 | None | Verify `emergency_tokens` table in `supabase.sql` and persistence helpers |
| 9 | Rate Limiting & Isolation | R2, R4 | Test 3.1, 3.2, 3.3 | 60 req/min, `locked: false`, token-isolated headerless, loopback bypass |
| 10 | Security Attack Resilience | R4 | Test 5.1, 5.2 | Concurrent bursts (50 requests), XSS, SQLi, traversal, buffer overflow |

## Test Runner
- Command: `npm test` inside `apps/web`
- Includes: `profile-update.test.ts`, `edge-cases.test.ts`, and `adversarial-stress-r1-r4.ts`
- Expected: All suites pass with exit code 0
