from .views import (
    doctorAccountViewAdmin,
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


app_name = 'hospitalAdmin'

router = DefaultRouter()
router.register(r'clinic-admin', ClinicAdminApprovalViewSet, basename='clinic-admin-approval')

urlpatterns = [
    # Admin login
    path('login/', AdminLoginJwtView.as_view(), name='admin_login'),
    path('logout/', AdminLogoutJwtView.as_view(), name='admin_logout'),
    path('token/refresh/', AdminTokenRefreshView.as_view(), name='doctor_token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='doctor_token_verify'),

    # Approve Doctor
    path('doctors/pending/', PendingDoctorListAPIView.as_view(), name='pending-doctors'),
    path('approve/doctors/<uuid:doctor_id>/', ApproveDoctorAPIView.as_view(), name='approve-doctor'),

    # Doctor management
    path('doctor/registration/', DoctorRegistrationView.as_view(), name='api_doctors_registration_admin'),
    path('doctors/', doctorAccountViewAdmin.as_view(), name='api_doctors_admin'),
    path('doctor/<uuid:pk>/', doctorAccountViewAdmin.as_view(), name='api_doctor_detail_admin'),

    # Legacy patient / appointment admin routes removed (use patient_account + appointments apps).

    path('', include(router.urls)),
]
