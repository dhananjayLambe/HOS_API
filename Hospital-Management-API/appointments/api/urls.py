from django.urls import path
from appointments.api.views import DoctorAvailabilityView

urlpatterns = [
    path('doctors-availability/',
            DoctorAvailabilityView.as_view(),
            name='doctor-availability'),
]