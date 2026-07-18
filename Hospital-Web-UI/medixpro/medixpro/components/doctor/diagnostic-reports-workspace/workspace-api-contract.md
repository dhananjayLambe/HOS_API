# Doctor Diagnostic Workspace API Contract (Phase 1)

Frozen contract shared by the production UI (`createLiveWorkspaceProvider`) and backend responses.

**Milestone 12:** demo/fixture providers are removed from runtime. This contract describes live API payloads only.

## Queue counts

```json
{
  "reports_ready": 0,
  "awaiting": 0,
  "critical": 0
}
```

## Patient context

```json
{
  "id": "uuid",
  "name": "Patient Name",
  "age": 42,
  "gender": "male",
  "identifier": "PAT123456",
  "mobile": "9999999999",
  "last_visit_at": "2026-07-16T10:00:00Z",
  "current_consultation_id": "uuid-or-null",
  "current_consultation_label": "Consultation label"
}
```

## Report summary

```json
{
  "id": "uuid-or-awaiting:<line_uuid>",
  "report_number": "DR-2026-1001",
  "patient": {},
  "test_name": "HbA1c",
  "category": "Biochemistry",
  "lab_name": "Lab Name",
  "branch_name": "Branch Name",
  "doctor_name": "Dr Name",
  "consultation_id": "uuid-or-null",
  "consultation_label": "label-or-null",
  "encounter_id": "uuid-or-null",
  "collection_date": "ISO or null",
  "report_date": "ISO or null",
  "uploaded_at": "ISO or null",
  "clinical_status": "AWAITING_REPORT | AVAILABLE | UPDATED",
  "clinical_findings_preview": "optional string"
}
```

## Report detail

Summary shape plus:

```json
{
  "artifacts": [
    {
      "id": "uuid",
      "label": "CBC Report.pdf",
      "artifact_type": "PDF | IMAGE | OTHER",
      "preview_url": "url-or-null",
      "download_url": "url",
      "is_primary": true
    }
  ],
  "timeline": {
    "ordered_at": "ISO or null",
    "collected_at": "ISO or null",
    "uploaded_at": "ISO or null"
  },
  "clinical_findings": "string-or-null"
}
```

