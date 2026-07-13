"""Read-only Django admin for Support Trace inspection."""

from django.contrib import admin

from support_trace.models import SupportTrace


@admin.register(SupportTrace)
class SupportTraceAdmin(admin.ModelAdmin):
    list_display = (
        "workflow_instance_id",
        "correlation_id",
        "workflow_type",
        "status",
        "sync_status",
        "workflow_health",
        "last_event",
        "updated_at",
    )
    list_filter = (
        "status",
        "sync_status",
        "workflow_health",
        "workflow_type",
        "last_source",
    )
    search_fields = (
        "correlation_id",
        "workflow_instance_id",
        "booking_id",
        "patient_account_id",
        "phone_number",
        "resource_id",
    )
    readonly_fields = [f.name for f in SupportTrace._meta.fields]
    ordering = ("-updated_at",)

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False
