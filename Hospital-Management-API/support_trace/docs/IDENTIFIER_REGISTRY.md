# Identifier Registry

The `IdentifierRegistry` facade is the single source of truth for identifier behavior.

## Composition

```python
IDENTIFIER_REGISTRY: list[IdentifierStrategy] = [
    WhatsAppIdentifierStrategy(),
    PaymentIdentifierStrategy(),
    PhoneIdentifierStrategy(),
    BookingIdentifierStrategy(),
    # ... one class per identifier type
]
```

## Facade API

| Method | Delegates to |
|--------|--------------|
| `all_strategies()` | Returns full registry list |
| `get_by_field(field_name)` | Lookup strategy by SupportTrace column |
| `extract_from_audit(audit, source)` | `ExtractionRegistry` |

## Split registries

### DetectorRegistry

Aggregates `strategy.detect(raw)` across all strategies, sorted by confidence descending.

### ExtractionRegistry

- Adapts `SupportTraceSyncEvent` to audit-like namespace for unified extraction
- `merge(*dicts)` — combine identifier dicts without field loss

### NormalizationRegistry

Single entry: `normalize(field, value) → str | None`

### ValidationRegistry

`validate_dict(identifiers) → dict` — drops invalid values, logs warnings (fail-open).

## Extension guidelines

1. One strategy class per identifier type.
2. Never hardcode identifier logic in `WorkflowSyncService` or lookup services.
3. Register new strategies in `IDENTIFIER_REGISTRY` only.
4. Use `supports_partial_search()` to opt into prefix/partial search plans.

See [IDENTIFIER_STRATEGY.md](IDENTIFIER_STRATEGY.md) for the strategy protocol.
