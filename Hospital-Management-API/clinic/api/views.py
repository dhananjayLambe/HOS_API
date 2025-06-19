import logging
from django.db import transaction

from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle

from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

from clinic.api.serializers import (
    ClinicSerializer,
    ClinicAddressSerializer,
    ClinicSpecializationSerializer,
    ClinicScheduleSerializer,
    ClinicAdminRegistrationSerializer,
    ClinicServiceSerializer,
    ClinicServiceListSerializer,
    ClinicAdminTokenObtainPairSerializer,
    ClinicAdminTokenRefreshSerializer,
    ClinicAdminTokenVerifySerializer,
)

from clinic.models import (
    Clinic,
    ClinicAddress,
    ClinicSpecialization,
    ClinicSchedule,
    ClinicService,
    ClinicServiceList,
)

from account.permissions import IsClinicAdmin
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.views import TokenVerifyView
logger = logging.getLogger(__name__)


class ClinicCreateView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        serializer = ClinicSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Get All Clinics
class ClinicListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        clinics = Clinic.objects.all()
        serializer = ClinicSerializer(clinics, many=True)
        return Response(serializer.data)

# Get a Single Clinic
class ClinicDetailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request, pk):
        try:
            clinic = Clinic.objects.get(pk=pk)
        except Clinic.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ClinicSerializer(clinic)
        return Response(serializer.data)

# Update Clinic
class ClinicUpdateView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def put(self, request, pk):
        try:
            clinic = Clinic.objects.get(pk=pk)
        except Clinic.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = ClinicSerializer(clinic, data=request.data, partial=True)  # partial=True for partial updates
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Delete Clinic
class ClinicDeleteView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def delete(self, request, pk):
        try:
            clinic = Clinic.objects.get(pk=pk)
        except Clinic.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        
        clinic.delete()
        return Response({"detail": "Deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

class ClinicAddressViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    queryset = ClinicAddress.objects.all()
    serializer_class = ClinicAddressSerializer

class ClinicSpecializationViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    queryset = ClinicSpecialization.objects.all()
    serializer_class = ClinicSpecializationSerializer

class ClinicScheduleViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    queryset = ClinicSchedule.objects.all()
    serializer_class = ClinicScheduleSerializer

class ClinicServiceViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    queryset = ClinicService.objects.all()
    serializer_class = ClinicServiceSerializer

class ClinicServiceListViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    queryset = ClinicServiceList.objects.all()
    serializer_class = ClinicServiceListSerializer

class ClinicRegistrationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        # Phase 1: Register Clinic Basic Details
        clinic_serializer = ClinicSerializer(data=request.data)
        if clinic_serializer.is_valid():
            clinic = clinic_serializer.save()
            return Response({"message": "Clinic registered successfully.", "clinic_id": clinic.id}, status=status.HTTP_201_CREATED)
        return Response(clinic_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ClinicProfileUpdateView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def put(self, request, clinic_id):
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({"error": "Clinic not found."}, status=status.HTTP_404_NOT_FOUND)

        # Address
        address_data = request.data.get("address")
        if address_data:
            clinic_address_serializer = ClinicAddressSerializer(data=address_data)
            if clinic_address_serializer.is_valid():
                ClinicAddress.objects.update_or_create(clinic=clinic, defaults=clinic_address_serializer.validated_data)

        # Specializations
        specializations = request.data.get("specializations", [])
        for specialization in specializations:
            specialization_serializer = ClinicSpecializationSerializer(data=specialization)
            if specialization_serializer.is_valid():
                ClinicSpecialization.objects.create(clinic=clinic, **specialization_serializer.validated_data)

        # Services
        services_data = request.data.get("services")
        if services_data:
            clinic_service_serializer = ClinicServiceSerializer(data=services_data)
            if clinic_service_serializer.is_valid():
                ClinicService.objects.update_or_create(clinic=clinic, defaults=clinic_service_serializer.validated_data)

        # Schedule
        schedule_data = request.data.get("schedule")
        if schedule_data:
            clinic_schedule_serializer = ClinicScheduleSerializer(data=schedule_data)
            if clinic_schedule_serializer.is_valid():
                ClinicSchedule.objects.update_or_create(clinic=clinic, defaults=clinic_schedule_serializer.validated_data)

        # Service List
        service_list = request.data.get("service_list", [])
        for service in service_list:
            service_list_serializer = ClinicServiceListSerializer(data=service)
            if service_list_serializer.is_valid():
                ClinicServiceList.objects.create(clinic=clinic, **service_list_serializer.validated_data)

        return Response({"message": "Clinic profile updated successfully."}, status=status.HTTP_200_OK)
    
class ClinicAdminRegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ClinicAdminRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "status": "success",
                "message": "Clinic Admin created successfully",
                "data": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email
                }
            }, status=status.HTTP_201_CREATED)
        return Response({
            "status": "error",
            "message": "Validation failed",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class ClinicAdminLoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = ClinicAdminTokenObtainPairSerializer

class ClinicAdminLogoutView(APIView):
    """
    Logout ClinicAdmin by blacklisting the refresh token.
    """
    permission_classes = [IsAuthenticated,IsClinicAdmin]


    def post(self, request):
        print("Request data:", request.data)  # Debugging line to check request data
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response({
                "status": "error",
                "message": "Refresh token is required."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response({
                "status": "success",
                "message": "Successfully logged out."
            }, status=status.HTTP_200_OK)

        except TokenError:
            return Response({
                "status": "error",
                "message": "Token is invalid or already blacklisted."
            }, status=status.HTTP_400_BAD_REQUEST)


class ClinicAdminTokenRefreshView(TokenRefreshView):
    serializer_class = ClinicAdminTokenRefreshSerializer

class ClinicAdminTokenVerifyView(TokenVerifyView):
    serializer_class = ClinicAdminTokenVerifySerializer