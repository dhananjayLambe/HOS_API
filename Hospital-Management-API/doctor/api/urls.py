from django.urls import path
from .views import (
    CustomAuthToken,doctorAppointmentView,DoctorDetailsAPIView,
    LogoutView,DoctorRegistrationAPIView,
    UserView,DoctorProfileUpdateAPIView)

app_name='doctor'

urlpatterns = [
    path('register/', DoctorRegistrationAPIView.as_view(), name='doctor-registration'),
    path('doctor-details/', DoctorDetailsAPIView.as_view(), name='doctor-details'),
    path('user-details/', UserView.as_view(), name='api_doctor_user'),
    path('proflie-details/', DoctorProfileUpdateAPIView.as_view(), name='doctor-proflie-details'),
    path('login/', CustomAuthToken.as_view(), name='api_doctor_login'),
    path('logout/', LogoutView.as_view(), name='api_doctor_logout'),
    path('appointments/', doctorAppointmentView.as_view(), name='api_doctor_profile'),  
]