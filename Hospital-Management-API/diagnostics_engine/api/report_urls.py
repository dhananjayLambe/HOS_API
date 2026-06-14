"""
v1 operational report URL routes.

Mounted at ``api/v1/diagnostics/`` from project ``main.urls``
(same pattern as ``labs.api.investigation_urls``).
"""

from django.urls import path

from diagnostics_engine.api.views.reports.doctor_summary import DoctorReportDashboardSummaryView
from diagnostics_engine.api.views.reports.encounter_reports import EncounterReportsView
from diagnostics_engine.api.views.reports.mark_ready import MarkReadyView
from diagnostics_engine.api.views.reports.operational_metrics import ReportOperationalMetricsView
from diagnostics_engine.api.views.reports.operational import (
    ReportOperationalArtifactUploadView,
    ReportOperationalDetailView,
    ReportOperationalDownloadView,
    ReportTaskContextView,
    ReportTaskQueueView,
)
from diagnostics_engine.api.views.reports.patient_reports import PatientReportsView
from diagnostics_engine.api.views.reports.report_history import ReportHistoryView
from diagnostics_engine.api.views.reports.report_timeline import ReportTimelineView
from diagnostics_engine.api.views.reports.retry_delivery import RetryDeliveryView
from diagnostics_engine.api.views.reports.send_whatsapp import SendWhatsAppView

urlpatterns = [
    path(
        "reports/doctor-summary/",
        DoctorReportDashboardSummaryView.as_view(),
        name="v1-doctor-report-dashboard-summary",
    ),
    path(
        "reports/operational-metrics/",
        ReportOperationalMetricsView.as_view(),
        name="v1-report-operational-metrics",
    ),
    path(
        "report-tasks/",
        ReportTaskQueueView.as_view(),
        name="v1-report-task-queue",
    ),
    path(
        "report-tasks/<uuid:task_id>/",
        ReportTaskContextView.as_view(),
        name="v1-report-task-context",
    ),
    path(
        "reports/<uuid:report_id>/artifacts/upload/",
        ReportOperationalArtifactUploadView.as_view(),
        name="v1-report-artifact-upload",
    ),
    path(
        "reports/<uuid:report_id>/",
        ReportOperationalDetailView.as_view(),
        name="v1-report-detail",
    ),
    path(
        "reports/<uuid:report_id>/download/",
        ReportOperationalDownloadView.as_view(),
        name="v1-report-download",
    ),
    path(
        "reports/<uuid:report_id>/mark-ready/",
        MarkReadyView.as_view(),
        name="v1-report-mark-ready",
    ),
    path(
        "reports/<uuid:report_id>/send-whatsapp/",
        SendWhatsAppView.as_view(),
        name="v1-report-send-whatsapp",
    ),
    path(
        "reports/<uuid:report_id>/history/",
        ReportHistoryView.as_view(),
        name="v1-report-history",
    ),
    path(
        "reports/<uuid:report_id>/timeline/",
        ReportTimelineView.as_view(),
        name="v1-report-timeline",
    ),
    path(
        "delivery-logs/<uuid:log_id>/retry/",
        RetryDeliveryView.as_view(),
        name="v1-delivery-log-retry",
    ),
    path(
        "patients/<uuid:patient_id>/reports/",
        PatientReportsView.as_view(),
        name="v1-patient-reports",
    ),
    path(
        "encounters/<uuid:encounter_id>/reports/",
        EncounterReportsView.as_view(),
        name="v1-encounter-reports",
    ),
]
