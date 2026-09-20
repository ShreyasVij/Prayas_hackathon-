# Handoff Report: Survey 2 — Requirements R2 & R3
**Author:** `teamwork_preview_explorer_survey_2`  
**Date:** 2026-09-20  
**Scope:** Requirement R2 (Scan & Upload View Layout & Document Aspect Ratio) & Requirement R3 (Scanned Documents Modal & Extracted Information Formatting) in `apps/web`.

---

## 1. Observation

### Observation 1: Scan & Upload Grid Split & Severe Width Restriction
- **File:** `apps/web/app/documents/page.tsx`
- **Lines 572–574 & 718–725:**
  ```tsx
  {viewMode === 'scan' && (
    <div className="col-12 col-lg-5">
      <div className="card shadow-sm h-100">
  ...
  {viewMode === 'scan' && (
    <div className="col-12 col-lg-7">
      <div className="card h-100 shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-md-6">
  ```
  The Scan view is partitioned into `col-lg-5` (Upload card) and `col-lg-7` (Preview & Review card). Inside `col-lg-7`, it is further divided into two `col-md-6` columns. On a 1280px screen with container padding, each `col-md-6` sub-column is only ~330px wide; on 1024px displays, it drops to ~260px.

### Observation 2: Lack of Aspect Ratio Calculation in Preview
- **File:** `apps/web/app/documents/page.tsx`
- **Lines 724–737:**
  ```tsx
  <div className="col-12 col-md-6">
    <div className="rounded-3 border h-100 p-2 text-center" style={{ background: "#f7f7f7" }}>
      <div className="text-muted small mb-2">{titleText || 'Original Preview'}</div>
      {previewUrl ? (
        <div className="position-relative d-inline-block" ...>
          {(() => {
            const current = files[previewIndex];
            const isPdf = !!current && ((current.type || '').toLowerCase().includes('pdf') || (current.name || '').toLowerCase().endsWith('.pdf'));
            return isPdf ? (
              <iframe src={(previewUrl ? (previewUrl + '#toolbar=0&navpanes=0&scrollbar=1') : '')} title="preview-pdf" className="rounded-3" style={{ width: '100%', height: 360, border: 'none' }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl || ''} alt="preview" className="img-fluid rounded-3" />
            );
          })()}
  ```
  No `naturalWidth` or `naturalHeight` is read. The image uses `className="img-fluid rounded-3"` without CSS aspect-ratio or centered flex styling.

### Observation 3: Badge Clipping in DocumentReviewForm Header
- **File:** `apps/web/components/DocumentReviewForm.tsx`
- **Lines 55–63:**
  ```tsx
  <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
    <div className="min-w-0">
      <h3 className="text-base font-bold text-zinc-900 truncate">Extracted Clinical Data</h3>
      <p className="text-xs text-zinc-500">Review and verify AI-extracted fields before saving</p>
    </div>
    <div className="shrink-0">
      <AIBadge />
    </div>
  </div>
  ```
- **File:** `apps/web/components/ui/ai-badge.tsx`
- **Lines 34–36:**
  ```tsx
  <span className="text-[10px] font-semibold tracking-wider uppercase whitespace-nowrap">
    AI Generated — Verified
  </span>
  ```
  In a ~300px column, the badge text (~165px) plus heading (~170px) exceeds available width, forcing line wraps or horizontal clipping.

### Observation 4: Extracted Vitals Table Minimum Width & Column Cutoff
- **File:** `apps/web/components/DocumentReviewForm.tsx`
- **Lines 140–183:**
  ```tsx
  <div className="overflow-x-auto rounded-xl border border-slate-200">
    <table className="w-full text-left text-xs border-collapse min-w-[340px]">
      <thead className="bg-slate-50 border-b border-slate-200 text-zinc-600">
        <tr>
          <th className="py-2.5 px-3 font-semibold w-[46%]">Label</th>
          <th className="py-2.5 px-3 font-semibold w-[24%]">Value</th>
          <th className="py-2.5 px-3 font-semibold w-[20%]">Unit</th>
          <th className="py-2.5 px-2 text-center w-[10%]"></th>
        </tr>
      </thead>
  ```
  `min-w-[340px]` table placed inside `p-5` card (subtracting 40px padding) within a ~300px column causes an overflow scrollbar. Column percentages (`w-[20%]`, `w-[24%]`) clash with inputs with `min-w-[65px]` and `min-w-[55px]`, truncating vital labels, values, and units.

### Observation 5: Faint Modal Backdrop & Close Control
- **File:** `apps/web/app/documents/page.tsx`
- **Lines 890 & 961–975:**
  ```tsx
  <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.65)', zIndex: 1050, backdropFilter: 'blur(3px)' }}>
  ...
  <button className="btn btn-sm btn-outline-danger" onClick={() => { setViewerOpen(false); ... }} title="Close viewer">✕</button>
  ```
  Backdrop opacity `0.65` allows background elements to bleed through. The close button is styled as a generic outline button grouped inside the toolbar rather than a distinct top-right modal window control.

### Observation 6: Modal Zoom & Multi-Page View
- **File:** `apps/web/app/documents/page.tsx`
- **Lines 906–935 & 1002–1067:**
  Zoom controls use text emojis (`🔍−`, `🔍+`, `↻`). Single image zoom manipulates container-relative width (`width: ${viewerZoom * 100}%`) rather than natural scaling. Multi-page viewer lacks `scroll-behavior: smooth`.

