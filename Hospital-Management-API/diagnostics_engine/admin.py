from django.contrib import admin

from diagnostics_engine.models import (
    DiagnosisTestMapping,
    DiagnosticCategory,
    DiagnosticOrder,
    DiagnosticOrderItem,
    DiagnosticOrderTestLine,
    DiagnosticPackage,
    DiagnosticPackageItem,
    DiagnosticReport,
    DiagnosticServiceMaster,
    DiagnosticTestReport,
    EligibleLabSnapshot,
    RoutingDecisionSnapshot,
    RoutingEvent,
    RoutingLabOrderAssignment,
    RoutingRun,
    SymptomTestMapping,
)


# --- Catalog -----------------------------------------------------------------


@admin.register(DiagnosticCategory)
class DiagnosticCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "parent", "is_active", "ordering", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "code")
    raw_id_fields = ("parent", "created_by", "updated_by", "deleted_by")


@admin.register(DiagnosticServiceMaster)
class DiagnosticServiceMasterAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "category", "is_active", "home_collection_possible", "tat_hours_default", "created_at")
    list_filter = ("is_active", "home_collection_possible", "appointment_required")
    search_fields = ("code", "name", "short_name", "synopsis")
    raw_id_fields = ("category", "deleted_by")


@admin.register(DiagnosticPackage)
class DiagnosticPackageAdmin(admin.ModelAdmin):
    list_display = ("name", "lineage_code", "version", "is_latest", "is_active", "category", "created_at")
    list_filter = ("is_latest", "is_active", "package_type", "collection_type")
    search_fields = ("name", "lineage_code")
    raw_id_fields = ("category", "parent_package", "created_by", "updated_by", "deleted_by")


@admin.register(DiagnosticPackageItem)
class DiagnosticPackageItemAdmin(admin.ModelAdmin):
    list_display = ("package", "service", "quantity", "is_mandatory", "display_order", "created_at")
    list_filter = ("is_mandatory",)
    search_fields = ("package__name", "package__lineage_code", "service__code", "service__name")
    raw_id_fields = ("package", "service", "created_by", "updated_by", "deleted_by")


@admin.register(DiagnosisTestMapping)
class DiagnosisTestMappingAdmin(admin.ModelAdmin):
    list_display = ("diagnosis", "service", "rule_type", "weight", "is_active", "ordering")
    list_filter = ("rule_type", "is_active")
    search_fields = ("diagnosis__label", "diagnosis__icd10_code", "service__name", "service__code")
    raw_id_fields = ("diagnosis", "service", "created_by", "updated_by")


@admin.register(SymptomTestMapping)
class SymptomTestMappingAdmin(admin.ModelAdmin):
    list_display = ("symptom", "service", "rule_type", "weight", "is_active", "ordering")
    list_filter = ("rule_type", "is_active")
    search_fields = ("symptom__display_name", "symptom__code", "service__name", "service__code")
    raw_id_fields = ("symptom", "service", "created_by", "updated_by")


# --- Orders ------------------------------------------------------------------


@admin.register(DiagnosticOrder)
class DiagnosticOrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "status",
        "routing_status",
        "sample_collection_mode",
        "branch",
        "consultation",
        "final_amount",
        "created_at",
    )
    list_filter = ("status", "routing_status", "sample_collection_mode", "source", "is_active")
    search_fields = ("order_number", "id")
    raw_id_fields = (
        "encounter",
        "consultation",
        "patient_profile",
        "doctor",
        "branch",
        "cancelled_by",
        "created_by",
        "updated_by",
    )
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(DiagnosticOrderItem)
class DiagnosticOrderItemAdmin(admin.ModelAdmin):
    list_display = ("order", "line_type", "name_snapshot", "status", "price_snapshot", "display_order", "created_at")
    list_filter = ("line_type", "status", "is_home_collection_eligible")
    search_fields = ("name_snapshot", "order__order_number")
    raw_id_fields = ("order", "service", "diagnostic_package", "created_by", "updated_by", "deleted_by")


@admin.register(DiagnosticOrderTestLine)
class DiagnosticOrderTestLineAdmin(admin.ModelAdmin):
    list_display = ("order", "service", "status", "execution_type", "created_at")
    list_filter = ("status", "execution_type")
    search_fields = ("order__order_number", "service__code", "service__name")
    raw_id_fields = ("order", "order_item", "service", "created_by", "updated_by")


