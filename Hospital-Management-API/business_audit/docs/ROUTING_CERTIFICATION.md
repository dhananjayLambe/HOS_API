# Routing Decision Certification

`RoutingDecisionCertificationService.certify()` validates routing decision audit integrity for a booking journey.

## Usage

```python
from business_audit.decision.certification.routing_certification_service import (
    RoutingDecisionCertificationService,
)

report = RoutingDecisionCertificationService().certify(
    correlation_id=correlation_id,
    booking_id=booking_id,
    decision_id=decision_id,  # optional — scopes to one attempt
)
assert report.passed
```

## Validators

| Validator | Checks |
|-----------|--------|
| Timeline | Exactly one `routing.started` and one terminal (`lab_assigned` or `failed`) per `decision_id` |
| Decision snapshot | Mandatory snapshot on `lab_assigned` and `manual_override` |
| Correlation | Shared `correlation_id`, `workflow_type=Routing`, `resource_type=Decision` |

## Checklist

- [ ] One `routing.started` per `decision_id`
- [ ] One terminal event per `decision_id`
- [ ] Selected lab present when assigned
- [ ] Ranks 1..N contiguous in snapshot
- [ ] Decision snapshot on terminal success
- [ ] Workflow hierarchy: recommendation → booking → routing → decision
- [ ] Shared `correlation_id` across nested workflows

## Tests

`business_audit/tests/decision/test_routing_certification.py`
