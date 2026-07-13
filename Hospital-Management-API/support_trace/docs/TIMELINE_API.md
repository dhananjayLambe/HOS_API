# Timeline API

`GET /api/v1/support/{scope}/{id}/timeline`

| Endpoint | Service |
|----------|---------|
| `/workflow/{id}/timeline` | `TimelineService.build_workflow_timeline` |
| `/patient/{id}/timeline` | `TimelineService.build_patient_timeline` |
| `/correlation/{id}/timeline` | `TimelineService.build_correlation_timeline` |
| `/booking/{id}/timeline` | `TimelineService.build_booking_timeline` |

Filters: `date_from`, `date_to`, `category`, `severity`

Reserved: `stream=true` (future SSE — ignored in M5.6)
