## 2026-09-19T20:26:45Z
Investigate Requirement R2: Scan & Upload View Layout & Document Aspect Ratio and R3: Scanned Documents Modal & Extracted Information Formatting.

Key Requirements:
- In the Documents tab "Scan and Upload" view, enlarge and center the document preview so it displays at a natural, legible aspect ratio calculated from the uploaded image dimensions.
- Expand and align the view so badges like "AI GENERATED — VERIFIED" are fully visible without horizontal clipping or scrollbar truncation.
- Re-align the extracted vitals table with proper column widths and padding so vital labels, values, and units are never cut off.
- When viewing a scanned document, open it as a focused modal window with a dark backdrop that overshadows the background until closed with the close button (top-right control).
- For single-page images, provide an optimal default aspect ratio and responsive zoom in/out controls.
- For multi-page documents, provide an appropriately proportioned viewer with smooth vertical scrolling.
- Present extracted clinical data cleanly formatted with clear colon separators and consistent indentation (e.g., `Patient Name: Kagstro Woods`), ensuring labels and values are distinctly separated.
- Provide a clear summary section with an action button to generate summaries.
