from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import(
    HospitalViewSet, FrontDeskUserViewSet,
    HospitalLicensingViewSet, HospitalOperationalDetailsViewSet, 
    HospitalStaffDetailsViewSet, HospitalFacilityViewSet, 
    HospitalDigitalInformationViewSet, HospitalBillingInformationViewSet, 
    FrontDeskUserViewSet

)

router = DefaultRouter()

#Hospital Registration Details Path
router.register(r'hospitals', HospitalViewSet, basename='hospital')
router.register(r'hospital-licensing', HospitalLicensingViewSet, basename='hospital-licensing')
router.register(r'hospital-operational-details', HospitalOperationalDetailsViewSet, basename='hospital-operational-details')
router.register(r'hospital-staff-details', HospitalStaffDetailsViewSet, basename='hospital-staff-details')
router.register(r'hospital-facility', HospitalFacilityViewSet, basename='hospital-facility')
router.register(r'hospital-digital-information', HospitalDigitalInformationViewSet, basename='hospital-digital-information')
router.register(r'hospital-billing-information', HospitalBillingInformationViewSet, basename='hospital-billing-information')

# Front Desk Users Path
router.register(r'frontdesk-users', FrontDeskUserViewSet, basename='frontdeskuser')

urlpatterns = [
    path('', include(router.urls)),
]
