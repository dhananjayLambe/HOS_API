from django.urls import path
from reports.api.views import AppointmentSummaryReportView

app_name = "reports"

urlpatterns = [
    path("appointments/summary/", AppointmentSummaryReportView.as_view(), name="appointment-summary-report"),
]

