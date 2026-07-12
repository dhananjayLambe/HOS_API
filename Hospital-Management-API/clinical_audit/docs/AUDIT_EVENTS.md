---
owner: clinical-audit-team
module: clinical_audit
version: 1.0
last_updated: 2026-07-12
status: approved
---

# Audit Events Catalogue

Platform-wide catalogue of clinical audit events. New modules append sections here.

## Consultation events

| Event ID | Display label | Snapshot | Actor |
|---|---|---|---|
| `consultation.started` | Consultation Started | No | doctor / helpdesk |
| `consultation.completed` | Consultation Completed | No | doctor |
| `consultation.cancelled` | Consultation Cancelled | Yes | doctor |
| `consultation.findings.updated` | Consultation Findings Updated | Yes | doctor |
| `consultation.instructions.updated` | Consultation Instructions Updated | Yes | doctor |
| `consultation.investigations.updated` | Consultation Investigations Updated | Yes | doctor |
| `consultation.reopened` | Consultation Reopened | Yes | doctor (facade only — no business flow yet) |

Display labels come from `AuditAction.label` — never hardcode strings in business code.

---

### consultation.started

**Trigger:** New consultation created (not idempotent replay).

**Payload:**

```json
{
  "status": "started",
  "consultation_mode": "walk_in",
  "started_at": "2026-07-12T10:00:00+00:00",
  "source": "doctor",
  "visit_pnr": "260712-CL-XXXXX-001"
}
```

**Example:**

```python
ConsultationAuditService.emit_started(
    encounter, consultation, user, source="doctor"
)
```

---

### consultation.completed

**Trigger:** End consultation API succeeds; emitted via `transaction.on_commit`.

**Idempotency:** Skips if `consultation.completed` already exists for resource.

**Payload:**

```json
{
  "duration_minutes": 18,
  "prescription_created": true,
  "diagnosis_count": 3,
  "tests_ordered": 4,
  "follow_up_required": true,
  "consultation_status": "finalized",
  "encounter_status": "consultation_completed",
  "completion_source": "doctor"
}
```

---

### consultation.cancelled

**Trigger:** Cancel encounter API succeeds (not idempotent early-return).

**Idempotency:** Skips duplicate `consultation.cancelled` for same resource.

**Payload:**

```json
{
  "reason": "Patient unavailable",
  "cancelled_by": "42",
  "prior_status": "consultation_in_progress"
}
```

**Snapshot:** Consultation state before cancel.

---

### consultation.findings.updated

**Trigger:** PATCH `/consultations/findings/{id}/` succeeds.

**Payload:**

```json
{
  "section": "findings",
  "changed_fields": ["note", "severity"]
}
```

---

### consultation.instructions.updated

**Trigger:** PATCH `/consultations/instructions/{id}/` succeeds.

**Payload:**

```json
{
  "section": "instructions",
  "changed_fields": ["input_data"]
}
```

---

### consultation.investigations.updated

**Trigger:** PATCH investigation item succeeds.

**Payload:**

```json
{
  "section": "investigations",
  "changed_fields": ["notes", "urgency"]
}
```

---

### consultation.reopened

**Status:** Facade implemented; no production wiring until reopen business flow exists.

**Payload:**

```json
{
  "reason": "Prescription correction",
  "reopened_by": "42",
  "prior_completed_at": "2026-07-12T09:00:00+00:00"
}
```

---

## Clinical documentation events (M3.4)

| Event ID | Display label | Snapshot | Actor |
|---|---|---|---|
| `diagnosis.added` | Diagnosis Added | No | doctor |
| `diagnosis.updated` | Diagnosis Updated | Yes | doctor |
| `allergy.added` | Allergy Added | No | doctor / helpdesk |
| `allergy.updated` | Allergy Updated | Yes | doctor / helpdesk |
| `clinical_notes.updated` | Clinical Notes Updated | Yes | doctor (facade only — no business flow yet) |
| `vitals.recorded` | Vital Signs Recorded | No | doctor / helpdesk |
| `symptoms.recorded` | Symptoms Recorded | No | doctor |

