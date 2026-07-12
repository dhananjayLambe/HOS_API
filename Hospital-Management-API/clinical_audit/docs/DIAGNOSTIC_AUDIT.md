---
owner: clinical-audit-team
module: diagnostics_engine
version: 1.0
last_updated: 2026-07-12
status: approved
---

# Diagnostic & Report Audit (M3.6)

Immutable clinical audit trail for diagnostic test ordering and report lifecycle events.

## Clinical Audit vs Business Audit

| Stream | Purpose | Examples |
|---|---|---|
| **Clinical Audit** (`clinical_audit.ClinicalAudit`) | Permanent EMR patient-care history | Test ordered, report uploaded, report viewed |
| **Business Audit** (Phase 4 / legacy logs) | Operational workflow | Sample collected, technician assigned, courier |

Both may reference the same report but serve different purposes. M3.6 adds **Clinical Audit** rows alongside existing legacy `ClinicalAuditLog` and structured `emit_report_event()` logs — those are not removed.

## Architecture

```
diagnostics_engine / notifications write paths
        │
        ▼
diagnostics_engine/audit/hooks.py
        │
        ▼
DiagnosticAuditService
        │
        ▼
ClinicalAuditService.record()
```

Business modules **never** call `ClinicalAuditService.record()` directly.

## Module layout

```
diagnostics_engine/
└── audit/
    ├── diagnostic_audit_service.py
    ├── hooks.py
    ├── test_payload_builder.py
    ├── report_payload_builder.py
    ├── snapshot_builder.py
    └── constants.py
```

## Events

| Business event | Audit action | Snapshot | Integration |
|---|---|---|---|
| Test Ordered | `test.ordered` | No | `DiagnosticOrderCreationService.create_order_from_consultation` |
| Test Recommendation Sent | `recommendation.sent` | No | `WhatsAppService.send_recommendation_message` |
| Report Uploaded | `report.uploaded` | No | `ArtifactUploadService.upload_report_artifacts` |
| Report Viewed | `report.viewed` | No | `ReportOperationalDetailView.get` |
| Report Downloaded | `report.downloaded` | No | `ReportDownloadService.build_download_response` |
| Report Shared | `report.shared` | No | `SendWhatsAppView` / `ReportDeliveryService.prepare_report_delivery` |

**Entities:** `DIAGNOSTIC_TEST` for orders, `RECOMMENDATION` for recommendation sent, `REPORT` for report events.

## Payload examples

### Test Ordered

```json
{
  "test_count": 3,
  "order_source": "consultation",
  "home_collection": true
}
```

### Test Recommendation Sent

```json
{
  "recommendation_channel": "whatsapp",
  "test_count": 4
}
```

### Report Uploaded

```json
{
  "artifact_type": "PDF",
  "report_count": 2,
  "verified": true
}
```

### Report Viewed

```json
{
  "viewer_role": "Doctor",
  "viewer_platform": "Web"
}
```

### Report Downloaded

```json
{
  "download_format": "PDF",
  "download_channel": "Web"
}
```

### Report Shared

```json
{
  "share_channel": "WhatsApp",
  "recipient_type": "Patient"
}
```

## Integration map

| Write path | Hook | Commit strategy |
|---|---|---|
| `DiagnosticOrderCreationService._run` (non-idempotent) | `schedule_test_ordered` | `emit_after_commit` |
| `WhatsAppService.send_recommendation_message` | `schedule_test_recommendation_sent` | `emit_after_commit` |
| `ArtifactUploadService.upload_report_artifacts` | `schedule_report_uploaded` | `emit_after_commit` |
| `ReportOperationalDetailView.get` | `schedule_report_viewed` | Inline (after auth + DTO) |
| `ReportDownloadService.build_download_response` | `schedule_report_downloaded` | Inline |
| `SendWhatsAppView.post` | `schedule_report_shared` | `emit_after_commit` |

## Idempotency

| Event | Strategy |
|---|---|
| Test Ordered | Skip if `test.ordered` exists for `resource_id=str(order.id)` |
| Recommendation Sent | Skip if `recommendation.sent` exists for `recommendation_id` |
| Report Uploaded | Skip if `report.uploaded` exists for `resource_id=str(report.id)` |
| Report Viewed / Downloaded / Shared | Emit every successful access (no dedupe) |

Idempotent order creation (`idempotent=True`) does **not** emit `test.ordered`.

## Failure isolation

Hooks catch exceptions at integration boundaries. `ClinicalAuditService.record()` is fail-open — ordering, uploads, views, downloads, and shares succeed even when audit persistence fails.

## Correlation

Transactional events use `emit_after_commit`, which captures `LogContext.correlation_id`. Diagnostic events within a consultation workflow share the same correlation ID as consultation and prescription events.

## Deferred wiring

| Item | Reason |
|---|---|
| Investigation item POST (`investigation.added`) | Out of scope — Test Ordered uses `DiagnosticOrder` only |
| `report.approved` | Enum exists; no clear clinical approval hook mapped |
| Legacy artifact download route | No clinical audit on `/api/diagnostics/.../artifacts/.../download/` |
| Radiology / PACS / FHIR DiagnosticReport | Future extension |

## Security

Never store PDF bytes, DICOM, signed URLs, JWT tokens, or base64 blobs. Payloads sanitized via `sanitize_audit_payload`.

## Tests

```bash
DJANGO_SETTINGS_MODULE=main.settings_test python -m pytest \
  clinical_audit/tests/test_diagnostic_audit.py \
  clinical_audit/tests/test_diagnostic_audit_integration.py -v
```

## Related docs

- [AUDIT_EVENTS.md](AUDIT_EVENTS.md) — event catalogue
- [HOW_TO_USE.md](HOW_TO_USE.md) — integration examples
- [PRESCRIPTION_AUDIT.md](PRESCRIPTION_AUDIT.md) — M3.5 recommendation.generated
- [CONSULTATION_AUDIT.md](CONSULTATION_AUDIT.md) — M3.3 reference pattern
