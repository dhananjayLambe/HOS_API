from django.urls import path

from notifications.api.views.resend import WhatsAppResendAPIView
from notifications.api.views.retry import WhatsAppRetryAPIView
from notifications.api.views.webhook import WhatsAppWebhookAPIView

urlpatterns = [
    path(
        "whatsapp/webhook/",
        WhatsAppWebhookAPIView.as_view(),
        name="whatsapp-webhook",
    ),
    path(
        "whatsapp/retry/<uuid:message_id>/",
        WhatsAppRetryAPIView.as_view(),
        name="whatsapp-retry",
    ),
    path(
        "whatsapp/resend/<uuid:prescription_id>/",
        WhatsAppResendAPIView.as_view(),
        name="whatsapp-resend",
    ),
]
