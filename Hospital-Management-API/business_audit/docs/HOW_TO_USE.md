# How to Use Business Audit

M4.1 provides the framework only. Production modules wire facades in M4.2–M4.8.

## Reference pattern: Booking Audit (M4.3)

M4.3 is the **canonical Business Workflow audit** implementation. Use it as the template for M4.4+ domains.

Production modules integrate via hooks only — never `BusinessAuditService.record()` directly:

```python
from business_audit.booking.hooks import (
    schedule_booking_business_created,
    schedule_booking_business_confirmed,
)

# After DiagnosticOrder is persisted (inside a transaction):
schedule_booking_business_created(order=order, user=request.user)
schedule_booking_business_confirmed(order=order, user=request.user)
```

The facade (`BookingAuditService`) handles:

- FSM `state_before` / `state_after` on every record
- Payload and snapshot builders
- Idempotency guards
- `parent_workflow_instance_id` linkage to recommendation workflows

See [BOOKING_AUDIT.md](BOOKING_AUDIT.md) and [BOOKING_STATE_MACHINE.md](BOOKING_STATE_MACHINE.md).

## Decision Engine Audit (M4.4)

M4.4 adds explainability for routing decisions. Production modules integrate via routing hooks only:

```python
from business_audit.decision.routing.hooks import (
    schedule_routing_decision_started,
    schedule_routing_business_manual_override,
)
```

Post-booking routing is wired inside `RoutingService` / `AssignmentService`. Marketplace recommendations use `schedule_marketplace_routing_decision` from `LabRecommendationService`.

See [DECISION_AUDIT.md](DECISION_AUDIT.md) and [ROUTING_AUDIT.md](ROUTING_AUDIT.md).

## Communication Audit (M4.5)

M4.5 adds explainability for patient communication (report delivery is Use Case #1). Production modules integrate via communication report hooks only:

```python
from business_audit.communication.report.hooks import (
    schedule_report_ready,
    schedule_delivery_requested,
    schedule_channel_delivery_success,
    schedule_delivery_failed,
    schedule_delivery_retried,
    schedule_report_portal_communication,      # extension point stub
    schedule_communication_webhook_received,   # extension point stub
)
```

Wired inside `ReportWorkflowService.mark_ready`, `ReportDeliveryService` (prepare/send/fail/retry), and Celery `deliver_report_whatsapp` failure path.

`LabReportDeliveryLog.metadata` stores `communication_id`, `communication_attempt_id`, `attempt_number`.

See [COMMUNICATION_AUDIT.md](COMMUNICATION_AUDIT.md) and [REPORT_DELIVERY_AUDIT.md](REPORT_DELIVERY_AUDIT.md).

## Module facade pattern (M4.2+)

Each module should expose a thin audit facade that:

1. Resolves workflow context from `LogContext`
2. Maps domain events to `BusinessAuditAction` + human `event` label
3. Calls `BusinessAuditService.record()` with fail-open semantics

```python
# notifications/audit/whatsapp_audit_service.py (future M4.x)
from business_audit.services import BusinessAuditService
from business_audit.enums import (
    ActorType, BusinessAuditAction, BusinessResourceType,
    EventCategory, WorkflowStatus, WorkflowType,
)

class WhatsAppAuditService:
    @classmethod
    def emit_message_sent(cls, *, message_id, organization_id, workflow_instance_id, **ctx):
        return BusinessAuditService.record(
            action=BusinessAuditAction.WORKFLOW_COMPLETED,
            event="WhatsApp message sent",
            workflow_type=WorkflowType.WHATSAPP_FLOW,
            workflow_instance_id=workflow_instance_id,
            category=EventCategory.NOTIFICATION,
            domain="notifications",
            service="WhatsAppService",
            operation="send_message",
            resource_type=BusinessResourceType.MESSAGE,
            resource_id=message_id,
            organization_id=organization_id,
            status=WorkflowStatus.COMPLETED,
            actor_type=ActorType.SYSTEM,
            external_provider=ctx.get("provider"),
            provider_reference=ctx.get("provider_reference"),
            **{k: v for k, v in ctx.items() if k in {"correlation_id", "payload"}},
        )
```

## Nested workflow example

```python
import uuid
from business_audit.domain.context import apply_workflow_context, generate_workflow_instance_id
from business_audit.services import BusinessAuditService
from shared.logging.context import LogContext, get_context_manager

correlation_id = str(uuid.uuid4())
recommendation_instance = generate_workflow_instance_id()

get_context_manager().set(LogContext(
    correlation_id=correlation_id,
    workflow_instance_id=recommendation_instance,
))

BusinessAuditService.record(
    action="workflow.started",
    event="Recommendation workflow started",
    workflow_type="Recommendation",
    workflow_instance_id=recommendation_instance,
    category="Recommendation",
    domain="consultations_core",
    service="RecommendationService",
    operation="generate",
    resource_type="Recommendation",
    resource_id="REC-001",
    organization_id=org_id,
    status="Started",
    actor_type="System",
)

booking_instance = generate_workflow_instance_id()
apply_workflow_context(
    workflow_instance_id=booking_instance,
    parent_workflow_instance_id=recommendation_instance,
)

BusinessAuditService.record(
    action="workflow.started",
    event="Booking workflow started",
    workflow_type="Booking",
    workflow_instance_id=booking_instance,
    parent_workflow_instance_id=recommendation_instance,
    category="Booking",
    domain="diagnostics_engine",
    service="BookingService",
    operation="create_booking",
    resource_type="Booking",
    resource_id="BOOK-001",
    organization_id=org_id,
    status="Started",
    actor_type="System",
    correlation_id=correlation_id,
)
```

Both records share `correlation_id`. The booking record links to the recommendation via `parent_workflow_instance_id`.

## Celery task propagation

Pass tracing fields explicitly into tasks and restore at entry:

```python
@shared_task
def process_delivery(correlation_id, workflow_instance_id, parent_workflow_instance_id=None):
    apply_workflow_context(
        correlation_id=correlation_id,
        workflow_instance_id=workflow_instance_id,
        parent_workflow_instance_id=parent_workflow_instance_id,
    )
    BusinessAuditService.record(
        action="workflow.running",
        event="Report delivery in progress",
        ...
    )
```

## Do not

- Mutate or delete audit rows
- Store credentials, tokens, or binary blobs in payloads
- Block business logic on audit failure (unless explicitly testing with `raise_on_failure=True`)
- Use bare `workflow_id` — always `workflow_instance_id` for executions
