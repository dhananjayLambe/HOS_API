from django.urls import path,include
from rest_framework import routers
from clinic.api.views import (
    ClinicCreateView, ClinicListView,
    ClinicDetailView, ClinicUpdateView,
    ClinicDeleteView,ClinicAddressViewSet,
    ClinicSpecializationViewSet,
    ClinicScheduleViewSet,
    ClinicServiceViewSet,
    ClinicServiceListViewSet,)

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
    path('', include(router.urls)),
]   