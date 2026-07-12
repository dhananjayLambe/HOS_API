---
owner: clinical-audit-team
module: clinical_documentation
version: 1.0
last_updated: 2026-07-12
status: approved
---

# Clinical Documentation Audit (M3.4)

Immutable audit trail for clinical documentation changes: diagnosis, allergy, vitals, symptoms, and clinical notes (facade ready).

## Architecture

```
consultations_core write paths
        │
        ▼
clinical_documentation/audit/hooks.py
        │
        ▼
ClinicalDocumentationAuditService
        │
        ▼
ClinicalAuditService.record()
```

Business modules **never** call `ClinicalAuditService.record()` directly. Use the facade and `emit_after_commit` from `consultations_core.audit`.

## Module layout

```
clinical_documentation/
└── audit/
    ├── clinical_documentation_audit_service.py
    ├── payload_builder.py
    ├── snapshot_builder.py
    ├── section_diff.py
    ├── hooks.py
    └── constants.py
```

## Events

| Business event | Audit action | Snapshot | Integration |
|---|---|---|---|
| Diagnosis Added | `diagnosis.added` | No | `end_consultation_service._persist_diagnoses` |
| Diagnosis Updated | `diagnosis.updated` | Yes | `end_consultation_service._persist_diagnoses` |
| Allergy Added | `allergy.added` | No | `PreConsultationSectionAPIView` (`allergies`) |
| Allergy Updated | `allergy.updated` | Yes | `PreConsultationSectionAPIView` (`allergies`) |
| Vital Signs Recorded | `vitals.recorded` | No | Pre-consult section API + `VisitVitalsAPIView` |
| Symptoms Recorded | `symptoms.recorded` | No | `end_consultation_service._persist_symptoms` |
| Clinical Notes Updated | `clinical_notes.updated` | Yes | **Facade only** — no production write API yet |

Display labels come from `AuditAction.label` via `audit_event_label()`.

## Payload examples

### Diagnosis Added

```json
{
  "diagnosis_code": "I10",
  "diagnosis_name": "Essential Hypertension",
  "classification": "provisional",
  "is_primary": true,
  "severity": "mild"
}
```

### Diagnosis Updated

```json
{
  "changed_fields": ["classification", "severity"]
}
```

### Allergy Added

```json
{
  "allergen": "Penicillin",
  "reaction": "Skin Rash",
  "severity": "Moderate"
}
```

### Vital Signs Recorded

```json
{
  "height_cm": 172,
  "weight_kg": 74,
  "temperature": 36.5,
  "pulse": 78,
  "blood_pressure": "120/80",
  "spo2": 98
}
```

### Symptoms Recorded

```json
{
  "chief_complaint": "Headache",
  "symptoms": ["Headache", "Nausea"],
  "duration": "2 days"
}
```

### Clinical Notes Updated (facade)

```json
{
  "section": "Assessment",
  "changed_fields": ["assessment"]
}
```

## Integration pattern

```python
from consultations_core.audit import emit_after_commit
from clinical_documentation.audit import (
    ClinicalDocumentationAuditService,
    schedule_diagnosis_audit,
)

# Preferred: use hooks from business services
schedule_diagnosis_audit(
    consultation=consultation,
    user=user,
    diagnosis_row=row,
    prior_state=prior_state,
    is_create=is_create,
)

# Or call facade directly (after commit)
emit_after_commit(
    ClinicalDocumentationAuditService.emit_vital_signs_recorded,
    encounter,
    user,
    section_id=section_obj.id,
    vitals_data=section_obj.data,
    source="doctor",
)
```

## Idempotency

| Event | Strategy |
|---|---|
| Diagnosis Added | Skip if `diagnosis.added` exists for `resource_id` |
| Diagnosis Updated | Skip if `changed_fields` is empty |
| Allergy Added | Skip if `allergy.added` exists for `section_id:allergen_key` |
| Allergy Updated | Skip if section diff shows no changes |
| Vitals Recorded | Skip if normalized vitals payload unchanged |
| Symptoms Recorded | Emitted on each meaningful persist |

## Failure isolation

Audit scheduling is wrapped in try/except at hook boundaries. `ClinicalAuditService.record()` is fail-open — clinical saves succeed even when audit persistence fails.

## Correlation

All hooks use `emit_after_commit`, which captures `LogContext.correlation_id` at schedule time. Documentation events within a consultation workflow share the same correlation ID as consultation lifecycle events.

## Clinical notes — deferred wiring

No dedicated Clinical Notes entity or write API exists today. `emit_clinical_notes_updated()` is implemented and tested. Future integration candidates:

- `Consultation.closure_note` at end consultation
- Dedicated clinical notes section API when introduced

## Security

Payloads are sanitized via `sanitize_audit_payload` / `sanitize_audit_snapshot`. No passwords, tokens, files, PDFs, images, or binary content.

## Tests

```bash
DJANGO_SETTINGS_MODULE=main.settings_test python -m pytest \
  clinical_audit/tests/test_clinical_documentation_audit.py \
  clinical_audit/tests/test_clinical_documentation_audit_integration.py -v
```

## Related docs

- [AUDIT_EVENTS.md](AUDIT_EVENTS.md) — event catalogue
- [HOW_TO_USE.md](HOW_TO_USE.md) — integration examples
- [CONSULTATION_AUDIT.md](CONSULTATION_AUDIT.md) — M3.3 reference pattern
