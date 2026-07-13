# Workflow Investigation API

All endpoints: `GET /api/v1/support/{resource}/{id}?expand=...`

| Endpoint | Facade method |
|----------|---------------|
| `/workflow/{id}` | `lookup_by_workflow` |
| `/correlation/{id}` | `lookup_by_correlation` |
| `/booking/{id}` | `lookup_by_booking` |
| `/report/{id}` | `lookup_by_report` |
| `/whatsapp/{id}` | `lookup_by_whatsapp` |
| `/patient/{id}` | `lookup_by_patient` |

Health: use `expand=health` (no dedicated `/health` endpoint).

Response includes `metadata.investigation_id` for traceability.
