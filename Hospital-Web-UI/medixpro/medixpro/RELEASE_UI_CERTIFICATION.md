# Release UI Certification

**Status:** Active engineering standard  
**Applies to:** Every production release (first use: September DoctorProCare launch)  
**Scope:** Medixpro frontend (`Hospital-Web-UI/medixpro`)  
**Peers:** Feature Freeze · Security Review · Production Readiness · End-to-End Testing

---

## Purpose

Certify that every in-scope page **behaves correctly for a real doctor**.

This is a **release gate**, not a redesign exercise and not an ad hoc “find UI bugs” pass.

### Non-goals

- UI redesign or visual refresh
- New product features
- Opinion-based polish without acceptance criteria

### How to use

1. Confirm **Entry Criteria** for the page.
2. Audit **one page at a time** against Must Pass categories (Pass / Fail / N/A).
3. Log findings with severity, evidence, ownership, and regression risk.
4. Resolve all **P0** and **P1** findings.
5. Validate applicable **clinical workflow paths**.
6. Record **PASS** or **FAIL** with sign-off (Definition of Done).

---

## Overall Release Dashboard

Status values: `Not started` | `In review` | `Blocked` | `Certified` | `Not eligible`

| # | Page | Route | Status | Owner | Release | Notes |
|---|------|-------|--------|-------|---------|-------|
| 1 | Doctor Dashboard | `/doctor-dashboard` | In review | Frontend | TBD | Wave 1 — Milestone 1 workflow audit complete; P0/P1 fixed; awaiting PO/QA sign-off |
| 2 | Patients list | `/patients` | Not started | Frontend | TBD | Wave 1 |
| 3 | Patient Summary | `/patients/[id]` | Not started | Frontend | TBD | Wave 1 |
| 4 | Start Consultation | `/consultations/start-consultation` | Not started | Frontend | TBD | Wave 1 |
| 5 | Pre-Consultation | `/consultations/pre-consultation` | Not started | Frontend | TBD | Wave 1; include dynamic variant if production |
| 6 | Active Consultation | `/consultations/consultation/[encounterId]` | Not started | Frontend | TBD | Wave 1 |
| 7 | Create Prescription | `/prescriptions/create` | Not started | Frontend | TBD | Wave 1 |
| 8 | Prescription detail / completed | `/prescriptions/[id]`, `/prescriptions/completed/[encounterId]` | Not started | Frontend | TBD | Wave 1 |
| 9 | Diagnostic Reports Workspace | `/lab-tests-reports` | Not started | Frontend | TBD | Wave 1 |
| 10 | Appointments | `/appointments`, `/appointments/[id]` | Not started | Frontend | TBD | Wave 1 |
| 11 | Prescriptions list | `/prescriptions` | Not started | Frontend | TBD | Wave 1 |
| 12 | Templates | `/doctor/templates` or `/prescriptions/templates` | Not started | Frontend | TBD | Wave 1 |

**Wave 2+ (tracked, not default release blockers):** admin ops, lab-dashboard, helpdesk, patient-dashboard — certify only if they gate the release.

### Workflow path dashboard

| Workflow | Status | Last validated | Release |
|----------|--------|----------------|---------|
| Consultation | In review | 2026-07-18 (dashboard handoff only) | TBD |
| Diagnostics | Not started | — | TBD |
| Prescription | Not started | — | TBD |

---

## Entry Criteria

A page is eligible for certification **only when all** of the following are true:

- [ ] Functional development for the page is completed
- [ ] Backend APIs for the page are finalized
- [ ] Mock / demo data removed from the production path
- [ ] Feature flags for the page are finalized
- [ ] Page is QA-ready
- [ ] No known blocking backend defects for this surface

If any item fails, mark the page **Not eligible**. Do not audit unfinished work.

---

## Exit Criteria and severity

### Release blockers (cannot certify / cannot ship the page)

- Broken clinical workflow
- Data loss
- Wrong patient, encounter, prescription, or report shown
- Permission / authorization failure
- Broken navigation or dead critical actions
- Unhandled API failure or UI crash

### Non-blocking (does not fail certification by itself)

- Padding, minor alignment, typography, cosmetic spacing

### Severity model

| Severity | Release impact |
|----------|----------------|
| **P0** | Release blocker |
| **P1** | Must fix before release |
| **P2** | Fix in current sprint |
| **P3** | Backlog |
| **P4** | Enhancement |

**Certification requires all P0 and P1 findings resolved** (with PR and Fixed Version recorded).

