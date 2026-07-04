# CloudWatch Search Examples — Correlation Framework

Reference queries for reconstructing a DoctorProCare patient workflow from a single Correlation ID.

Golden trace Correlation ID:

```
550e8400-e29b-41d4-a716-446655440000
```

Log group (application):

```
/doctorprocare/application
```

⸻

## Full workflow reconstruction

```
fields @timestamp, correlation_id, request_id, module, action, message, booking_id, report_id
| filter correlation_id = "550e8400-e29b-41d4-a716-446655440000"
| sort @timestamp asc
```

Expected timeline:

| Time (UTC) | Action |
|------------|--------|
| 10:00:01 | `api.request_received` |
| 10:00:02 | `authentication.verified` |
| 10:00:03 | `recommendation.generated` |
| 10:00:04 | `booking.submitted` |
| 10:00:05 | `booking.confirmed` |
| 10:00:06 | `celery.task_started` |
| 10:00:07 | `whatsapp.notification_sent` |
| 10:01:22 | `laboratory.processing_started` |
| 10:01:25 | `report.upload_completed` |
| 10:01:28 | `workflow.completed` |

⸻

## Celery / background only

```
fields @timestamp, action, module, message
| filter correlation_id = "550e8400-e29b-41d4-a716-446655440000"
| filter module in ["celery", "whatsapp", "laboratory", "reports"]
| sort @timestamp asc
```

⸻

## Exception search

```
fields @timestamp, action, message, exception.type, exception.message
| filter correlation_id = "550e8400-e29b-41d4-a716-446655440000"
| filter ispresent(exception)
| sort @timestamp asc
```

⸻

## Booking-centric lookup

```
fields @timestamp, action, message, booking_id, report_id
| filter booking_id = "BK-CERT-001"
| sort @timestamp asc
```

When `booking_id` is known but Correlation ID is not, this query recovers the Correlation ID from the first matching event, then use the full-workflow query above.

⸻

## Concurrent request isolation check

```
fields correlation_id, request_id, action
| filter action = "api.request_received"
| stats count_distinct(request_id) as requests by correlation_id
```

Each Correlation ID may appear on multiple HTTP requests (retries / follow-ups), but each `request_id` must map to exactly one HTTP request.

⸻

## Support playbook

1. Obtain Correlation ID from the API response header `X-Correlation-ID` or from the client error report.
2. Run the full workflow reconstruction query.
3. Confirm every expected action is present and timestamps are ordered.
4. If a step is missing, filter by `module` for that layer (API, Celery, WhatsApp, Reports).
5. For failures, run the exception search on the same Correlation ID.
