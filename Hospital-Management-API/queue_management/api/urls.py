from django.urls import path
from queue_management.api.views import (
    CheckInQueueAPIView, DoctorQueueAPIView, StartConsultationAPIView, 
    CompleteConsultationAPIView, SkipPatientAPIView, UrgentPatientAPIView
)

urlpatterns = [
    path("check-in/", CheckInQueueAPIView.as_view(), name="queue-check-in"),
    path("doctor/<int:doctor_id>/", DoctorQueueAPIView.as_view(), name="doctor-queue"),
    path("start/", StartConsultationAPIView.as_view(), name="queue-start"),
    path("complete/", CompleteConsultationAPIView.as_view(), name="queue-complete"),
    path("skip/", SkipPatientAPIView.as_view(), name="queue-skip"),
    path("urgent/", UrgentPatientAPIView.as_view(), name="queue-urgent"),
]