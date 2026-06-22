from django.urls import path

from doctor.api.dashboard_views import (
    DoctorPatientsDashboardView,
    DoctorPracticeOverviewView,
    DoctorReportsDashboardView,
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
]
