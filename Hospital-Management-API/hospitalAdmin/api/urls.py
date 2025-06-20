from .views import (
doctorAccountViewAdmin,
appointmentViewAdmin,
patientRegistrationViewAdmin,
patientAccountViewAdmin,
patientHistoryViewAdmin,
approvePatientViewAdmin,
approveAppointmentViewAdmin,
DoctorRegistrationView,
AdminLogoutView,
AdminLoginJwtView,
AdminLogoutJwtView,
AdminTokenRefreshView,
ClinicAdminApprovalViewSet,
PendingDoctorListAPIView,
ApproveDoctorAPIView,
)


from django.urls import path, include
from rest_framework_simplejwt.views import TokenVerifyView
from rest_framework.routers import DefaultRouter


app_name='hospitalAdmin'

router = DefaultRouter()
router.register(r'clinic-admin', ClinicAdminApprovalViewSet, basename='clinic-admin-approval')

urlpatterns = [
    #Admin login
    path('login/', AdminLoginJwtView.as_view(), name='admin_login'),
    path('logout/', AdminLogoutJwtView.as_view(), name='admin_logout'),
    path('token/refresh/', AdminTokenRefreshView.as_view(), name='doctor_token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='doctor_token_verify'),
    
    # Send a password reset link or OTP to the registered email/phone.
    # * Reset Password API
    # * Update the password using the token or OTP.
    # * Change Password API
    # * Allow logged-in doctors to update their password.
    # * Token Refresh API
    # * Refresh expired tokens to maintain session continuity.

 
    #Approve Doctor
    path('doctors/pending/', PendingDoctorListAPIView.as_view(), name='pending-doctors'),
    path('approve/doctors/<uuid:doctor_id>/', ApproveDoctorAPIView.as_view(), name='approve-doctor'),

    #Approve Patient
    path('approve/patients/', approvePatientViewAdmin.as_view(), name='api_patients_approve_admin'),
    path('approve/patient/<uuid:pk>/', approvePatientViewAdmin.as_view(), name='api_patient_detail_approve_admin'),

    # Approve Appointment
    path('approve/appointments/', approveAppointmentViewAdmin.as_view(), name='api_appointment_approve_admin'),
    path('approve/appointment/<int:pk>', approveAppointmentViewAdmin.as_view(), name='api_appointment_approve_detail_admin'),

    #Doctor management
    #path('doctor/registration/', docregistrationViewAdmin.as_view(), name='api_doctors_registration_admin'),
    path('doctor/registration/', DoctorRegistrationView.as_view(), name='api_doctors_registration_admin'),
    path('doctors/', doctorAccountViewAdmin.as_view(), name='api_doctors_admin'),
    path('doctor/<uuid:pk>/', doctorAccountViewAdmin.as_view(), name='api_doctor_detail_admin'),
    
    #patient Management
    path('patient/registration/', patientRegistrationViewAdmin.as_view(), name='api_patient_registration_admin'),
    path('patients/', patientAccountViewAdmin.as_view(), name='api_patients_admin'),
    path('patient/<uuid:pk>/', patientAccountViewAdmin.as_view(), name='api_patient_detail_admin'),
    path('patient/<uuid:pk>/history/', patientHistoryViewAdmin.as_view(), name='api_patient_history_admin'),
    path('patient/<uuid:pk>/history/<int:hid>/', patientHistoryViewAdmin.as_view(), name='api_patient_history_admin'),

    #Appointment Management
    path('appointments/', appointmentViewAdmin.as_view(), name='api_appointments_admin'),
    path('appointment/<int:pk>/', appointmentViewAdmin.as_view(), name='api_appointment_detail_admin'),
    path('', include(router.urls)),
]