# --- Reports -----------------------------------------------------------------


@admin.register(DiagnosticReport)
class DiagnosticReportAdmin(admin.ModelAdmin):
    list_display = ("order", "status", "storage_mode", "uploaded_at")
    list_filter = ("status", "storage_mode")
    search_fields = ("order__order_number",)
    raw_id_fields = ("order", "uploaded_by", "delivered_by", "deleted_by")


@admin.register(DiagnosticTestReport)
class DiagnosticTestReportAdmin(admin.ModelAdmin):
    list_display = ("order_test_line", "status", "storage_mode", "is_editable", "uploaded_at", "delivered_at")
    list_filter = ("status", "storage_mode", "is_editable")
    raw_id_fields = ("order_test_line", "uploaded_by", "delivered_by", "deleted_by")


# --- Routing -----------------------------------------------------------------


@admin.register(RoutingRun)
class RoutingRunAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "diagnostic_order",
        "routing_status",
        "resolved_pincode",
        "resolved_location_source",
        "requested_collection_mode",
        "routing_engine_version",
        "created_at",
    )
    list_filter = ("routing_status", "routing_strategy", "requested_collection_mode", "is_active", "is_deleted")
    search_fields = ("id", "diagnostic_order__order_number", "encounter_display_id", "resolved_pincode")
    raw_id_fields = (
        "diagnostic_order",
        "encounter",
        "consultation",
        "patient",
        "clinic",
        "doctor",
        "triggered_by",
        "created_by",
        "updated_by",
        "deleted_by",
    )


@admin.register(EligibleLabSnapshot)
class EligibleLabSnapshotAdmin(admin.ModelAdmin):
    list_display = (
        "routing_run",
        "branch",
        "lab",
        "is_eligible",
        "ranking_position",
        "estimated_price",
        "created_at",
    )
    list_filter = ("is_eligible", "is_active", "is_deleted", "supports_home_collection", "supports_all_tests")
    search_fields = ("routing_run__id", "branch__branch_code", "lab__organization_code")
    raw_id_fields = (
        "routing_run",
        "diagnostic_order",
        "encounter",
        "consultation",
        "patient",
        "lab",
        "branch",
        "created_by",
        "updated_by",
        "deleted_by",
    )


@admin.register(RoutingDecisionSnapshot)
class RoutingDecisionSnapshotAdmin(admin.ModelAdmin):
    list_display = (
        "routing_run",
        "eligible_lab_snapshot",
        "recommendation_label",
        "final_score",
        "created_at",
    )
    list_filter = ("decision_type", "recommendation_label", "recommendation_confidence", "is_active", "is_deleted")
    raw_id_fields = (
        "routing_run",
        "eligible_lab_snapshot",
        "encounter",
        "consultation",
        "created_by",
        "updated_by",
        "deleted_by",
    )


@admin.register(RoutingLabOrderAssignment)
class RoutingLabOrderAssignmentAdmin(admin.ModelAdmin):
    list_display = (
        "diagnostic_order",
        "branch",
        "lab",
        "assignment_status",
        "assignment_type",
        "routing_run",
        "assigned_at",
    )
    list_filter = ("assignment_status", "assignment_type", "is_active", "is_deleted")
    search_fields = ("diagnostic_order__order_number", "branch__branch_code", "encounter_display_id")
    raw_id_fields = (
        "diagnostic_order",
        "encounter",
        "consultation",
        "patient",
        "clinic",
        "doctor",
        "routing_run",
        "selected_snapshot",
        "selected_decision",
        "lab",
        "branch",
        "assigned_by",
        "accepted_by",
        "rejected_by",
        "created_by",
        "updated_by",
        "deleted_by",
    )


@admin.register(RoutingEvent)
class RoutingEventAdmin(admin.ModelAdmin):
    list_display = ("routing_run", "event_type", "diagnostic_order", "assignment", "source", "created_at")
    list_filter = ("event_type", "source", "is_active", "is_deleted")
    search_fields = ("diagnostic_order__order_number", "routing_run__id")
    raw_id_fields = (
        "routing_run",
        "assignment",
        "diagnostic_order",
        "encounter",
        "consultation",
        "actor",
        "created_by",
        "updated_by",
        "deleted_by",
    )
