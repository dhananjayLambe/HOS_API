"""Report API views — legacy (api/diagnostics) and operational (api/v1/diagnostics)."""

from diagnostics_engine.api.views.reports.legacy import (
    OrderReportsListView,
    ReportArtifactDownloadView,
    ReportArtifactUploadView,
    ReportDeliverView,
    ReportReadyView,
    TestLineReportView,
)
from diagnostics_engine.api.views.reports.encounter_reports import EncounterReportsView
from diagnostics_engine.api.views.reports.mark_ready import MarkReadyView
from diagnostics_engine.api.views.reports.operational import (
    ReportOperationalArtifactUploadView,
    ReportOperationalDetailView,
    ReportOperationalDownloadView,
    ReportTaskContextView,
    ReportTaskQueueView,
)
from diagnostics_engine.api.views.reports.patient_reports import PatientReportsView
from diagnostics_engine.api.views.reports.report_history import ReportHistoryView
from diagnostics_engine.api.views.reports.retry_delivery import RetryDeliveryView
from diagnostics_engine.api.views.reports.send_whatsapp import SendWhatsAppView

__all__ = [
    # Legacy
    "OrderReportsListView",
    "ReportArtifactDownloadView",
    "ReportArtifactUploadView",
    "ReportDeliverView",
    "ReportReadyView",
    "TestLineReportView",
    # Operational (v1)
    "ReportOperationalArtifactUploadView",
    "ReportOperationalDetailView",
    "ReportOperationalDownloadView",
    "ReportTaskContextView",
    "ReportTaskQueueView",
    "MarkReadyView",
    "SendWhatsAppView",
    "RetryDeliveryView",
    "ReportHistoryView",
    "PatientReportsView",
    "EncounterReportsView",
]
