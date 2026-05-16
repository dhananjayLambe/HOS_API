"""Django admin registrations for labs marketplace / operations models."""

from django.contrib import admin

from labs.models import (
    BranchPackagePricing,
    BranchServiceArea,
    BranchServicePricing,
    LabAddress,
    LabBranch,
    LabCollectionRequest,
    LabDocument,
    LabOrderAssignment,
    LabOrganization,
    LabReportDeliveryLog,
    LabReportReview,
    LabSampleTracking,
    LabSchedule,
    LabUser,
    LabVisitAppointment,
)


@admin.register(LabOrganization)
class LabOrganizationAdmin(admin.ModelAdmin):
    list_display = (
        "organization_name",
        "organization_code",
        "registration_status",
        "is_verified",
        "onboarding_completed",
        "is_active_for_orders",
        "is_active",
        "home_collection_available",
        "created_at",
    )
    list_filter = (
        "registration_status",
        "is_verified",
        "onboarding_completed",
        "is_active_for_orders",
        "is_active",
        "is_deleted",
        "lab_type",
    )
    search_fields = ("organization_name", "organization_code", "display_name", "slug", "primary_contact_number")
    ordering = ("organization_name",)


@admin.register(LabBranch)
class LabBranchAdmin(admin.ModelAdmin):
    list_display = (
        "branch_name",
        "branch_code",
        "organization",
        "is_active",
        "is_active_for_orders",
        "home_collection_available",
        "walk_in_collection_available",
        "created_at",
    )
    list_filter = ("is_active", "is_deleted", "is_active_for_orders", "home_collection_available", "walk_in_collection_available")
    search_fields = ("branch_name", "branch_code", "organization__organization_code", "organization__organization_name")
    raw_id_fields = ("organization",)
    ordering = ("organization", "branch_name")


@admin.register(LabAddress)
class LabAddressAdmin(admin.ModelAdmin):
    list_display = ("branch", "city", "state", "pincode", "is_active", "created_at")
    list_filter = ("is_active", "is_deleted", "state")
    search_fields = ("branch__branch_code", "branch__branch_name", "city", "pincode", "address_line_1")
    raw_id_fields = ("branch",)


@admin.register(LabSchedule)
class LabScheduleAdmin(admin.ModelAdmin):
    list_display = ("branch", "day_of_week", "is_closed", "open_time", "close_time", "is_active")
    list_filter = ("day_of_week", "is_closed", "is_active", "is_deleted")
    raw_id_fields = ("branch",)


@admin.register(LabUser)
class LabUserAdmin(admin.ModelAdmin):
    list_display = ("user", "organization", "branch", "role", "is_primary_admin", "is_active", "created_at")
    list_filter = ("role", "is_primary_admin", "is_active", "is_deleted")
    search_fields = ("user__username", "user__email", "employee_code", "branch__branch_code", "organization__organization_code")
    raw_id_fields = ("user", "organization", "branch")


@admin.register(LabDocument)
class LabDocumentAdmin(admin.ModelAdmin):
    list_display = ("organization", "document_type", "document_number", "expiry_date", "is_active", "created_at")
    list_filter = ("document_type", "is_active", "is_deleted")
    search_fields = ("document_number", "organization__organization_code", "organization__organization_name")
    raw_id_fields = ("organization",)


@admin.register(BranchServiceArea)
class BranchServiceAreaAdmin(admin.ModelAdmin):
    list_display = ("branch", "pincode", "city", "state", "is_active", "is_home_collection_available", "created_at")
    list_filter = ("is_active", "is_deleted", "is_home_collection_available")
    search_fields = ("pincode", "city", "branch__branch_code", "branch__branch_name")
    raw_id_fields = ("branch",)


@admin.register(BranchServicePricing)
class BranchServicePricingAdmin(admin.ModelAdmin):
    list_display = ("branch", "service", "selling_price","cost_price", "is_active", "is_available", "valid_from", "valid_to", "created_at")
    list_filter = ("is_active", "is_available", "home_collection_supported")
    search_fields = ("branch__branch_code", "service__code", "service__name")
    raw_id_fields = ("branch", "service")


@admin.register(BranchPackagePricing)
class BranchPackagePricingAdmin(admin.ModelAdmin):
    list_display = ("branch", "package", "selling_price", "is_active", "is_available", "valid_from", "valid_to", "created_at")
    list_filter = ("is_active", "is_available")
    search_fields = ("branch__branch_code", "package__name", "package__lineage_code")
    raw_id_fields = ("branch", "package")


@admin.register(LabOrderAssignment)
class LabOrderAssignmentAdmin(admin.ModelAdmin):
    list_display = ("diagnostic_order", "lab_branch", "status", "assigned_at", "created_at")
    list_filter = ("status", "is_active", "is_deleted")
    search_fields = ("diagnostic_order__order_number", "lab_branch__branch_code")
    raw_id_fields = ("diagnostic_order", "lab_branch", "assigned_by")


@admin.register(LabCollectionRequest)
class LabCollectionRequestAdmin(admin.ModelAdmin):
    list_display = ("diagnostic_order", "lab_branch", "collection_status", "preferred_date", "created_at")
    list_filter = ("collection_status", "is_active", "is_deleted")
    search_fields = ("diagnostic_order__order_number", "lab_branch__branch_code")
    raw_id_fields = ("diagnostic_order", "lab_branch", "assigned_phlebotomist")


@admin.register(LabVisitAppointment)
class LabVisitAppointmentAdmin(admin.ModelAdmin):
    list_display = ("diagnostic_order", "lab_branch", "appointment_date", "appointment_slot", "status", "created_at")
    list_filter = ("status", "is_active", "is_deleted")
    search_fields = ("diagnostic_order__order_number", "lab_branch__branch_code")
    raw_id_fields = ("diagnostic_order", "lab_branch")


@admin.register(LabSampleTracking)
class LabSampleTrackingAdmin(admin.ModelAdmin):
    list_display = ("test_line", "sample_barcode", "sample_status", "collected_at", "received_at_lab", "created_at")
    list_filter = ("sample_status", "is_active", "is_deleted")
    search_fields = ("sample_barcode",)
    raw_id_fields = ("test_line", "collected_by", "received_by")


@admin.register(LabReportDeliveryLog)
class LabReportDeliveryLogAdmin(admin.ModelAdmin):
    list_display = (
        "diagnostic_test_report",
        "delivery_channel",
        "recipient",
        "delivery_status",
        "sent_at",
        "delivered_at",
        "retry_count",
        "created_at",
    )
    list_filter = ("delivery_status", "delivery_channel", "is_active", "is_deleted")
    search_fields = ("recipient", "external_message_id")
    raw_id_fields = ("diagnostic_test_report",)


@admin.register(LabReportReview)
class LabReportReviewAdmin(admin.ModelAdmin):
    list_display = ("diagnostic_test_report", "reviewed_by", "review_status", "reviewed_at", "created_at")
    list_filter = ("review_status", "is_active", "is_deleted")
    raw_id_fields = ("diagnostic_test_report", "reviewed_by")
