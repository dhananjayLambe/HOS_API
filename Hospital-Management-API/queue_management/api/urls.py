from django.urls import path
from queue_management.api.views import (
    CheckInQueueAPIView, DoctorQueueAPIView, StartConsultationAPIView, 
    CompleteConsultationAPIView, SkipPatientAPIView, UrgentPatientAPIView, 
    QueueDetailsView, UpdateQueuePositionView,
    QueueReorderAPIView, MarkPatientNotAvailableAPIView, CancelAppointmentAPIView,
    QueuePatientView, CancelAppointmentView
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
    #Helpdesk API
    path("reorder/", QueueReorderAPIView.as_view(), name="queue-reorder"),
    path("not-available/<uuid:id>/", MarkPatientNotAvailableAPIView.as_view(), name="queue-not-available"),
    path("queue-cancel/<uuid:id>/", CancelAppointmentAPIView.as_view(), name="queue-cancel"),
    #Patient Self-Service APIs
    path('patient-status/<uuid:id>/', QueuePatientView.as_view(), name='queue-patient-status'),
    path('patient-cancel/<uuid:id>/', CancelAppointmentView.as_view(), name='queue-patient-cancel'),

]
#Remaining tasks for Queue Management API:
# 📌 5. Real-Time Updates & Notifications
# 13. WebSocket Connection for Live Queue – ws://queue/live-updates/
# • Sends real-time queue updates to doctors & helpdesk.
# 14. Send Push Notification to Patients (Background Task)
# • Notifies patients when their turn is near.
 
# 📌 6. Background Jobs (Celery & Redis)
# 15. Auto-Update Estimated Wait Time
# • Runs every few minutes to recalculate wait times.
# 16. Auto-Remove Patients Who Don’t Check-In
# • Removes patients who haven’t checked in after a set time.
