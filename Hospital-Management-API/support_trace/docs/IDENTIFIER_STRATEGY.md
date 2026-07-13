# Identifier Strategy Pattern

M5.3 uses the **Strategy Pattern** for all identifier types. Each identifier is a self-contained strategy class implementing detection, normalization, validation, and audit extraction.

## Protocol

```python
class IdentifierStrategy(Protocol):
    identifier_type: IdentifierType
    field_name: str

    def detect(self, raw: str) -> DetectedIdentifier | None
    def normalize(self, value: str) -> str | None
    def validate(self, value: str) -> str | None  # error message or None
    def extract_from_business_audit(self, audit) -> str | None
    def extract_from_clinical_audit(self, audit) -> str | None
    def supports_partial_search(self) -> bool
```

## Strategy classes

Located in `support_trace/identifiers/strategies/`:

| Strategy | Field | Partial search |
|----------|-------|----------------|
| `PhoneIdentifierStrategy` | `phone_number` | Yes |
| `WhatsAppIdentifierStrategy` | `whatsapp_message_id` | Yes |
| `PaymentIdentifierStrategy` | `payment_id` | Yes |
| `ProviderReferenceIdentifierStrategy` | `provider_reference` | Yes |
| `BookingIdentifierStrategy` | `booking_id` | No |
| … | … | … |

## Adding a new identifier type

1. Create `NewIdentifierStrategy` in `strategies/` extending `BaseIdentifierStrategy`.
2. Add the class to `IDENTIFIER_REGISTRY` in `identifier_registry.py`.
3. Add the column to `IDENTIFIER_FIELDS` and `SupportTrace` model (migration).
4. Add tests in `support_trace/tests/identifiers/test_strategies.py`.

No changes to `IdentifierDetector`, `SearchPlanner`, or `IdentifierLookupService` are required.

## Split registries

The facade `IdentifierRegistry` delegates to:

| Registry | Role |
|----------|------|
| `DetectorRegistry` | Rank `strategy.detect()` results |
| `ExtractionRegistry` | Extract from audit rows / sync events |
| `NormalizationRegistry` | `normalize(field, value)` |
| `ValidationRegistry` | Validate and deduplicate identifier dicts |

Detection, extraction, normalization, and validation evolve independently.
