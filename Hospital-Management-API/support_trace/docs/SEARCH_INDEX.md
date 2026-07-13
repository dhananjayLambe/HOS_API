# Search Index

`SupportTrace` is the only search index. `SupportTraceSearchRepository` executes search plans — it does not store identifiers separately.

## Indexed columns

All 17 identifier fields on `SupportTrace` are indexed (`db_index=True`):

`patient_account_id`, `patient_profile_id`, `consultation_id`, `encounter_id`, `recommendation_id`, `booking_id`, `routing_id`, `report_id`, `prescription_id`, `order_id`, `payment_id`, `invoice_id`, `laboratory_id`, `branch_id`, `provider_reference`, `whatsapp_message_id`, `phone_number`

## Search statistics (M5.3)

| Column | Purpose |
|--------|---------|
| `first_seen_at` | First identifier indexed on trace |
| `last_seen_at` | Last identifier update |
| `identifier_count` | Denormalized non-null identifier count |

Maintained by `IdentifierSyncService` on every workflow sync.

## Repository API

```python
from support_trace.identifiers.search_repository import SupportTraceSearchRepository

SupportTraceSearchRepository.execute(plan)
SupportTraceSearchRepository.exact_match("booking_id", uuid)
SupportTraceSearchRepository.prefix_search("provider_reference", "lab-")
SupportTraceSearchRepository.partial_search("phone_number", "9876")
```

Low-level `SupportTraceRepository.find_by_identifier` remains for backward compatibility.

## Query patterns

| Pattern | When used |
|---------|-----------|
| Exact | Primary path after detection |
| Prefix | Provider refs, phones (bounded LIMIT=25) |
| Partial | Fallback for partial provider/phone match |
| Relationship | Post-match expansion |

## search_vector

JSON token field populated on every upsert for future OpenSearch migration. M5.3 queries use indexed columns, not `search_vector`.

## Performance targets

| Operation | Target |
|-----------|--------|
| Detection | <2 ms |
| Exact lookup | <10 ms |
| Partial search | <50 ms |
| Relationship expansion | <30 ms |
| Identifier sync overhead | <20 ms |
