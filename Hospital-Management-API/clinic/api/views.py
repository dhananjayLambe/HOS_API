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
from account.permissions import IsClinicAdmin, IsDoctorOrClinicAdminOrSuperuser, IsDoctorOrHelpdeskOrClinicAdminOrSuperuser

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
    ClinicProfileSerializer,
    ClinicHolidaySerializer,
)

from clinic.models import (
    Clinic,
    ClinicAddress,
    ClinicProfile,
    ClinicService,
    ClinicServiceList,
    ClinicSchedule,
    ClinicSpecialization,
    ClinicAdminProfile,
    ClinicHoliday,
)
from account.permissions import IsDoctor
logger = logging.getLogger(__name__)
from clinic.utils import api_response

from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import viewsets, mixins, filters
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from clinic.models import Clinic
from clinic.api.serializers import ClinicListFrontendSerializer
from clinic.pagination import ClinicPageNumberPagination

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



class ClinicListViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    print("ClinicListViewSet")
    """
    Endpoint: GET /api/clinics/
    Returns paginated clinics in frontend-friendly format.
    """
    serializer_class = ClinicListFrontendSerializer
    permission_classes = [AllowAny]
    pagination_class = ClinicPageNumberPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["address__city", "address__state", "is_approved"]
    search_fields = ["name", "address__city", "address__state"]
    ordering_fields = ["name", "created_at"]
    ordering = ["created_at"]

    def get_queryset(self):
        qs = Clinic.objects.select_related("address").all()

        # Only approved by default
        # if self.request.query_params.get("is_approved") is None:
        #     qs = qs.filter(is_approved=True)

        return qs

    # Cache list endpoint for 5 minutes
    @method_decorator(cache_page(60 * 5))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


# ============================================================================
# Production-Ready Clinic Information APIs (Following Requirement Document)
# ============================================================================

