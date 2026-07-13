# State Registry

Action → state mappings live in per-workflow registries under `support_trace/workflow/registries/`.

## Facade

```python
from support_trace.workflow.registries import resolve_transition

transition = resolve_transition("booking.confirmed", workflow_type="Booking")
```

## Registries

| Registry | WorkflowType |
|----------|--------------|
| `recommendation.py` | Recommendation |
| `booking.py` | Booking |
| `routing.py` | Routing |
| `report_delivery.py` | ReportDelivery |
| `consultation.py` | Consultation |
| `prescription.py` | Prescription |
| `diagnostic_report.py` | DiagnosticReport |

Each registry maps audit actions to `WorkflowStateTransition(current_state, workflow_step, trace_status, ...)`.

## Extending

Add a new registry file and register it in `registries/__init__.py`. Do not edit unrelated registries (WhatsApp Reminder/OTP/Flow can be added later without touching Booking).

## Examples

| Action | State | Step | Status |
|--------|-------|------|--------|
| `recommendation.generated` | Generated | Generating Recommendation | Started |
| `booking.confirmed` | Confirmed | Booking Confirmed | Running |
| `routing.lab_assigned` | Assigned | Lab Assigned | Completed |
| `report.whatsapp_delivery` | Delivered | WhatsApp Delivery | Completed |
| `consultation.started` | Started | Consultation Started | Started |
| `prescription.signed` | Signed | Prescription Signed | Running |
| `report.viewed` | Viewed | Waiting for Patient View | Running |

Unmapped actions → no-op (sync returns success without writing).
