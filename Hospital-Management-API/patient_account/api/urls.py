
from django.urls import path, include
from rest_framework.routers import DefaultRouter # URL Routing
from patient_account.api.views import (
    CheckUserStatusView,VerifyOTPView,
    CustomTokenRefreshView,LogoutView,get_patient_account,RegisterPatientView,AddPatientProfileView,
    GetPatientProfilesView,DeletePatientProfileView,GetProfileByNameView,
    GetPrimaryProfileView,
    SendOTPView,UpdatePatientProfileView)
app_name = 'patient_account'

#router = DefaultRouter()
#router.register(r'', basename='patients')

urlpatterns = [
    #path('', include(router.urls)),
    path('check-user/', CheckUserStatusView.as_view(), name='check-user'),
    path('send-otp/', SendOTPView.as_view(), name='send-otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('refresh-token/', CustomTokenRefreshView.as_view(), name='refresh-token'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('register/', RegisterPatientView.as_view(), name='register-patient'),
    path('patient-account/', get_patient_account, name='patient-account'),
    path("add-profile/", AddPatientProfileView.as_view(), name="add-profile"),
    path("update-profile-details/<uuid:profile_id>/", UpdatePatientProfileView.as_view(), name="update-profile-details"),
    path("get-patient-profiles/", GetPatientProfilesView.as_view(), name="get-patient-profiles"),
    path("delete-profile/<uuid:profile_id>/", DeletePatientProfileView.as_view(), name="delete-profile"),
    path("get-profile-by-name/<str:first_name>/", GetProfileByNameView.as_view(), name="get-profile-by-name"),
    path("get-primary-profile/", GetPrimaryProfileView.as_view(), name="get-primary-profile"),

]

# Authentication Flow

# User opens the app
    # If the user has a valid JWT token, they continue using the app.
    # If the token is expired or not present, prompt for login via OTP.

# User enters mobile number
    # If the number is new → Register and send OTP.
    # If the number exists → Send OTP for login.

# User enters OTP
    # If OTP is valid → Generate and return a JWT token.
    # If invalid → Reject with an error.

# User continues using the app
    # If the JWT token expires, they must refresh it.