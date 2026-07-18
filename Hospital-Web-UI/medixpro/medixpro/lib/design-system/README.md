# DoctorProCare Clinical Design System

Lightweight tokens and primitives for clinical EMR modules (Reports, Prescriptions, Consultations, Labs, Patient Profile).

## Goals

- Premium clinical UI (Epic / Athena-like confidence), not admin/CRM aesthetics
- Consistent elevation, status colors, typography, and spacing
- Dark-mode-ready CSS variables (theme not enabled in Phase 1)

## Tokens

Defined in `app/globals.css` under `:root` (and stubbed under `.dark`):

| Token | Purpose |
|-------|---------|
| `--clinical-surface-page` | Level 1 page background |
| `--clinical-surface-section` | Level 2 primary sections |
| `--clinical-surface-interactive` | Level 3 hover / interactive fill |
| `--clinical-border-subtle` / `--clinical-divider` | Soft borders |
| `--clinical-text-primary` / `secondary` / `meta` | Typography hierarchy |
| `--clinical-accent-available` (+ `-soft`) | Blue — available / reviewed |
| `--clinical-accent-awaiting` (+ `-soft`) | Amber — awaiting results |
| `--clinical-accent-updated` (+ `-soft`) | Purple — corrected / updated |
| `--clinical-accent-critical` (+ `-soft`) | Red — critical |
| `--clinical-accent-archived` (+ `-soft`) | Gray — archived |

Helpers and class presets live in [`clinical.ts`](./clinical.ts).

## Elevation levels

1. **Page** — no border; page background only (`surfacePage` / `ClinicalSurface variant="page"`)
2. **Section** — light border + soft shadow (`surfaceSection` / `variant="section"`)
3. **Interactive** — hover tint / chips / rows (`surfaceInteractive` / KPI cards / filter chips)

## Primitives

Import from `@/components/clinical`:

| Component | Use for |
|-----------|---------|
| `ClinicalSurface` | Page / section wrappers |
| `ClinicalStatusBadge` | Clinical report status chips |
| `ClinicalFilterChip` | Quick filter pills |
| `ClinicalKpiCard` | Queue / KPI strip cards |
| `ClinicalEmptyState` | Empty lists with helpful copy |
| `ClinicalSectionHeader` | Section titles |

## Status mapping

| Clinical status | Tone |
|-----------------|------|
| `REPORT_AVAILABLE`, `PENDING_REVIEW`, `REVIEWED` | Available (blue) |
| `AWAITING_REPORT` | Awaiting (amber) |
| `CORRECTED` | Updated (purple) |
| `ARCHIVED` | Archived (gray) |
| Critical flag (`isCritical`) | Critical (red) — separate badge |

## Helpers

- `formatArtifactTabLabel("CBC Report.pdf")` → `"CBC Report"`
- `clinicalStatusBadgeClasses(status)` — badge class string
- `kpiTintForQueue("needs_review" | "critical" | "awaiting")`
- Typography: `typePageTitle`, `typeSectionTitle`, `typePatientName`, `typeTableHead`, `typeMeta`
- Rows: `rowHover`, `rowSelected`, `rowZebra`

## Adopting in a new module

1. Prefer CSS variables / `clinical.ts` presets over hard-coded `red-50` / `slate-200`
2. Wrap primary panels in `ClinicalSurface variant="section"`
3. Use `ClinicalStatusBadge` / `ClinicalFilterChip` for status and filters
4. Keep motion to `transition-colors duration-150` unless interaction needs more

## First consumer

Diagnostic Reports Workspace under `components/doctor/diagnostic-reports-workspace/`.

**Consultation CDS (Phase 1):** mid-consult `ConsultationReportsDrawer` embeds `ConsultationClinicalReportsPanel` (clinical summary, timeline, modality filters, clinical empty state). The full-page `/lab-tests-reports` route keeps the operational workspace chrome.