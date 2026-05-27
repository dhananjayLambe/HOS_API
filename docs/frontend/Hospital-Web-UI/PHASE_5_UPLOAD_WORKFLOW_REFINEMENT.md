# Phase 5 — Upload Workflow Operational Refinement

Operational refinement of the existing lab report upload route (`/lab-dashboard/reports/upload`). No parallel upload UI, no layout redesign, no modal-heavy flows.

## Route

| Param | Purpose |
|-------|---------|
| `taskId` | Task-scoped upload (required for deep-link from queue) |
| `reportId` | Parsed, reserved for future correction/targeted upload |
| `returnUrl` | Safe return path for invalid-task CTA and shell back (must start with `/lab-dashboard`) |
| `demo` | Preserved demo flag |

Helpers: `lib/labs/reports/upload/upload-route.ts`

## Task context ownership

- Upload page loads task detail via `useReportTaskContext` + `upload-task-context-adapter.ts`
- **Never** hydrates from reports queue React Query cache
- Survives direct refresh and deep-link

## Workflow machine

`lib/labs/reports/upload/upload-workflow-machine.ts` — pure transitions, `canAdvance`, `canSubmit`, `getBlockedReason`.

Steps with `taskId`: Upload → Preview → Confirm → Success.  
Without `taskId`: Select task → same chain.

## Draft storage

- Key: `report-upload-draft:${taskId}`
- Schema: `{ version: 1, savedAt, taskId, filesMeta, primaryFileId, verified }`
- TTL: 24 hours
- Legacy `lab-report-draft:*` migrated on read
- **Metadata only** — banner: *Please reselect report files to continue.*

## Primary report selection

Priority: PDF → image → spreadsheet → other. UI label: **Primary report**.

## Components

| Component | Role |
|-----------|------|
| `UploadWorkflowStepper` | 3-step stepper + a11y |
| `UploadTaskSummarySidebar` | Sticky desktop / collapsible mobile summary |
| `UploadExistingReports` | Read-only historical context |
| `UploadDropzone` | Browse-first + drag-drop |
| `UploadAttachmentRow` | Dense operational file rows |
| `UploadPreviewStep` | Verification-first preview |
| `UploadConfirmationStep` | Healthcare verification checkbox |
| `UploadSuccessStep` | Lifecycle-aligned success + mock WhatsApp CTA |
| `UploadWorkflowActionBar` | Fixed bottom bar + safe-area + disabled reasons |

Thin re-exports kept for migration: `ReportUploadStepper`, `UploadSummaryPanel`, `PreviewStep`, etc.

## Tests

Vitest under `lib/labs/reports/upload/*.test.ts` — route, draft, primary, validation, stepper, workflow machine, adapter.

## Non-goals

Chunked uploads, server drafts, custom PDF renderer, WhatsApp UI simulation, queue-cache hydration for upload page, correction UI.

## UI polish pass (layout v2)

- Folder structure: `upload/layout/`, `steps/`, `sidebar/`, `footer/`, `shared/` (thin re-exports at legacy paths)
- `UploadWorkflowLayout` — page max-width, grid, footer padding compensation
- `REPORT_UPLOAD_FOOTER_HEIGHT` (`72px`) + `uploadFooterPaddingStyle` in `upload-layout-styles.ts`
- `--lab-shell-header-height` on `DashboardHeader`; `labStickyBelowHeader` token
- `UploadStepStatus` async-ready stepper states
- Client file validation: duplicate / unsupported / too large (`upload-file-validation.ts`)
- Footer `z-[45]`, grouped actions, mobile full-width CTA