---

## Definition of Done

A page is **Certified** only when:

- [ ] Entry criteria were met at audit start
- [ ] Must Pass checklist complete (every category **Pass** or explicit **N/A**)
- [ ] All P0 / P1 findings resolved
- [ ] Applicable clinical workflow path(s) validated
- [ ] Patient Safety checks pass
- [ ] Product owner sign-off
- [ ] QA sign-off
- [ ] No known regressions on Affected modules
- [ ] Final certification recorded as **PASS**

---

## Browser matrix

Minimum supported browsers for certification:

| Browser | Required |
|---------|----------|
| Chrome (latest stable) | Yes |
| Edge (latest stable) | Yes |
| Safari (latest stable) | Yes |
| Firefox (latest stable) | Yes |

If a browser is unsupported for a release, document it explicitly in the page audit header. Do not silently skip.

### Viewport checks

For each page, verify layouts at:

- 1024px
- 768px
- 600px

Desktop remains primary; tablet/mobile must not break.

---

## Performance budgets

Approximate budgets for Wave 1 clinical pages (adjust per release if measured baselines differ; document overrides in the page audit):

| Metric | Target |
|--------|--------|
| First meaningful content (no blank flash) | ≤ 2s on typical clinic network |
| Critical list/API spinner visible until data or error | No empty flash; spinner/skeleton ≤ 5s before error/empty state |
| Critical API round-trip (UI wait) | Prefer ≤ 3s; show error + Retry if exceeded without data |
| Large list (100+ rows) initial render | No multi-second freeze; virtualize or paginate if needed |
| Duplicate identical requests on mount | None (flag as finding) |

Performance failures that block clinical use are **P0/P1**. Cosmetic jank without workflow impact is **P2+**.

---

## Accessibility gate

Minimum requirements (not mouse-only):

- [ ] Visible focus for interactive controls
- [ ] Keyboard can complete primary actions
- [ ] Form controls have labels
- [ ] Text/icon contrast adequate for clinical reading
- [ ] Screen-reader compatible where applicable (critical identity and actions)

---

## Must Pass categories

For each category on a page audit, record **Pass**, **Fail**, or **N/A**.

Use **N/A** when the page has no upload, pagination, dialogs, etc. Do not invent findings.

### 1. Empty States

Intentional empty UI with message and next action. No blank white page, empty table without copy, or broken grid.

### 2. Loading States

Spinner, skeleton, or shimmer. No flash of empty content while loading.

### 3. Error States

User-readable message + Retry (or equivalent). No raw `TypeError`, `undefined`, or bare `500`.

### 4. Long Data

Long patient names, medicine names, report names, lab names do not overflow or obscure clinical identity.

### 5. Mobile / Tablet

No broken layouts at 1024 / 768 / 600.

### 6. Button Consistency

Loading, disabled, success, and error feedback where actions mutate data. No forever-clickable Save.

### 7. Form Validation

Required fields, invalid dates, phone, email, duplicate submit guard, large text handled.

### 8. Search

Empty search, special characters, very long text, no results, case-insensitive behavior.

### 9. Filters

Changing filters updates results, resets pagination, keeps URL in sync, resets correctly.

### 10. Pagination

Next / Previous / first / last / empty page / filter + pagination.

### 11. Navigation

Every critical control goes somewhere. No dead buttons. Back navigation and deep links work.

### 12. URL Sync

Tabs, filters, and search survive refresh.

### 13. Refresh

Reload does not lose required context or show incorrect empty/error without recovery.

### 14. Browser Back

Back returns to the previous clinical step correctly.

### 15. Scroll Position

Back restores previous scroll where expected.

### 16. Accessibility

Meets Accessibility gate above.

### 17. Colors

Status colors, disabled buttons, badges, hover states are consistent and readable.

### 18. Icons

No missing, wrong, broken, or misaligned icons on critical paths.

### 19. Tables

Sorting (if present), alignment, sticky header (if present), empty rows, horizontal scroll when needed.

### 20. Cards

Equal spacing, padding, margins, radius, alignment where cards are used for interaction.

### 21. Typography

Consistent heading hierarchy, sizes, and line spacing.

### 22. Dialogs

Open, close, ESC, click outside, loading, and error behavior.

### 23. Toast Messages

Create / update / delete / upload actions provide feedback.

### 24. File Upload

Wrong type, large file, multiple files, cancel, progress, retry.

### 25. Permissions

Hide, disable, read-only, and unauthorized states are correct.

