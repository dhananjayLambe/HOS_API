from django.db import models

# =========================================================
# DIAGNOSTICS ENGINE ENUMS / CHOICES
# =========================================================
# Centralized enum definitions for the diagnostics domain.
#
# Why centralized?
# - keeps API responses consistent
# - prevents magic strings across services
# - simplifies frontend integrations
# - improves analytics consistency
# - enables safer workflow orchestration
#
# These enums power:
# - catalog management
# - diagnostic order lifecycle
# - execution workflows
# - report lifecycle
# - pricing + commissions
# - future orchestration engines
# =========================================================

# =========================================================
# COMMISSION SYSTEM
# =========================================================
# Defines how doctor/lab/platform commissions are calculated.
#
# FLAT:
#   Fixed amount per order.
#
# PERCENT:
#   Percentage of billable amount.
# =========================================================
class CommissionType(models.TextChoices):
    FLAT = "flat", "Flat Amount"
    PERCENT = "percent", "Percentage"


# =========================================================
# DIAGNOSTIC ORDER LIFECYCLE
# =========================================================
# Operational/commercial order lifecycle.
#
# IMPORTANT:
# This is NOT the consultation lifecycle.
#
# Example flow:
# CREATED
#   -> CONFIRMED
#   -> SAMPLE_COLLECTED
#   -> IN_PROCESSING
#   -> REPORT_READY
#   -> COMPLETED
#
# Partial/cancel states support enterprise workflows.
# =========================================================
class OrderStatus(models.TextChoices):
    CREATED = "created", "Created"
    CONFIRMED = "confirmed", "Confirmed"
    SAMPLE_COLLECTED = "sample_collected", "Sample Collected"
    IN_PROCESSING = "in_processing", "In Processing"
    REPORT_READY = "report_ready", "Report Ready"
    COMPLETED = "completed", "Completed"
    PARTIAL = "partial", "Partially Completed"
    CANCELLED = "cancelled", "Cancelled"


# =========================================================
# PACKAGE OWNERSHIP TYPE
# =========================================================
# SYSTEM:
#   Platform-managed package.
#
# CUSTOM:
#   Clinic/lab/provider specific package.
# =========================================================
class PackageType(models.TextChoices):
    SYSTEM = "system", "System"
    CUSTOM = "custom", "Custom"


# =========================================================
# COLLECTION AVAILABILITY
# =========================================================
# Defines where a diagnostic service/package can be executed.
#
# HOME:
#   Home sample collection only.
#
# LAB:
#   Branch visit required.
#
# BOTH:
#   Flexible execution model.
# =========================================================
class CollectionType(models.TextChoices):
    HOME = "home", "Home"
    LAB = "lab", "Lab"
    BOTH = "both", "Both"


# =========================================================
# ORDER FULFILLMENT POLICY
# =========================================================
# STRICT:
#   All services must be fulfilled together.
#
# PARTIAL:
#   Partial fulfillment allowed.
#
# Important for:
# - inventory gaps
# - provider routing
# - package execution
# =========================================================
class FulfillmentMode(models.TextChoices):
    STRICT = "strict", "Strict"
    PARTIAL = "partial", "Partial"


# =========================================================
# COMMISSION SOURCE TRACKING
# =========================================================
# Helps explain WHY a commission rule was applied.
#
# Useful for:
# - audits
# - finance reconciliation
# - campaign analytics
# - payout debugging
# =========================================================
class CommissionSource(models.TextChoices):
    DEFAULT = "default", "Default"
    CAMPAIGN = "campaign", "Campaign"
    CUSTOM = "custom", "Custom"


# =========================================================
# ORDER LINE TYPE
# =========================================================
# TEST:
#   Single diagnostic investigation.
#
# PACKAGE:
#   Multi-test grouped bundle.
#
# Packages later expand into execution test lines.
# =========================================================
class OrderLineType(models.TextChoices):
    TEST = "test", "Test"
    PACKAGE = "package", "Package"


# =========================================================
# EXECUTION MODE
# =========================================================
# Defines HOW a diagnostic service is fulfilled.
#
# HOME_COLLECTION:
#   Phlebotomist/home visit workflow.
#
# BRANCH_VISIT:
#   Patient visits diagnostic center.
#
# THIRD_PARTY:
#   External provider/network execution.
# =========================================================
class ExecutionType(models.TextChoices):
    HOME_COLLECTION = "home_collection", "Home Collection"
    BRANCH_VISIT = "branch_visit", "Branch Visit"
    THIRD_PARTY = "third_party", "Third Party"


# =========================================================
# EXECUTION TEST LINE STATUS
# =========================================================
# Lowest operational workflow status.
#
# Used by:
# - collection teams
# - lab technicians
# - report workflows
# - provider dashboards
# =========================================================
class OrderTestLineStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SCHEDULED = "scheduled", "Scheduled"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


# =========================================================
# CLINICAL APPLICABILITY FILTERS
# =========================================================
# Used for:
# - package eligibility
# - recommendation engines
# - smart filtering
# - future AI clinical suggestions
# =========================================================
class GenderApplicability(models.TextChoices):
    ALL = "all", "All"
    MALE = "male", "Male"
    FEMALE = "female", "Female"


# =========================================================
# REPORT STORAGE STRATEGY
# =========================================================
# STRUCTURED:
#   Fully normalized report data.
#
# FILE:
#   File/PDF/image only.
#
# HYBRID:
#   Structured + uploaded report artifacts.
#
# Hybrid is expected to become the dominant model.
# =========================================================
class ReportStorageMode(models.TextChoices):
    STRUCTURED = "structured", "Structured Only"
    FILE = "file", "File Only"
    HYBRID = "hybrid", "Structured + File"


# =========================================================
# REPORT LIFECYCLE
# =========================================================
# Tracks report processing lifecycle.
#
# Example:
# PENDING
#   -> IN_PROGRESS
#   -> READY
#   -> DELIVERED
#
# Supports:
# - patient notifications
# - WhatsApp delivery
# - doctor review workflows
# - compliance tracking
# =========================================================
class ReportLifecycleStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    IN_PROGRESS = "in_progress", "In Progress"
    READY = "ready", "Ready"
    DELIVERED = "delivered", "Delivered"
    REJECTED = "rejected", "Rejected"


# Public exports for diagnostics domain enums.
# Helps keep imports standardized across services.
__all__ = [
    "CollectionType",
    "CommissionSource",
    "CommissionType",
    "ExecutionType",
    "FulfillmentMode",
    "GenderApplicability",
    "OrderLineType",
    "OrderStatus",
    "OrderTestLineStatus",
    "PackageType",
    "ReportLifecycleStatus",
    "ReportStorageMode",
]
