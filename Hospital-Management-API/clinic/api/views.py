import logging

from django.db import transaction

from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from rest_framework_simplejwt.authentication import JWTAuthentication
from account.permissions import IsClinicAdmin

from clinic.api.serializers import (
    ClinicAddressSerializer,
    ClinicAdminRegistrationSerializer,
    ClinicAdminTokenObtainPairSerializer,
    ClinicAdminTokenRefreshSerializer,
    ClinicAdminTokenVerifySerializer,
    ClinicScheduleSerializer,
    ClinicSerializer,
    ClinicServiceListSerializer,
    ClinicServiceSerializer,
    ClinicSpecializationSerializer,
    ClinicOnboardingSerializer,
)

from clinic.models import (
    Clinic,
    ClinicAddress,
    ClinicService,
    ClinicServiceList,
    ClinicSchedule,
    ClinicSpecialization,
)
from account.permissions import IsDoctor
logger = logging.getLogger(__name__)
from clinic.utils import api_response


class ClinicOnboardingView(APIView):
    print("i am in clinic onboarding view API ")
    permission_classes = []

    @transaction.atomic
    def post(self, request):
        serializer = ClinicOnboardingSerializer(data=request.data)
        if serializer.is_valid():
            reg_no = serializer.validated_data.get("registration_number")
            if reg_no and Clinic.objects.filter(registration_number=reg_no).exists():
                return api_response(status.HTTP_400_BAD_REQUEST, "Clinic already registered with this registration number.")
            clinic = serializer.save()
            return api_response(status.HTTP_201_CREATED, "Clinic created successfully.", ClinicOnboardingSerializer(clinic).data)
        return api_response(status.HTTP_400_BAD_REQUEST, "Invalid clinic data.", serializer.errors)



# Create Clinic
class ClinicCreateView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = ClinicSerializer(data=request.data)
        if serializer.is_valid():
            reg_no = serializer.validated_data.get('registration_number')
            if reg_no and Clinic.objects.filter(registration_number=reg_no).exists():
                return api_response(status.HTTP_400_BAD_REQUEST, "Clinic already registered with this registration number.")

            clinic = serializer.save()
            return api_response(status.HTTP_201_CREATED, "Clinic created successfully.", ClinicSerializer(clinic).data)
        return api_response(status.HTTP_400_BAD_REQUEST, "Invalid clinic data.", serializer.errors)


# Get All Clinics
class ClinicListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        clinics = Clinic.objects.all().order_by('-created_at')
        serializer = ClinicSerializer(clinics, many=True)
        return api_response(status.HTTP_200_OK, "Clinics retrieved successfully.", serializer.data)


# Get a Single Clinic
class ClinicDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            clinic = Clinic.objects.get(pk=pk)
        except Clinic.DoesNotExist:
            return api_response(status.HTTP_404_NOT_FOUND, "Clinic not found.")
        serializer = ClinicSerializer(clinic)
        return api_response(status.HTTP_200_OK, "Clinic retrieved successfully.", serializer.data)


