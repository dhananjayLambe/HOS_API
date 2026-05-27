# Order Completion UX — Phase 1 (UI + mock data)

Reports page only: `/lab-dashboard/reports/`

The new order-completion UI is **on by default** (Phase 1 mock data).

- Legacy queue: `?legacy=1` or `NEXT_PUBLIC_LAB_ORDER_COMPLETION_UX=false`

## What shipped

- Compact order cards (max 5 rows) with report chips, TAT urgency, next action, contextual CTAs
- Sticky search (patient / order / phone)
- Needs Attention pinned section
- Tiny filter chips: All, Pending Upload, Ready To Send, Urgent, Failed, Delivered
- Owner KPI strip (click to filter)
- Patient grouping with auto-collapse at 5+ orders
- Upload drawer (no wizard); `/lab-dashboard/reports/upload` redirects here
- **Multi-artifact upload drawer** — drag/drop PDF, PNG, CSV, XLSX, TXT, ZIP; staged file rows with icons; inline preview; filename toast on save
- Send Available dialog, batch Send All bar, Edit Number on delivery failure
- In-card success toasts (auto-dismiss)

## Artifact model (Phase 1b)

- One test line → one report → **many file artifacts** (matches backend `DiagnosticReportArtifact`)
- Supported types: `.pdf`, `.jpg`, `.jpeg`, `.png`, `.csv`, `.xlsx`, `.txt`, `.zip` (25MB max, shared with legacy wizard validation)
- Drawer shows **Already Uploaded** and **Uploading Now** as separate compact sections
- Staged file rows use direct `[Preview] [Remove]` actions; preview renders only after staff clicks Preview
- Preview panel supports PDF/image iframe and spreadsheet parse panel without auto-rendering every file
- Mock `markReportUploaded` appends artifacts and sets report to ready; toast uses actual filename(s)

## Unchanged

- `/lab-dashboard/orders/` and all other lab routes

## Mock scenarios

See `lib/labs/reports/completion/order-lifecycle-demo.ts` — partial upload, delivery failure, STAT, TAT breach, multi-order patient (Rahul), batch-ready orders.
