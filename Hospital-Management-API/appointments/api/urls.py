from django.urls import path,include
from rest_framework.routers import DefaultRouter
from appointments.api.views import (
    DoctorAvailabilityView,
    AppointmentCreateView,
    AppointmentDetailView,
    AppointmentCancelView,
    AppointmentRescheduleView,
    PatientAppointmentsView
    )


urlpatterns = [
    path('doctors-availability/',
            DoctorAvailabilityView.as_view(),
            name='doctor-availability'),
    path('create/', AppointmentCreateView.as_view(), name='appointment-create'),
    path('detail/', AppointmentDetailView.as_view(), name='appointment-detail'),
    path('cancel/', AppointmentCancelView.as_view(), name='appointment-cancel'),
    path('reschedule/', AppointmentRescheduleView.as_view(), name='appointment-reschedule'),
    path('patient-appointments/', PatientAppointmentsView.as_view(), name='patient-appointments'),
]