"""
v1 doctor report workspace URL routes.

Mounted at ``api/v1/doctors/reports/`` from project ``main.urls``.
"""

from django.urls import path

from doctor_report_workspace.api.views.workspace import (
    WorkspaceListAPIView,
    WorkspaceReportDetailAPIView,
    WorkspaceReportDownloadAPIView,
    WorkspaceReportPreviewAPIView,
    WorkspaceSummaryAPIView,
)
from doctor_report_workspace.api.views.workspace_search import WorkspaceSearchAPIView

app_name = "doctor_report_workspace"

urlpatterns = [
    path(
        "workspace/",
        WorkspaceListAPIView.as_view(),
        name="workspace-list",
    ),
    path(
        "workspace/summary/",
        WorkspaceSummaryAPIView.as_view(),
        name="workspace-summary",
    ),
    path(
        "workspace/search/",
        WorkspaceSearchAPIView.as_view(),
        name="workspace-search",
    ),
    path(
        "workspace/reports/<uuid:report_id>/download/",
        WorkspaceReportDownloadAPIView.as_view(),
        name="workspace-report-download",
    ),
    path(
        "workspace/reports/<uuid:report_id>/preview/",
        WorkspaceReportPreviewAPIView.as_view(),
        name="workspace-report-preview",
    ),
    path(
        "workspace/reports/<uuid:report_id>/",
        WorkspaceReportDetailAPIView.as_view(),
        name="workspace-report-detail",
    ),
]
