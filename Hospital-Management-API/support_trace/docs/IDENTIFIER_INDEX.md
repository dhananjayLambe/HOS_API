# Identifier Index

M5.3 formalizes the identifier index as the **Identifier Resolution Framework**. Support Trace remains the only search index.

## Architecture

```
Audit → WorkflowSyncService → IdentifierSyncService → SupportTrace
                                      ↓
                            IdentifierLookupService.lookup_any()
```

## Indexed fields (17)

Defined in `identifiers/lookup_keys.py` as `IDENTIFIER_FIELDS`:

| Field | Typical source |
|-------|----------------|
| `patient_account_id` | Patient account UUID |
| `patient_profile_id` | Patient profile UUID |
| `consultation_id` | Consultation record |
| `encounter_id` | Clinical encounter |
| `recommendation_id` | Marketplace recommendation |
| `booking_id` | Diagnostic booking |
| `routing_id` | Lab routing assignment |
| `report_id` | Diagnostic report |
| `prescription_id` | Prescription record |
| `order_id` | Diagnostic order |
| `payment_id` | Payment transaction |
| `invoice_id` | Invoice record |
| `laboratory_id` | Laboratory partner |
| `branch_id` | Clinic branch |
| `provider_reference` | External provider ID |
| `whatsapp_message_id` | WhatsApp message ID (`wamid.*`) |
| `phone_number` | Patient phone (digits only) |

## Search statistics

| Column | Maintained by |
|--------|---------------|
| `first_seen_at` | `IdentifierSyncService` — first identifier indexed |
| `last_seen_at` | Last identifier update |
| `identifier_count` | Denormalized count for health checks |

## Sync (write path)

`IdentifierSyncService` runs inside `WorkflowSyncService`:

1. Extract via `ExtractionRegistry`
2. Accumulative merge with existing trace identifiers
3. Validate via `ValidationRegistry` (fail-open)
4. Update stats + `search_vector`

## Lookup (read path)

```python
from support_trace.identifiers import IdentifierLookupService

result = IdentifierLookupService.lookup_any("919876543210")
result = IdentifierLookupService.lookup_any("wamid.HBgL...")
```

Returns `IdentifierLookupResult` with `matched_field`, `confidence`, `strategy`, `search_time_ms`.

## Low-level repository

```python
from support_trace.domain.repository import SupportTraceRepository

repo = SupportTraceRepository()
trace = repo.find_by_identifier("phone_number", "919876543210")
```

Prefer `IdentifierLookupService` for production support — it runs detection, search planning, and relationship expansion.

## Related docs

- [IDENTIFIER_STRATEGY.md](IDENTIFIER_STRATEGY.md)
- [IDENTIFIER_REGISTRY.md](IDENTIFIER_REGISTRY.md)
- [IDENTIFIER_LOOKUP.md](IDENTIFIER_LOOKUP.md)
- [SEARCH_PLANNER.md](SEARCH_PLANNER.md)
- [SEARCH_INDEX.md](SEARCH_INDEX.md)
- [NORMALIZATION.md](NORMALIZATION.md)
- [RELATIONSHIP_RESOLVER.md](RELATIONSHIP_RESOLVER.md)
