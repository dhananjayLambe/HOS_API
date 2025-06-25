from django.urls import path,include
from rest_framework.routers import DefaultRouter
from appointments.api.views import (
    AppointmentCreateView,
    AppointmentDetailView,
    AppointmentCancelView,
    AppointmentRescheduleView,
    PatientAppointmentsView,
    DoctorAppointmentsView,
    AppointmentSlotView,
    )
app_name = 'appointments'

urlpatterns = [
    #path('', include(router.urls)),
    path('create/', AppointmentCreateView.as_view(), name='appointment-create'),
    path('detail/', AppointmentDetailView.as_view(), name='appointment-detail'),
    path('cancel/', AppointmentCancelView.as_view(), name='appointment-cancel'),
    path('reschedule/', AppointmentRescheduleView.as_view(), name='appointment-reschedule'),
    #Appointments View
    path('patient-appointments/', PatientAppointmentsView.as_view(), name='patient-appointments'),
    path("doctor-appointments/", DoctorAppointmentsView.as_view(), name="doctor-appointments"),
    path("slots/", AppointmentSlotView.as_view(), name="appointment-slots"),

]