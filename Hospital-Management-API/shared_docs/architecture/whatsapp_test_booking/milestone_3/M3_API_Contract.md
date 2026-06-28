# M3 — API Contract (v1)

**Endpoint:** `POST /api/v1/marketplace/diagnostics/recommendations/`  
**Auth:** JWT Bearer  
**Rate limit:** 20 requests/minute per user

## Request

```json
{
  "consultation_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_request_id": "wa-retry-1"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `consultation_id` | Yes | UUID |
| `client_request_id` | No | Max 128 chars; echoed in `metadata` |

**Headers:** Optional `X-Request-ID` for correlation (server generates if absent).

## Success response — HTTP 200

```json
{
  "metadata": {
    "recommendation_id": "uuid",
    "request_id": "uuid",
    "client_request_id": "wa-retry-1",
    "recommendation_version": "v1",
    "routing_version": "v1",
    "catalog_version": null,
    "pricing_version": null,
    "generated_at": "2026-06-27T10:00:00+00:00",
    "expires_at": "2026-06-27T10:15:00+00:00",
    "expires_in_seconds": 900,
    "duration_ms": 42
  },
  "recommendation": {
    "available": true,
    "consultation_id": "uuid",
    "collection_mode": "home",
    "home_collection_available": true,
    "lab_visit_available": true,
    "branch_address": "1 Lab St, Mumbai, MH, 400001",
    "branch_contact_number": "9999999999",
    "branch_working_hours": {
      "opening": "08:00",
      "closing": "20:00",
      "display": "08:00 – 20:00"
    },
    "google_maps_url": "https://www.google.com/maps/search/?api=1&query=19.076,72.8777",
    "available_slot_dates": null,
    "lab": {
      "id": "uuid",
      "display_name": "Acme Diagnostics",
      "logo_url": null,
      "verified": true,
      "rating": null
    },
    "branch": {
      "id": "uuid",
      "name": "Andheri Branch",
      "code": "BR-001",
      "address": "1 Lab St",
      "city": "Mumbai",
      "pincode": "400001",
      "latitude": "19.0760",
      "longitude": "72.8777",
      "phone": "9999999999"
    },
    "quoted_price": "950.00",
    "routing_estimated_price": "920.00",
    "pricing_source": "service_sum",
    "estimated_distance_km": 4.2,
    "estimated_tat_hours": 18,
    "routing_score": "0.9400",
    "primary_label": "recommended",
    "secondary_labels": ["fastest"],
    "why_recommended": ["Best overall score", "Fastest turnaround"]
  },
  "tests": [],
  "packages": [],
  "error": null
}
```

## Failure response — same envelope

```json
{
  "metadata": { "...": "..." },
  "recommendation": {
    "available": false,
    "consultation_id": "uuid"
  },
  "tests": [],
  "packages": [],
  "error": {
    "code": "NO_ELIGIBLE_LABORATORY",
    "message": "No laboratory can fulfill this request at the selected location.",
    "next_action": "CHANGE_LOCATION"
  }
}
```

## HTTP status mapping

| Condition | HTTP | `error.code` |
|-----------|------|--------------|
| Success | 200 | `error` is null |
| Invalid body | 400 | `VALIDATION_ERROR` |
| Business failures (investigations, location) | 400 | domain reason |
| No lab / pricing failure | 409 | `NO_ELIGIBLE_LABORATORY`, `PRICING_FAILURE` |
| Consultation missing | 404 | `CONSULTATION_NOT_FOUND` |
| No access | 403 | `PERMISSION_DENIED` |
| Unauthenticated | 401 | DRF default |
| Server error | 500 | `INTERNAL_ERROR` |

## `next_action` values

| Code | `next_action` |
|------|---------------|
| `NO_ELIGIBLE_LABORATORY` | `CHANGE_LOCATION` |
| `NO_INVESTIGATIONS` | `ADD_INVESTIGATIONS` |
| `ONLY_CUSTOM_INVESTIGATIONS` | `REMOVE_CUSTOM_TEST` |
| `LOCATION_MISSING` | `CHANGE_LOCATION` |
| `PRICING_FAILURE` | `TRY_AGAIN` |
| Other | `CONTACT_SUPPORT` |

## TTL

Default `expires_in_seconds`: **900** (15 minutes). Override via env `MARKETPLACE_RECOMMENDATION_TTL_SECONDS` or Django setting.

## Future (documented, not implemented in v1)

- `location_override` in request
- `channel` in request (`whatsapp`, `mobile`, …)
- Recommendation snapshot persistence keyed by `recommendation_id`
