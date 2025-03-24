from django.urls import path
from queue_management.api.views import (
    CheckInQueueAPIView, DoctorQueueAPIView, StartConsultationAPIView, 
    CompleteConsultationAPIView, SkipPatientAPIView, UrgentPatientAPIView, 
    QueueDetailsView, UpdateQueuePositionView,
    QueueReorderAPIView, MarkPatientNotAvailableAPIView, CancelAppointmentAPIView
)

urlpatterns = [
    #queue management
    path("check-in/", CheckInQueueAPIView.as_view(), name="queue-check-in"),
    path("doctor/<uuid:doctor_id>/<uuid:clinic_id>/", DoctorQueueAPIView.as_view(), name="doctor-queue"),
    path("start/", StartConsultationAPIView.as_view(), name="queue-start"),
    path("complete/", CompleteConsultationAPIView.as_view(), name="queue-complete"),
    path("skip/", SkipPatientAPIView.as_view(), name="queue-skip"),
    path("urgent/", UrgentPatientAPIView.as_view(), name="queue-urgent"),
    path("queue-details/", QueueDetailsView.as_view(), name="queue-details"),
    path("update-position/<uuid:queue_id>/", UpdateQueuePositionView.as_view(), name="update-queue-position"),
    #Helpdesk 
    #TBD - Need to test the APIS reamainng in this file
    path("reorder/", QueueReorderAPIView.as_view(), name="queue-reorder"),
    path("not-available/<uuid:id>/", MarkPatientNotAvailableAPIView.as_view(), name="queue-not-available"),
    path("queue-cancel/<uuid:id>/", CancelAppointmentAPIView.as_view(), name="queue-cancel"),

]