# Report Delivery Workflow

## Hierarchy

```
Recommendation → Booking → Routing → Communication → Attempt → Provider → Webhook
```

Parent chain resolved via `report.order_test_line.order`.

## Lifecycle

1. **Report finalized** — `ReportWorkflowService.mark_ready()` → `report.ready`
2. **Delivery prepared** — `prepare_report_delivery()` → `report.delivery_requested` (capture `queue_wait_ms`)
3. **Provider send** — `execute_delivery_send()` → `report.{channel}_delivery` (decision + provider snapshots + metrics)
4. **Failure** — `mark_delivery_failed()` → `report.delivery_failed`
5. **Retry** — `retry_delivery()` → `report.delivery_retried` + new attempt log
6. **Portal** — `schedule_report_portal_communication()` stub until portal publisher exists
7. **Webhook** — `schedule_communication_webhook_received()` stub for provider callbacks

## Timing instrumentation

`prepare_report_delivery` stores `prepared_at_monotonic` on log metadata. `execute_delivery_send` computes:

- `queue_wait_ms` — prepare → send start
- `provider_latency_ms` — send start → provider response
- `total_delivery_ms` — prepare → delivered

## Certification

`CommunicationCertificationService.certify(communication_id)` validates timeline, snapshots, and correlation when `correlation_id` is provided.

## Test gate

```bash
DJANGO_SETTINGS_MODULE=main.settings_test .venv/bin/python -m pytest clinical_audit/tests business_audit/tests -v
```

354 tests passed (38 new communication tests).
