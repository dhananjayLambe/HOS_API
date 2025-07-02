from django.urls import path,include
from rest_framework import routers
from clinic.api.views import (
    ClinicCreateView, ClinicListView,
    ClinicDetailView, ClinicUpdateView,
    ClinicDeleteView,ClinicAddressViewSet,
    ClinicSpecializationViewSet,ClinicAdminRegisterView,
    ClinicScheduleViewSet,
    ClinicServiceViewSet,
    ClinicServiceListViewSet,ClinicAdminLoginView,
    ClinicRegistrationView,ClinicProfileUpdateView,
    ClinicAdminLogoutView,
    ClinicAdminTokenRefreshView,ClinicAdminTokenVerifyView)

router = routers.DefaultRouter()
router.register(r'clinic-address', ClinicAddressViewSet)
router.register(r'clinic-specializations', ClinicSpecializationViewSet, basename='clinic-specialization')
router.register(r'clinic-schedules', ClinicScheduleViewSet, basename='clinic-schedule')
router.register(r'clinic-services', ClinicServiceViewSet, basename='clinic-service')
router.register(r'clinic-service-list', ClinicServiceListViewSet, basename='clinic-service-list')

urlpatterns = [
    path('clinics/', ClinicListView.as_view(), name='clinic-list'),
    path('clinics/create/', ClinicCreateView.as_view(), name='clinic-create'),
    path('clinics/<uuid:pk>/', ClinicDetailView.as_view(), name='clinic-detail'),
    path('clinics/update/<uuid:pk>/', ClinicUpdateView.as_view(), name='clinic-update'),
    path('clinics/delete/<uuid:pk>/', ClinicDeleteView.as_view(), name='clinic-delete'),
    
    #path('registration/', ClinicRegistrationView.as_view(), name='clinic-register'),
    path('profilupdate/<uuid:clinic_id>/', ClinicProfileUpdateView.as_view(), name='clinic-profile-update'),
    path('', include(router.urls)),
    path('clinic-admin/register/', ClinicAdminRegisterView.as_view(), name='clinic-admin-register'),
    path('clinic-admin/login/', ClinicAdminLoginView.as_view(), name='clinic-admin-login'),
    path('clinic-admin/logout/', ClinicAdminLogoutView.as_view(), name='clinic-admin-logout'),
    path('api/clinic-admin/token/refresh/', ClinicAdminTokenRefreshView.as_view(), name='clinic_admin_token_refresh'),
    path('api/clinic-admin/token/verify/', ClinicAdminTokenVerifyView.as_view(), name='clinic_admin_token_verify'),

]

# profilupdate/<uuid:clinic_id>/ Need to remove the code for schding as it can be added to appointmennt app
# path("clinic/details/", ClinicDetailView.as_view(), name="clinic-details"),
# need to get the all the details as when doctor log in to the system he should be able to see the clinic details
#API need to create for the same

# TODO: Implement ClinicSchedule model if we need to enforce clinic-wide timing rules