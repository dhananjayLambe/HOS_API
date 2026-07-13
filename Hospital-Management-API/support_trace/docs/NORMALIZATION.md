# Normalization Rules

Single normalization path via `NormalizationRegistry.normalize(field, value)`.

## Rules by type

| Field | Rule |
|-------|------|
| `phone_number` | Strip non-digits (`+91 98765 43210` → `919876543210`) |
| UUID fields | Lowercase if valid UUID; preserve non-UUID resource IDs (e.g. `ORD-99`) |
| `provider_reference` | Trim whitespace |
| `whatsapp_message_id` | Preserve `wamid.` prefix as-is |
| `payment_id` | Preserve `pay_` / `rzp_` prefixes; lowercase UUIDs |

## UUID fields

`patient_account_id`, `patient_profile_id`, `consultation_id`, `encounter_id`, `recommendation_id`, `booking_id`, `routing_id`, `report_id`, `prescription_id`, `order_id`, `payment_id`, `invoice_id`, `laboratory_id`, `branch_id`

## Accumulative merge

`IdentifierSyncService` never replaces existing identifier values:

```
existing.booking_id = "abc"
new event adds report_id
→ trace has both booking_id and report_id
```

## search_vector tokens

Built after normalization via `build_search_vector(identifiers)`:

```python
{
    "phone_number": ["919876543210"],
    "booking_id": ["<lowercased-uuid>"],
}
```

## Validation

After normalization, `ValidationRegistry` checks:

- UUID format (for uuid_field strategies)
- Phone digit length (10–15)
- Provider reference max length
- Payment prefix patterns
- Duplicate field conflicts (logged, fail-open)
