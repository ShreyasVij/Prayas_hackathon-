# Comprehensive Investigation Report: Requirements R2 & R3
**Investigator:** `teamwork_preview_explorer_survey_2`  
**Working Directory:** `d:/Prayas_hackathon-/.agents/teamwork_preview_explorer_survey_2`  
**Date:** 2026-09-20  
**Scope:** Requirement R2 (Scan & Upload View Layout & Document Aspect Ratio) & Requirement R3 (Scanned Documents Modal & Extracted Information Formatting) in `apps/web`.

---

## Executive Summary

This investigation analyzed all document-related views, components, and APIs across `apps/web`. The core issues affecting UX in the Documents tab and Document Viewer Modal stem from:
1. **Grid Column Over-Constriction (R2)**: In `apps/web/app/documents/page.tsx` (`viewMode === 'scan'`), the Scan & Upload view places the Upload form in `col-12 col-lg-5` (5/12 width) and cram-packs both the document preview AND the `DocumentReviewForm` into `col-12 col-lg-7` (7/12 width) using two inner `col-12 col-md-6` sub-columns. This gives each only ~29% of the viewport (~300px on standard desktop screens).
2. **Missing Natural Aspect Ratio Calculation (R2 & R3)**: Document previews in the scan view and the viewer modal lack any `naturalWidth` / `naturalHeight` aspect ratio calculation. Single-page images either stretch or rely on unconstrained containers, leading to awkward clipping and poor legibility.
3. **Badge Horizontal Clipping & Truncation (R2)**: Due to the ~300px column restriction in `DocumentReviewForm.tsx`, the `AIBadge` (`AI Generated — Verified`) in the header wraps or is clipped when placed adjacent to the title, forcing container scrollbars and visual truncation.
4. **Vitals Table Column Mismatches (R2 & R3)**: `DocumentReviewForm.tsx` sets `min-w-[340px]` on the vitals table inside a `p-5` card in a ~300px column, guaranteeing horizontal scrollbars. Inflexible column percentage widths (`w-[46%]`, `w-[24%]`, `w-[20%]`, `w-[10%]`) clash with hardcoded input `min-w-*` styles, cutting off vital labels, values, and units (e.g. `mg/dL`, `mmHg`). In the viewer modal, vitals tables lack explicit column widths, causing wrapping and cutoffs.
5. **Viewer Modal Backdrop & Close Control (R3)**: The modal backdrop in `documents/page.tsx` uses a faint `rgba(0, 0, 0, 0.65)` with light blur, failing to overshadow dashboard background elements. The close button is embedded in the toolbar rather than clearly anchoring the top-right corner.
6. **Zoom & Multi-Page Limitations (R3)**: Zoom controls use text symbols (`🔍−`, `🔍+`, `↻`) and scale `width` relative to the container rather than smooth CSS transforms. Multi-page documents lack smooth vertical scrolling (`scroll-behavior: smooth`) and pagination indicators.
7. **Missing Colon Separators & Inconsistent Indentation (R3)**: Extracted patient and clinical information in the modal uses Bootstrap `<dl className="row">` / `<dt className="col-4">` / `<dd className="col-8">` without any colon separators (`:`) and without consistent indentation (e.g. `Patient Name: Kagstro Woods`).
8. **Summary Section & Action Button (R3)**: The summary section uses inconsistent maroon styling (`background: #81102A`), lacks in-modal error feedback if `/api/documents/fast-summarize` fails, and lacks a polished design-system presentation.

---

## 1. Inventory of Target Files & Components

| Component / File Path | Role in R2 & R3 | Current Implementation Notes |
|---|---|---|
| `apps/web/app/documents/page.tsx` | Main documents page: Scan & Upload view, Document List, Document Viewer Modal | Contains both R2 scan/upload layout and R3 viewer modal implementation (1292 lines). Mixed Bootstrap & Tailwind. |
| `apps/web/components/DocumentReviewForm.tsx` | Review & confirmation form for AI-extracted fields | Renders `AIBadge`, Patient Name, DOB, Doctor, Diagnosis, Summary, and Extracted Vitals Table (219 lines). |
| `apps/web/components/ui/ai-badge.tsx` | Reusable AI badge component | Renders Sparkles icon + `AI Generated — Verified` with shimmer animation (41 lines). |
| `apps/web/app/dashboard/documents/[documentId]/page.tsx` | Individual document detail page | Displays single/multi-page previews and patient details dl (399 lines). |
| `apps/web/app/api/documents/fast-summarize/route.ts` | Fast AI summarization API | Accepts `{ documentId, structured }`, saves to `summaries`, returns `{ ok: true, summary }`. |
| `apps/web/app/globals.css` | Global styling & animations | Contains `.ai-badge-shimmer`, animation keyframes, and utilities. |