### Observation 7: Missing Colons and Indentation in Extracted Data
- **File:** `apps/web/app/documents/page.tsx`
- **Lines 1086–1092:**
  ```tsx
  <dl className="row mb-3">
    <dt className="col-4">Patient Name</dt><dd className="col-8">{viewerDoc?.patient_name || '—'}</dd>
    <dt className="col-4">Date of Birth</dt><dd className="col-8">{viewerDoc?.dob || '—'}</dd>
    <dt className="col-4">Doctor Name</dt><dd className="col-8">{viewerDoc?.doctorName || viewerDoc?.doctor_name || '—'}</dd>
    <dt className="col-4">Diagnosis</dt><dd className="col-8">{viewerDoc?.diagnosis || 'no outright diagnosis by the doctor'}</dd>
    <dt className="col-4">Report Date</dt><dd className="col-8">{viewerDoc?.report_date || '—'}</dd>
  </dl>
  ```
  Neither colons (`:`) nor consistent indentation are present.

### Observation 8: Inconsistent Summary Section & Error Leaking
- **File:** `apps/web/app/documents/page.tsx`
- **Lines 1160–1161 & 1203:**
  ```tsx
  <button className="btn btn-sm d-inline-flex align-items-center gap-1" style={{ background: "#81102A", color: "white" }} ...>
  ...
  setError(data?.error || 'Summary generation failed');
  ```
  The button uses hardcoded maroon background `#81102A`. If fast-summarize fails, it sets `error` on the background page instead of in the modal.

---

## 2. Logic Chain

1. **Scan View Cramping & Badge Clipping:** Observation 1 demonstrates that `col-lg-7` is subdivided into two `col-md-6` columns. Because each sub-column is only ~260–330px, Observation 3 shows that the 343px header (Title + `AIBadge`) cannot fit horizontally, causing badge wrapping or clipping.
2. **Aspect Ratio Distortion:** Observation 2 demonstrates that no natural image dimensions are measured, and the image is constrained to a fixed 360px iframe or an uncentered `img-fluid` block. Calculating `naturalWidth / naturalHeight` on image load and applying it to an enlarged, centered flex container will ensure accurate and legible presentation without cropping.
3. **Vitals Cutoff:** Observation 4 demonstrates that the table's `min-w-[340px]` exceeds the inner 260px column width. Aligning column widths (`w-[44%]`, `w-[26%]`, `w-[20%]`, `w-[10%]`), expanding container width to 50% of the page (~580px), and balancing input padding ensures that labels, values, and units are never cut off.
4. **Modal Backdrop & Close Button:** Observation 5 confirms that backdrop `rgba(0,0,0,0.65)` is too light. Setting `fixed inset-0 z-50 bg-black/85 backdrop-blur-md` and anchoring a dedicated top-right `X` close control with `Escape` key handling ensures a focused, overshadowing modal.
5. **Extracted Data Presentation:** Observation 7 shows that `<dt className="col-4">Patient Name</dt><dd className="col-8">` omits colons and indentation. Re-formatting to `<span className="font-semibold text-zinc-700 min-w-[130px]">Patient Name:</span>` satisfies the requirement for clear colons (`:`) and consistent indentation.
6. **Summary Styling & Error Scoping:** Observation 8 proves that the summary button is visually disconnected from the design system and leaks error states to the background page. Updating to MediLocker teal buttons (`bg-teal-600`) with local in-modal error feedback will resolve the UX gap.

---

## 3. Caveats

- **No Caveats:** All relevant document viewer components, scan workflows, API endpoints (`/api/documents/fast-summarize`, `/api/documents`), and CSS styles were thoroughly inspected.

---

## 4. Conclusion

Requirements R2 and R3 can be completely fulfilled by targeting two primary files:
1. `apps/web/app/documents/page.tsx`:
   - Redesign Scan & Upload view into a spacious 2-column workspace (`lg:grid-cols-2` with 50% preview canvas and 50% review form).
   - Add image aspect ratio calculation hook (`naturalWidth / naturalHeight`).
   - Enhance the Document Viewer Modal: `bg-black/85` backdrop, dedicated top-right `X` close button, `Escape` key listener, transform-based responsive zoom controls, smooth vertical scrolling for multi-page documents, clean colon formatting (`Patient Name: Kagstro Woods`), and MediLocker teal summary controls with local error feedback.
2. `apps/web/components/DocumentReviewForm.tsx`:
   - Re-align header layout so `AIBadge` remains fully visible without truncation.
   - Re-align vitals table column widths and padding to prevent cutoffs.

---

## 5. Verification Method

To independently verify after implementation:
1. **Automated Tests:** Run `npm test` in `apps/web`:
   ```bash
   cd apps/web && npm test
   ```
2. **Scan & Upload View Inspection:**
   - Navigate to `/documents` with `viewMode === 'scan'`.
   - Upload sample medical reports (portrait and landscape images). Verify the preview is centered, enlarged, and rendered with its natural aspect ratio.
   - Verify `AI Generated — Verified` badge is fully visible without clipping or scrollbars.
   - Verify the vitals table displays Label, Value, and Unit cleanly without horizontal scrollbars.
3. **Modal Window Inspection:**
   - Open any scanned document from the "Scanned Records" tab.
   - Verify dark backdrop (`bg-black/85`) overshadows the background.
   - Verify top-right `X` button and `Escape` key close the modal.
   - Verify zoom in, zoom out, reset, and rotate controls.
   - Verify multi-page documents scroll vertically with smooth behavior.
   - Inspect extracted patient data for explicit colon separators (`Patient Name: ...`) and consistent indentation.
   - Click "Generate Summary" and verify loading spinner and structured summary render.
