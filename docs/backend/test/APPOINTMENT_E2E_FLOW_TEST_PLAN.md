# Appointment → Check-in → Queue → Consultation — E2E test plan

## Layout

| Path | Purpose |
|------|---------|
| [Hospital-Management-API/tests/helpers/factories.py](../../../Hospital-Management-API/tests/helpers/factories.py) | Shared `make_clinic`, `make_doctor`, `make_helpdesk_user`, `make_patient`, `make_authenticated_client` |
| [Hospital-Management-API/tests/helpers/realtime_mock.py](../../../Hospital-Management-API/tests/helpers/realtime_mock.py) | `mock_queue_realtime()` — patches queue realtime entry points used from check-in and queue views |
| [Hospital-Management-API/appointments/tests/test_appointment_create_api.py](../../../Hospital-Management-API/appointments/tests/test_appointment_create_api.py) | POST create: valid, `PAST_TIME`, `SLOT_CONFLICT`, `FUTURE_LIMIT_EXCEEDED` |
| [Hospital-Management-API/appointments/tests/test_appointment_e2e_flow.py](../../../Hospital-Management-API/appointments/tests/test_appointment_e2e_flow.py) | Full API journey, rollback, auto-heal, realtime failure, auth |
| [Hospital-Management-API/appointments/tests/test_appointment_concurrency.py](../../../Hospital-Management-API/appointments/tests/test_appointment_concurrency.py) | `TransactionTestCase` + threads; load test tagged `@tag("slow")` |
| [Hospital-Management-API/queue_management/tests/test_queue_service_unit.py](../../../Hospital-Management-API/queue_management/tests/test_queue_service_unit.py) | `add_to_queue` dedupe, retry, `trigger_queue_realtime_update` |

## Status semantics

- **Queue** (`queue_management.models.Queue`): `waiting` → `vitals_done` → `in_consultation` → `completed` (row retained; not deleted).
- **Encounter** (`ClinicalEncounter`): `created` → `pre_consultation_in_progress` → `consultation_in_progress` → `consultation_completed`.

## Commands

```bash
cd Hospital-Management-API
python manage.py test appointments.tests.test_appointment_create_api -v2
python manage.py test appointments.tests.test_appointment_e2e_flow -v2
python manage.py test queue_management.tests.test_queue_service_unit -v2
python manage.py test appointments.tests.test_appointment_concurrency.CheckInConcurrencyTests -v2
python manage.py test appointments.tests.test_appointment_concurrency --exclude-tag=slow -v2
```

## Notes

- Default `main/settings.py` uses PostgreSQL; tests need a running DB or equivalent settings override.
- Slow concurrency load test: `python manage.py test appointments.tests.test_appointment_concurrency -v2` (includes 25 parallel check-ins).
