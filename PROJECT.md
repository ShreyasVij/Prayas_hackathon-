# Project: MediLocker UX & Performance Overhaul

## Architecture
- **Framework**: Next.js 14 (App Router) with React 18, Tailwind CSS, Lucide icons, Motion/React.
- **Backend / Services**:
  - Next.js API route handlers in `apps/web/app/api/`
  - MongoDB via `@/lib/server/db` and `@/packages/db`
  - Python AI / OCR worker in `apps/ai` with OCR.space and Tesseract pipeline
- **Client State & Navigation**:
  - Dashboard bento grid with `HealthStatusHero`, `EmergencyQRBox`, `VitalsTrendChart`, `RecentDocsList`
  - Documents management at `/documents` with dual view (`records` / `scan`) and document preview modal
  - Emergency public access at `/emergency/[token]` and emergency management at `/emergency/settings`

## Feature Inventory
Every feature from user requirements (R1–R4) mapped to milestones:
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Instant AI Health Brief | Eliminate UI loading delays on Dashboard for "Your AI Health Brief" | M1 | R1 |
| 2 | Instant Emergency Token Preview | Eliminate loading delay for emergency token icon/card on Dashboard | M1 | R1 |
| 3 | Smooth Emergency Open Navigation | "Open" button on Dashboard emergency card opens emergency view without 404 or redirect failure | M1 | R1 |
| 4 | Natural Document Aspect Ratio | Compute and display natural aspect ratio from uploaded image dimensions in Scan & Upload | M2 | R2 |
| 5 | Expand & Align Scan View | Enlarge and center document preview; ensure badges like "AI GENERATED — VERIFIED" are fully visible without clipping | M2 | R2 |
| 6 | Vitals Table Realignment | Proper column widths and padding so vital labels, values, and units are never cut off | M2 | R2 |
| 7 | Dark Backdrop Document Modal | Open scanned document as focused modal with dark backdrop overshadowing background and top-right close button | M3 | R3 |
| 8 | Zoom & Multi-Page Scrolling | Single-page responsive zoom in/out; multi-page proportional viewer with smooth vertical scrolling | M3 | R3 |
| 9 | Clinical Data Formatting & Colons | Formatted with clear colon separators and consistent indentation (e.g., `Patient Name: Kagstro Woods`), distinct label/value | M3 | R3 |
| 10 | Document Summary Section & Action | Dedicated summary section with action button to generate summaries | M3 | R3 |
| 11 | Unauthenticated Emergency Access | Emergency access URL works reliably in fresh/incognito tab without "Access Denied" or false rate limits | M4 | R4 |
| 12 | OCR Pipeline Warnings Resolution | Inspect and address document/OCR processing warnings and extraction failures | M4 | R4 |
| 13 | Comprehensive Automated Test Suite | Run and pass all unit, integration, and E2E tests cleanly via `npm test` in `apps/web` | M5 | Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Dashboard Performance & Emergency Navigation | `apps/web/app/dashboard/page.tsx`, `apps/web/components/dashboard/EmergencyQRBox.tsx`, `apps/web/app/api/health-summary/route.ts`, `apps/web/app/emergency/page.tsx` | none | IN_PROGRESS |
| M2 | Scan & Upload View Layout & Document Aspect Ratio | `apps/web/app/documents/page.tsx`, `apps/web/components/DocumentReviewForm.tsx`, `apps/web/components/ui/ai-badge.tsx` | none | IN_PROGRESS |
| M3 | Scanned Documents Modal & Extracted Information Formatting | `apps/web/app/documents/page.tsx` (modal viewer) | M2 | IN_PROGRESS |
| M4 | Emergency Token Public Access & Pipeline Logs | `apps/web/app/api/emergency/[token]/route.ts`, `apps/web/app/emergency/[token]/page.tsx`, `apps/web/packages/db/index.ts`, `apps/ai/src/medilocker_ai/documents/extraction.py` | none | IN_PROGRESS |
| M5 | E2E Testing Suite & Acceptance Verification | `apps/web/package.json`, `apps/web/test/`, and automated execution of `npm test` | M1, M2, M3, M4 | IN_PROGRESS |

## Interface Contracts
### Dashboard ↔ Emergency Access
- `EmergencyQRBox` provides `qrData.url` targeting `/emergency/${token}`.
- Fallback token is `emg-live-8921-xyz` with target URL `/emergency/emg-live-8921-xyz`.
- "Open" button links directly to `qrData.url` (or fallback token URL) for instant emergency responder view.
- `/emergency` route redirects smoothly to `/emergency/settings` without client-side hydration delays.

### Scan & Upload ↔ Document Review Form
- `DocumentReviewForm` receives `initialData` and renders header with `AIBadge` without horizontal clipping.
- Table columns structured: Label (min 140px, 44%), Value (min 90px, 26%), Unit (min 65px, 20%), Delete action (min 35px, 10%).

### Scanned Document Modal
- Modal root: fixed overlay `z-[1050] bg-black/85 backdrop-blur-sm`.
- Top-right close button `✕` anchored in modal header + Escape key listener.
- Patient metadata rendered as structured grid with explicit `:` colon separator and uniform indentation.
- Summarize button with localized spinner and in-modal error alert.

### Emergency Token API ↔ Public Responder View
- Endpoint `GET /api/emergency/[token]`:
  - Rate-limit per IP with unique fallback (`req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1'`).
  - Supports demo tokens (`dry-run-token-abc123`, `emg-live-8921-xyz`, `dry-run`).
  - Checks MongoDB users collection, and falls back to Supabase JSON profile store.
  - Returns accurate error codes (404 for missing token, 429 for rate limit, 403 for revoked/suspicious).
- Page `/emergency/[token]/page.tsx`:
  - Starts fetching emergency profile immediately without waiting for geolocation resolution.
  - Distinguishes "Rate Limited", "Token Not Found", and "Access Denied".

## Code Layout
- `apps/web/app/dashboard/page.tsx`: Dashboard page client & HealthStatusHero
- `apps/web/components/dashboard/EmergencyQRBox.tsx`: Emergency QR card and Open button
- `apps/web/app/api/health-summary/route.ts`: Concurrent health summary fetch
- `apps/web/app/emergency/page.tsx`: Root emergency redirect
- `apps/web/app/documents/page.tsx`: Documents page, scan view layout, and modal viewer
- `apps/web/components/DocumentReviewForm.tsx`: Review form and vitals table
- `apps/web/components/ui/ai-badge.tsx`: AI verification badge
- `apps/web/app/api/emergency/[token]/route.ts`: Emergency public token route handler
- `apps/web/app/emergency/[token]/page.tsx`: Public emergency profile responder view
- `apps/web/packages/db/index.ts`: Emergency token DB helpers
- `apps/web/package.json`: Test scripts
- `apps/web/test/`: Test suites