---

## 2. Deep Dive: Requirement R2 Findings

### 2.1 Preview Sizing & Aspect Ratio Calculation
- **Observation:** In `apps/web/app/documents/page.tsx`:
  - Lines 719–737:
    ```tsx
    <div className="col-12 col-lg-7">
      <div className="card h-100 shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <div className="rounded-3 border h-100 p-2 text-center" style={{ background: "#f7f7f7" }}>
                <div className="text-muted small mb-2">{titleText || 'Original Preview'}</div>
                {previewUrl ? (
                  <div className="position-relative d-inline-block" ...>
                    {isPdf ? (
                      <iframe src={previewUrl + '#toolbar=0&navpanes=0&scrollbar=1'} style={{ width: '100%', height: 360, border: 'none' }} />
                    ) : (
                      <img src={previewUrl || ''} alt="preview" className="img-fluid rounded-3" />
                    )}
    ```
- **Defects:**
  1. The preview is confined to `col-md-6` of `col-lg-7` (~29% of container width).
  2. The image uses `img-fluid` with `d-inline-block`. It does not detect natural width or height.
  3. No `naturalWidth / naturalHeight` aspect ratio calculation exists.
  4. The image is not centered in an enlarged canvas.

### 2.2 Badge Clipping ("AI GENERATED — VERIFIED")
- **Observation:** In `apps/web/components/DocumentReviewForm.tsx`:
  - Lines 55–63:
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
  - In `apps/web/components/ui/ai-badge.tsx`:
    - Lines 20–37:
      ```tsx
      <div className={cn("ai-badge-shimmer relative inline-flex items-center gap-1.5 shrink-0 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-teal-700 select-none", className)}>
        <Sparkles className="h-3 w-3 text-teal-600 shrink-0" strokeWidth={2} />
        {!compact && (
          <span className="text-[10px] font-semibold tracking-wider uppercase whitespace-nowrap">
            AI Generated — Verified
          </span>
        )}
      </div>
      ```
- **Defects:**
  1. Total width required by the title (~170px) + gap (8px) + badge (~165px) is ~343px.
  2. The column is only ~300px wide.
  3. The badge is forced onto a second row or clipped horizontally by card boundaries. If container has `overflow-hidden`, badge text is truncated.

