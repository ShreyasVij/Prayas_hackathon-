# Handoff Report: Requirement R1 — Dashboard Performance & Emergency Navigation

**Subagent**: `teamwork_preview_explorer_survey_1`  
**Milestone**: `survey_r1_dashboard_emergency`  
**Working Directory**: `d:/Prayas_hackathon-/.agents/teamwork_preview_explorer_survey_1`  
**Type**: Hard Handoff (Investigation Complete)  

---

## 1. Observation

1. **Dashboard Health Brief Loading & Streaming Delay**:
   - `apps/web/app/dashboard/page.tsx`:
     - Lines 42–58: `sessionStorage.getItem("medilocker_cached_health_brief")` is used to initialize `statusText` and `loading`. Because `sessionStorage` is tab-scoped, any fresh tab defaults to `loading = true` and renders 5 pulsing skeleton lines (`<div className="h-3.5 rounded-full bg-slate-100 animate-pulse" />`).
     - Lines 100–104:
       ```tsx
       if (!statusText || statusText !== plain) {
         setIsStreaming(true);
         setStatusText(plain);
         setTimeout(() => setIsStreaming(false), Math.min(plain.length * 10, 1500));
       }
       ```
     - `apps/web/components/dashboard/StreamingText.tsx`: Lines 48–74 implement a character-by-character typewriter effect (`charsPerTick = 3`, `intervalMs = 14`). When `isStreaming` is triggered, `displayedLength` is set to `0`, delaying full content visibility by up to 1.5 seconds even after the text is fetched.
   - `apps/web/app/api/health-summary/route.ts`: Prior to parallelization, lines 25–51 awaited 5 sequential queries on `userHealthSummary`, `documents`, and `jobs`, adding multi-roundtrip network latency.

2. **Emergency Token Preview Waterfall & Loading Delay**:
   - `apps/web/components/dashboard/EmergencyQRBox.tsx`:
     - Lines 49–100: `fetchExistingToken()` performs a multi-step waterfall:
       1. `fetch("/api/emergency/token")`
       2. If token lacks QR: `fetchQRForToken(tokenId)` (`GET /api/emergency/token?tokenId=...`)
       3. If empty/missing: `generateToken()` (`POST /api/emergency/token`)
     - Lines 172–176: While `loading` is true, the entire QR preview is replaced by a skeleton box (`<div className="h-[140px] w-[140px] rounded-xl bg-slate-100 animate-pulse" />`).
     - Lines 42–47: `FALLBACK_QR` is only used inside the `catch` block after failure, rather than acting as an instant optimistic preview.

3. **Emergency "Open" Button 404 & Redirection Failures**:
   - In `origin/main` (`apps/web/components/dashboard/EmergencyQRBox.tsx` line 46):
     ```ts
     const FALLBACK_QR: QRToken = {
       token: "emg-live-8921-xyz",
       tokenId: "tok-emg-001",
       qrCode: "...",
       url: "/emergency/token/emg-live-8921-xyz",
     };
     ```
   - In `origin/main` (`apps/web/app/api/emergency/token/route.ts` lines 253–258):
     `GET /api/emergency/token` returned `400 { error: 'profileId is required' }` when called without parameters, forcing `EmergencyQRBox.tsx` into `catch` and loading `FALLBACK_QR`.
   - The route filesystem in `apps/web/app/emergency/`:
     - Contains `[token]/page.tsx` (`/emergency/:token`).
     - Does **NOT** contain `/emergency/token/:token`.
     - Clicking "Open" navigated to `/emergency/token/emg-live-8921-xyz`, resulting directly in **HTTP 404 Not Found**.
   - In `apps/web/app/emergency/page.tsx`:
     Lines 9–12 perform client-side redirection via `useEffect` and `router.push('/emergency/settings')`, rendering a client spinner "Redirecting to Emergency Settings..." and inducing navigation lag.

4. **Test Suite Verification**:
   - Executed `npm test` in `apps/web`: 4 profile tests and 6 edge case tests passed cleanly.
   - Executed `npx tsx test/emergency-token-and-viewer.test.ts` in `apps/web`: All 7 emergency token and document viewer verification tests passed cleanly.

---

## 2. Logic Chain