class ClinicCreateAPIView(APIView):
    """
    POST /api/clinics/
    Create a new clinic
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctorOrClinicAdminOrSuperuser]

    @transaction.atomic
    def post(self, request):
        serializer = ClinicSerializer(data=request.data)
        if serializer.is_valid():
            clinic = serializer.save()
            return Response({
                "success": True,
                "message": "Clinic created successfully",
                "data": ClinicSerializer(clinic).data
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class ClinicDetailAPIView(APIView):
    """
    GET /api/clinics/{clinic_id}/
    Get clinic details
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdeskOrClinicAdminOrSuperuser]

    def get(self, request, clinic_id):
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "success": False,
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = ClinicSerializer(clinic)
        return Response({
            "success": True,
            "message": "Clinic retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)


class ClinicRetrieveUpdateDeleteAPIView(APIView):
    """
    Combined view for GET, PUT, PATCH, DELETE /api/clinics/{clinic_id}/
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    # Immutable fields that cannot be updated
    IMMUTABLE_FIELDS = ['registration_number', 'status', 'is_approved']

    def check_permissions(self, request):
        """Check permissions based on HTTP method"""
        if request.method == 'GET':
            permission = IsDoctorOrHelpdeskOrClinicAdminOrSuperuser()
        else:
            permission = IsDoctorOrClinicAdminOrSuperuser()
        
        if not permission.has_permission(request, self):
            self.permission_denied(
                request, message=getattr(permission, 'message', None)
            )

    def get(self, request, clinic_id):
        """GET /api/clinics/{clinic_id}/"""
        self.check_permissions(request)
        
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "success": False,
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = ClinicSerializer(clinic)
        return Response({
            "success": True,
            "message": "Clinic retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def _check_immutable_fields(self, request_data):
        """Check if immutable fields are being updated"""
        immutable_in_request = [field for field in self.IMMUTABLE_FIELDS if field in request_data]
        if immutable_in_request:
            return {
                "success": False,
                "errors": {
                    field: [f"{field} cannot be updated."] for field in immutable_in_request
                }
            }
        return None

    @transaction.atomic
    def put(self, request, clinic_id):
        """PUT /api/clinics/{clinic_id}/"""
        self.check_permissions(request)
        
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "success": False,
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Check for immutable fields
        immutable_error = self._check_immutable_fields(request.data)
        if immutable_error:
            return Response(immutable_error, status=status.HTTP_403_FORBIDDEN)

        serializer = ClinicSerializer(clinic, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "message": "Clinic updated successfully",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def patch(self, request, clinic_id):
        """PATCH /api/clinics/{clinic_id}/"""
        self.check_permissions(request)
        
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "success": False,
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Check for immutable fields
        immutable_error = self._check_immutable_fields(request.data)
        if immutable_error:
            return Response(immutable_error, status=status.HTTP_403_FORBIDDEN)

        serializer = ClinicSerializer(clinic, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "message": "Clinic updated successfully",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def delete(self, request, clinic_id):
        """DELETE /api/clinics/{clinic_id}/"""
        self.check_permissions(request)
        
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "success": False,
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Check for dependencies
        from doctor.models import doctor
        from appointments.models import Appointment
        
        has_doctors = clinic.doctors.exists()
        has_appointments = clinic.appointments.exists()
        
        if has_doctors or has_appointments:
            reasons = []
            if has_doctors:
                reasons.append("doctors")
            if has_appointments:
                reasons.append("appointments")
            
            return Response({
                "success": False,
                "detail": f"Clinic cannot be deleted as active records exist: {', '.join(reasons)}."
            }, status=status.HTTP_400_BAD_REQUEST)

        clinic.delete()
        return Response({
            "success": True,
            "message": "Clinic deleted successfully"
        }, status=status.HTTP_200_OK)




class ClinicAddressUpsertAPIView(APIView):
    """
    GET  /api/clinics/{clinic_id}/address/
    POST /api/clinics/{clinic_id}/address/
    PUT  /api/clinics/{clinic_id}/address/
    Get, create or update clinic address (upsert)
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctorOrClinicAdminOrSuperuser]

    def get(self, request, clinic_id):
        """GET /api/clinics/{clinic_id}/address/"""
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "success": False,
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Get address if exists
        try:
            address = clinic.address
            serializer = ClinicAddressSerializer(address)
            return Response({
                "success": True,
                "message": "Address retrieved successfully",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        except ClinicAddress.DoesNotExist:
            return Response({
                "success": False,
                "message": "Address not found for this clinic."
            }, status=status.HTTP_404_NOT_FOUND)

    @transaction.atomic
    def post(self, request, clinic_id):
        return self._upsert_address(request, clinic_id)

    @transaction.atomic
    def put(self, request, clinic_id):
        return self._upsert_address(request, clinic_id)

    def _upsert_address(self, request, clinic_id):
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "success": False,
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Get or create address
        address, created = ClinicAddress.objects.get_or_create(
            clinic=clinic,
            defaults={}
        )

        # Add clinic to request data if not present
        data = request.data.copy()
        data['clinic'] = clinic.id

        serializer = ClinicAddressSerializer(address, data=data, partial=not created)
        if serializer.is_valid():
            serializer.save()
            message = "Address created successfully" if created else "Address updated successfully"
            return Response({
                "success": True,
                "message": message,
                "data": serializer.data
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        
        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class ClinicProfileDetailUpdateAPIView(APIView):
    """
    GET /api/clinics/{clinic_id}/profile/ - Get clinic profile
    PATCH /api/clinics/{clinic_id}/profile/ - Update clinic profile
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def check_permissions(self, request):
        """Check permissions based on HTTP method"""
        if request.method == 'GET':
            permission = IsDoctorOrHelpdeskOrClinicAdminOrSuperuser()
        else:
            permission = IsDoctorOrClinicAdminOrSuperuser()
        
        if not permission.has_permission(request, self):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to perform this action.")

    def get(self, request, clinic_id):
        """GET /api/clinics/{clinic_id}/profile/"""
        self.check_permissions(request)
        
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "success": False,
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)

        profile, created = ClinicProfile.objects.get_or_create(clinic=clinic)
        serializer = ClinicProfileSerializer(profile)
        
        return Response({
            "success": True,
            "message": "Profile retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def patch(self, request, clinic_id):
        """PATCH /api/clinics/{clinic_id}/profile/"""
        self.check_permissions(request)
        
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "success": False,
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)

        profile, created = ClinicProfile.objects.get_or_create(clinic=clinic)
        
        serializer = ClinicProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            message = "Profile created successfully" if created else "Profile updated successfully"
            return Response({
                "success": True,
                "message": message,
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)




class ClinicScheduleListCreateAPIView(APIView):
    """
    GET /api/clinics/{clinic_id}/schedules/ - Get weekly schedule
    POST /api/clinics/{clinic_id}/schedules/ - Create/update day schedule
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def check_permissions(self, request):
        """Check permissions based on HTTP method"""
        if request.method == 'GET':
            permission = IsDoctorOrHelpdeskOrClinicAdminOrSuperuser()
        else:
            permission = IsDoctorOrClinicAdminOrSuperuser()
        
        if not permission.has_permission(request, self):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to perform this action.")

    def get(self, request, clinic_id):
        """GET /api/clinics/{clinic_id}/schedules/"""
        self.check_permissions(request)
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "success": False,
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Get all schedules for this clinic
        schedules = ClinicSchedule.objects.filter(clinic=clinic).order_by('day_of_week')
        serializer = ClinicScheduleSerializer(schedules, many=True)
        
        # If no schedules exist, return empty list with all 7 days structure
        days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        existing_days = {s['day_of_week'] for s in serializer.data}
        
        # Add missing days with default closed status
        result = list(serializer.data)
        for day in days_of_week:
            if day not in existing_days:
                result.append({
                    'day_of_week': day,
                    'is_closed': True,
                    'open_time': None,
                    'close_time': None,
                    'is_active': False
                })
        
        # Sort by day of week
        day_order = {day: idx for idx, day in enumerate(days_of_week)}
        result.sort(key=lambda x: day_order.get(x['day_of_week'], 99))
        
        return Response({
            "success": True,
            "message": "Weekly schedule retrieved successfully",
            "data": result
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def post(self, request, clinic_id):
        """POST /api/clinics/{clinic_id}/schedules/"""
        self.check_permissions(request)
        
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "success": False,
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()
        data['clinic'] = clinic.id

        # Check if schedule for this day already exists
        day_of_week = data.get('day_of_week')
        if day_of_week:
            schedule, created = ClinicSchedule.objects.get_or_create(
                clinic=clinic,
                day_of_week=day_of_week,
                defaults={}
            )
            
            serializer = ClinicScheduleSerializer(schedule, data=data, partial=not created)
            if serializer.is_valid():
                serializer.save()
                message = "Schedule created successfully" if created else "Schedule updated successfully"
                return Response({
                    "success": True,
                    "message": message,
                    "data": serializer.data
                }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        else:
            serializer = ClinicScheduleSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "success": True,
                    "message": "Schedule created successfully",
                    "data": serializer.data
                }, status=status.HTTP_201_CREATED)

        return Response({
            "success": False,
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class ClinicAdminMyClinicAPIView(APIView):
    """
    GET /api/clinic/clinic-admin/my-clinic/
    Get the clinic information for the logged-in clinic admin
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsClinicAdmin]

    def get(self, request):
        """Get clinic details for the authenticated clinic admin"""
        try:
            clinic_admin_profile = request.user.clinic_admin_profile
            clinic = clinic_admin_profile.clinic
        except ClinicAdminProfile.DoesNotExist:
            return Response({
                "success": False,
                "message": "Clinic admin profile not found."
            }, status=status.HTTP_404_NOT_FOUND)
        except AttributeError:
            return Response({
                "success": False,
                "message": "User does not have a clinic admin profile."
            }, status=status.HTTP_404_NOT_FOUND)

        # Serialize clinic with related data
        serializer = ClinicSerializer(clinic)
        
        # Get related data
        response_data = serializer.data
        
        # Add address if exists
        try:
            address = clinic.address
            address_serializer = ClinicAddressSerializer(address)
            response_data['address'] = address_serializer.data
        except ClinicAddress.DoesNotExist:
            response_data['address'] = None
        
        # Add profile if exists
        try:
            profile = clinic.clinicprofile
            profile_serializer = ClinicProfileSerializer(profile)
            response_data['profile'] = profile_serializer.data
        except ClinicProfile.DoesNotExist:
            response_data['profile'] = None
        
        # Add schedules
        schedules = ClinicSchedule.objects.filter(clinic=clinic).order_by('day_of_week')
        schedule_serializer = ClinicScheduleSerializer(schedules, many=True)
        response_data['schedules'] = schedule_serializer.data
        
        return Response({
            "success": True,
            "message": "Clinic information retrieved successfully",
            "data": response_data
        }, status=status.HTTP_200_OK)


# ============================================================================
# Clinic Holidays API
# ============================================================================

def _check_clinic_access(request, clinic):
    """
    Helper function to check if user has access to the clinic.
    Returns (has_access, error_response) tuple.
    """
    user = request.user
    
    # Superuser always has access
    if user.is_superuser:
        return True, None
    
    # Check if user is clinic admin of this clinic
    if hasattr(user, 'clinic_admin_profile'):
        if user.clinic_admin_profile.clinic == clinic:
            return True, None
    
    # Check if user is doctor associated with this clinic
    if hasattr(user, 'doctor'):
        if clinic in user.doctor.clinics.all():
            return True, None
    
    # Check if user is helpdesk with access to this clinic
    if hasattr(user, 'helpdesk'):
        if clinic in user.helpdesk.clinics.all():
            return True, None
    
    return False, Response({
        "status": "error",
        "message": "You do not have permission to access this clinic."
    }, status=status.HTTP_403_FORBIDDEN)


class ClinicHolidayListCreateAPIView(APIView):
    """
    GET  /api/clinics/{clinic_id}/holidays/ - List holidays
    POST /api/clinics/{clinic_id}/holidays/ - Create holiday
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def check_permissions(self, request):
        """Check permissions based on HTTP method"""
        if request.method == 'GET':
            permission = IsDoctorOrHelpdeskOrClinicAdminOrSuperuser()
        else:
            permission = IsDoctorOrClinicAdminOrSuperuser()
        
        if not permission.has_permission(request, self):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to perform this action.")

    def get(self, request, clinic_id):
        """GET /api/clinics/{clinic_id}/holidays/"""
        self.check_permissions(request)
        
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Check clinic access
        has_access, error_response = _check_clinic_access(request, clinic)
        if not has_access:
            return error_response

        # Get query parameters for filtering
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        is_active_param = request.query_params.get('is_active')

        # Build queryset
        queryset = ClinicHoliday.objects.filter(clinic=clinic)

        # Apply filters
        if from_date:
            queryset = queryset.filter(end_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(start_date__lte=to_date)
        if is_active_param is not None:
            is_active = is_active_param.lower() == 'true'
            queryset = queryset.filter(is_active=is_active)

        # Order by start_date
        queryset = queryset.order_by('start_date')

        serializer = ClinicHolidaySerializer(queryset, many=True)
        return Response({
            "status": "success",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def post(self, request, clinic_id):
        """POST /api/clinics/{clinic_id}/holidays/"""
        self.check_permissions(request)
        
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Check clinic access
        has_access, error_response = _check_clinic_access(request, clinic)
        if not has_access:
            return error_response

        # Add clinic to request data
        data = request.data.copy()
        data['clinic'] = clinic.id

        serializer = ClinicHolidaySerializer(data=data, context={'request': request})
        if serializer.is_valid():
            holiday = serializer.save()
            return Response({
                "status": "success",
                "message": "Clinic holiday created successfully.",
                "data": {
                    "id": str(holiday.id),
                    "title": holiday.title
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            "status": "error",
            "message": "Validation failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class ClinicHolidayRetrieveUpdateDeleteAPIView(APIView):
    """
    GET  /api/clinics/{clinic_id}/holidays/{holiday_id}/ - Retrieve holiday
    PUT  /api/clinics/{clinic_id}/holidays/{holiday_id}/ - Full update
    PATCH /api/clinics/{clinic_id}/holidays/{holiday_id}/ - Partial update
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def check_permissions(self, request):
        """Check permissions based on HTTP method"""
        if request.method == 'GET':
            permission = IsDoctorOrHelpdeskOrClinicAdminOrSuperuser()
        else:
            permission = IsDoctorOrClinicAdminOrSuperuser()
        
        if not permission.has_permission(request, self):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to perform this action.")

    def get(self, request, clinic_id, holiday_id):
        """GET /api/clinics/{clinic_id}/holidays/{holiday_id}/"""
        self.check_permissions(request)
        
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Check clinic access
        has_access, error_response = _check_clinic_access(request, clinic)
        if not has_access:
            return error_response

        try:
            holiday = ClinicHoliday.objects.get(id=holiday_id, clinic=clinic)
        except ClinicHoliday.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Holiday not found."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = ClinicHolidaySerializer(holiday)
        return Response({
            "status": "success",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def put(self, request, clinic_id, holiday_id):
        """PUT /api/clinics/{clinic_id}/holidays/{holiday_id}/"""
        self.check_permissions(request)
        
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Check clinic access
        has_access, error_response = _check_clinic_access(request, clinic)
        if not has_access:
            return error_response

        try:
            holiday = ClinicHoliday.objects.get(id=holiday_id, clinic=clinic)
        except ClinicHoliday.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Holiday not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Add clinic to request data to ensure it doesn't change
        data = request.data.copy()
        data['clinic'] = clinic.id

        serializer = ClinicHolidaySerializer(holiday, data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "success",
                "message": "Holiday updated successfully.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response({
            "status": "error",
            "message": "Validation failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def patch(self, request, clinic_id, holiday_id):
        """PATCH /api/clinics/{clinic_id}/holidays/{holiday_id}/"""
        self.check_permissions(request)
        
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Check clinic access
        has_access, error_response = _check_clinic_access(request, clinic)
        if not has_access:
            return error_response

        try:
            holiday = ClinicHoliday.objects.get(id=holiday_id, clinic=clinic)
        except ClinicHoliday.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Holiday not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Add clinic to request data to ensure it doesn't change
        data = request.data.copy()
        data['clinic'] = clinic.id

        serializer = ClinicHolidaySerializer(holiday, data=data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "success",
                "message": "Holiday updated successfully.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response({
            "status": "error",
            "message": "Validation failed.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class ClinicHolidayDeactivateAPIView(APIView):
    """
    PATCH /api/clinics/{clinic_id}/holidays/{holiday_id}/deactivate/
    Soft delete (deactivate) a holiday
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctorOrClinicAdminOrSuperuser]

    @transaction.atomic
    def patch(self, request, clinic_id, holiday_id):
        """PATCH /api/clinics/{clinic_id}/holidays/{holiday_id}/deactivate/"""
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Clinic not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Check clinic access
        has_access, error_response = _check_clinic_access(request, clinic)
        if not has_access:
            return error_response

        try:
            holiday = ClinicHoliday.objects.get(id=holiday_id, clinic=clinic)
        except ClinicHoliday.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Holiday not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Deactivate the holiday
        holiday.is_active = False
        holiday.save()

        return Response({
            "status": "success",
            "message": "Clinic holiday deactivated successfully."
        }, status=status.HTTP_200_OK)