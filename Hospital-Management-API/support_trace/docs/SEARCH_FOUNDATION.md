# Search Foundation

M5.1 reserves `search_vector` for a future OpenSearch migration. The field is populated but not queried in M5.1.

## Field

| Column | Type | Default |
|--------|------|---------|
| `search_vector` | JSONField | `{}` |

## Population

`SupportTraceBuilder` calls `build_search_vector(identifiers)` after identifier normalization:

```python
{
    "phone_number": ["919876543210"],
    "booking_id": ["ord-456"],
    "patient_account_id": ["a1b2c3d4-..."],
}
```

Rules:

- Phone numbers: digits only (already normalized)
- Other identifiers: lowercased string tokens
- Only fields with non-empty values are included

Defined in `domain/lookup_keys.py`.

## Why JSONField now

1. **Zero migration cost later** — tokens are already stored per row.
2. **Repository patterns documented** — M5.6 can add OpenSearch sync without schema changes.
3. **Testable today** — builder tests verify token shape.

## M5.1 query path

M5.1 uses **indexed identifier columns** for lookups, not `search_vector`:

```python
repo.find_by_identifier("phone_number", "919876543210")
repo.find_all_by_identifier("booking_id", "ORD-456")
```

These hit `db_index=True` columns directly.

## Future OpenSearch path (M5.6+)

```
SupportTrace row
    │
    ├── search_vector (JSON tokens) ──► OpenSearch document
    │
    └── identifier columns ──► SQL fallback / exact match
```

Planned capabilities:

- Full-text search across event labels (`last_event`)
- Fuzzy phone / provider reference matching
- Correlation-scoped timeline queries
- `sync_status` / `workflow_health` dashboard filters

## Design constraints

- Do not store audit payloads in `search_vector`.
- Keep token count bounded — one token per identifier field.
- Rebuild tokens on every upsert from normalized identifiers (idempotent).

## Verification

Builder tests assert `search_vector` is populated when identifiers are provided. No repository query methods read `search_vector` in M5.1.