### 26. Date Formatting

Consistent format across the page (prefer one product standard; IST context).

### 27. Time Zone

IST everywhere for clinical timestamps unless explicitly product-documented otherwise.

### 28. Clinical Workflow

Doctor can finish the applicable workflow path for this page (see Workflow paths).

### 29. Performance

Meets Performance budgets; no large unnecessary re-renders, duplicate API calls, or unused requests on critical paths.

### 30. Visual Consistency

Spacing, button sizes, headers, cards, tabs, badges align with neighboring clinical pages.

### 31. State Consistency

Refresh, multi-tab, cache invalidation, browser back, duplicate requests, and stale data after navigation are correct (especially React Query caches).

### 32. Patient Safety (mandatory)

- Correct patient displayed
- Correct encounter
- Correct prescription
- Correct report
- No stale patient after navigation
- No accidental destructive action without confirmation

### Healthcare add-ons (evaluate on every clinical page)

**Clinical Safety**

- Patient identifiers not truncated in a confusing way
- Name, age, gender, and UHID visible where clinically important
- Destructive clinical actions require confirmation
- Report previews show correct patient context

**Data Integrity**

- Dashboard counts match underlying lists
- Timeline order consistent
- No duplicate cards after refresh
- Status badges match backend state

**Privacy**

- No data from another patient after navigation
- No stale cached data after switching patients
- Clinic-scoped visibility respected

---

## Clinical workflow paths

A release that ships doctor clinical features must pass all applicable paths below.

### Consultation

```text
Login → Patient → Consultation → Prescription → Finish
```

| Field | Value |
|-------|-------|
| Status | In review |
| PASS / FAIL | Partial — dashboard handoff Pass (2026-07-18); full path pending |
| Blocking findings | — |
| Last validated | 2026-07-18 (Login → Dashboard → Start Consultation / View Patient) |

### Diagnostics

```text
Patient → Lab Order → Report Upload → Doctor Review → Preview
```

| Field | Value |
|-------|-------|
| Status | Not started |
| PASS / FAIL | — |
| Blocking findings | — |
| Last validated | — |

### Prescription

```text
Create → Save → Print → WhatsApp → Completed
```

| Field | Value |
|-------|-------|
| Status | Not started |
| PASS / FAIL | — |
| Blocking findings | — |
| Last validated | — |

---

## Page audit template

Copy this block for each page audit.

### Certification header

| Field | Value |
|-------|-------|
| Page | |
| Route | |
| Status | Not started / In review / Blocked / Certified / Not eligible |
| Owner | |
| Date | |
| Reviewer | |
| Commit SHA | |
| Branch | |
| Release | |
| Entry criteria met? | Yes / No |

### Category results

| Category | Result (Pass / Fail / N/A) | Notes |
|----------|---------------------------|-------|
| Empty States | | |
| Loading States | | |
| Error States | | |
| Long Data | | |
| Mobile / Viewport | | |
| Button Consistency | | |
| Form Validation | | |
| Search | | |
| Filters | | |
| Pagination | | |
| Navigation | | |
| URL Sync | | |
| Refresh | | |
| Browser Back | | |
| Scroll Position | | |
| Accessibility | | |
| Colors | | |
| Icons | | |
| Tables | | |
| Cards | | |
| Typography | | |
| Dialogs | | |
| Toast Messages | | |
| File Upload | | |
| Permissions | | |
| Date Formatting | | |
| Time Zone | | |
| Clinical Workflow | | |
| Performance | | |
| Visual Consistency | | |
| State Consistency | | |
| Patient Safety | | |
| Clinical Safety | | |
| Data Integrity | | |
| Privacy | | |

### Final certification

| Field | Value |
|-------|-------|
| Certification | PASS / FAIL |
| Reason | |
| Blocking findings (P0/P1) | |
| Remaining risks | |
| Product owner sign-off | |
| QA sign-off | |

---

## Findings schema

Every finding must include the fields below. Vague findings without evidence are rejected.

| Field | Description |
|-------|-------------|
| ID | e.g. `UI-001` |
| Page / Route | |
| Category | From Must Pass list |
| Severity | P0–P4 |
| Evidence | Screenshot ref, route, browser, resolution, steps to reproduce |
| Root cause | |
| Suggested fix | |
| Regression risk / Affected modules | e.g. Patient Summary → Timeline, Lab History, Overview |
| Owner | e.g. Frontend |
| Component | File or component name |
| GitHub Issue | |
| PR | |
| Fixed Version / Release | |
| Status | Open / In progress / Fixed / Won't fix |

