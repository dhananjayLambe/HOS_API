"""Constants for diagnostic booking business audit."""

from django.conf import settings

# Operational FSM state labels (reference pattern for future business domains)
BOOKING_STATE_CREATED = "Created"
BOOKING_STATE_CONFIRMED = "Confirmed"
BOOKING_STATE_MODIFIED = "Modified"
BOOKING_STATE_CANCELLED = "Cancelled"
BOOKING_STATE_EXPIRED = "Expired"
BOOKING_STATE_CLOSED = "Closed"

STAGE_CREATION = "creation"
STAGE_CONFIRMATION = "confirmation"
STAGE_MODIFICATION = "modification"
STAGE_CANCELLATION = "cancellation"
STAGE_EXPIRATION = "expiration"
STAGE_CLOSURE = "closure"

DOMAIN_DIAGNOSTICS = "diagnostics_engine"
DOMAIN_LABS = "labs"

SERVICE_ORDER_CREATION = "DiagnosticOrderCreationService"
SERVICE_VISIT_WORKFLOW = "VisitWorkflowService"
SERVICE_ROUTING = "RoutingAssignmentService"
SERVICE_CANCELLATION = "CancellationService"
SERVICE_ORDER_STATUS = "OrderStatusAggregationService"
SERVICE_EXPIRATION = "BookingExpirationService"

OPERATION_CREATE_ORDER = "create_order_from_consultation"
OPERATION_CONFIRM_ORDER = "confirm_order"
OPERATION_CONFIRM_VISIT = "confirm_visit"
OPERATION_RESCHEDULE_VISIT = "reschedule_visit"
OPERATION_ASSIGN_LAB = "assign_lab"
OPERATION_CANCEL_ORDER = "cancel_order"
OPERATION_CLOSE_ORDER = "sync_order_completed"
OPERATION_EXPIRE = "expire_stale_bookings"

COLLECTION_MODE_HOME = "HOME_COLLECTION"
COLLECTION_MODE_VISIT = "VISIT_LAB"

DOWNSTREAM_ORDER_CREATE = [
    "DiagnosticOrderCreationService",
    "LabRouting",
]
DOWNSTREAM_CONFIRMATION = [
    "VisitWorkflowService",
    "LabAssignmentWorkflow",
    "HomeCollectionProvisioning",
]
DOWNSTREAM_MODIFICATION = ["VisitWorkflowService", "RoutingAssignmentService"]
DOWNSTREAM_CANCELLATION = ["CancellationService"]
DOWNSTREAM_EXPIRATION = ["BookingExpirationService"]
DOWNSTREAM_CLOSURE = ["OrderStatusAggregationService"]

BOOKING_ENGINE_VERSION = getattr(settings, "APPLICATION_VERSION", "0.0.0")

CONFIRMATION_SOURCE_SYSTEM = "system"
CONFIRMATION_SOURCE_VISIT = "visit_confirm"
