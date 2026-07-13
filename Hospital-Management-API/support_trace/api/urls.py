"""Support Investigation REST API routes."""

from django.urls import path

from support_trace.api.views.export import ExportCreateView, ExportStatusView
from support_trace.api.views.lookup import (
    BookingLookupView,
    ConsultationLookupView,
    CorrelationLookupView,
    PatientLookupView,
    PaymentLookupView,
    PhoneLookupView,
    PrescriptionLookupView,
    RecommendationLookupView,
    ReportLookupView,
    WhatsappLookupView,
    WorkflowLookupView,
)
from support_trace.api.views.search import SearchSuggestionsView, SearchView
from support_trace.api.views.timeline import (
    BookingTimelineView,
    CorrelationTimelineView,
    PatientTimelineView,
    WorkflowTimelineView,
)

app_name = "support_investigation"

urlpatterns = [
    path("search", SearchView.as_view(), name="search"),
    path("search/suggestions", SearchSuggestionsView.as_view(), name="search-suggestions"),
    path("workflow/<str:workflow_id>", WorkflowLookupView.as_view(), name="workflow"),
    path("workflow/<str:workflow_id>/timeline", WorkflowTimelineView.as_view(), name="workflow-timeline"),
    path("correlation/<str:correlation_id>", CorrelationLookupView.as_view(), name="correlation"),
    path("correlation/<str:correlation_id>/timeline", CorrelationTimelineView.as_view(), name="correlation-timeline"),
    path("booking/<str:booking_id>", BookingLookupView.as_view(), name="booking"),
    path("booking/<str:booking_id>/timeline", BookingTimelineView.as_view(), name="booking-timeline"),
    path("report/<str:report_id>", ReportLookupView.as_view(), name="report"),
    path("recommendation/<str:recommendation_id>", RecommendationLookupView.as_view(), name="recommendation"),
    path("consultation/<str:consultation_id>", ConsultationLookupView.as_view(), name="consultation"),
    path("prescription/<str:prescription_id>", PrescriptionLookupView.as_view(), name="prescription"),
    path("payment/<str:payment_id>", PaymentLookupView.as_view(), name="payment"),
    path("whatsapp/<str:message_id>", WhatsappLookupView.as_view(), name="whatsapp"),
    path("patient/<str:patient_id>", PatientLookupView.as_view(), name="patient"),
    path("patient/<str:patient_id>/timeline", PatientTimelineView.as_view(), name="patient-timeline"),
    path("phone/<str:phone>", PhoneLookupView.as_view(), name="phone"),
    path("export", ExportCreateView.as_view(), name="export-create"),
    path("export/<str:export_id>", ExportStatusView.as_view(), name="export-status"),
]
