# Business Audit Framework

Workflow-centric operational audit platform for DoctorProCare.

## Milestones

| Milestone | Status |
|-----------|--------|
| M4.1 Foundation | Complete |
| M4.2 Recommendation Audit | Complete |

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
DJANGO_SETTINGS_MODULE=main.settings_test .venv/bin/python -m pytest business_audit/tests -v
```
