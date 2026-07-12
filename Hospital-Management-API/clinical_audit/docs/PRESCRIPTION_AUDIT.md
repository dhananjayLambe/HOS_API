---
owner: clinical-audit-team
module: consultations_core
version: 1.0
last_updated: 2026-07-12
status: approved
---

# Prescription & Recommendation Audit (M3.5)

Immutable audit trail for prescription lifecycle events and diagnostic recommendation generation.

## Architecture

```
consultations_core / diagnostics_engine write paths
        │
        ▼
consultations_core/audit/prescription/hooks.py
        │
        ▼
PrescriptionAuditService
        │
        ▼
ClinicalAuditService.record()
```

Business modules **never** call `ClinicalAuditService.record()` directly. Use the facade and `emit_after_commit` from `consultations_core.audit`.

## Module layout

```
consultations_core/
└── audit/
    └── prescription/
        ├── prescription_audit_service.py
        ├── prescription_payload_builder.py
        ├── prescription_snapshot_builder.py
        ├── recommendation_payload_builder.py
        ├── recommendation_snapshot_builder.py
        ├── hooks.py
        └── constants.py
```

## Events

| Business event | Audit action | Snapshot | Integration |
|---|---|---|---|
| Prescription Created | `prescription.created` | No | `end_consultation_service._persist_medicines` |
| Prescription Signed | `prescription.signed` | No | `end_consultation_service._persist_medicines` (after `finalize()`) |
| Prescription Updated | `prescription.updated` | Yes | **Facade only** — no standalone edit API today |
| Prescription Downloaded | `prescription.downloaded` | No | `PrescriptionDownloadAPIView` |
| Recommendation Generated | `recommendation.generated` | No | `MarketplaceRecommendationView` (when `available=true`) |
| Recommendation Accepted | `recommendation.accepted` | Yes | **Facade only** — no accept API yet |

`prescription.generated` (`PRESCRIPTION_GENERATED`) remains in the enum for backward compatibility but is not emitted by M3.5 integrations.

Display labels come from `AuditAction.label` via `audit_event_label()`.

## Payload examples

### Prescription Created

```json
{
  "medicine_count": 3,
  "prescription_type": "Digital",
  "is_signed": false
}
```

### Prescription Signed

```json
{
  "signed_at": "2026-07-12T10:00:00+00:00",
  "signature_type": "Digital",
  "doctor_license": "MH-12345",
  "finalized": true
}
```

### Prescription Updated (facade)

```json
{
  "changed_fields": ["medicine_count", "status"]
}
```

### Prescription Downloaded

```json
{
  "downloaded_by": "Patient",
  "download_format": "PDF"
}
```

### Recommendation Generated

```json
{
  "recommendation_type": "Diagnostic",
  "recommendation_count": 4
}
```

### Recommendation Accepted (facade)

```json
{
  "accepted_items": 2,
  "rejected_items": 1
}
```

## Integration map

| Write path | Hook | Commit strategy |
|---|---|---|
| `end_consultation_service._persist_medicines` | `schedule_prescription_created`, `schedule_prescription_signed` | `emit_after_commit` |
| `PrescriptionDownloadAPIView.get` | `schedule_prescription_downloaded` | Inline (read-only GET, fail-open) |
| `MarketplaceRecommendationView.post` | `schedule_recommendation_generated` | `emit_after_commit` (only when `result.available`) |

## Integration pattern

```python
from consultations_core.audit import (
    schedule_prescription_created,
    schedule_prescription_signed,
    schedule_prescription_downloaded,
    schedule_recommendation_generated,
)

# After prescription lines saved (before finalize):
schedule_prescription_created(
    consultation=consultation,
    user=user,
    prescription=prescription,
)

prescription.finalize()

# After refresh_from_db:
schedule_prescription_signed(
    consultation=consultation,
    user=user,
    prescription=prescription,
)

# Download API (after PDF validation):
schedule_prescription_downloaded(prescription=prescription, request=request)

# Marketplace recommendation (available only):
schedule_recommendation_generated(
    consultation=consultation,
    user=request.user,
    recommendation_id=recommendation_id,
    result=result,
)
```

## Idempotency

| Event | Strategy |
|---|---|
| Prescription Created | Skip if `prescription.created` exists for `resource_id=str(prescription.id)` |
| Prescription Signed | Skip if `prescription.signed` exists for same `resource_id` |
| Prescription Downloaded | Emit per successful download (retries within one request do not double-schedule) |
| Recommendation Generated | Skip if `recommendation.generated` exists for `resource_id=str(recommendation_id)` |
| Recommendation Accepted | Skip if `recommendation.accepted` exists for resource (facade) |

## Failure isolation

Hooks catch exceptions at integration boundaries. `ClinicalAuditService.record()` is fail-open — prescribing, download, and recommendation APIs succeed even when audit persistence fails.

## Correlation

Transactional events use `emit_after_commit`, which captures `LogContext.correlation_id` at schedule time. Prescription and recommendation events within a consultation workflow share the same correlation ID as consultation lifecycle events.

## Deferred wiring

| Event | Reason | Future hook candidates |
|---|---|---|
| `prescription.updated` | Draft edits blocked after finalize; versioning creates new RX rows | MAR, ePrescription edit API |
| `recommendation.accepted` | No patient accept flow | Marketplace order confirmation, WhatsApp accept CTA |
| Async WhatsApp `recommendation.generated` | Avoid duplicate events with API path | `diagnostic_recommendation_whatsapp_orchestrator` |

## Security

Payloads are sanitized via `sanitize_audit_payload` / `sanitize_audit_snapshot`. Never store PDF bytes, signature images, JWT tokens, or base64 blobs.

## Tests

```bash
DJANGO_SETTINGS_MODULE=main.settings_test python -m pytest \
  clinical_audit/tests/test_prescription_audit.py \
  clinical_audit/tests/test_prescription_audit_integration.py -v
```

## Related docs

- [AUDIT_EVENTS.md](AUDIT_EVENTS.md) — event catalogue
- [HOW_TO_USE.md](HOW_TO_USE.md) — integration examples
- [CONSULTATION_AUDIT.md](CONSULTATION_AUDIT.md) — M3.3 reference pattern
- [CLINICAL_DOCUMENTATION_AUDIT.md](CLINICAL_DOCUMENTATION_AUDIT.md) — M3.4 clinical documentation integration
