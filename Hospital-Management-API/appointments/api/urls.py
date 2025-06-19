from django.urls import path,include
from rest_framework.routers import DefaultRouter
from appointments.api.views import (
    DoctorAvailabilityView,
    AppointmentCreateView,
    AppointmentDetailView,
    AppointmentCancelView,
    AppointmentRescheduleView,
    PatientAppointmentsView,
    DoctorAppointmentsView,
    DoctorLeaveCreateView,
    DoctorLeaveListView,
    DoctorLeaveUpdateView,
    DoctorLeaveDeleteView,
    DoctorFeeStructureViewSet,
    FollowUpPolicyViewSet,AppointmentSlotView,
    )
app_name = 'appointments'

router = DefaultRouter()
router.register(r'doctor-fees', DoctorFeeStructureViewSet)
router.register(r'follow-up-policies', FollowUpPolicyViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('doctors-availability/',
            DoctorAvailabilityView.as_view(),
            name='doctor-availability'),
    path('create/', AppointmentCreateView.as_view(), name='appointment-create'),
    path('detail/', AppointmentDetailView.as_view(), name='appointment-detail'),
    path('cancel/', AppointmentCancelView.as_view(), name='appointment-cancel'),
    path('reschedule/', AppointmentRescheduleView.as_view(), name='appointment-reschedule'),
    #Appointments View
    path('patient-appointments/', PatientAppointmentsView.as_view(), name='patient-appointments'),
    path("doctor-appointments/", DoctorAppointmentsView.as_view(), name="doctor-appointments"),
    #Doctor Leave View
    path("doctor-leave-create/", DoctorLeaveCreateView.as_view(), name="doctor-leave-create"),
    path("doctor-leave-list/", DoctorLeaveListView.as_view(), name="doctor-leave-list"),
    path("doctor-leave-update/<uuid:pk>/", DoctorLeaveUpdateView.as_view(), name="doctor-leave-update"),
    path("doctor-leave-delete/<uuid:pk>/", DoctorLeaveDeleteView.as_view(), name="doctor-leave-delete"),
    path("slots/", AppointmentSlotView.as_view(), name="appointment-slots"),

]