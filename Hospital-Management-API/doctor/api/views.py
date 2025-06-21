# Standard library imports
import logging
from django.contrib.auth import authenticate
from django.contrib.auth.models import Group
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django_ratelimit.decorators import ratelimit
# Third-party imports
from rest_framework import generics, status, viewsets,permissions
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, NotFound
from rest_framework.permissions import IsAuthenticated
from django.db import transaction


# Local application imports
from account.models import User
from account.permissions import IsDoctor
from helpdesk.models import HelpdeskClinicUser

from doctor.models import (
    doctor,DoctorAddress,Registration,GovernmentID,
    Education, Award, Certification, DoctorFeedback, DoctorService, DoctorSocialLink, Specialization,
    CustomSpecialization
    )
# Local module imports
from doctor.api.serializers import (
    DoctorRegistrationSerializer,
    DoctorProfileUpdateSerializer,
    DoctorSerializer,
    HelpdeskApprovalSerializer,
    PendingHelpdeskUserSerializer,
    ProfileSerializer,
    UserSerializer,
    DoctorAddressSerializer,
    RegistrationSerializer,
    GovernmentIDSerializer,
    EducationSerializer,
    CustomSpecializationSerializer,
    SpecializationSerializer,
    DoctorServiceSerializer,
    AwardSerializer,CertificationSerializer,
    DoctorDashboardSummarySerializer,
    RegistrationSerializer,
    DoctorProfilePhotoUploadSerializer,DoctorProfileSerializer,
)
from consultations.models import Consultation, PatientFeedback
from appointments.models import Appointment
from prescriptions.models import Prescription
from account.permissions import IsDoctor
from django.utils.timezone import now
from django.db.models import Avg, Sum, Count, Q
from django.db import transaction
logger = logging.getLogger(__name__)
from account.permissions import IsAdminUser, IsDoctor

