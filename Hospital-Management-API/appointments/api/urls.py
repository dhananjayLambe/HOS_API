from django.urls import path
from appointments.api.views import (
    DoctorAvailabilityView,
    AppointmentCreateView,
    AppointmentDetailView,
    AppointmentCancelView,
    AppointmentRescheduleView,
    PatientAppointmentsView,
    DoctorAppointmentsView
    )


urlpatterns = [
    path('doctors-availability/',
            DoctorAvailabilityView.as_view(),
            name='doctor-availability'),
    path('create/', AppointmentCreateView.as_view(), name='appointment-create'),
    path('detail/', AppointmentDetailView.as_view(), name='appointment-detail'),
    path('cancel/', AppointmentCancelView.as_view(), name='appointment-cancel'),
    path('reschedule/', AppointmentRescheduleView.as_view(), name='appointment-reschedule'),
    #need to add the filters and pagination need to make production ready as well
    path('patient-appointments/', PatientAppointmentsView.as_view(), name='patient-appointments'),
    path("doctor-appointments/", DoctorAppointmentsView.as_view(), name="doctor-appointments"),
]