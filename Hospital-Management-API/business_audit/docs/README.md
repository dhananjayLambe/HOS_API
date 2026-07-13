# Business Audit Framework

Workflow-centric operational audit platform for DoctorProCare.

## Milestones

| Milestone | Status |
|-----------|--------|
| M4.1 Foundation | Complete |
| M4.2 Recommendation Audit | Complete |
| M4.3 Booking Audit | Complete |
| M4.4 Decision Engine Audit (Laboratory Routing) | Complete |
| M4.5 Communication Audit Framework (Report Delivery) | Complete |

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — platform design and write path
- [WORKFLOW_MODEL.md](WORKFLOW_MODEL.md) — workflow instances, nesting, async propagation
- [EVENT_MODEL.md](EVENT_MODEL.md) — action vs event, status vs outcome
- [DATA_MODEL.md](DATA_MODEL.md) — schema, indexes, immutability
- [SERVICE.md](SERVICE.md) — `BusinessAuditService.record()` API
- [HOW_TO_USE.md](HOW_TO_USE.md) — module facade pattern
- [RECOMMENDATION_AUDIT.md](RECOMMENDATION_AUDIT.md) — M4.2 recommendation facade and integrations
- [RECOMMENDATION_EVENTS.md](RECOMMENDATION_EVENTS.md) — recommendation action catalog
- [RECOMMENDATION_WORKFLOW.md](RECOMMENDATION_WORKFLOW.md) — three-stage lifecycle model
- [BOOKING_AUDIT.md](BOOKING_AUDIT.md) — M4.3 booking facade (reference workflow audit pattern)
- [BOOKING_EVENTS.md](BOOKING_EVENTS.md) — booking action catalog
- [BOOKING_WORKFLOW.md](BOOKING_WORKFLOW.md) — booking lifecycle model
- [BOOKING_STATE_MACHINE.md](BOOKING_STATE_MACHINE.md) — FSM template for future business domains
- [DECISION_AUDIT.md](DECISION_AUDIT.md) — M4.4 Decision Engine Audit Framework
- [DECISION_STATE_MACHINE.md](DECISION_STATE_MACHINE.md) — generic decision FSM template
- [DECISION_SNAPSHOT.md](DECISION_SNAPSHOT.md) — mandatory snapshot schema
- [ROUTING_AUDIT.md](ROUTING_AUDIT.md) — laboratory routing (Use Case #1)
- [ROUTING_EVENTS.md](ROUTING_EVENTS.md) — routing action catalog
- [ROUTING_WORKFLOW.md](ROUTING_WORKFLOW.md) — hierarchy, retries, marketplace
- [ROUTING_RULES.md](ROUTING_RULES.md) — ER_/IR_ codes, weights, versioning
- [ROUTING_CERTIFICATION.md](ROUTING_CERTIFICATION.md) — certification checklist
- [COMMUNICATION_AUDIT.md](COMMUNICATION_AUDIT.md) — M4.5 Communication Audit Framework
- [COMMUNICATION_STATE_MACHINE.md](COMMUNICATION_STATE_MACHINE.md) — extended communication FSM
- [COMMUNICATION_SNAPSHOT.md](COMMUNICATION_SNAPSHOT.md) — decision, provider, channel, metrics snapshots
- [COMMUNICATION_PROVIDERS.md](COMMUNICATION_PROVIDERS.md) — channel/provider registry, webhook stub
- [REPORT_DELIVERY_AUDIT.md](REPORT_DELIVERY_AUDIT.md) — report delivery (Use Case #1)
- [REPORT_DELIVERY_EVENTS.md](REPORT_DELIVERY_EVENTS.md) — report delivery action catalog
- [REPORT_DELIVERY_WORKFLOW.md](REPORT_DELIVERY_WORKFLOW.md) — lifecycle, timing, certification

## Quick start

```python
from business_audit.enums import (
    ActorType,
    BusinessAuditAction,
    BusinessResourceType,
    EventCategory,
    WorkflowStatus,
    WorkflowType,
)
from business_audit.services import BusinessAuditService
from business_audit.domain.context import generate_workflow_instance_id

workflow_instance_id = generate_workflow_instance_id()

BusinessAuditService.record(
    action=BusinessAuditAction.WORKFLOW_STARTED,
    event="WhatsApp recommendation workflow started",
    workflow_type=WorkflowType.WHATSAPP_FLOW,
    workflow_instance_id=workflow_instance_id,
    category=EventCategory.NOTIFICATION,
    domain="notifications",
    service="WhatsAppService",
    operation="send_recommendation",
    resource_type=BusinessResourceType.MESSAGE,
    resource_id="MSG-001",
    organization_id=str(clinic.id),
    status=WorkflowStatus.STARTED,
    actor_type=ActorType.SYSTEM,
)
```

## Test gate

```bash
DJANGO_SETTINGS_MODULE=main.settings_test .venv/bin/python -m pytest clinical_audit/tests business_audit/tests -v
```
