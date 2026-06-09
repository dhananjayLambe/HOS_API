from django.contrib import admin, messages

from notifications.models.whatsapp_notifications import WhatsAppMessage, WhatsAppMessageStatus
from notifications.services.delivery.whatsapp_service import WhatsAppService
from notifications.tasks import send_prescription_whatsapp


@admin.register(WhatsAppMessage)
class WhatsAppMessageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "message_type",
        "status",
        "recipient_mobile_number",
        "recipient_name",
        "prescription",
        "created_at",
        "sent_at",
        "delivered_at",
    )
    list_filter = ("status", "message_type", "provider", "conversation_category")
    search_fields = ("recipient_mobile_number", "recipient_name", "meta_message_id", "idempotency_key")
    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
        "request_payload",
        "response_payload",
        "webhook_payload",
    )
    actions = ["retry_failed_delivery"]

    @admin.action(description="Retry failed delivery")
    def retry_failed_delivery(self, request, queryset):
        retried = 0
        for message in queryset.filter(status=WhatsAppMessageStatus.FAILED):
            try:
                retry_message = WhatsAppService().retry_delivery(
                    message_id=message.id,
                    initiated_by=request.user,
                )
                send_prescription_whatsapp.delay(str(retry_message.id))
                retried += 1
            except ValueError:
                continue
        self.message_user(request, f"Queued {retried} retry delivery(s).", messages.SUCCESS)
