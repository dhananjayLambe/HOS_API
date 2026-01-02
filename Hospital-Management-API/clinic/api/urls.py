from django.urls import path,include
from rest_framework import routers
from clinic.api.views import (
    ClinicCreateView, ClinicListView,
    ClinicDetailView, ClinicUpdateView,
    ClinicDeleteView,ClinicAddressViewSet,
    ClinicSpecializationViewSet,ClinicAdminRegisterView,
    ClinicScheduleViewSet,ClinicListViewSet,
    ClinicServiceViewSet,
    ClinicServiceListViewSet,ClinicAdminLoginView,
    ClinicRegistrationView,ClinicProfileUpdateView,
    ClinicAdminLogoutView,ClinicOnboardingView,
    ClinicAdminTokenRefreshView,ClinicAdminTokenVerifyView,
    # New production-ready APIs
    ClinicCreateAPIView,
    ClinicRetrieveUpdateDeleteAPIView,
    ClinicAddressUpsertAPIView,
    ClinicProfileDetailUpdateAPIView,
    ClinicScheduleListCreateAPIView,
    ClinicAdminMyClinicAPIView,
    # Clinic Holidays APIs
    ClinicHolidayListCreateAPIView,
    ClinicHolidayRetrieveUpdateDeleteAPIView,
    ClinicHolidayDeactivateAPIView,
)

router = routers.DefaultRouter()
router.register(r'clinic-address', ClinicAddressViewSet)
router.register(r'clinic-specializations', ClinicSpecializationViewSet, basename='clinic-specialization')
router.register(r'clinic-schedules', ClinicScheduleViewSet, basename='clinic-schedule')
router.register(r'clinic-services', ClinicServiceViewSet, basename='clinic-service')
router.register(r'clinic-service-list', ClinicServiceListViewSet, basename='clinic-service-list')
router.register(r"clinic-list-ui", ClinicListViewSet, basename="clinic")

urlpatterns = [
    # ========================================================================
    # Production-Ready Clinic Information APIs (Following Requirement Doc)
    # ========================================================================
    # Base URL: /api/clinic/
    
    # Clinic CRUD APIs
    path('clinics/', ClinicCreateAPIView.as_view(), name='clinic-create'),
    path('clinics/<uuid:clinic_id>/', ClinicRetrieveUpdateDeleteAPIView.as_view(), name='clinic-retrieve-update-delete'),
    
    # Clinic Address APIs (POST and PUT both use same endpoint)
    path('clinics/<uuid:clinic_id>/address/', ClinicAddressUpsertAPIView.as_view(), name='clinic-address-upsert'),
    
    # Clinic Profile APIs (Branding) - GET and PATCH use same endpoint
    path('clinics/<uuid:clinic_id>/profile/', ClinicProfileDetailUpdateAPIView.as_view(), name='clinic-profile-detail-update'),
    
    # Clinic Schedule APIs (Operating Hours) - POST and GET use same endpoint
    path('clinics/<uuid:clinic_id>/schedules/', ClinicScheduleListCreateAPIView.as_view(), name='clinic-schedule-list-create'),
    
    # Clinic Holidays APIs
    path('clinics/<uuid:clinic_id>/holidays/', ClinicHolidayListCreateAPIView.as_view(), name='clinic-holiday-list-create'),
    path('clinics/<uuid:clinic_id>/holidays/<uuid:holiday_id>/', ClinicHolidayRetrieveUpdateDeleteAPIView.as_view(), name='clinic-holiday-retrieve-update-delete'),
    path('clinics/<uuid:clinic_id>/holidays/<uuid:holiday_id>/deactivate/', ClinicHolidayDeactivateAPIView.as_view(), name='clinic-holiday-deactivate'),
    
    # ========================================================================
    # Legacy/Other APIs (Keeping for backward compatibility)
    # ========================================================================
    path("clinics/onboarding/", ClinicOnboardingView.as_view(), name="clinic-onboarding"),
    path('clinics/list/', ClinicListView.as_view(), name='clinic-list'),
    path('clinics/create/', ClinicCreateView.as_view(), name='clinic-create-legacy'),
    path('clinics/<uuid:pk>/detail/', ClinicDetailView.as_view(), name='clinic-detail-legacy'),
    path('clinics/update/<uuid:pk>/', ClinicUpdateView.as_view(), name='clinic-update-legacy'),
    path('clinics/delete/<uuid:pk>/', ClinicDeleteView.as_view(), name='clinic-delete-legacy'),
    
    #path('registration/', ClinicRegistrationView.as_view(), name='clinic-register'),
    path('profilupdate/<uuid:clinic_id>/', ClinicProfileUpdateView.as_view(), name='clinic-profile-update-legacy'),
    path('', include(router.urls)),
    path('clinic-admin/register/', ClinicAdminRegisterView.as_view(), name='clinic-admin-register'),
    path('clinic-admin/login/', ClinicAdminLoginView.as_view(), name='clinic-admin-login'),
    path('clinic-admin/logout/', ClinicAdminLogoutView.as_view(), name='clinic-admin-logout'),
    path('clinic-admin/my-clinic/', ClinicAdminMyClinicAPIView.as_view(), name='clinic-admin-my-clinic'),
    path('api/clinic-admin/token/refresh/', ClinicAdminTokenRefreshView.as_view(), name='clinic_admin_token_refresh'),
    path('api/clinic-admin/token/verify/', ClinicAdminTokenVerifyView.as_view(), name='clinic_admin_token_verify'),

]

# profilupdate/<uuid:clinic_id>/ Need to remove the code for schding as it can be added to appointmennt app
# path("clinic/details/", ClinicDetailView.as_view(), name="clinic-details"),
# need to get the all the details as when doctor log in to the system he should be able to see the clinic details
#API need to create for the same

# TODO: Implement ClinicSchedule model if we need to enforce clinic-wide timing rules