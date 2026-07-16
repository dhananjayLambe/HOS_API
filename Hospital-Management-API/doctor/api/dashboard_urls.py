from django.urls import path

from doctor.api.dashboard_views import (
    DoctorPatientsDashboardView,
    DoctorPracticeOverviewView,
    DoctorReportsDashboardView,
)
from doctor.api.workspace_views import (
    DoctorWorkspaceArtifactDownloadView,
    DoctorWorkspaceCountsView,
    DoctorWorkspacePatientsSearchView,
    DoctorWorkspaceReportDetailView,
    DoctorWorkspaceReportsView,
)

app_name = "doctor_dashboard"

urlpatterns = [
    path(
        "dashboard/patients/",
        DoctorPatientsDashboardView.as_view(),
        name="dashboard-patients",
    ),
    path(
        "dashboard/reports/",
        DoctorReportsDashboardView.as_view(),
        name="dashboard-reports",
    ),
    path(
        "dashboard/practice-overview/",
        DoctorPracticeOverviewView.as_view(),
        name="dashboard-practice-overview",
    ),
    path(
        "diagnostic-workspace/patients/search/",
        DoctorWorkspacePatientsSearchView.as_view(),
        name="diagnostic-workspace-patient-search",
    ),
    path(
        "diagnostic-workspace/counts/",
        DoctorWorkspaceCountsView.as_view(),
        name="diagnostic-workspace-counts",
    ),
    path(
        "diagnostic-workspace/reports/",
        DoctorWorkspaceReportsView.as_view(),
        name="diagnostic-workspace-reports",
    ),
    path(
        "diagnostic-workspace/reports/<uuid:report_id>/",
        DoctorWorkspaceReportDetailView.as_view(),
        name="diagnostic-workspace-report-detail",
    ),
    path(
        "diagnostic-workspace/reports/<uuid:report_id>/artifacts/<uuid:artifact_id>/download/",
        DoctorWorkspaceArtifactDownloadView.as_view(),
        name="diagnostic-workspace-artifact-download",
    ),
]