See [CLINICAL_DOCUMENTATION_AUDIT.md](CLINICAL_DOCUMENTATION_AUDIT.md) for payloads and integration points.

---

### diagnosis.added

**Trigger:** `ConsultationDiagnosis` row created during end consultation persist.

**Payload:**

```json
{
  "diagnosis_code": "I10",
  "diagnosis_name": "Essential Hypertension",
  "classification": "provisional",
  "is_primary": true,
  "severity": "mild"
}
```

**Idempotency:** Skips if `diagnosis.added` already exists for `resource_id`.

---

### diagnosis.updated

**Trigger:** Existing `ConsultationDiagnosis` row updated during end consultation persist.

**Payload:**

```json
{
  "changed_fields": ["classification", "severity"]
}
```

**Snapshot:** Prior diagnosis code, classification, severity, is_primary.

---

### allergy.added / allergy.updated

**Trigger:** Pre-consultation allergies section saved (`POST .../section/allergies/`).

**Added payload:**

```json
{
  "allergen": "Penicillin",
  "reaction": "Skin Rash",
  "severity": "Moderate"
}
```

**Updated payload:**

```json
{
  "changed_fields": ["reaction", "severity"]
}
```

---

### vitals.recorded

**Trigger:** Meaningful vitals saved via pre-consult section API or `POST /api/visits/{id}/vitals/`.

**Payload:**

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

---

### symptoms.recorded

**Trigger:** `ConsultationSymptom` row saved during end consultation persist.

**Payload:**

```json
{
  "chief_complaint": "Headache",
  "symptoms": ["Headache", "Nausea"],
  "duration": "2 days"
}
```

---

### clinical_notes.updated

**Status:** Facade implemented; no production wiring until dedicated notes entity/API exists.

**Payload:**

```json
{
  "section": "Assessment",
  "changed_fields": ["assessment"]
}
```

---

## Prescription & recommendation events (M3.5)

| Event ID | Display label | Snapshot | Actor |
|---|---|---|---|
| `prescription.created` | Prescription Created | No | doctor |
| `prescription.signed` | Prescription Signed | No | doctor |
| `prescription.updated` | Prescription Updated | Yes | doctor (facade only — no edit API yet) |
| `prescription.downloaded` | Prescription Downloaded | No | patient / doctor / anonymous |
| `recommendation.generated` | Recommendation Generated | No | doctor |
| `recommendation.accepted` | Recommendation Accepted | Yes | doctor (facade only — no accept API yet) |

See [PRESCRIPTION_AUDIT.md](PRESCRIPTION_AUDIT.md) for payloads and integration points.

---

### prescription.created

**Trigger:** `Prescription` and lines created during `end_consultation_service._persist_medicines`.

**Payload:**

```json
{
  "medicine_count": 3,
  "prescription_type": "Digital",
  "is_signed": false
}
```

**Idempotency:** Skips if `prescription.created` already exists for `resource_id`.

---

### prescription.signed

**Trigger:** `Prescription.finalize()` during end consultation persist.

**Payload:**

```json
{
  "signed_at": "2026-07-12T10:00:00+00:00",
  "signature_type": "Digital",
  "doctor_license": "MH-12345",
  "finalized": true
}
```

**Idempotency:** Skips if `prescription.signed` already exists for `resource_id`.

---

### prescription.downloaded

**Trigger:** Successful `GET /api/v1/prescriptions/<id>/download/`.

**Payload:**

```json
{
  "downloaded_by": "Patient",
  "download_format": "PDF"
}
```

**Idempotency:** One audit row per successful download request.

---

### recommendation.generated

**Trigger:** `MarketplaceRecommendationView` when `LabRecommendationService.recommend()` returns `available=true`.

**Payload:**

```json
{
  "recommendation_type": "Diagnostic",
  "recommendation_count": 4
}
```

