from django.urls import path
from .views import (
    doctorAppointmentView,DoctorDetailsAPIView,
    DoctorRegistrationAPIView,PendingHelpdeskRequestsView,
    UserView,DoctorProfileUpdateAPIView,ApproveHelpdeskUserView,
    DoctorLoginView,DoctorLogoutView,DoctorTokenRefreshView)
from rest_framework_simplejwt.views import TokenVerifyView

app_name='doctor'

urlpatterns = [
    # Doctor Authentication Endpoints
    path('login/', DoctorLoginView.as_view(), name='doctor_login'),
    path('logout/', DoctorLogoutView.as_view(), name='doctor_logout'),
    path('token/refresh/', DoctorTokenRefreshView.as_view(), name='doctor_token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='doctor_token_verify'),

    path('register/', DoctorRegistrationAPIView.as_view(), name='doctor-registration'),
    path('doctor-details/', DoctorDetailsAPIView.as_view(), name='doctor-details'),
    path('user-details/', UserView.as_view(), name='api_doctor_user'),
    path('proflie-details/', DoctorProfileUpdateAPIView.as_view(), name='doctor-proflie-details'),
    path("helpdesk/pending-requests/", PendingHelpdeskRequestsView.as_view(), name="helpdesk-pending-requests"),
    path("helpdesk/approve/<uuid:helpdesk_user_id>/", ApproveHelpdeskUserView.as_view(), name="approve-helpdesk"),
    #path('api/helpdesk/<uuid:helpdesk_id>/deactivate/', DeactivateHelpdeskUserView.as_view(), name='deactivate_helpdesk_user'),
    #path('api/helpdesk/<uuid:helpdesk_id>/delete/', DeleteHelpdeskUserView.as_view(), name='delete_helpdesk_user'),

    #path('login/', CustomAuthToken.as_view(), name='api_doctor_login'),
    #path('logout/', LogoutView.as_view(), name='api_doctor_logout'),
    path('appointments/', doctorAppointmentView.as_view(), name='api_doctor_profile'),
    
]
#helpdesk uuid is user uuid used to approve the helpdesk user

#token Refresh API - used by the front end for the if the token is expired after the one month time period it will refresh the token automatically no need to login again
#token Verify API - used by the front end to verify the token is valid or not