class DoctorLoginView(APIView):
    """Custom JWT login for doctors only"""
    permission_classes=[]
    authentication_classes=[]
    def post(self, request ,*args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if not user:
            return Response({"message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.groups.filter(name='doctor').exists():
            return Response({"message": "You are not authorized to log in as a doctor"},
                            status=status.HTTP_403_FORBIDDEN)

        if not user.status:  # Assuming 'status' is the approval field
            return Response({"message": "Your account is not approved by admin yet!"},
                            status=status.HTTP_403_FORBIDDEN)
        try:
            doctor_instance = doctor.objects.get(user=user)
            doctor_id = doctor_instance.id
        except doctor.DoesNotExist:
            return Response({"message": "Doctor not found"}, status=status.HTTP_404_NOT_FOUND)

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            "id": user.id,
            "doctor_id": doctor_id,
            "username": user.username,
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
        }, status=status.HTTP_200_OK)

class DoctorProfileView(APIView):
    """"API endpoint for doctor profile view/update-- Only accessble by doctors will update profile data only"""

    permission_classes=[IsDoctor]

    def get(self, request, format=None):
        user = request.user
        profile = doctor.objects.filter(user=user).get()
        userSerializer = UserSerializer(user)
        profileSerializer = ProfileSerializer(profile)
        return Response({
            'user_data': userSerializer.data,
            'profile_data': profileSerializer.data
        }, status=status.HTTP_200_OK)

    def put(self, request, format=None):
        user = request.user
        profile = doctor.objects.filter(user=user).get()
        profileSerializer = ProfileSerializer(
            instance=profile, data=request.data.get('profile_data'), partial=True)
        if profileSerializer.is_valid():
            profileSerializer.save()
            userSerializer = UserSerializer(user)
            return Response({
                'user_data': userSerializer.data,
                'profile_data': profileSerializer.data
            }, status=status.HTTP_200_OK)
        return Response({
                'profile_data': profileSerializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, format=None):
        user = request.user
        profile = doctor.objects.filter(user=user).get()
        profile.delete()
        return Response({"message": "Doctor profile deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

class UserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        #serializer = UserSerializer(user)
        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        user = request.user
        #serializer = UserSerializer(user, data=request.data)
        serializer = UserSerializer(user, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        user = request.user
        user.delete()
        return Response({"message": "User deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

class DoctorRegistrationAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        serializer = DoctorRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            doctor_instance = serializer.save()
            # Add the user to the "doctor" group
            doctor_group, created = Group.objects.get_or_create(name="doctor")
            doctor_instance.user.groups.add(doctor_group)
            # Generate JWT tokens
            refresh = RefreshToken.for_user(doctor_instance.user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            return Response({
                "message": "Doctor registered successfully.",
                "doctor_id": str(doctor_instance.id),
                "access_token": access_token,
                "refresh_token": refresh_token
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DoctorDetailsAPIView(APIView):
    """
    API view to fetch doctor details for the authenticated user.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated,IsDoctor]
    def get(self, request):
        try:
            # Get the authenticated user
            user = request.user
            # Fetch the doctor instance associated with the authenticated user
            doctor_instance = doctor.objects.get(user=user)
            # Serialize the doctor details
            serializer = DoctorSerializer(doctor_instance)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        except doctor.DoesNotExist:
            return Response({"error": "Doctor details not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DoctorProfileUpdateAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request):
        try:
            user = request.user
            doctor_instance = doctor.objects.get(user=user)
            serializer = DoctorProfileUpdateSerializer(doctor_instance, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except doctor.DoesNotExist:
            return Response({"error": "Doctor profile not found"}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        user = request.user
        if hasattr(user, 'doctor'):
            return Response({"error": "Doctor profile already exists"}, status=status.HTTP_400_BAD_REQUEST)
        serializer = DoctorProfileUpdateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(user=user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        try:
            user = request.user
            doctor_instance = doctor.objects.get(user=user)
            serializer = DoctorProfileUpdateSerializer(doctor_instance, data=request.data, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except doctor.DoesNotExist:
            return Response({"error": "Doctor profile not found"}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request):
        try:
            user = request.user
            doctor_instance = doctor.objects.get(user=user)
            serializer = DoctorProfileUpdateSerializer(doctor_instance, data=request.data, partial=True, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except doctor.DoesNotExist:
            return Response({"error": "Doctor profile not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request):
        try:
            user = request.user
            doctor_instance = doctor.objects.get(user=user)
            doctor_instance.delete()
            return Response({"message": "Doctor profile deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
        except doctor.DoesNotExist:
            return Response({"error": "Doctor profile not found"}, status=status.HTTP_404_NOT_FOUND)
      
class DoctorTokenRefreshView(TokenRefreshView):
    """Refresh JWT access token"""
    pass

class DoctorLogoutView(APIView):
    """Logout doctor by blacklisting the refresh token"""
    permission_classes=[]
    authentication_classes=[]

    def post(self, request):
        try:
            refresh_token = request.data["refresh_token"]
            token = RefreshToken(refresh_token)
            token.blacklist()  # Blacklist token so it can't be reused
            return Response({"message": "Logout successful"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)

class PendingHelpdeskRequestsView(generics.ListAPIView):
    """API to list pending Helpdesk user requests for a doctor's associated clinics"""
    serializer_class = PendingHelpdeskUserSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated,IsDoctor]

    def get_queryset(self):
        """Fetch clinics associated with the doctor and return pending helpdesk users"""
        doctor = self.request.user.doctor  
        clinics = doctor.clinics.all()  # Get all clinics where doctor works
        return HelpdeskClinicUser.objects.filter(clinic__in=clinics, is_active=False)

class ApproveHelpdeskUserView(generics.UpdateAPIView):
    """API for doctors to approve or reject a helpdesk user"""
    serializer_class = HelpdeskApprovalSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated,IsDoctor]

    def get_object(self):
        """Ensure the doctor can only approve users from their associated clinics"""
        doctor = self.request.user.doctor
        helpdesk_user = get_object_or_404(HelpdeskClinicUser, id=self.kwargs["helpdesk_user_id"])

        if helpdesk_user.clinic not in doctor.clinics.all():
            raise PermissionDenied("You can only approve helpdesk users for your clinic.")

        return helpdesk_user

    def patch(self, request, *args, **kwargs):
        """Handle partial updates (approve/reject helpdesk user)"""
        helpdesk_user = self.get_object()
        serializer = self.get_serializer(helpdesk_user, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Helpdesk user updated successfully."}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Deactivate Helpdesk User (Set status=False)
class DeactivateHelpdeskUserView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated,IsDoctor]

    def patch(self, request, helpdesk_id):
        try:
            helpdesk_user = HelpdeskClinicUser.objects.get(id=helpdesk_id, clinic__doctors=request.user.doctor)
            helpdesk_user.status = False  # Set status to inactive
            helpdesk_user.user.status = False  # Set status to inactive
            helpdesk_user.user.is_active = False  # Set is_active to False
            helpdesk_user.user.save()
            helpdesk_user.save()
            return Response({"message": "Helpdesk user deactivated successfully."}, status=status.HTTP_200_OK)
        except HelpdeskClinicUser.DoesNotExist:
            return Response({"error": "Helpdesk user not found or unauthorized."}, status=status.HTTP_404_NOT_FOUND)

# Delete Helpdesk User
class DeleteHelpdeskUserView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated,IsDoctor]

    def delete(self, request, helpdesk_id):
        try:
            helpdesk_user = HelpdeskClinicUser.objects.get(id=helpdesk_id, clinic__doctors=request.user.doctor)
            helpdesk_user.user.delete()  # Deletes the associated User record
            helpdesk_user.delete()  # Deletes the HelpdeskClinicUser record
            return Response({"message": "Helpdesk user deleted successfully."}, status=status.HTTP_204_NO_CONTENT)
        except HelpdeskClinicUser.DoesNotExist:
            return Response({"error": "Helpdesk user not found or unauthorized."}, status=status.HTTP_404_NOT_FOUND)

class DoctorAddressViewSet(viewsets.ViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_object(self, doctor):
        try:
            return DoctorAddress.objects.get(doctor=doctor)
        except DoctorAddress.DoesNotExist:
            return None

    def list(self, request):
        address = self.get_object(request.user.doctor)
        if not address:
            return Response({"status": "error", "message": "Address not found"}, status=404)
        serializer = DoctorAddressSerializer(address)
        return Response({"status": "success", "data": serializer.data})

    @transaction.atomic
    def create(self, request):
        doctor = request.user.doctor
        if self.get_object(doctor):
            return Response({"status": "error", "message": "Address already exists"}, status=409)
        serializer = DoctorAddressSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(doctor=doctor)
            return Response({"status": "success", "message": "Address created", "data": serializer.data}, status=201)
        return Response({"status": "error", "message": "Validation failed", "errors": serializer.errors}, status=400)

    @transaction.atomic
    def update(self, request, pk=None):
        address = self.get_object(request.user.doctor)
        if not address:
            return Response({"status": "error", "message": "Address not found"}, status=404)
        serializer = DoctorAddressSerializer(address, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "success", "message": "Address updated", "data": serializer.data})
        return Response({"status": "error", "message": "Validation failed", "errors": serializer.errors}, status=400)

    @transaction.atomic
    def partial_update(self, request, pk=None):
        address = self.get_object(request.user.doctor)
        if not address:
            return Response({"status": "error", "message": "Address not found"}, status=404)
        serializer = DoctorAddressSerializer(address, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "success", "message": "Address partially updated", "data": serializer.data})
        return Response({"status": "error", "message": "Validation failed", "errors": serializer.errors}, status=400)

    @transaction.atomic
    def destroy(self, request, pk=None):
        address = self.get_object(request.user.doctor)
        if not address:
            return Response({"status": "error", "message": "Address not found"}, status=404)
        address.delete()
        return Response({"status": "success", "message": "Address deleted"}, status=204)
   
class RegistrationView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request):
        doctor = request.user.doctor
        try:
            registration = doctor.registration
            serializer = RegistrationSerializer(registration)
            return Response({
                "status": "success",
                "message": "Registration data fetched",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        except Registration.DoesNotExist:
            raise NotFound("Registration not found")

    @transaction.atomic
    def post(self, request):
        doctor = request.user.doctor
        if hasattr(doctor, 'registration'):
            return Response({
                "status": "error",
                "message": "Registration already exists"
            }, status=status.HTTP_409_CONFLICT)

        #serializer = RegistrationSerializer(data=request.data)
        serializer = RegistrationSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(doctor=doctor)
            return Response({
                "status": "success",
                "message": "Registration created",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response({
            "status": "error",
            "message": "Validation failed",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def put(self, request):
        doctor = request.user.doctor
        try:
            registration = doctor.registration
        except Registration.DoesNotExist:
            raise NotFound("Registration not found")

        #serializer = RegistrationSerializer(registration, data=request.data)
        serializer = RegistrationSerializer(registration, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "success",
                "message": "Registration updated",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            "status": "error",
            "message": "Validation failed",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def patch(self, request):
        doctor = request.user.doctor
        try:
            registration = doctor.registration
        except Registration.DoesNotExist:
            raise NotFound("Registration not found")

        #serializer = RegistrationSerializer(registration, data=request.data, partial=True)
        serializer = RegistrationSerializer(registration, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "success",
                "message": "Registration partially updated",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            "status": "error",
            "message": "Validation failed",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def delete(self, request):
        doctor = request.user.doctor
        try:
            registration = doctor.registration
            registration.delete()
            return Response({
                "status": "success",
                "message": "Registration deleted"
            }, status=status.HTTP_204_NO_CONTENT)
        except Registration.DoesNotExist:
            raise NotFound("Registration not found")

class GovernmentIDViewSet(viewsets.ViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_object(self, doctor):
        try:
            return doctor.government_ids
        except GovernmentID.DoesNotExist:
            raise NotFound("Government ID not found.")

    def create(self, request):
        doctor = request.user.doctor
        if hasattr(doctor, 'government_ids'):
            return Response(
                {"status": "error", "message": "Government ID already exists."},
                status=status.HTTP_409_CONFLICT
            )

        serializer = GovernmentIDSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            serializer.save(doctor=doctor)

        return Response(
            {"status": "success", "message": "Government ID added successfully.", "data": serializer.data},
            status=status.HTTP_201_CREATED
        )

    def retrieve(self, request):
        doctor = request.user.doctor
        government_id = self.get_object(doctor)
        serializer = GovernmentIDSerializer(government_id)
        return Response(
            {"status": "success", "data": serializer.data},
            status=status.HTTP_200_OK
        )

    def update(self, request):
        doctor = request.user.doctor
        government_id = self.get_object(doctor)

        serializer = GovernmentIDSerializer(government_id, data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            serializer.save()

        return Response(
            {"status": "success", "message": "Government ID updated successfully.", "data": serializer.data},
            status=status.HTTP_200_OK
        )

    def partial_update(self, request):
        doctor = request.user.doctor
        government_id = self.get_object(doctor)

        serializer = GovernmentIDSerializer(government_id, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            serializer.save()

        return Response(
            {"status": "success", "message": "Government ID updated successfully.", "data": serializer.data},
            status=status.HTTP_200_OK
        )

    def destroy(self, request):
        doctor = request.user.doctor
        government_id = self.get_object(doctor)
        government_id.delete()

        return Response(
            {"status": "success", "message": "Government ID deleted successfully."},
            status=status.HTTP_204_NO_CONTENT
        )

class EducationViewSet(viewsets.ModelViewSet):
    serializer_class = EducationSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_queryset(self):
        return Education.objects.filter(doctor=self.request.user.doctor)

    def perform_create(self, serializer):
        serializer.save(doctor=self.request.user.doctor)

    def perform_update(self, serializer):
        serializer.save()


class SpecializationViewSet(viewsets.ModelViewSet):
    serializer_class = SpecializationSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_queryset(self):
        return Specialization.objects.filter(doctor=self.request.user.doctor).order_by('-created_at')

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({
            "status": "success",
            "message": "Specialization created successfully",
            "data": serializer.data
        }, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({
            "status": "success",
            "message": "Specialization updated successfully",
            "data": serializer.data
        })

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            "status": "success",
            "message": "Specialization deleted successfully"
        }, status=status.HTTP_204_NO_CONTENT)

class CustomSpecializationViewSet(viewsets.ModelViewSet):
    queryset = CustomSpecialization.objects.all().order_by('name')
    serializer_class = CustomSpecializationSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "status": "success",
            "message": "Custom specializations fetched successfully",
            "data": serializer.data
        })

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response({
            "status": "success",
            "message": "Custom specialization created successfully",
            "data": self.get_serializer(instance).data
        }, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response({
            "status": "success",
            "message": "Custom specialization updated successfully",
            "data": self.get_serializer(instance).data
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({
            "status": "success",
            "message": "Custom specialization deleted successfully"
        }, status=status.HTTP_204_NO_CONTENT)

class DoctorServiceViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorServiceSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_queryset(self):
        return DoctorService.objects.filter(doctor=self.request.user.doctor).order_by('-created_at')

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(doctor=request.user.doctor)
        return Response({
            "status": "success",
            "message": "Service created successfully",
            "data": self.get_serializer(instance).data
        }, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            "status": "success",
            "message": "Service updated successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({
            "status": "success",
            "message": "Service deleted successfully"
        }, status=status.HTTP_204_NO_CONTENT)


class AwardViewSet(viewsets.ModelViewSet):
    serializer_class = AwardSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_queryset(self):
        return Award.objects.filter(doctor=self.request.user.doctor).order_by('-date_awarded')

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(doctor=request.user.doctor)
        return Response({
            "status": "success",
            "message": "Award created successfully",
            "data": self.get_serializer(instance).data
        }, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={'request': request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response({
            "status": "success",
            "message": "Award updated successfully",
            "data": serializer.data
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({
            "status": "success",
            "message": "Award deleted successfully"
        }, status=status.HTTP_204_NO_CONTENT)

class CertificationViewSet(viewsets.ModelViewSet):
    serializer_class = CertificationSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_queryset(self):
        return Certification.objects.filter(doctor=self.request.user.doctor).order_by('-date_of_issue')

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(doctor=request.user.doctor)
        return Response({
            "status": "success",
            "message": "Certification created successfully",
            "data": self.get_serializer(instance).data
        }, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={'request': request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response({
            "status": "success",
            "message": "Certification updated successfully",
            "data": serializer.data
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({
            "status": "success",
            "message": "Certification deleted successfully"
        }, status=status.HTTP_204_NO_CONTENT)
    
class DoctorDashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]
    authentication_classes = [JWTAuthentication]
    def get(self, request):
        doctor = request.user.doctor
        today = now().date()

        try:
            with transaction.atomic():
                total_patients_today = Appointment.objects.filter(
                    doctor=doctor,
                    appointment_date=today
                ).values('patient_profile').distinct().count()

                total_consultations = Consultation.objects.filter(
                    doctor=doctor,
                    started_at__date=today,
                    is_finalized=True
                ).count()

                pending_followups = Appointment.objects.filter(
                    doctor=doctor,
                    appointment_date=today,
                    appointment_type='follow_up',
                    status='scheduled'
                ).count()

                consultations_today = Consultation.objects.filter(
                    doctor=doctor,
                    started_at__date=today,
                    ended_at__isnull=False
                )

                total_duration_minutes = sum([
                    (c.ended_at - c.started_at).total_seconds() / 60.0
                    for c in consultations_today if c.ended_at and c.started_at
                ])

                average_consultation_time = (
                    total_duration_minutes / consultations_today.count()
                    if consultations_today.count() > 0 else 0
                )

                upcoming_appointments = Appointment.objects.filter(
                    doctor=doctor,
                    appointment_date=today,
                    appointment_time__gt=now().time(),
                    status='scheduled'
                ).count()

                new_patients_today = Appointment.objects.filter(
                    doctor=doctor,
                    appointment_date=today,
                    appointment_type='new'
                ).values('patient_profile').distinct().count()

                cancelled_appointments_today = Appointment.objects.filter(
                    doctor=doctor,
                    appointment_date=today,
                    status='cancelled'
                ).count()

                patients_waiting_now = Appointment.objects.filter(
                    doctor=doctor,
                    appointment_date=today,
                    status='scheduled'
                ).count()

                total_revenue_today = Appointment.objects.filter(
                    doctor=doctor,
                    appointment_date=today,
                    status='completed'
                ).aggregate(revenue=Sum('consultation_fee'))['revenue'] or 0

                last_consultation = consultations_today.order_by('-ended_at').first()

                average_rating = PatientFeedback.objects.filter(
                    consultation__doctor=doctor,
                    created_at__date=today
                ).aggregate(avg=Avg('rating'))['avg'] or 0

                prescriptions_today = Prescription.objects.filter(
                    consultation__doctor=doctor,
                    created_at__date=today
                ).count()

                data = {
                    "total_patients_today": total_patients_today,
                    "total_consultations": total_consultations,
                    "pending_followups": pending_followups,
                    "average_consultation_time_minutes": round(average_consultation_time, 2),
                    "upcoming_appointments": upcoming_appointments,
                    "new_patients_today": new_patients_today,
                    "cancelled_appointments_today": cancelled_appointments_today,
                    "patients_waiting_now": patients_waiting_now,
                    "total_consultation_time_minutes": round(total_duration_minutes, 2),
                    "total_revenue_today": float(total_revenue_today),
                    "last_consultation_end_time": last_consultation.ended_at if last_consultation else None,
                    "average_patient_rating": round(average_rating, 2),
                    "total_prescriptions_issued": prescriptions_today
                }

                serializer = DoctorDashboardSummarySerializer(data)
                return Response({
                    "status": "success",
                    "message": "Dashboard summary fetched successfully",
                    "data": serializer.data
                }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching dashboard summary: {str(e)}")
            return Response({
                "status": "error",
                "message": "Failed to fetch dashboard summary",
                "data": None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RegistrationViewSet(viewsets.ModelViewSet):
    serializer_class = RegistrationSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']  # restrict to allowed methods

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Registration.objects.all()
        return Registration.objects.filter(doctor=user.doctor)

    def get_object(self):
        obj = super().get_object()
        if obj.doctor != self.request.user.doctor and not self.request.user.is_superuser:
            raise PermissionDenied("You do not have permission to access this registration.")
        return obj

    def perform_create(self, serializer):
        instance = serializer.save(doctor=self.request.user.doctor)
        logger.info(f"Registration created by doctor {self.request.user.doctor.id}: {instance.id}")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=False, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        logger.info(f"Registration updated by doctor {self.request.user.doctor.id}: {instance.id}")
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        logger.info(f"Registration partially updated by doctor {self.request.user.doctor.id}: {instance.id}")
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        logger.info(f"Registration deleted by doctor {self.request.user.doctor.id}: {instance.id}")
        return Response({"detail": "Medical license deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

    def perform_destroy(self, instance):
        instance.delete()

class UploadDoctorPhotoView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def patch(self, request):
        doctor_instance = request.user.doctor
        serializer = DoctorProfilePhotoUploadSerializer(
            doctor_instance, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "success",
                "message": "Profile photo updated successfully.",
                "data": {
                    "doctor_id": str(doctor_instance.id),
                    "photo_url": request.build_absolute_uri(doctor_instance.photo.url)
                }
            }, status=status.HTTP_200_OK)
        return Response({
            "status": "error",
            "message": "Failed to upload photo.",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class DoctorProfileView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request):
        doctor_instance = request.user.doctor
        serializer = DoctorProfileSerializer(doctor_instance, context={'request': request})
        return Response({
            "status": "success",
            "message": "Doctor profile fetched successfully.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)