### 2.3 Extracted Vitals Table Cutoff & Padding
- **Observation:** In `apps/web/components/DocumentReviewForm.tsx`:
  - Lines 140–195:
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
        <tbody className="divide-y divide-slate-100">
          <tr key={idx} className="hover:bg-slate-50/50">
            <td className="p-1.5">
              <input className="w-full min-w-[120px] px-2.5 py-1 text-xs rounded-lg ..." value={v.label} />
            </td>
            <td className="p-1.5">
              <input className="w-full min-w-[65px] px-2 py-1 text-xs rounded-lg ..." value={v.value} />
            </td>
            <td className="p-1.5">
              <input className="w-full min-w-[55px] px-2 py-1 text-xs rounded-lg ..." value={v.unit || '-'} />
            </td>
            <td className="p-1.5 text-center">
              <button onClick={() => removeVital(idx)}><Trash2 className="h-3.5 w-3.5" /></button>
            </td>
          </tr>
    ```
- **Defects:**
  1. Total minimum width of inputs alone is 120 + 65 + 55 + 30 = 270px, plus cell padding and table borders.
  2. Inside a 260px container, this triggers `overflow-x-auto`, producing a horizontal scrollbar.
  3. The unit column (`w-[20%]`) is too narrow: 20% of 260px is 52px, which is smaller than `min-w-[55px]` plus padding, cutting off unit text (e.g. `mg/dL`).
  4. The value column (`w-[24%]`) cuts off multi-digit or decimal numbers.

---

## 3. Deep Dive: Requirement R3 Findings

### 3.1 Scanned Document Modal Backdrop & Close Control
- **Observation:** In `apps/web/app/documents/page.tsx`:
  - Lines 890–893:
    ```tsx
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.65)', zIndex: 1050, backdropFilter: 'blur(3px)' }}>
      <div className="bg-white rounded shadow" style={{ width: viewerFullMode ? '98%' : '95%', height: '94%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <div style={{ height: 48, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: '#f8fafc' }}>
    ```
  - Lines 961–975:
    ```tsx
    <button
      className="btn btn-sm btn-outline-danger"
      onClick={() => { setViewerOpen(false); ... }}
      title="Close viewer"
    >
      ✕
    </button>
    ```
- **Defects:**
  1. Backdrop opacity `0.65` allows background cards and tables to remain distractingly visible.
  2. Close button is styled as a generic Bootstrap outline button with character `✕` grouped alongside toolbar buttons, rather than an unmistakable top-right modal window dismissal control.
  3. Modal does not intercept `Escape` keyboard events.

### 3.2 Single-Page Images: Aspect Ratio & Responsive Zoom
- **Observation:** In `apps/web/app/documents/page.tsx`:
  - Lines 905–936:
    ```tsx
    <button className="btn btn-outline-secondary" onClick={() => setViewerZoom(z => Math.max(z - 0.25, 0.5))}>🔍−</button>
    <button className="btn btn-outline-secondary" onClick={() => { setViewerZoom(1); setViewerRotation(0); }}>{Math.round(viewerZoom * 100)}%</button>
    <button className="btn btn-outline-secondary" onClick={() => setViewerZoom(z => Math.min(z + 0.25, 3.5))}>🔍+</button>
    <button className="btn btn-outline-secondary" onClick={() => setViewerRotation(r => (r + 90) % 360)}>↻</button>
    ```
  - Lines 1039–1057:
    ```tsx
    <img
      src={viewerUrl}
      alt={viewerDoc?.docType || "Medical Document"}
      style={{
        maxWidth: viewerZoom === 1 ? '100%' : 'none',
        maxHeight: viewerZoom === 1 ? (viewerFullMode ? '88vh' : '78vh') : 'none',
        width: viewerZoom !== 1 ? `${viewerZoom * 100}%` : 'auto',
        height: 'auto',
        objectFit: 'contain',
        transform: `rotate(${viewerRotation}deg)`,
        transformOrigin: 'center center',
        cursor: viewerZoom > 1 ? 'grab' : 'zoom-in',
      }}
      onClick={() => setViewerZoom(viewerZoom === 1 ? 1.6 : 1)}
    />
    ```
- **Defects:**
  1. When `viewerZoom !== 1`, `width: ${viewerZoom * 100}%` sets width relative to container width rather than the image's intrinsic size, causing portrait documents to distort horizontally.
  2. The natural aspect ratio is not calculated or passed as `aspectRatio: naturalWidth / naturalHeight`.
  3. Zoom controls use raw text symbols rather than responsive icons and polished button states.

### 3.3 Multi-Page Document Proportions & Smooth Scrolling
- **Observation:** In `apps/web/app/documents/page.tsx`:
  - Lines 1002–1025:
    ```tsx
    ) : viewerUrls && viewerUrls.length > 1 ? (
      <div style={{ width: '100%', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '16px' }}>
        {viewerUrls.map((u, idx) => (
          <div key={u + idx} style={{ width: '100%', maxWidth: viewerFullMode ? '1200px' : '850px', textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px', fontWeight: 600 }}>Page {idx + 1}</p>
            <img src={u} alt={`Page ${idx + 1}`} style={{ maxWidth: '100%', maxHeight: viewerFullMode ? '88vh' : '72vh', height: 'auto', objectFit: 'contain', ... }} />
          </div>
        ))}
      </div>
    ```
- **Defects:**
  1. Missing `scrollBehavior: 'smooth'` / `scroll-smooth`.
  2. Lacks sticky page status indicator ("Page X of Y").
  3. `maxHeight: 72vh` on multi-page view constrains vertical scrolling natural flow.

### 3.4 Extracted Clinical Information: Colon Separators & Consistent Indentation
- **Observation:** In `apps/web/app/documents/page.tsx`:
  - Lines 1086–1092:
    ```tsx
    <dl className="row mb-3">
      <dt className="col-4">Patient Name</dt><dd className="col-8">{viewerDoc?.patient_name || '—'}</dd>
      <dt className="col-4">Date of Birth</dt><dd className="col-8">{viewerDoc?.dob || '—'}</dd>
      <dt className="col-4">Doctor Name</dt><dd className="col-8">{viewerDoc?.doctorName || viewerDoc?.doctor_name || '—'}</dd>
      <dt className="col-4">Diagnosis</dt><dd className="col-8">{viewerDoc?.diagnosis || 'no outright diagnosis by the doctor'}</dd>
      <dt className="col-4">Report Date</dt><dd className="col-8">{viewerDoc?.report_date || '—'}</dd>
    </dl>
    ```
  - And in `apps/web/app/dashboard/documents/[documentId]/page.tsx`:
    - Lines 333–358:
      ```tsx
      <div className="flex justify-between">
        <dt className="text-gray-500">Patient</dt>
        <dd className="font-medium">{document.metadata?.patientName || "-"}</dd>
      </div>
      ```
- **Defects:**
  1. Neither file contains colon (`:`) separators.
  2. There is no consistent indentation or distinct label/value alignment (e.g. `Patient Name: Kagstro Woods`).
  3. Violates Acceptance Criteria item 6: *"Extracted patient information displays with proper spacing, colons (:), and indentation."*

### 3.5 Clear Summary Section & Summary Generation Action Button
- **Observation:** In `apps/web/app/documents/page.tsx`:
  - Lines 1157–1218:
    ```tsx
    <div className="d-flex align-items-center justify-content-between mb-1">
      <div className="fw-semibold">Summary</div>
      <button 
        className="btn btn-sm d-inline-flex align-items-center gap-1"
        style={{ background: "#81102A", color: "white" }}
        disabled={summaryLoading}
        onClick={async () => {
          ...
          const res = await fetch('/api/documents/fast-summarize', { ... });
          if (res.ok) {
            setViewerDoc((prev: any) => ({ ...prev, summary_full: data.summary }));
            await refreshDocuments('active');
          } else {
            setError(data?.error || 'Summary generation failed'); // BUG: sets error on background page!
          }
        }}
      >
        <span>{hasSummary ? '🔄 Generate In-Depth Summary' : '✨ Generate Summary'}</span>
      </button>
    </div>
    ```
- **Defects:**
  1. Inconsistent maroon background `#81102A` does not conform to MediLocker's primary teal theme.
  2. Error state calls `setError(...)` (line 1203), which sets the error on the *background* documents page (behind the modal backdrop), while the user inside the modal sees nothing!
  3. No clear in-modal error alert or loading skeleton.
  4. Lacks Lucide icons (`Sparkles`, `RefreshCw`).

---

## 4. Remediation Blueprint

### Step 1: Layout Reconfiguration in `apps/web/app/documents/page.tsx`
Replace the cramped 5-col / 7-col split with a dynamic 2-column workspace for Scan & Upload:
- When idle (no files): Show an inviting upload dropzone with high visibility.
- When files are selected / in review:
  - **Left Column (50% width / `lg:col-span-6`)**: Full-sized Document Preview.
    - Measure image dimensions on load:
      ```tsx
      const [previewAspect, setPreviewAspect] = useState<number | null>(null);
      ```
    - Center and enlarge preview:
      ```tsx
      <div className="flex items-center justify-center p-4 bg-slate-900/5 rounded-2xl min-h-[460px] max-h-[700px] overflow-hidden">
        <img
          src={previewUrl}
          alt="Document Preview"
          style={previewAspect ? { aspectRatio: `${previewAspect}` } : undefined}
          className="max-h-[640px] max-w-full w-auto h-auto object-contain rounded-xl shadow-md border border-slate-200"
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            if (naturalWidth && naturalHeight) {
              setPreviewAspect(naturalWidth / naturalHeight);
            }
          }}
        />
      </div>
      ```
  - **Right Column (50% width / `lg:col-span-6`)**: `DocumentReviewForm` with full width (~580px).

### Step 2: Fix `DocumentReviewForm.tsx` Header & Vitals Table
1. **Header Layout**:
   ```tsx
   <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
     <div className="min-w-0 flex-1">
       <h3 className="text-base font-bold text-zinc-900 truncate">Extracted Clinical Data</h3>
       <p className="text-xs text-zinc-500 truncate">Review and verify AI-extracted fields before saving</p>
     </div>
     <div className="shrink-0">
       <AIBadge />
     </div>
   </div>
   ```
2. **Vitals Table**:
   - Proper column widths: Label: `w-[44%]`, Value: `w-[26%]`, Unit: `w-[20%]`, Delete: `w-[10%]`.
   - Balanced input padding (`px-2.5 py-1.5`), remove conflicting hardcoded `min-w-[120px]`/`min-w-[65px]`/`min-w-[55px]`.
   - Remove confusing hyphen fallback (`'-'`) on unit input.

### Step 3: Enhance Scanned Documents Modal in `documents/page.tsx`
1. **Backdrop & Dismissal**:
   - Set backdrop: `fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6`.
   - Dedicated top-right close control with Lucide `X` icon and `aria-label="Close document viewer"`.
   - Add `Escape` keydown listener to close the modal.
2. **Single-Page Aspect Ratio & Zoom**:
   - Compute natural aspect ratio via `onLoad`:
     ```tsx
     const [modalAspect, setModalAspect] = useState<number | null>(null);
     ```
   - Transform-based zoom:
     ```tsx
     style={{
       aspectRatio: modalAspect ? `${modalAspect}` : 'auto',
       transform: `scale(${viewerZoom}) rotate(${viewerRotation}deg)`,
       transformOrigin: 'center center',
       transition: 'transform 0.15s ease-out',
     }}
     ```
   - Responsive Zoom Controls: Zoom In (`ZoomIn`), Zoom Out (`ZoomOut`), Reset (`100%`), Rotate (`RotateCw`), Full View (`Maximize2` / `Minimize2`), External Link (`ExternalLink`).
3. **Multi-Page Vertical Scrolling**:
   - Apply `scroll-smooth overflow-y-auto` with clean page badges (`Page X of Y`).
4. **Clinical Data Formatting**:
   - Format with clear colon separators and consistent indentation:
     ```tsx
     <div className="space-y-2.5 text-sm bg-slate-50/80 p-4 rounded-xl border border-slate-200">
       <div className="flex items-baseline gap-2">
         <span className="font-semibold text-zinc-700 min-w-[130px] shrink-0">Patient Name:</span>
         <span className="text-zinc-900 font-medium">{viewerDoc?.patient_name || '—'}</span>
       </div>
       <div className="flex items-baseline gap-2">
         <span className="font-semibold text-zinc-700 min-w-[130px] shrink-0">Date of Birth:</span>
         <span className="text-zinc-900 font-medium">{viewerDoc?.dob || '—'}</span>
       </div>
       <div className="flex items-baseline gap-2">
         <span className="font-semibold text-zinc-700 min-w-[130px] shrink-0">Doctor Name:</span>
         <span className="text-zinc-900 font-medium">{viewerDoc?.doctorName || viewerDoc?.doctor_name || '—'}</span>
       </div>
       <div className="flex items-baseline gap-2">
         <span className="font-semibold text-zinc-700 min-w-[130px] shrink-0">Diagnosis:</span>
         <span className="text-zinc-900 font-medium">{viewerDoc?.diagnosis || 'No outright diagnosis'}</span>
       </div>
       <div className="flex items-baseline gap-2">
         <span className="font-semibold text-zinc-700 min-w-[130px] shrink-0">Report Date:</span>
         <span className="text-zinc-900 font-medium">{viewerDoc?.report_date || '—'}</span>
       </div>
       {viewerDoc?.docType && (
         <div className="flex items-baseline gap-2">
           <span className="font-semibold text-zinc-700 min-w-[130px] shrink-0">Record Type:</span>
           <span className="text-zinc-900 font-medium capitalize">{viewerDoc.docType}</span>
         </div>
       )}
     </div>
     ```
5. **Modal Vitals Table**:
   - Style with clean headers and generous column widths: Vital Label (`45%`), Value (`30%`), Unit (`25%`).
6. **Summary Section & Action Button**:
   - In-modal `summaryModalError` state.
   - Action button styled with MediLocker teal: `bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-sm`.
   - Structured summary display for In-Depth Summary, Key Findings, Recommendations, Follow-Ups, and Lifestyle Advice.

---

## 5. Verification Plan

1. **Aspect Ratio Verification**:
   - Upload sample portrait image (e.g. 800x1200) and landscape image (e.g. 1200x800). Verify computed `aspectRatio` matches dimensions without top/bottom cropping.
2. **Badge & Vitals Visibility**:
   - Confirm "AI GENERATED — VERIFIED" badge in `DocumentReviewForm` header is completely visible without wrapping or horizontal clipping.
   - Confirm vital labels, values, and units (including multi-character units like `mg/dL`) are fully readable without table horizontal scrollbars on desktop view.
3. **Modal Overlay & Controls**:
   - Click "View" on any record in the Documents list.
   - Verify backdrop is dark (`bg-black/85`) and completely overshadows background.
   - Verify top-right close button (`X`) closes the modal immediately.
   - Verify `Escape` key closes the modal.
   - Test Zoom In, Zoom Out, Reset, and Rotate controls.
4. **Information Formatting**:
   - Inspect modal sidebar: Confirm all fields display with explicit colons (`:`) and consistent left indentation (`Patient Name: Kagstro Woods`).
5. **Summary Generation**:
   - Click "Generate Summary" / "Generate In-Depth Summary". Confirm loading spinner renders, API call succeeds, and summary updates cleanly.
6. **Automated Test Suite**:
   - Run `npm test` in `apps/web` (verifying `tsx test/profile-update.test.ts` and `tsx test/edge-cases.test.ts`).
