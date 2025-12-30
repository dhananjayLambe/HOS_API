from django.urls import path, include
from rest_framework_simplejwt.views import TokenVerifyView
from rest_framework.routers import DefaultRouter
from doctor.api.views import (
    DoctorOnboardingPhase1View,
    DoctorDetailsAPIView,DoctorAddressViewSet,
    DoctorRegistrationAPIView,PendingHelpdeskRequestsView,
    UserView,DoctorProfileUpdateAPIView,ApproveHelpdeskUserView,
    DoctorLoginView,DoctorLogoutView,DoctorTokenRefreshView,
    RegistrationView,GovernmentIDViewSet,EducationViewSet,
    SpecializationViewSet,CustomSpecializationViewSet,
    DoctorServiceViewSet,AwardViewSet,CertificationViewSet,
    DoctorDashboardSummaryView,RegistrationViewSet,
    UploadDoctorPhotoView,DoctorProfileView,
    UploadRegistrationCertificateView,
    UploadEducationCertificateView,UploadGovernmentIDView,DoctorKYCStatusView,
    KYCVerifyView,DoctorSearchView,UploadDigitalSignatureView,
    DoctorFeeStructureViewSet,FollowUpPolicyViewSet,CancellationPolicyViewSet,DoctorAvailabilityView,DoctorLeaveCreateView,
    DoctorLeaveCreateView,DoctorLeaveListView,DoctorLeaveUpdateView,DoctorLeaveDeleteView,
    DoctorOPDStatusViewSet,
    CheckUserStatusView,DoctorFullProfileAPIView,DoctorBankDetailsViewSet,
    DoctorWorkingHoursView,DoctorAvailabilityPreviewView,DoctorSchedulingRulesViewSet,
    DoctorOPDCheckInView,DoctorOPDCheckOutView,DoctorOPDStatusGetView,
)

app_name='doctor'
router = DefaultRouter()
# Address is handled explicitly below to support PUT/PATCH at base URL without pk
# router.register(r'address', DoctorAddressViewSet, basename='doctor-address')
router.register(r'education', EducationViewSet, basename='education')
router.register(r'specializations', SpecializationViewSet, basename='specialization')
router.register(r'custom-specializations', CustomSpecializationViewSet, basename='custom-specialization')
router.register(r'services', DoctorServiceViewSet, basename='doctor-service')
router.register(r'awards', AwardViewSet, basename='doctor-award')
router.register(r'certifications', CertificationViewSet, basename='doctor-certification')
router.register(r'medical-license', RegistrationViewSet, basename='medical-license')
router.register(r'doctor-fees', DoctorFeeStructureViewSet, basename='doctor-fees')
router.register(r'follow-up-policies', FollowUpPolicyViewSet, basename='follow-up-policies')
router.register(r'cancellation-policies', CancellationPolicyViewSet, basename='cancellation-policies')
router.register(r'scheduling-rules', DoctorSchedulingRulesViewSet, basename='scheduling-rules')
router.register(r'doctor-opd-status', DoctorOPDStatusViewSet)

government_id_view = GovernmentIDViewSet.as_view({
    'post': 'create',
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy',
})

address_view = DoctorAddressViewSet.as_view({
    'get': 'list',
    'post': 'create',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy',
})

bank_details_view = DoctorBankDetailsViewSet.as_view({
    'get': 'retrieve',
    'post': 'create',
})

bank_details_detail_view = DoctorBankDetailsViewSet.as_view({
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy',
})

urlpatterns = [
    path('address/', address_view, name='doctor-address'),
    path('', include(router.urls)),
    # Doctor Authentication Endpoints
    path('check-doctor-user/', CheckUserStatusView.as_view(), name='check-doctor-user'),
    path("onboarding/phase1/", DoctorOnboardingPhase1View.as_view(), name="doctor-onboarding-phase1"),
     path("profile/", DoctorFullProfileAPIView.as_view(), name="doctor-full-profile"),
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
    path('registration/', RegistrationView.as_view(), name='doctor-registration'),
    path('government-id/', government_id_view, name='doctor-government-id'),
    path('bank-details/', bank_details_view, name='doctor-bank-details'),
    path('bank-details/<int:pk>/', bank_details_detail_view, name='doctor-bank-details-detail'),
    path('dashboard/summary/', DoctorDashboardSummaryView.as_view(), name='doctor-dashboard-summary'),
    path('upload-photo/', UploadDoctorPhotoView.as_view(), name='upload-doctor-photo'),
    path('me/', DoctorProfileView.as_view(), name='doctor-profile'),
    #KYC 
    path('kyc/upload/registration/', UploadRegistrationCertificateView.as_view(), name='doctor-kyc-registration-upload'),
    path('kyc/upload/education/', UploadEducationCertificateView.as_view(), name='doctor-kyc-education-upload'),
    path('kyc/upload/govt-id/', UploadGovernmentIDView.as_view(), name='upload-govt-id'),
    path('kyc/upload/digital-signature/', UploadDigitalSignatureView.as_view(), name='upload-digital-signature'),
    path('kyc/status/', DoctorKYCStatusView.as_view(), name='doctor-kyc-status'),
    path("kyc/admin-verify/<uuid:doctor_id>/", KYCVerifyView.as_view(), name="kyc-admin-verify"),
    path("search-doctors/", DoctorSearchView.as_view(), name="search-doctors"),
    path('doctors-availability/',
            DoctorAvailabilityView.as_view(),
            name='doctor-availability'),
        #Doctor Leave View
    path("doctor-leave-create/", DoctorLeaveCreateView.as_view(), name="doctor-leave-create"),
    path("doctor-leave-list/", DoctorLeaveListView.as_view(), name="doctor-leave-list"),
    path("doctor-leave-update/<uuid:pk>/", DoctorLeaveUpdateView.as_view(), name="doctor-leave-update"),
    path("doctor-leave-delete/<uuid:pk>/", DoctorLeaveDeleteView.as_view(), name="doctor-leave-delete"),
    # Working Hours & Scheduling APIs
    path("working-hours/", DoctorWorkingHoursView.as_view(), name="doctor-working-hours"),
    path("availability-preview/", DoctorAvailabilityPreviewView.as_view(), name="doctor-availability-preview"),
    path("opd-status/check-in/", DoctorOPDCheckInView.as_view(), name="doctor-opd-check-in"),
    path("opd-status/check-out/", DoctorOPDCheckOutView.as_view(), name="doctor-opd-check-out"),
    path("opd-status/", DoctorOPDStatusGetView.as_view(), name="doctor-opd-status-get"),
]
#helpdesk uuid is user uuid used to approve the helpdesk user
#token Refresh API - used by the front end for the if the token is expired after the one month time period it will refresh the token automatically no need to login again
#token Verify API - used by the front end to verify the token is valid or not