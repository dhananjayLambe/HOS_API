from django.urls import path,include
from rest_framework import routers
from clinic.api.views import (
    ClinicCreateView, ClinicListView,
    ClinicDetailView, ClinicUpdateView,
    ClinicDeleteView,ClinicAddressViewSet,
    ClinicSpecializationViewSet,
    ClinicScheduleViewSet,
    ClinicServiceViewSet,
    ClinicServiceListViewSet,
    ClinicRegistrationView,ClinicProfileUpdateView)

router = routers.DefaultRouter()
router.register(r'clinic-address', ClinicAddressViewSet)
router.register(r'clinic-specializations', ClinicSpecializationViewSet, basename='clinic-specialization')
router.register(r'clinic-schedules', ClinicScheduleViewSet, basename='clinic-schedule')
router.register(r'clinic-services', ClinicServiceViewSet, basename='clinic-service')
router.register(r'clinic-service-list', ClinicServiceListViewSet, basename='clinic-service-list')

urlpatterns = [
    path('clinics/', ClinicListView.as_view(), name='clinic-list'),
    path('create/', ClinicCreateView.as_view(), name='clinic-create'),
    path('get/<uuid:pk>/', ClinicDetailView.as_view(), name='clinic-detail'),
    path('update/<uuid:pk>/', ClinicUpdateView.as_view(), name='clinic-update'),
    path('delete/<uuid:pk>/', ClinicDeleteView.as_view(), name='clinic-delete'),
    path('registration/', ClinicRegistrationView.as_view(), name='clinic-register'),
    path('profilupdate/<uuid:clinic_id>/', ClinicProfileUpdateView.as_view(), name='clinic-profile-update'),
    path('', include(router.urls)),
]

# profilupdate/<uuid:clinic_id>/ Need to remove the code for schding as it can be added to appointmennt app
# path("clinic/details/", ClinicDetailView.as_view(), name="clinic-details"),
# need to get the all the details as when doctor log in to the system he should be able to see the clinic details
#API need to create for the same