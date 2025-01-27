from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomAuthToken,doctorAppointmentView,DoctorDetailsAPIView,
    LogoutView, DoctorRegistrationView,DoctorRegistrationAPIView,
    DoctorProfileView,UserView,DoctorProfileUpdateAPIView) #DoctorProfileViewSet,




app_name='doctor'
# Create a router and register the viewset
#router = DefaultRouter()
#router.register(r'doctor-profiles', DoctorProfileViewSet, basename='doctor-profile')

urlpatterns = [
    path('registration/', DoctorRegistrationView.as_view(), name='api_doctor_registration'),#old
    path('profile/', DoctorProfileView.as_view(), name='api_doctor_profile'),#old code for doctor profile

    #path('', include(router.urls)),  # Include the router's URLs
    path('register/', DoctorRegistrationAPIView.as_view(), name='doctor-registration'),#new
    path('doctor-details/', DoctorDetailsAPIView.as_view(), name='doctor-details'),
    path('user-details/', UserView.as_view(), name='api_doctor_user'),
    path('proflie-details/', DoctorProfileUpdateAPIView.as_view(), name='doctor-proflie-details'),
    path('login/', CustomAuthToken.as_view(), name='api_doctor_login'),
    path('logout/', LogoutView.as_view(), name='api_doctor_logout'),
    path('appointments/', doctorAppointmentView.as_view(), name='api_doctor_profile'),  
]