**Idempotency:** Skips if `recommendation.generated` already exists for `resource_id=str(recommendation_id)`.

---

## Diagnostic & report events (M3.6)

| Event ID | Display label | Snapshot | Actor |
|---|---|---|---|
| `test.ordered` | Test Ordered | No | doctor |
| `recommendation.sent` | Laboratory Recommendation Sent | No | system |
| `report.uploaded` | Report Uploaded | No | lab |
| `report.viewed` | Report Viewed | No | doctor / lab |
| `report.downloaded` | Report Downloaded | No | patient / doctor / lab |
| `report.shared` | Report Shared | No | lab |

See [DIAGNOSTIC_AUDIT.md](DIAGNOSTIC_AUDIT.md) for payloads and integration points.

---

### test.ordered

**Trigger:** `DiagnosticOrderCreationService.create_order_from_consultation` (non-idempotent create).

**Payload:**

```json
{
  "test_count": 3,
  "order_source": "consultation",
  "home_collection": true
}
```

**Idempotency:** Skips if `test.ordered` already exists for `resource_id=str(order.id)`.

---

### recommendation.sent

**Trigger:** Successful `WhatsAppService.send_recommendation_message`.

**Payload:**

```json
{
  "recommendation_channel": "whatsapp",
  "test_count": 4
}
```

**Idempotency:** Skips if `recommendation.sent` already exists for `recommendation_id`.

---

### report.uploaded / report.viewed / report.downloaded / report.shared

See [DIAGNOSTIC_AUDIT.md](DIAGNOSTIC_AUDIT.md) for full payload schemas. View, download, and share events are recorded per successful access (no deduplication).

---

## Security rules (all events)

Audit payloads must never contain:

- Passwords, tokens, OTPs, session secrets
- Prescription PDFs, lab report PDFs, images, DICOM, ECG binary, attachments
- Large base64 blobs

Only metadata and clinically relevant identifiers.

---

## Certification status (M3.7)

| Event ID | Wired | Certification E2E |
|---|---|---|
| `consultation.started` | Yes | Yes |
| `consultation.completed` | Yes | Yes |
| `symptoms.recorded` | Yes | Yes |
| `vitals.recorded` | Yes | Yes |
| `diagnosis.added` | Yes | Yes |
| `prescription.created` | Yes | Yes |
| `prescription.signed` | Yes | Yes |
| `test.ordered` | Yes | Yes |
| `recommendation.sent` | Yes | Yes |
| `report.uploaded` | Yes | Yes |
| `report.viewed` | Yes | Yes |
| `report.downloaded` | Yes | Yes |
| `report.shared` | Yes | Yes |
| `patient.record_created` | Enum only | Deferred |
| `recommendation.generated` | Yes (marketplace) | Excluded from canonical E2E |

Canonical 13-event journey: see [SAMPLE_PATIENT_TIMELINE.md](SAMPLE_PATIENT_TIMELINE.md).

---

## Correlation

- HTTP requests: `X-Correlation-ID` header → `LogContext` → captured at `emit_after_commit` schedule time
- All events in one workflow should share one correlation ID

**Future:** `workflow_id` in `_meta` for cross-module journeys (Appointment → Consultation → Prescription).

---

## Related docs

- [CLINICAL_DOCUMENTATION_AUDIT.md](CLINICAL_DOCUMENTATION_AUDIT.md) — M3.4 integration guide
- [PRESCRIPTION_AUDIT.md](PRESCRIPTION_AUDIT.md) — M3.5 prescription and recommendation integration
- [DIAGNOSTIC_AUDIT.md](DIAGNOSTIC_AUDIT.md) — M3.6 diagnostic and report integration
- [CERTIFICATION.md](CERTIFICATION.md) — M3.7 certification validators
- [SERVICE.md](SERVICE.md) — M3.2 service layer
- [HOW_TO_USE.md](HOW_TO_USE.md) — module `audit/` package pattern
