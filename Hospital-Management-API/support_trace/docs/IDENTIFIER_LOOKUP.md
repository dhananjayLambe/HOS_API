# Identifier Lookup

M5.3 ships the universal lookup engine. M5.5 `TraceLookupService` is a thin facade over this layer.

## Pipeline

```
lookup_any(raw)
  → IdentifierDetector
  → SearchPlanner
  → SupportTraceSearchRepository
  → RelationshipResolver
  → LookupResultBuilder
  → IdentifierLookupResult
```

## lookup_any()

```python
from support_trace.identifiers import IdentifierLookupService

result = IdentifierLookupService.lookup_any("919876543210")
result = IdentifierLookupService.lookup_any("wamid.HBgL...")
result = IdentifierLookupService.lookup_any(booking_uuid)
```

No caller needs to know the identifier type.

## Typed shortcuts

All return full `IdentifierLookupResult`:

```python
IdentifierLookupService.lookup_patient(account_id)
IdentifierLookupService.lookup_consultation(consultation_id)
IdentifierLookupService.lookup_booking(booking_id)
IdentifierLookupService.lookup_report(report_id)
IdentifierLookupService.lookup_whatsapp(message_id)
IdentifierLookupService.lookup_payment(payment_id)
IdentifierLookupService.lookup_provider_reference(ref)
IdentifierLookupService.lookup_phone(phone)
```

## DetectedIdentifier

```json
{
  "identifier_type": "WhatsAppMessage",
  "confidence": 0.99,
  "reason": "prefix wamid.",
  "normalized": "wamid.HBgL...",
  "field_name": "whatsapp_message_id"
}
```

## IdentifierLookupResult

Survives through M5.9 — includes support-debug metadata:

| Field | Description |
|-------|-------------|
| `identifier` | Raw input |
| `normalized` | Canonical value |
| `detected_type` | `IdentifierType` or None |
| `matched_field` | SupportTrace column that matched |
| `matched_value` | Value used in query |
| `confidence` | Detection confidence 0–1 |
| `strategy` | `exact`, `prefix`, `partial`, `relationship` |
| `traces` | Primary matches |
| `related_traces` | Expanded via RelationshipResolver |
| `trace_count` / `related_trace_count` | Result counts |
| `search_time_ms` | Wall-clock lookup time |

## Reverse lookup

`RelationshipResolver.expand(traces)` finds related workflows via:

- Shared identifier columns
- `parent_workflow_instance_id` chain
- `correlation_id` siblings

See [RELATIONSHIP_RESOLVER.md](RELATIONSHIP_RESOLVER.md).
