from django.urls import path

from consultations_core.api.views.prescription_download import PrescriptionDownloadAPIView

urlpatterns = [
    path(
        "<uuid:prescription_id>/download/",
        PrescriptionDownloadAPIView.as_view(),
        name="prescription-download",
    ),
]
