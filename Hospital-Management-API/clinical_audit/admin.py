"""Read-only Django admin for Clinical Audit records."""

from django.contrib import admin

from clinical_audit.models import ClinicalAudit


@admin.register(ClinicalAudit)
class ClinicalAuditAdmin(admin.ModelAdmin):
    """Permanent audit records are viewable but never mutable via admin."""

    list_display = (
        "id",
        "timestamp",
        "action",
        "outcome",
        "correlation_id",
        "patient_account_id",
        "consultation_id",
        "user_id",
        "source",
    )
    list_filter = ("action", "outcome", "source", "module", "resource_type")
    search_fields = (
        "correlation_id",
        "patient_account_id",
        "consultation_id",
        "encounter_id",
        "user_id",
        "resource_id",
        "event",
    )
    readonly_fields = [field.name for field in ClinicalAudit._meta.fields]
    ordering = ("-timestamp",)

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False