### Findings log

| ID | Page | Category | Severity | Owner | Issue | PR | Status |
|----|------|----------|----------|-------|-------|-----|--------|
| UI-001 | Doctor Dashboard | URL Sync | P1 | Frontend | — | local | Fixed |
| UI-002 | Doctor Dashboard | Navigation | P1 | Frontend | — | local | Fixed |
| UI-003 | Doctor Dashboard | Navigation | P1 | Frontend | — | local | Fixed |
| UI-004 | Doctor Dashboard | Loading States | P3 | Frontend | — | local | Fixed |
| UI-005 | Doctor Dashboard | Visual Consistency | P3 | Frontend | — | — | Open |
| UI-006 | Doctor Dashboard | Navigation | P2 | Frontend | — | — | Open |

---

## Wave 1 page queue

Audit order:

1. `/doctor-dashboard`
2. `/patients`
3. `/patients/[id]`
4. `/consultations/start-consultation`
5. `/consultations/pre-consultation` (+ dynamic variant if production)
6. `/consultations/consultation/[encounterId]`
7. `/prescriptions/create`
8. `/prescriptions/[id]` and `/prescriptions/completed/[encounterId]`
9. `/lab-tests-reports`
10. `/appointments` and `/appointments/[id]`
11. `/prescriptions`
12. `/doctor/templates` or `/prescriptions/templates`

Prefer existing shared patterns when suggesting fixes:

- `components/clinical/ClinicalEmptyState.tsx`
- Route-level `app/**/loading.tsx`
- Domain empty/error components under `components/labs/**` and patient summary

Do not invent a parallel design system during certification.

---

## AI-assisted Audit

Vendor-agnostic. Use with any AI code assistant or human QA. Do **not** treat this process as tool-specific.

### Prompt template

Copy and fill the bracketed fields:

```text
You are performing a Release UI Certification audit for DoctorProCare (medixpro).

This is a RELEASE GATE, not a redesign review. Do not suggest visual redesigns or new features.

## Target
- Page name: [PAGE_NAME]
- Route: [ROUTE]
- Code entry points: [page.tsx path + key components]
- Release: [RELEASE_NAME]
- Branch / Commit: [BRANCH] / [SHA]

## Preconditions
1. Verify Entry Criteria (dev complete, APIs final, mocks removed, flags final, QA-ready, no blocking backend defects).
2. If entry criteria fail, stop and mark the page Not eligible.

## Required output structure

### 1. Certification header
Status, Owner, Date, Reviewer, Commit SHA, Branch, Release

### 2. Category results
For every Must Pass category in RELEASE_UI_CERTIFICATION.md:
Result = Pass | Fail | N/A
Use N/A when the capability does not exist on this page. Do not invent findings.

### 3. Findings
For each finding, output in this order:

Finding
→ Evidence (route, browser, resolution, steps; screenshot ref if available)
→ Root Cause
→ Suggested Fix (prefer existing shared empty/loading/error patterns)
→ Regression Risk (Affected modules)
→ Priority (P0–P4)

Also include: Owner, Component, suggested GitHub Issue title.

### 4. Patient Safety & State Consistency
Explicitly call out pass/fail for wrong patient/encounter/report, stale cache after navigation, multi-tab, refresh, and duplicate requests.

### 5. Final certification
Certification: PASS or FAIL
Reason
Blocking Findings (P0/P1)
Remaining Risks

Do not certify PASS if any P0/P1 remains open.
```

---

## Page audits

### Audit #1: Doctor Dashboard (Milestone 1 — Functional & Clinical Workflow)

#### Certification header

| Field | Value |
|-------|-------|
| Page | Doctor Dashboard |
| Route | `/doctor-dashboard` |
| Status | In review |
| Owner | Frontend |
| Date | 2026-07-18 |
| Reviewer | AI-assisted Audit (Milestone 1) |
| Commit SHA | 9fc76bd (pre-fix baseline; fixes on working tree) |
| Branch | main |
| Release | TBD (September launch Wave 1) |
| Entry criteria met? | Yes — live path is API-backed; orphan mock components (`doctor-appointments`, `doctor-tasks`, `doctor-stats`) are not imported by this page |

#### Milestone 1 scope note

This audit covers functional load, KPI wiring, demo-data check, widget load, navigation, refresh, browser back, URL state, login redirect, and logout. Full visual/a11y certification remains for a later pass.