1. **AI Health Brief Latency**:
   - Observation 1 demonstrates that in any new tab, `sessionStorage` has no entry.
   - Therefore, `loading` starts as `true`, and the component waits for `GET /api/health-summary`.
   - Once data arrives, `HealthStatusHero` sets `isStreaming = true`, resetting `displayedLength` to `0` and typing out letters over 1500ms.
   - Hence, the delay is caused by tab-scoped cache misses, sequential DB queries, and artificial typewriter animation.

2. **Emergency Token Preview Latency**:
   - Observation 2 demonstrates that `EmergencyQRBox` starts with `loading = true` on cold sessions.
   - It executes up to 3 chained HTTP requests before setting `loading = false`.
   - The immediate fallback QR is locked behind the `catch` block and is never rendered optimistically.
   - Hence, users experience 1–2.5 seconds of blank skeleton pulsing on dashboard load.

3. **Emergency "Open" Button 404 & Redirection**:
   - Observation 3 proves that in `origin/main`, `FALLBACK_QR.url` was hardcoded to `/emergency/token/emg-live-8921-xyz`.
   - Because `GET /api/emergency/token` rejected requests without `profileId`, `FALLBACK_QR` was immediately loaded.
   - Clicking "Open" directed the browser to `/emergency/token/emg-live-8921-xyz`.
   - Because the App Router route is `/emergency/[token]` (not `/emergency/token/[token]`), Next.js returned a 404.
   - Additionally, navigating to `/emergency` triggered a client-side `useEffect` redirect loop rather than a server-side route redirect.

---

## 3. Caveats

- **Active Session State**: In production, if MongoDB Atlas experiences network latency, cold-start latency will still apply to uncached first visits unless persistent client caching (`localStorage`) or edge/SSR caching is active.
- **Two Interpretations of "Open" Button**:
  - Interpretation A: "Open" opens the public responder emergency view (`/emergency/${token}`).
  - Interpretation B: "Open" opens the emergency settings tab (`/emergency/settings`).
  - Both routes must be valid and free of 404 or redirect issues.
- **Dry-run Mode Flag**: In dry-run mode (`NEXT_PUBLIC_DRY_RUN=true`), mock tokens are returned (`/emergency/dry-run`). `/api/emergency/[token]/route.ts` must ensure `'dry-run'` is treated identically to `'dry-run-token-abc123'` to prevent 404s in non-dry-run fallback scenarios.

---

## 4. Conclusion

Requirement R1 is fully understood:
1. **Health Brief Performance**: Eliminate the artificial 1500ms `StreamingText` typewriter delay for static summaries, expand cache from `sessionStorage` to persistent `localStorage` (with hydration safety), and maintain DB query parallelization.
2. **Emergency Token Icon**: Render the fallback/cached token preview optimistically on mount without blocking on the 3-step waterfall, and have `GET /api/emergency/token` return a complete token + QR in a single round-trip.
3. **Emergency Navigation & 404 Elimination**:
   - Route for public emergency responder view is `/emergency/[token]`.
   - Route for settings management is `/emergency/settings`.
   - Fix `FALLBACK_QR.url` to `/emergency/emg-live-8921-xyz` (valid route) instead of `/emergency/token/emg-live-8921-xyz` (404 route).
   - Convert `/emergency/page.tsx` from client-side `router.push` to Next.js App Router server `redirect('/emergency/settings')`.

---

## 5. Verification Method

1. **Run Project Test Suite**:
   ```bash
   cd apps/web
   npm test
   ```
   *Expected Result*: All profile and edge case suites pass with exit code 0.

2. **Run Emergency Token & Detection Tests**:
   ```bash
   cd apps/web
   npx tsx test/emergency-token-and-viewer.test.ts
   ```
   *Expected Result*: All 7 emergency token, hash lookup, suspicious activity, and signed URL tests pass cleanly.

3. **Route Navigation Verification**:
   - Inspect `http://localhost:3000/dashboard` in a fresh incognito tab. Verify that "Your AI Health Brief" and the emergency QR token preview appear immediately without lingering skeleton states.
   - Click the "Open" button on the Emergency Access card. Verify that it navigates directly to `/emergency/emg-live-8921-xyz` or `/emergency/settings` with HTTP 200 (no 404, no redirect loops).
