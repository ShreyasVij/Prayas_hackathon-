# Original User Request

## Initial Request — 2026-09-20T01:55:48+05:30

# Teamwork Project Prompt

> Requested team: Full multi-agent team (larger team handling parallel exploration across all modules)

Review the existing codebase and deliver a high-performance, polished implementation resolving all dashboard latency, emergency QR access, and document viewer UX issues.

Working directory: d:/Prayas_hackathon-
Integrity mode: development

Git branch: `fix/dashboard-emergency-docs-issues`

## Requirements

### R1. Dashboard Performance & Emergency Navigation
- Eliminate UI loading delays on the Dashboard for both "Your AI Health Brief" and the emergency token icon.
- Ensure the Emergency access block "Open" button opens the emergency view smoothly without 404 errors or redirection failures.

### R2. Scan & Upload View Layout & Document Aspect Ratio
- In the Documents tab "Scan and Upload" view, enlarge and center the document preview so it displays at a natural, legible aspect ratio calculated from the uploaded image dimensions.
- Expand and align the view so badges like "AI GENERATED — VERIFIED" are fully visible without horizontal clipping or scrollbar truncation.
- Re-align the extracted vitals table with proper column widths and padding so vital labels, values, and units are never cut off.

### R3. Scanned Documents Modal & Extracted Information Formatting
- When viewing a scanned document, open it as a focused modal window with a dark backdrop that overshadows the background until closed with the close button.
- For single-page images, provide an optimal default aspect ratio and responsive zoom in/out controls.
- For multi-page documents, provide an appropriately proportioned viewer with smooth vertical scrolling.
- Present extracted clinical data cleanly formatted with clear colon separators and consistent indentation (e.g., `Patient Name: Kagstro Woods`), ensuring labels and values are distinctly separated.
- Provide a clear summary section with an action button to generate summaries.

### R4. Emergency Token Public Access & Processing Logs
- Guarantee that the emergency access URL generated from the QR code functions reliably when opened in a new or incognito browser tab without triggering "Access Denied" or false rate-limiting flags.
- Inspect the document and OCR processing logs, diagnose any underlying pipeline warnings or extraction failures, and address them.

## Acceptance Criteria

### Functional & Visual Verification
- [ ] The dashboard loads the AI health brief and emergency token preview immediately without blocking UI rendering.
- [ ] Clicking "Open" on the dashboard emergency card opens the emergency view directly without 404 errors.
- [ ] Emergency access URL loads profile and vital details in a fresh, unauthenticated browser session.
- [ ] The document view modal renders with a darkened backdrop overlay and top-right close control.
- [ ] Document images are displayed using their computed natural aspect ratio without awkward top or bottom cropping.
- [ ] Extracted patient information displays with proper spacing, colons (`:`), and indentation.
- [ ] All automated unit/integration tests pass cleanly (`npm test` in `apps/web`).

## 2026-09-20T02:56:52Z

Deploy an enhanced patient Emergency QR and public responder system ensuring emergency QR codes remain permanent until manual regeneration, resolving to local environment during development and production domain when deployed, displaying full patient profile details alongside previously stored medical documents for emergency responders, and designed to cleanly integrate with the ongoing team-wide migration to Supabase.

Working directory: d:/Prayas_hackathon-
Integrity mode: demo

## Requirements

### R1. Permanent Emergency QR Token Lifecycle
- Emergency QR tokens generated from the patient's Emergency tab must remain permanent by default, persisting indefinitely across sessions without premature expiration.
- The emergency QR code must only be replaced or invalidated when the patient manually initiates a regeneration action within their emergency settings, which immediately revokes the prior token and creates the new permanent token.

### R2. Responder View with Stored Documents & Profile Information
- When first responders or medical personnel scan the QR code or access the emergency responder URL (/emergency/[token]), the public page must load unauthenticatedly without login barriers or false security rate locks.
- The emergency response page and its backing endpoint must present the patient's critical profile details (identity, age/DOB, blood group, allergies, chronic conditions, current medications, emergency contacts with direct call actions).
- The emergency response page must also display the patient's previously stored medical documents and records (document titles, dates, categories, and readable view/preview/download links) so critical history is accessible when an incapacitated patient cannot provide physical documents.

### R3. Environment-Aware URL Resolution (Local vs. Production)
- Emergency QR codes generated during development must resolve to the local site environment (e.g., http://localhost:3000 or the active host derived from configuration/headers).
- When running in production, the QR codes and links must cleanly resolve to the production domain without requiring manual code changes or leaving hardcoded local development hosts.

### R4. Supabase Migration Compatibility & Storage Strategy
- The application is actively migrating from MongoDB to Supabase. The database architecture and storage layer for emergency tokens, QR URLs, and document links must be designed for full Supabase compatibility (e.g., clean DB helper abstraction, compatible schema / table design for emergency_tokens and documents, and graceful handling of local vs. remote DB transitions) so it integrates smoothly when the Supabase branch merges.

## Verification Resources

- Existing test suite in apps/web/test/ (including adversarial-stress-r1-r4.ts).
- Route handlers: apps/web/app/api/emergency/[token]/route.ts and apps/web/app/api/emergency/token/route.ts.
- Components and pages: apps/web/app/emergency/[token]/page.tsx, apps/web/app/emergency/settings/page.tsx, apps/web/components/EmergencyTokenGenerator.tsx, apps/web/components/dashboard/EmergencyQRBox.tsx.
- DB and Supabase abstractions: apps/web/packages/db/ and apps/web/packages/db/supabase.ts.
- Automated test command: npm test inside apps/web.

## Acceptance Criteria

### Token Permanence & Regeneration Lifecycle
- [ ] Emergency QR tokens persist with no automatic expiration and remain valid across system reboots and multiple access scans.
- [ ] Manual token regeneration revokes the prior token (returning appropriate revoked/invalid status if scanned) and immediately issues a new permanent QR code.
- [ ] Patient emergency settings UI clearly displays active permanent QR code status and provides explicit manual regeneration control.

### Public Emergency Details & Document Display
- [ ] Scanning or loading /emergency/[token] unauthenticatedly renders complete patient profile metadata (blood group, allergies, medications, emergency contacts).
- [ ] Stored patient medical documents are returned by the emergency API endpoint and displayed on /emergency/[token] with clickable view/preview access.
- [ ] Emergency access logs record access events without blocking legitimate scans.

### Environment-Aware URL Generation
- [ ] In development, generated QR code links point to the local server host (http://localhost:3000 or configured local origin).
- [ ] In production environments, generated QR code links dynamically use the production base URL configured via environment variables.

### Supabase Compatibility & Schema Preparedness
- [ ] Token and document storage operations are abstracted so that switching/migrating persistence to Supabase requires minimal glue code and zero breaking changes to the emergency QR contracts.
- [ ] Supabase schema/table definitions or dual-support queries are provided for emergency tokens and document associations.

### Regression & Automated Testing
- [ ] Automated tests cover permanent token persistence, manual regeneration revocation, and unauthenticated public document viewing.
- [ ] All test suites pass cleanly (npm test in apps/web).
