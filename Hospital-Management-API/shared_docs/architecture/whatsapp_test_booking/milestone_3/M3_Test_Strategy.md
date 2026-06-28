# M3 — Test Strategy

## Unit

- Serializer: label split, `why_recommended`, `next_action` mapping
- Response builder: TTL, envelope shape

## Integration

- `LabRecommendationService` parity via API (`test_parity_with_domain_service`)

## API

| Case | Expected |
|------|----------|
| Success envelope | 200, nested fields |
| Audit created | +1 audit row |
| No order/routing writes | counts unchanged |
| 401 | no token |
| 403 | wrong doctor |
| 404 | unknown consultation |
| 400 | no investigations |
| 409 | no eligible lab |
| Superuser | cross-doctor access |
| TTL override | settings |

## Chaos

| Scenario | Expected |
|----------|----------|
| Branch inactive | 409 |
| Clinic address deleted | 400 LOCATION_MISSING |
| Pricing deactivated | 409 |

## Regression

Run with M2:

```bash
DJANGO_SETTINGS_MODULE=main.settings_test .venv/bin/python manage.py test \
  diagnostics_engine.tests.test_marketplace_recommendation_api \
  diagnostics_engine.tests.test_lab_recommendation_service
```

File: `diagnostics_engine/tests/test_marketplace_recommendation_api.py`
