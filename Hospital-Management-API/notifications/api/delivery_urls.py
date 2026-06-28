from django.urls import path

from notifications.api.views.recommendation_metrics import (
    RecommendationConsultationStatusAPIView,
    RecommendationWhatsAppMetricsAPIView,
)
from notifications.api.views.resend import WhatsAppConsultationResendAPIView, WhatsAppResendAPIView
from notifications.api.views.retry import WhatsAppRetryAPIView
from notifications.api.views.status import WhatsAppConsultationStatusAPIView
from notifications.api.views.webhook import WhatsAppWebhookAPIView

urlpatterns = [
    path(
        "whatsapp/webhook/",
        WhatsAppWebhookAPIView.as_view(),
        name="whatsapp-webhook",
    ),
    path(
        "whatsapp/status/consultation/<uuid:consultation_id>/",
        WhatsAppConsultationStatusAPIView.as_view(),
        name="whatsapp-consultation-status",
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
    path(
        "whatsapp/resend/consultation/<uuid:consultation_id>/",
        WhatsAppConsultationResendAPIView.as_view(),
        name="whatsapp-resend-consultation",
    ),
    path(
        "whatsapp/recommendations/metrics/",
        RecommendationWhatsAppMetricsAPIView.as_view(),
        name="whatsapp-recommendation-metrics",
    ),
    path(
        "whatsapp/recommendations/consultation/<uuid:consultation_id>/",
        RecommendationConsultationStatusAPIView.as_view(),
        name="whatsapp-recommendation-consultation-status",
    ),
]
