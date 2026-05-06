# CONSULTATION COMPLETION WORKSPACE PLAN

## Objective

Replace the current End Consultation completion behavior from:

- preview popup tab + dashboard redirect

to:

- redirect to `/prescriptions/completed/{encounter_id}`
- final locked prescription workspace
- auto-download PDF once
- print/cancel/continue workflow actions
- refresh-safe direct link support

## Final Flow

1. Doctor clicks End Consultation.
2. Frontend posts to `/consultations/encounter/{id}/consultation/complete/`.
3. Frontend stores `sessionStorage["rx-completion:{encounter_id}"]`.
4. Frontend redirects to `/prescriptions/completed/{encounter_id}`.
5. Completion page resolves `consultation_id` from session or `GET /consultations/encounter/{encounter_id}/`.
6. Completion page loads summary JSON from `/consultations/{id}/summary-lite/`.
7. Completion page renders React prescription preview.
8. Completion page auto-downloads `/consultations/{id}/summary-lite/pdf/` once per encounter.

## Architecture

```mermaid
flowchart LR
    EndConsult["End Consultation"] -->|"POST /consultations/encounter/{id}/consultation/complete/"| Backend
    EndConsult -->|"sessionStorage[rx-completion:{encounter_id}] + router.replace('/prescriptions/completed/{encounter_id}')"| CompletionPage
    CompletionPage -->|"fallback"| Lookup["GET /consultations/encounter/{encounter_id}/"]
    CompletionPage -->|"POST /consultations/{id}/summary-lite/"| SummaryJson
    CompletionPage -->|"POST /consultations/{id}/summary-lite/pdf/"| PdfDownload
    SummaryJson --> ReactPreview
    CompletionPage --> CancelState["sessionStorage[rx-cancel:{pnr}]"]
```

## Backend Scope

- Reuse existing encounter detail endpoint:
  - `GET /consultations/encounter/{encounter_id}/`
  - consumes `consultation_id`, `status`, `consultation_end_time`, `visit_pnr`
- No schema changes.
- No cancel API in phase 1.

## Frontend Scope

- New route:
  - `Hospital-Web-UI/medixpro/medixpro/app/(dashboard)/prescriptions/completed/[encounterId]/page.tsx`
  - `Hospital-Web-UI/medixpro/medixpro/app/(dashboard)/prescriptions/completed/[encounterId]/loading.tsx`
- New components:
  - `Hospital-Web-UI/medixpro/medixpro/components/prescriptions/prescription-preview.tsx`
  - `Hospital-Web-UI/medixpro/medixpro/components/prescriptions/prescription-success-header.tsx`
  - `Hospital-Web-UI/medixpro/medixpro/components/prescriptions/prescription-actions-sidebar.tsx`
  - `Hospital-Web-UI/medixpro/medixpro/components/prescriptions/cancel-prescription-modal.tsx`
  - `Hospital-Web-UI/medixpro/medixpro/components/prescriptions/start-next-consultation-section.tsx`
- End Consultation handoff updated in:
  - `Hospital-Web-UI/medixpro/medixpro/components/consultations/consultation-action-bar.tsx`

## UX Decisions

- Keep existing app shell/layout.
- 75/25 split (`lg:col-span-3` + `lg:col-span-1`), stacked on smaller screens.
- Sticky success header and sticky right actions panel.
- PNR shown in completion metadata, encounter id not shown.
- Preview is locked/read-only with explicit lock note.
- Cancel uses backend prescription lifecycle endpoint and persists audit metadata.

## Future-ready notes

- Encounter cancel and prescription cancel are distinct:
  - `POST /consultations/encounter/{encounter_id}/cancel/` cancels visit workflow.
  - `POST /consultations/{consultation_id}/prescription/cancel/` invalidates prescription only.
- Prescription cancel audit model (nullable fields on `Prescription`):
  - `cancelled_at`, `cancelled_by`, `cancelled_by_source`
  - `cancel_reason_code`, `cancel_reason_text`
  - `cancelled_by_patient_profile` (future patient support)
- Lifecycle rule:
  - Only `FINALIZED -> CANCELLED` allowed in cancel flow.
  - `PrescriptionLine` rows remain immutable.
- API contract (doctor-side):
  - Request: `{ "reason_code": "...", "reason_text": "", "source": "doctor" }`
  - Response: current cancelled state, idempotent `200` if already cancelled.
- Future patient compatibility:
  - planned `POST /patient/prescriptions/{prescription_pnr}/cancel/` reusing same service.
- Remaining roadmap (out of phase 1):
  - WhatsApp sharing
  - patient app sync
  - timeline/audit views
  - digital signatures
  - repeat prescription workflows
