from .views import registrationView, CustomAuthToken, doctorProfileView, doctorAppointmentView,DoctorAdditionalDetailsView
from .views import LogoutView, DoctorRegistrationView
from django.urls import path


app_name='doctor'
urlpatterns = [
    #path('registration/', registrationView.as_view(), name='api_doctor_registration'),
    #path('profile/', doctorProfileView.as_view(), name='api_doctor_profile'),TBD
    path('registration/', DoctorRegistrationView.as_view(), name='api_doctor_registration'),
    #path('profile/', doctorProfileView.as_view(), name='api_doctor_profile'),
    path('login/', CustomAuthToken.as_view(), name='api_doctor_login'),
    path('logout/', LogoutView.as_view(), name='api_doctor_logout'),
    
    path('appointments/', doctorAppointmentView.as_view(), name='api_doctor_profile'),
    path('additional-details/', DoctorAdditionalDetailsView.as_view(), name='doctor-additional-details'),
]