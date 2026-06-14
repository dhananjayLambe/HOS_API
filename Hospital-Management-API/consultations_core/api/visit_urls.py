from django.urls import path

from consultations_core.api.views.clinical_visits import (
    ClinicalVisitDetailView,
    ClinicalVisitsDashboardSummaryView,
    ClinicalVisitsListView,
)

urlpatterns = [
    path("", ClinicalVisitsListView.as_view(), name="clinical-visits-list"),
    path("dashboard-summary/", ClinicalVisitsDashboardSummaryView.as_view(), name="clinical-visits-dashboard-summary"),
    path("<uuid:visit_id>/", ClinicalVisitDetailView.as_view(), name="clinical-visit-detail"),
]
