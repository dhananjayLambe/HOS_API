from .views import (
    CustomAuthToken,doctorAppointmentView,
    LogoutView, DoctorRegistrationView,DoctorProfileView,UserView)
from django.urls import path


app_name='doctor'
urlpatterns = [
    path('registration/', DoctorRegistrationView.as_view(), name='api_doctor_registration'),
    path('user-details/', UserView.as_view(), name='api_doctor_user'),
    path('profile/', DoctorProfileView.as_view(), name='api_doctor_profile'),
    path('login/', CustomAuthToken.as_view(), name='api_doctor_login'),
    path('logout/', LogoutView.as_view(), name='api_doctor_logout'),
    
    path('appointments/', doctorAppointmentView.as_view(), name='api_doctor_profile'),
    
]