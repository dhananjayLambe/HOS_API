from django.urls import path

from doctor.api.dashboard_views import DoctorPatientsDashboardView

app_name = "doctor_dashboard"

urlpatterns = [
    path(
        "dashboard/patients/",
        DoctorPatientsDashboardView.as_view(),
        name="dashboard-patients",
    ),
]
