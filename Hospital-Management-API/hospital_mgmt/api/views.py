from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.permissions import BasePermission
from hospital_mgmt.models import (
    Hospital, HospitalLicensing,
    HospitalOperationalDetails,
    HospitalStaffDetails, HospitalFacility,
    HospitalDigitalInformation, 
    HospitalBillingInformation, FrontDeskUser
)
from hospital_mgmt.api.serializers import (
    HospitalSerializer, FrontDeskUserSerializer,
    HospitalLicensingSerializer,
    HospitalOperationalDetailsSerializer, 
    HospitalStaffDetailsSerializer,
    HospitalFacilitySerializer,
    HospitalDigitalInformationSerializer,
    HospitalBillingInformationSerializer,
    FrontDeskUserSerializer
)



class IsAdmin(BasePermission):
    """custom Permission class for Admin"""

    def has_permission(self, request, view):
        return bool(request.user and request.user.groups.filter(name='admin').exists())

class HospitalViewSet(viewsets.ModelViewSet):
    queryset = Hospital.objects.all()
    serializer_class = HospitalSerializer
    permission_classes = [AllowAny]

class FrontDeskUserViewSet(viewsets.ModelViewSet):
    queryset = FrontDeskUser.objects.all()
    serializer_class = FrontDeskUserSerializer
    permission_classes = [AllowAny]

class HospitalLicensingViewSet(viewsets.ModelViewSet):
    queryset = HospitalLicensing.objects.all()
    serializer_class = HospitalLicensingSerializer
    permission_classes = [AllowAny]

class HospitalOperationalDetailsViewSet(viewsets.ModelViewSet):
    queryset = HospitalOperationalDetails.objects.all()
    serializer_class = HospitalOperationalDetailsSerializer
    permission_classes = [AllowAny]

class HospitalStaffDetailsViewSet(viewsets.ModelViewSet):
    queryset = HospitalStaffDetails.objects.all()
    serializer_class = HospitalStaffDetailsSerializer
    permission_classes = [AllowAny]

class HospitalFacilityViewSet(viewsets.ModelViewSet):
    queryset = HospitalFacility.objects.all()
    serializer_class = HospitalFacilitySerializer
    permission_classes = [AllowAny]

class HospitalDigitalInformationViewSet(viewsets.ModelViewSet):
    queryset = HospitalDigitalInformation.objects.all()
    serializer_class = HospitalDigitalInformationSerializer
    permission_classes = [AllowAny]

class HospitalBillingInformationViewSet(viewsets.ModelViewSet):
    queryset = HospitalBillingInformation.objects.all()
    serializer_class = HospitalBillingInformationSerializer
    permission_classes = [AllowAny]
