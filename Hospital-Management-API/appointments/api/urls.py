from django.urls import path
from appointments.api.views import (
    AppointmentListView,
    AppointmentDetailView,
    AppointmentCancelView,
    AppointmentCheckInView,
    AppointmentRescheduleView,
    PatientAppointmentsView,
    DoctorAppointmentsView,
    AppointmentSlotView,AppointmentHistoryView,AppointmentStatusUpdateView,
    WalkInAppointmentCreateView,AppointmentTodayMetricsView,DoctorCalendarView,
    )
app_name = 'appointments'

urlpatterns = [
    path("<uuid:pk>/reschedule/", AppointmentRescheduleView.as_view(), name="appointment-reschedule"),
    path("<uuid:pk>/cancel/", AppointmentCancelView.as_view(), name="appointment-cancel"),
    path("<uuid:pk>/check-in/", AppointmentCheckInView.as_view(), name="appointment-check-in"),
    path("", AppointmentListView.as_view(), name="appointment-create"),
    path('detail/', AppointmentDetailView.as_view(), name='appointment-detail'),
    #Appointments View
    path('patient-appointments/', PatientAppointmentsView.as_view(), name='patient-appointments'),
    path("doctor-appointments/", DoctorAppointmentsView.as_view(), name="doctor-appointments"),
    path("slots/", AppointmentSlotView.as_view(), name="appointment-slots"),
    path("history/", AppointmentHistoryView.as_view(), name="appointment-history"),
    path("update-status/", AppointmentStatusUpdateView.as_view(), name="appointment-update-status"),
    path('walk-in/', WalkInAppointmentCreateView.as_view(), name='walk-in-appointment'),
    path("metrics/today/", AppointmentTodayMetricsView.as_view(), name="appointment-metrics-today"),
    path("calendar-view/", DoctorCalendarView.as_view(), name="calendar-view"),

]

#Helpdesk UI → Check-in Button → BFF → Django → Encounter Created → UI Updated
#Queue order → Doctor flow → Patient experience
#Appointment → Check-in → Encounter → Queue → Pre-consult → Consultation → Completion