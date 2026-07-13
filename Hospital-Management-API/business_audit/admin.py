"""Django admin registration for Business Audit."""

from django.contrib import admin

from business_audit.models import BusinessAudit


@admin.register(BusinessAudit)
class BusinessAuditAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "action",
        "event",
        "workflow_type",
        "workflow_instance_id",
        "sequence_no",
        "status",
        "outcome",
        "category",
    )
    list_filter = ("workflow_type", "category", "status", "outcome", "domain")
    search_fields = (
        "correlation_id",
        "workflow_instance_id",
        "provider_reference",
        "resource_id",
    )
    readonly_fields = [field.name for field in BusinessAudit._meta.fields]

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False
