from django.db import models

# =========================================================
# DIAGNOSTIC ROUTING ENGINE — CHOICES
# =========================================================


class RoutingStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    PARTIAL = "partial", "Partial"
    NO_MATCH_FOUND = "no_match_found", "No Match Found"


class RoutingStrategy(models.TextChoices):
    NEAREST = "nearest", "Nearest"
    LOWEST_PRICE = "lowest_price", "Lowest Price"
    FASTEST_TAT = "fastest_tat", "Fastest TAT"
    BEST_VALUE = "best_value", "Best Value"
    HYBRID = "hybrid", "Hybrid"
    MANUAL = "manual", "Manual"


class RoutingLocationSource(models.TextChoices):
    PATIENT_ADDRESS = "patient_address", "Patient Address"
    PATIENT_PINCODE = "patient_pincode", "Patient Pincode"
    PATIENT_COORDINATES = "patient_coordinates", "Patient Coordinates"
    CLINIC_PINCODE = "clinic_pincode", "Clinic Pincode"
    CLINIC_LOCATION = "clinic_location", "Clinic Location"
    CITY_LEVEL = "city_level", "City Level"
    MANUAL = "manual", "Manual"


class RecommendationLabel(models.TextChoices):
    CHEAPEST = "cheapest", "Cheapest"
    FASTEST = "fastest", "Fastest"
    NEAREST = "nearest", "Nearest"
    BEST_VALUE = "best_value", "Best Value"
    RECOMMENDED = "recommended", "Recommended"


class RecommendationConfidence(models.TextChoices):
    HIGH = "high", "High"
    MEDIUM = "medium", "Medium"
    LOW = "low", "Low"


class AssignmentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ASSIGNED = "assigned", "Assigned"
    VIEWED = "viewed", "Viewed"
    ACCEPTED = "accepted", "Accepted"
    REJECTED = "rejected", "Rejected"
    EXPIRED = "expired", "Expired"
    CANCELLED = "cancelled", "Cancelled"
    COMPLETED = "completed", "Completed"


class AssignmentType(models.TextChoices):
    AUTO = "auto", "Auto"
    MANUAL = "manual", "Manual"
    PATIENT_SELECTED = "patient_selected", "Patient Selected"
    HELPDESK_SELECTED = "helpdesk_selected", "Helpdesk Selected"


class DiagnosticOrderRoutingStatus(models.TextChoices):
    """Denormalized routing lifecycle on DiagnosticOrder for cheap dashboard queries."""

    AWAITING_ASSIGNMENT = "awaiting_assignment", "Awaiting assignment"
    ROUTING_IN_PROGRESS = "routing_in_progress", "Routing in progress"
    ASSIGNED = "assigned", "Assigned"
    ROUTING_FAILED = "routing_failed", "Routing failed"
    NO_MATCH_FOUND = "no_match_found", "No match found"


class RoutingEventType(models.TextChoices):
    ROUTING_STARTED = "routing_started", "Routing Started"
    ROUTING_COMPLETED = "routing_completed", "Routing Completed"
    ROUTING_FAILED = "routing_failed", "Routing Failed"
    NO_ELIGIBLE_LABS = "no_eligible_labs", "No Eligible Labs"
    LAB_SUGGESTED = "lab_suggested", "Lab Suggested"
    ASSIGNMENT_CREATED = "assignment_created", "Assignment Created"
    LAB_VIEWED = "lab_viewed", "Lab Viewed"
    LAB_ACCEPTED = "lab_accepted", "Lab Accepted"
    LAB_REJECTED = "lab_rejected", "Lab Rejected"
    AUTO_EXPIRED = "auto_expired", "Auto Expired"
    REASSIGNED = "reassigned", "Reassigned"
    COMPLETED = "completed", "Completed"


__all__ = [
    "AssignmentStatus",
    "AssignmentType",
    "DiagnosticOrderRoutingStatus",
    "RecommendationConfidence",
    "RecommendationLabel",
    "RoutingEventType",
    "RoutingLocationSource",
    "RoutingStatus",
    "RoutingStrategy",
]
