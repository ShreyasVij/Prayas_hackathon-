## 2026-09-19T20:33:00Z
You are a teamwork_preview_worker.
Your identity: teamwork_preview_worker_m2.
Your working directory: d:/Prayas_hackathon-/.agents/teamwork_preview_worker_m2
Read:
- d:/Prayas_hackathon-/ORIGINAL_REQUEST.md
- d:/Prayas_hackathon-/PROJECT.md
- d:/Prayas_hackathon-/.agents/teamwork_preview_explorer_survey_2/analysis.md
- d:/Prayas_hackathon-/.agents/teamwork_preview_explorer_survey_2/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE FILE OWNERSHIP:
You exclusively own and may edit:
- apps/web/app/documents/page.tsx
- apps/web/components/DocumentReviewForm.tsx
- apps/web/components/ui/ai-badge.tsx
DO NOT modify any other files.

TASKS (Requirements R2 & R3: Scan & Upload View Layout, Aspect Ratio, Modal & Extracted Formatting):
1. Requirement R2:
   - In apps/web/app/documents/page.tsx, enlarge and center the document preview in Scan and Upload view. Restructure into a spacious 2-column workspace (`lg:grid-cols-2` with 50% preview canvas and 50% review form).
   - Calculate natural aspect ratio from uploaded image dimensions (`naturalWidth / naturalHeight` on image load) and apply it so the preview displays at a natural, legible aspect ratio without awkward top or bottom cropping.
   - In apps/web/components/DocumentReviewForm.tsx and apps/web/components/ui/ai-badge.tsx, expand and align the view so badges like "AI GENERATED — VERIFIED" are fully visible without horizontal clipping or scrollbar truncation.
   - Re-align the extracted vitals table with proper column widths (e.g. Label 44%, Value 26%, Unit 20%, Delete action 10%) and balanced padding so vital labels, values, and units are never cut off.
2. Requirement R3:
   - In apps/web/app/documents/page.tsx, when viewing a scanned document, open it as a focused modal window with a dark backdrop (`bg-black/85` or `rgba(0,0,0,0.85)` + `backdrop-blur-md`) that overshadows the background until closed with the close button.
   - Anchor a dedicated top-right close control (`✕` button) with `Escape` key listener.
   - For single-page images, provide an optimal default aspect ratio and responsive zoom in/out controls (+, -, reset, rotate).
   - For multi-page documents, provide an appropriately proportioned viewer with smooth vertical scrolling (`scroll-behavior: smooth`).
   - Present extracted clinical data cleanly formatted with clear colon separators (`:`) and consistent indentation (e.g., `Patient Name: Kagstro Woods`), ensuring labels and values are distinctly separated.
   - Provide a clear summary section with an action button to generate summaries, with loading state and in-modal error feedback.
3. Run test verification in `apps/web`.
4. Document all changes and verification results in `d:/Prayas_hackathon-/.agents/teamwork_preview_worker_m2/handoff.md`.
5. Send a message to orchestrator upon completion.