#### Functional findings

| Area | Result | Notes |
|------|--------|-------|
| Dashboard loads | Pass | Client page + route `loading.tsx`; hooks gate on auth session |
| KPI cards wired | Pass | Today's Appointments / Waiting / Completed ← `useDoctorScheduleTab`; Pending Reports ← `useDoctorPendingReports` |
| No hardcoded demo data on live path | Pass | Values from appointments, metrics, queue, and diagnostics summary APIs |
| Widgets load | Pass | Schedule always; Patients/Reports/Practice Overview lazy-fetch when tab active; 30s polling |
| Refresh / polling | Pass | Soft refetch via hooks; AbortController cancels in-flight requests |
| Login redirect | Pass | Doctor role → `/doctor-dashboard` (`login` + `getRoleRedirectPath`) |
| Logout | Pass | `user-nav` → `authContext.logout` → `/auth/login` |

**KPI / API map**

| Surface | Hook | API |
|---------|------|-----|
| Summary + Schedule | `useDoctorScheduleTab` | `POST /appointments/doctor-appointments/`, `GET /appointments/metrics/today/`, `GET /queue/doctor/{doctorId}/{clinicId}/` |
| Pending Reports card | `useDoctorPendingReports` | `GET v1/diagnostics/reports/doctor-summary/` |
| Patients tab | `useDoctorPatientsTab` | `GET v1/doctors/dashboard/patients/` |
| Reports tab | `useDoctorReportsTab` | `GET v1/doctors/dashboard/reports/` |
| Practice Overview | `useDoctorPracticeOverviewTab` | `GET v1/doctors/dashboard/practice-overview/` |

#### Navigation findings

| Control | Destination | Result |
|---------|-------------|--------|
| View Patient / Follow-up | `/patients/{id}` | Pass |
| Visit History | `/patients/{id}?tab=visits` | Pass |
| Start Consultation (Patients tab) | `/consultations/start-consultation` | Pass |
| Open report / patient (Reports) | patient + `?tab=labs` | Pass |
| Download report | `downloadDoctorReport` (no route) | Pass |
| Open workspace | `/lab-tests-reports?queue=needs_review` | Pass |
| Schedule appointment row / Start | patient summary / start consultation | Pass (fixed UI-003) |
| Live Queue row / Start | patient summary / start consultation | Pass (fixed UI-003) |
| `?queue=open` deep link | Schedule tab + queue focus | Pass (fixed UI-002) |
| `?search=patient` deep link | Redirects to `/patients` | Pass (fixed UI-002) |
| Tab URL sync `?tab=` | Survives refresh | Pass (fixed UI-001) |
| Sidebar doctor nav + logo | Clinical routes / dashboard | Pass (shell) |

#### Clinical workflow validation (dashboard slice)

```text
Login → Doctor Dashboard → Start Consultation / View Patient
```

| Check | Result |
|-------|--------|
| Login lands on dashboard for doctor | Pass |
| Patients tab → Start Consultation sets patient context and routes | Pass |
| Schedule/Queue → Start Consultation | Pass (after fix) |
| View Patient preserves selected patient in context | Pass |
| Full Consultation path (pre-consult → Rx → finish) | Deferred to later Wave 1 audits |

#### Category results (Milestone 1 relevant)

| Category | Result | Notes |
|----------|--------|-------|
| Empty States | Pass | Schedule empty copy; tab error+Retry patterns present |
| Loading States | Pass | Skeletons/loading flags; loading.tsx tabs aligned (UI-004 fixed partially) |
| Error States | Pass | Schedule/patients/reports/practice Retry UIs |
| Long Data | N/A | Not exhaustively tested this milestone |
| Mobile / Viewport | N/A | Deferred |
| Button Consistency | Pass | Start/Retry/Download feedback present |
| Form Validation | N/A | No forms on dashboard |
| Search | N/A | Search Patient deep-links to `/patients` |
| Filters | N/A | |
| Pagination | Pass | Patients + Reports local pagination |
| Navigation | Pass | After UI-002/UI-003 |
| URL Sync | Pass | After UI-001 |
| Refresh | Pass | Tab preserved via URL; data re-polled |
| Browser Back | Pass | Tab restored from `?tab=` when history has it |
| Scroll Position | N/A | Deferred |
| Accessibility | N/A | Deferred (buttons have aria-labels on new schedule actions) |
| Colors | N/A | Deferred |
| Icons | N/A | Deferred |
| Tables | Pass | Patients/Reports tables interactive |
| Cards | N/A | Deferred visual |
| Typography | N/A | Deferred |
| Dialogs | N/A | |
| Toast Messages | Pass | Download failures toast |
| File Upload | N/A | |
| Permissions | Pass | Auth-gated hooks; role redirect |
| Date Formatting | Pass | Welcome date via `Intl.DateTimeFormat` |
| Time Zone | N/A | Deferred IST audit |
| Clinical Workflow | Pass | Dashboard handoff slice |
| Performance | Pass (code) | 30s poll; lazy tabs; no React Query dupes observed |
| Visual Consistency | Fail | UI-005 orphan mocks remain (non-blocking) |
| State Consistency | Pass | Tab URL sync; inbound deep links honored |
| Patient Safety | Pass | Patient id set in context before navigate; schedule rows require `patientId` |
| Clinical Safety | Pass | Identifiers shown as names; UHID not on cards (list context) |
| Data Integrity | Pass (wiring) | KPI numerical accuracy vs live DB needs runtime QA |
| Privacy | Pass (code) | Clinic/doctor context via `resolveDoctorContext` |