# Update Clinic
class ClinicUpdateView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def put(self, request, pk):
        try:
            clinic = Clinic.objects.get(pk=pk)
        except Clinic.DoesNotExist:
            return api_response(status.HTTP_404_NOT_FOUND, "Clinic not found.")

        serializer = ClinicSerializer(clinic, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return api_response(status.HTTP_200_OK, "Clinic updated successfully.", serializer.data)
        return api_response(status.HTTP_400_BAD_REQUEST, "Invalid data.", serializer.errors)
    def patch(self, request, pk):
        try:
            clinic = Clinic.objects.get(pk=pk)
        except Clinic.DoesNotExist:
            return api_response(status.HTTP_404_NOT_FOUND, "Clinic not found.")

        serializer = ClinicSerializer(clinic, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return api_response(status.HTTP_200_OK, "Clinic partially updated successfully.", serializer.data)
        return api_response(status.HTTP_400_BAD_REQUEST, "Invalid data.", serializer.errors)

# Delete Clinic
class ClinicDeleteView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def delete(self, request, pk):
        try:
            clinic = Clinic.objects.get(pk=pk)
        except Clinic.DoesNotExist:
            return api_response(status.HTTP_404_NOT_FOUND, "Clinic not found.")

        clinic.delete()
        return api_response(status.HTTP_200_OK, "Clinic deleted successfully.")


class ClinicAddressViewSet(viewsets.ModelViewSet):
    queryset = ClinicAddress.objects.all()
    serializer_class = ClinicAddressSerializer
    permission_classes = [AllowAny] #IsAuthenticated
    authentication_classes = []

    def get_object(self):
        return get_object_or_404(ClinicAddress, pk=self.kwargs['pk'])

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({'status': True, 'message': 'List retrieved successfully', 'data': serializer.data}, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({'status': True, 'message': 'Record retrieved successfully', 'data': serializer.data}, status=status.HTTP_200_OK)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Idempotency check
            clinic = serializer.validated_data['clinic']
            existing = ClinicAddress.objects.filter(clinic=clinic).first()
            if existing:
                existing_serializer = self.get_serializer(existing)
                return Response({
                    'status': True,
                    'message': 'Address already exists. Returning existing.',
                    'data': existing_serializer.data
                }, status=status.HTTP_200_OK)
            self.perform_create(serializer)
            return Response({'status': True, 'message': 'Created successfully', 'data': serializer.data}, status=status.HTTP_201_CREATED)
        return Response({'status': False, 'message': 'Validation failed', 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        if serializer.is_valid():
            self.perform_update(serializer)
            return Response({'status': True, 'message': 'Updated successfully', 'data': serializer.data}, status=status.HTTP_200_OK)
        return Response({'status': False, 'message': 'Validation failed', 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            self.perform_update(serializer)
            return Response({'status': True, 'message': 'Patched successfully', 'data': serializer.data}, status=status.HTTP_200_OK)
        return Response({'status': False, 'message': 'Validation failed', 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({'status': True, 'message': 'Deleted successfully', 'data': {}}, status=status.HTTP_200_OK)

class ClinicSpecializationViewSet(viewsets.ModelViewSet):
    queryset = ClinicSpecialization.objects.all()
    serializer_class = ClinicSpecializationSerializer
    permission_classes = [AllowAny]  # IsAuthenticated
    authentication_classes = []

    def get_object(self):
        return get_object_or_404(ClinicSpecialization, pk=self.kwargs['pk'])

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'status': True,
            'message': 'List retrieved successfully',
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'status': True,
            'message': 'Record retrieved successfully',
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            clinic = serializer.validated_data['clinic']
            specialization_name = serializer.validated_data['specialization_name']
            existing = ClinicSpecialization.objects.filter(
                clinic=clinic,
                specialization_name__iexact=specialization_name
            ).first()
            if existing:
                existing_serializer = self.get_serializer(existing)
                return Response({
                    'status': True,
                    'message': 'Specialization already exists. Returning existing.',
                    'data': existing_serializer.data
                }, status=status.HTTP_200_OK)

            self.perform_create(serializer)
            return Response({
                'status': True,
                'message': 'Created successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)

        return Response({
            'status': False,
            'message': 'Validation failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        if serializer.is_valid():
            self.perform_update(serializer)
            return Response({
                'status': True,
                'message': 'Updated successfully',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'status': False,
            'message': 'Validation failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            self.perform_update(serializer)
            return Response({
                'status': True,
                'message': 'Patched successfully',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'status': False,
            'message': 'Validation failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            'status': True,
            'message': 'Deleted successfully',
            'data': {}
        }, status=status.HTTP_200_OK)

class ClinicScheduleViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    queryset = ClinicSchedule.objects.all()
    serializer_class = ClinicScheduleSerializer

class ClinicServiceViewSet(viewsets.ModelViewSet):
    queryset = ClinicService.objects.all()
    serializer_class = ClinicServiceSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_object(self):
        return ClinicService.objects.get(pk=self.kwargs['pk'])

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'status': True,
            'message': 'Clinic services list fetched successfully',
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'status': True,
            'message': 'Clinic service record fetched successfully',
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            clinic = serializer.validated_data['clinic']
            existing = ClinicService.objects.filter(clinic=clinic).first()
            if existing:
                existing_serializer = self.get_serializer(existing)
                return Response({
                    'status': True,
                    'message': 'Service already exists for this clinic. Returning existing.',
                    'data': existing_serializer.data
                }, status=status.HTTP_200_OK)
            self.perform_create(serializer)
            return Response({
                'status': True,
                'message': 'Clinic service created successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            'status': False,
            'message': 'Validation failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        if serializer.is_valid():
            self.perform_update(serializer)
            return Response({
                'status': True,
                'message': 'Clinic service updated successfully',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'status': False,
            'message': 'Validation failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            self.perform_update(serializer)
            return Response({
                'status': True,
                'message': 'Clinic service partially updated',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            'status': False,
            'message': 'Validation failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            'status': True,
            'message': 'Clinic service deleted successfully',
            'data': {}
        }, status=status.HTTP_200_OK)

class ClinicServiceListViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]
    serializer_class = ClinicServiceListSerializer

    def get_queryset(self):
        doctor = self.request.user.doctor  # OneToOneField from User
        return ClinicServiceList.objects.filter(clinic__in=doctor.clinics.all()).order_by('-updated_at')

    def create(self, request, *args, **kwargs):
        with transaction.atomic():
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            clinic = serializer.validated_data['clinic']
            service_name = serializer.validated_data['service_name']

            instance, created = ClinicServiceList.objects.update_or_create(
                clinic=clinic,
                service_name__iexact=service_name,
                defaults=serializer.validated_data
            )

            response_data = ClinicServiceListSerializer(instance).data
            return Response({
                "status": True,
                "message": "Service created" if created else "Service updated",
                "data": response_data
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        return self._custom_response(super().update(request, *args, **kwargs), "Service updated")

    def partial_update(self, request, *args, **kwargs):
        return self._custom_response(super().partial_update(request, *args, **kwargs), "Service partially updated")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({
            "status": True,
            "message": "Service deleted",
            "data": {}
        }, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            "status": True,
            "message": "Service fetched successfully",
            "data": serializer.data
        })

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "status": True,
            "message": "Service list fetched successfully",
            "data": serializer.data
        })

    def _custom_response(self, response, message):
        if response.status_code in [200, 201]:
            return Response({
                "status": True,
                "message": message,
                "data": response.data
            }, status=response.status_code)
        return response

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

    @transaction.atomic
    def put(self, request, clinic_id):
        return self._update_profile(request, clinic_id, partial=False)

    @transaction.atomic
    def patch(self, request, clinic_id):
        return self._update_profile(request, clinic_id, partial=True)

    def _update_profile(self, request, clinic_id, partial):
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "status": 404,
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Address
        address_data = request.data.get("address")
        if address_data:
            address_instance = ClinicAddress.objects.filter(clinic=clinic).first()
            address_data["clinic"] = clinic.id  # inject clinic manually
            serializer = ClinicAddressSerializer(
                instance=address_instance,
                data=address_data,
                partial=partial
            )
            if serializer.is_valid(raise_exception=True):
                serializer.save()

        # Specializations
        specializations = request.data.get("specializations")
        if specializations is not None:
            ClinicSpecialization.objects.filter(clinic=clinic).delete()
            for spec in specializations:
                spec["clinic"] = clinic.id
                serializer = ClinicSpecializationSerializer(data=spec)
                if serializer.is_valid(raise_exception=True):
                    serializer.save()

        # Services
        services_data = request.data.get("services")
        if services_data:
            service_instance = ClinicService.objects.filter(clinic=clinic).first()
            services_data["clinic"] = clinic.id
            serializer = ClinicServiceSerializer(
                instance=service_instance,
                data=services_data,
                partial=partial
            )
            if serializer.is_valid(raise_exception=True):
                serializer.save()

        # Schedule
        schedule_data = request.data.get("schedule")
        if schedule_data:
            schedule_instance = ClinicSchedule.objects.filter(clinic=clinic).first()
            schedule_data["clinic"] = clinic.id
            serializer = ClinicScheduleSerializer(
                instance=schedule_instance,
                data=schedule_data,
                partial=partial
            )
            if serializer.is_valid(raise_exception=True):
                serializer.save()

        # Service List
        service_list = request.data.get("service_list")
        if service_list is not None:
            ClinicServiceList.objects.filter(clinic=clinic).delete()
            for item in service_list:
                item["clinic"] = clinic.id
                serializer = ClinicServiceListSerializer(data=item)
                if serializer.is_valid(raise_exception=True):
                    serializer.save()

        return Response({
            "status": 200,
            "message": "Clinic profile updated successfully."
        }, status=status.HTTP_200_OK)
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