#### Findings detail

**UI-001 — Tabs not synced to URL (P1) — Fixed**

- Evidence: Route `/doctor-dashboard`; tabs used local `useState` only; refresh reset to Schedule.
- Root cause: No `useSearchParams` / `router.replace` for tab.
- Fix: Sync `?tab=schedule|patients|reports|practice-overview`.
- Regression risk: Doctor Dashboard tabs, deep links from other pages.
- Status: Fixed.

**UI-002 — Inbound `?queue=open` / `?search=patient` ignored (P1) — Fixed**

- Evidence: Prescription completed page linked to those query params; dashboard ignored them.
- Root cause: No query param handling.
- Fix: `queue=open` → Schedule + queue highlight/scroll; `search=patient` → redirect `/patients`; source Search Patient link updated to `/patients`.
- Regression risk: Prescription completed → next consultation CTA; Doctor Dashboard.
- Status: Fixed.

**UI-003 — Schedule/queue rows not navigable (P1) — Fixed**

- Evidence: Appointment and Live Queue rows display-only; no patient/consult actions.
- Root cause: Mapper omitted `patientId`; list/panel had no handlers.
- Fix: Map `patient_profile_id`; View Patient + Start actions on appointments and queue.
- Regression risk: Schedule tab, Live Queue, start-consultation handoff.
- Status: Fixed.

**UI-004 — `loading.tsx` showed obsolete Tasks/Stats tabs (P3) — Fixed**

- Evidence: Skeleton tabs labeled Tasks/Stats vs live Reports/Practice Overview.
- Fix: Aligned trigger labels.
- Status: Fixed.

**UI-005 — Orphan mock components still in repo (P3) — Open**

- Evidence: `components/doctor/doctor-appointments.tsx`, `doctor-tasks.tsx`, `doctor-stats.tsx` hardcoded samples; not imported by live page.
- Suggested fix: Delete or quarantine in cleanup sprint.
- Regression risk: Low if unused; risk if re-imported later.
- Status: Open.

**UI-006 — Summary KPI cards not clickable (P2) — Open**

- Evidence: Cards are display-only; doctors may expect drill-down to Schedule/Reports.
- Suggested fix: Optional navigate-on-click to matching tab (enhancement, not blocker).
- Status: Open.

#### Patient Safety & State Consistency

| Check | Result |
|-------|--------|
| Correct patient on View/Start from Patients/Schedule/Queue | Pass (requires `patientId`) |
| Stale patient after navigation | Pass at handoff (context set before route) |
| Multi-tab / cache | Pass (custom hooks, not shared RQ cache) |
| Refresh preserves tab | Pass via `?tab=` |
| Duplicate mount requests | Acceptable (initial + 30s poll); AbortController on refetch |

#### Final certification

| Field | Value |
|-------|-------|
| Certification | FAIL (pending sign-off) |
| Reason | Milestone 1 P0/P1 workflow defects are fixed in code. Full page **Certified** still requires Product owner + QA sign-off and runtime KPI accuracy check against live APIs. No open P0/P1 workflow findings remain. |
| Blocking findings (P0/P1) | None open |
| Remaining risks | UI-005, UI-006; live KPI count parity vs backend; multi-browser matrix not executed this milestone |
| Product owner sign-off | Pending |
| QA sign-off | Pending |

---

<!-- End Audit #1 -->
