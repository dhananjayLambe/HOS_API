# Standard library imports
import logging
from datetime import date, datetime, timedelta
from django.utils import timezone
# Django imports
from django.contrib.auth import authenticate
from django.contrib.auth.models import Group
from django.core.cache import cache
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import (
    Q, F, Avg, Sum, Value, FloatField, ExpressionWrapper
)
from django.db.models.functions import (
    Coalesce, Radians, Sin, Cos, ACos, Concat
)
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from rest_framework.generics import GenericAPIView

# Third-party imports
from rest_framework import generics, status, viewsets, permissions
from rest_framework.exceptions import NotFound
from rest_framework import serializers
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

# Local application imports
from account.models import User
from account.permissions import IsAdminUser, IsDoctor
from helpdesk.models import HelpdeskClinicUser
from clinic.models import Clinic
from doctor.models import (
    doctor, DoctorAddress, Registration, GovernmentID, Education,
    Award, Certification, DoctorFeedback, DoctorService,
    DoctorSocialLink, Specialization, CustomSpecialization, KYCStatus,
    DoctorFeeStructure,FollowUpPolicy,DoctorAvailability,DoctorLeave,
    DoctorOPDStatus,CancellationPolicy,DoctorBankDetails,DoctorSchedulingRules,
)
from doctor.api.serializers import (
    DoctorRegistrationSerializer, DoctorProfileUpdateSerializer, DoctorSerializer,
    HelpdeskApprovalSerializer, PendingHelpdeskUserSerializer, ProfileSerializer,
    UserSerializer, DoctorAddressSerializer, RegistrationSerializer,
    GovernmentIDSerializer, EducationSerializer, CustomSpecializationSerializer,
    SpecializationSerializer, DoctorServiceSerializer, AwardSerializer,
    CertificationSerializer, DoctorDashboardSummarySerializer,
    EducationCertificateUploadSerializer, DoctorProfilePhotoUploadSerializer,
    DoctorProfileSerializer, RegistrationDocumentUploadSerializer,
    GovernmentIDUploadSerializer, KYCStatusSerializer, KYCVerifySerializer,
    DigitalSignatureUploadSerializer,
    DoctorSearchSerializer,DoctorFeeStructureSerializer,FollowUpPolicySerializer,
    DoctorAvailabilitySerializer,DoctorLeaveSerializer,DoctorOPDStatusSerializer,
    DoctorPhase1Serializer,DoctorFullProfileSerializer,CancellationPolicySerializer,
    DoctorBankDetailsSerializer,DoctorSchedulingRulesSerializer,
)
from consultations.models import Consultation, PatientFeedback
from appointments.models import Appointment
from prescriptions.models import Prescription
from account.permissions import IsDoctorOrHelpdesk,IsDoctorOrHelpdeskOrPatient
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import  filters
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
# Constants
CACHE_TIMEOUT = 300  # 5 minutes

# Logger
logger = logging.getLogger(__name__)

class DoctorOnboardingPhase1View(GenericAPIView):
    """
    POST: Phase 1 onboarding. Creates User (OTP-based), doctor profile, GovernmentID and Registration.
    Note: OTP verification should be performed before calling this endpoint in your flow.
    """
    serializer_class = DoctorPhase1Serializer
    permission_classes = [permissions.AllowAny]  # OTP auth should be enforced at the router or middleware

    def post(self, request, *args, **kwargs):
        try:
            print("I am in DOCTOR phase 1 onboarding")
            #print("Request data:", request.data)
            serializer = self.get_serializer(data=request.data, context={"request": request})
            #print("Serializer:", serializer.data)
            #print("serializer.is_valid()",serializer.is_valid())
            if not serializer.is_valid():
                print("Validation errors:", serializer.errors)
                #return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            serializer.is_valid(raise_exception=True)
            with transaction.atomic():
                doctor_obj = serializer.save()
            #print("Doctor object:", doctor_obj)
            return Response(self.get_serializer(doctor_obj).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print("Exception:", e)
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

#Determines if the user is new or existing.

class CheckUserStatusView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        phone_number = request.data.get("phone_number")

        if not phone_number:
            return Response(
                {"error": "Phone number is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(username=phone_number)

            # ✅ Check if user is in doctor group
            if user.groups.filter(name="doctor").exists():
                return Response(
                    {
                        "role": "doctor",
                        "mobile": phone_number,
                        "exists": True,
                        "status": "existing_user",
                    },
                    status=status.HTTP_200_OK,
                )
            else:
                return Response(
                    {
                        "role": None,
                        "mobile": phone_number,
                        "exists": False,
                        "status": "not_a_doctor",
                        "message": "Mobile number registered but not as doctor",
                    },
                    status=status.HTTP_403_FORBIDDEN,  # Forbidden
                )

        except User.DoesNotExist:
            return Response(
                {
                    "status": "new_user",
                    "exists": False,
                    "mobile": phone_number,
                    "message": "Mobile number not registered",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

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

class DoctorFullProfileAPIView(APIView):
    """
    Fetch and update full doctor profile based on JWT token.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    throttle_classes = []  # Disable throttling for profile endpoint

    def get(self, request, *args, **kwargs):
        """
        Return complete doctor profile for the authenticated doctor.
        """
        user = request.user

        # Defensive check — ensure the logged-in user is mapped to a doctor
        try:
            doctor_obj = (
                doctor.objects
                .select_related("user", "address", "registration", "government_ids")
                .prefetch_related(
                    "education",
                    "specializations__custom_specialization",
                    "services",
                    "awards",
                    "certifications",
                    "clinics",
                )
                .get(user=user)
            )
        except doctor.DoesNotExist:
            return Response(
                {"detail": "Doctor profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.error(f"Error fetching doctor profile: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while fetching doctor profile", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Serialize complete profile
        try:
            serializer = DoctorFullProfileSerializer(doctor_obj, context={"request": request})
            return Response(
                {"doctor_profile": serializer.data},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Error serializing doctor profile: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while serializing doctor profile", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def patch(self, request, *args, **kwargs):
        """
        Update doctor profile fields (partial update).
        """
        user = request.user

        try:
            doctor_instance = doctor.objects.get(user=user)
        except doctor.DoesNotExist:
            return Response(
                {"error": "Doctor profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Log incoming data for debugging
        print(f"[DEBUG] PATCH request data: {request.data}")
        print(f"[DEBUG] Current doctor gender before update: {doctor_instance.gender}")

        # Use DoctorProfileUpdateSerializer for updates
        serializer = DoctorProfileUpdateSerializer(
            doctor_instance, 
            data=request.data, 
            partial=True, 
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            
            # Refresh from database to get updated values
            doctor_instance.refresh_from_db()
            print(f"[DEBUG] Doctor gender after save: {doctor_instance.gender}")
            print(f"[DEBUG] Doctor dob after save: {doctor_instance.dob}")
            print(f"[DEBUG] Doctor about after save: {doctor_instance.about}")
            
            # Return updated profile using DoctorFullProfileSerializer
            updated_serializer = DoctorFullProfileSerializer(doctor_instance, context={"request": request})
            return Response(
                {"doctor_profile": updated_serializer.data},
                status=status.HTTP_200_OK
            )
        
        print(f"[DEBUG] Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
  
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
        try:
            doctor_instance = request.user.doctor
        except AttributeError:
            return Response({"status": "error", "message": "Doctor profile not found"}, status=404)
        
        address = self.get_object(doctor_instance)
        if not address:
            return Response({"status": "error", "message": "Address not found"}, status=404)
        
        try:
            serializer = DoctorAddressSerializer(address)
            return Response({"status": "success", "data": serializer.data})
        except Exception as e:
            logger.error(f"Error serializing address: {str(e)}")
            return Response({"status": "error", "message": "Failed to retrieve address data"}, status=500)

    @transaction.atomic
    def create(self, request):
        try:
            doctor = request.user.doctor
        except AttributeError:
            return Response({"status": "error", "message": "Doctor profile not found"}, status=404)
        
        if self.get_object(doctor):
            return Response({"status": "error", "message": "Address already exists"}, status=409)
        serializer = DoctorAddressSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(doctor=doctor)
            return Response({"status": "success", "message": "Address created", "data": serializer.data}, status=201)
        return Response({"status": "error", "message": "Validation failed", "errors": serializer.errors}, status=400)

    @action(detail=False, methods=['put', 'patch'], url_path='', url_name='update-address')
    @transaction.atomic
    def update_address(self, request):
        """Handle both PUT and PATCH requests for updating address"""
        try:
            doctor_instance = request.user.doctor
        except AttributeError:
            return Response({"status": "error", "message": "Doctor profile not found"}, status=404)
        
        address = self.get_object(doctor_instance)
        if not address:
            return Response({"status": "error", "message": "Address not found"}, status=404)
        
        # Use partial=True for PATCH, full update for PUT
        is_partial = request.method == 'PATCH'
        
        try:
            serializer = DoctorAddressSerializer(address, data=request.data, partial=is_partial)
            if serializer.is_valid():
                serializer.save()
                message = "Address partially updated" if is_partial else "Address updated"
                return Response({"status": "success", "message": message, "data": serializer.data})
            return Response({"status": "error", "message": "Validation failed", "errors": serializer.errors}, status=400)
        except Exception as e:
            logger.error(f"Error updating address: {str(e)}")
            return Response({"status": "error", "message": f"Failed to update address: {str(e)}"}, status=500)

    @transaction.atomic
    def update(self, request, pk=None):
        """Handle PUT requests for updating address (full update)"""
        try:
            doctor_instance = request.user.doctor
        except AttributeError:
            return Response({"status": "error", "message": "Doctor profile not found"}, status=404)
        
        address = self.get_object(doctor_instance)
        if not address:
            return Response({"status": "error", "message": "Address not found"}, status=404)
        
        try:
            serializer = DoctorAddressSerializer(address, data=request.data, partial=False)
            if serializer.is_valid():
                serializer.save()
                return Response({"status": "success", "message": "Address updated", "data": serializer.data})
            return Response({"status": "error", "message": "Validation failed", "errors": serializer.errors}, status=400)
        except Exception as e:
            logger.error(f"Error updating address: {str(e)}")
            return Response({"status": "error", "message": f"Failed to update address: {str(e)}"}, status=500)

    @transaction.atomic
    def partial_update(self, request, pk=None):
        """Handle PATCH requests for updating address (partial update)"""
        try:
            doctor_instance = request.user.doctor
        except AttributeError:
            return Response({"status": "error", "message": "Doctor profile not found"}, status=404)
        
        address = self.get_object(doctor_instance)
        if not address:
            return Response({"status": "error", "message": "Address not found"}, status=404)
        
        try:
            serializer = DoctorAddressSerializer(address, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({"status": "success", "message": "Address partially updated", "data": serializer.data})
            return Response({"status": "error", "message": "Validation failed", "errors": serializer.errors}, status=400)
        except Exception as e:
            logger.error(f"Error updating address: {str(e)}")
            return Response({"status": "error", "message": f"Failed to update address: {str(e)}"}, status=500)

    @transaction.atomic
    def destroy(self, request, pk=None):
        try:
            doctor_instance = request.user.doctor
        except AttributeError:
            return Response({"status": "error", "message": "Doctor profile not found"}, status=404)
        
        address = self.get_object(doctor_instance)
        if not address:
            return Response({"status": "error", "message": "Address not found"}, status=404)
        
        try:
            address.delete()
            return Response({"status": "success", "message": "Address deleted"}, status=204)
        except Exception as e:
            logger.error(f"Error deleting address: {str(e)}")
            return Response({"status": "error", "message": f"Failed to delete address: {str(e)}"}, status=500)
   
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

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        doctor_instance = request.user.doctor
        qualification = request.data.get('qualification')
        institute = request.data.get('institute')
        year_of_completion = request.data.get('year_of_completion')
        
        # Check for duplicate education entry
        if qualification and institute and year_of_completion:
            existing = Education.objects.filter(
                doctor=doctor_instance,
                qualification=qualification,
                institute=institute,
                year_of_completion=year_of_completion
            ).first()
            
            if existing:
                # Update existing education entry instead of creating duplicate
                serializer = self.get_serializer(existing, data=request.data, partial=True, context={'request': request})
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)
                return Response({
                    "status": "success",
                    "message": "Education entry updated successfully",
                    "data": serializer.data
                }, status=status.HTTP_200_OK)
        
        # Create new education entry
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({
            "status": "success",
            "message": "Education entry created successfully",
            "data": serializer.data
        }, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save(doctor=self.request.user.doctor)

    def perform_update(self, serializer):
        serializer.save()


class SpecializationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing doctor specializations.
    
    Supports unified API approach:
    - Accept 'specialization_name' (string) to automatically handle predefined or custom specializations
    - Or use 'specialization' (code) and 'custom_specialization' (ID) for backward compatibility
    
    Example requests:
    1. Unified approach (recommended):
       POST /api/doctor/specializations/
       {
         "specialization_name": "Cardiologist",  // or any custom name
         "is_primary": true
       }
    
    2. Predefined specialization:
       POST /api/doctor/specializations/
       {
         "specialization": "CL",
         "is_primary": true
       }
    
    3. Custom specialization:
       POST /api/doctor/specializations/
       {
         "custom_specialization": "<uuid>",
         "is_primary": false
       }
    """
    serializer_class = SpecializationSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_queryset(self):
        return Specialization.objects.filter(doctor=self.request.user.doctor).order_by('-created_at')

    def get_specialization_name(self, specialization_instance):
        """
        Helper method to get the specialization name string from a Specialization instance.
        Returns the display name for predefined specializations or the custom specialization name.
        """
        if specialization_instance.specialization:
            return specialization_instance.get_specialization_display()
        elif specialization_instance.custom_specialization:
            return specialization_instance.custom_specialization.name
        return None

    def update_doctor_primary_specialization(self, doctor_instance, specialization_instance):
        """
        Update the doctor's primary_specialization field based on the specialization instance.
        If the specialization is marked as primary, update the doctor's field.
        If not primary, check if there are other primary specializations, otherwise clear it.
        """
        if specialization_instance.is_primary:
            # Get the specialization name and update doctor's primary_specialization
            specialization_name = self.get_specialization_name(specialization_instance)
            if specialization_name:
                doctor_instance.primary_specialization = specialization_name
                doctor_instance.save(update_fields=['primary_specialization'])
        else:
            # Check if there are other primary specializations
            other_primary = Specialization.objects.filter(
                doctor=doctor_instance,
                is_primary=True
            ).exclude(id=specialization_instance.id).first()
            
            if not other_primary:
                # No other primary specialization exists, clear the doctor's primary_specialization
                doctor_instance.primary_specialization = "General"
                doctor_instance.save(update_fields=['primary_specialization'])

    def list(self, request, *args, **kwargs):
        """List all specializations for the authenticated doctor"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "status": "success",
            "message": "Specializations retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        """Retrieve a specific specialization"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            "status": "success",
            "message": "Specialization retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Create a new specialization.
        
        Handles three input modes:
        1. specialization_name (string) - Unified approach (recommended)
        2. specialization (code) - Predefined specialization
        3. custom_specialization (ID) - Existing custom specialization
        """
        doctor_instance = request.user.doctor
        specialization_name = request.data.get('specialization_name')
        specialization = request.data.get('specialization')
        custom_specialization_id = request.data.get('custom_specialization')
        
        # Unified approach: if specialization_name is provided, use it
        if specialization_name:
            from doctor.models import SPECIALIZATION_CHOICES, CustomSpecialization
            
            specialization_name = specialization_name.strip()
            
            # Check if it matches predefined specialization
            matched_code = None
            for code, display_name in SPECIALIZATION_CHOICES:
                if display_name.lower() == specialization_name.lower():
                    matched_code = code
                    break
            
            if matched_code:
                # Check for duplicate predefined specialization
                existing = Specialization.objects.filter(
                    doctor=doctor_instance,
                    specialization=matched_code
                ).first()
                if existing:
                    return Response({
                        "status": "error",
                        "message": "Specialization already exists for this doctor.",
                        "data": self.get_serializer(existing).data
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # It's a custom specialization - find or create
                custom_spec, created = CustomSpecialization.objects.get_or_create(
                    name__iexact=specialization_name,
                    defaults={'name': specialization_name}
                )
                
                # Check for duplicate custom specialization
                existing = Specialization.objects.filter(
                    doctor=doctor_instance,
                    custom_specialization=custom_spec
                ).first()
                if existing:
                    return Response({
                        "status": "error",
                        "message": "Custom specialization already exists for this doctor.",
                        "data": self.get_serializer(existing).data
                    }, status=status.HTTP_400_BAD_REQUEST)
        
        # Backward compatibility: check for duplicates with old approach
        elif specialization:
            existing = Specialization.objects.filter(
                doctor=doctor_instance,
                specialization=specialization
            ).first()
            if existing:
                return Response({
                    "status": "error",
                    "message": "Specialization already exists for this doctor.",
                    "data": self.get_serializer(existing).data
                }, status=status.HTTP_400_BAD_REQUEST)
        elif custom_specialization_id:
            existing = Specialization.objects.filter(
                doctor=doctor_instance,
                custom_specialization_id=custom_specialization_id
            ).first()
            if existing:
                # Update existing specialization instead of creating duplicate
                serializer = self.get_serializer(existing, data=request.data, partial=True, context={'request': request})
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)
                
                # Refresh instance to get updated data
                existing.refresh_from_db()
                
                # Handle primary specialization logic
                is_primary = request.data.get('is_primary')
                if is_primary is not None:
                    if is_primary:
                        # Set all other specializations to non-primary
                        Specialization.objects.filter(
                            doctor=doctor_instance
                        ).exclude(id=existing.id).update(is_primary=False)
                
                # Update doctor's primary_specialization field
                self.update_doctor_primary_specialization(doctor_instance, existing)
                
                return Response({
                    "status": "success",
                    "message": "Specialization updated successfully",
                    "data": self.get_serializer(existing).data
                }, status=status.HTTP_200_OK)
        else:
            return Response({
                "status": "error",
                "message": "Either specialization_name, specialization, or custom_specialization must be provided."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create new specialization
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        
        # Handle primary specialization logic
        is_primary = request.data.get('is_primary', False)
        if is_primary:
            # Set all other specializations to non-primary
            Specialization.objects.filter(
                doctor=doctor_instance
            ).exclude(id=instance.id).update(is_primary=False)
        
        # Update doctor's primary_specialization field
        self.update_doctor_primary_specialization(doctor_instance, instance)
        
        return Response({
            "status": "success",
            "message": "Specialization created successfully",
            "data": self.get_serializer(instance).data
        }, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """
        Update an existing specialization.
        
        Supports updating via specialization_name (unified approach) or 
        traditional fields (specialization/custom_specialization).
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # If specialization_name is provided, handle it
        specialization_name = request.data.get('specialization_name')
        if specialization_name:
            from doctor.models import SPECIALIZATION_CHOICES, CustomSpecialization
            
            specialization_name = specialization_name.strip()
            
            # Check if it matches predefined specialization
            matched_code = None
            for code, display_name in SPECIALIZATION_CHOICES:
                if display_name.lower() == specialization_name.lower():
                    matched_code = code
                    break
            
            if matched_code:
                # Check if another specialization with this code already exists
                existing = Specialization.objects.filter(
                    doctor=request.user.doctor,
                    specialization=matched_code
                ).exclude(id=instance.id).first()
                if existing:
                    return Response({
                        "status": "error",
                        "message": "Another specialization with this name already exists.",
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # It's a custom specialization - find or create
                custom_spec, created = CustomSpecialization.objects.get_or_create(
                    name__iexact=specialization_name,
                    defaults={'name': specialization_name}
                )
                
                # Check if another specialization with this custom spec already exists
                existing = Specialization.objects.filter(
                    doctor=request.user.doctor,
                    custom_specialization=custom_spec
                ).exclude(id=instance.id).first()
                if existing:
                    return Response({
                        "status": "error",
                        "message": "Another specialization with this name already exists.",
                    }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Refresh instance to get updated data
        instance.refresh_from_db()
        
        # Handle primary specialization logic
        is_primary = request.data.get('is_primary')
        if is_primary is not None:
            if is_primary:
                # Set all other specializations to non-primary
                Specialization.objects.filter(
                    doctor=request.user.doctor
                ).exclude(id=instance.id).update(is_primary=False)
        
        # Update doctor's primary_specialization field
        self.update_doctor_primary_specialization(request.user.doctor, instance)
        
        return Response({
            "status": "success",
            "message": "Specialization updated successfully",
            "data": self.get_serializer(instance).data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """Delete a specialization"""
        instance = self.get_object()
        doctor_instance = request.user.doctor
        was_primary = instance.is_primary
        
        self.perform_destroy(instance)
        
        # If the deleted specialization was primary, update doctor's primary_specialization
        if was_primary:
            # Check if there are other primary specializations
            other_primary = Specialization.objects.filter(
                doctor=doctor_instance,
                is_primary=True
            ).first()
            
            if other_primary:
                # Update to the next primary specialization
                specialization_name = self.get_specialization_name(other_primary)
                if specialization_name:
                    doctor_instance.primary_specialization = specialization_name
                    doctor_instance.save(update_fields=['primary_specialization'])
            else:
                # No other primary specialization exists, reset to default
                doctor_instance.primary_specialization = "General"
                doctor_instance.save(update_fields=['primary_specialization'])
        
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
        name = request.data.get('name', '').strip()
        
        # Check if custom specialization with this name already exists
        existing = CustomSpecialization.objects.filter(name__iexact=name).first()
        
        if existing:
            # Return existing specialization instead of error
            return Response({
                "status": "success",
                "message": "Custom specialization already exists. Returning existing.",
                "data": self.get_serializer(existing).data
            }, status=status.HTTP_200_OK)
        
        # Create new specialization
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
        doctor_instance = request.user.doctor
        title = request.data.get('title')
        issued_by = request.data.get('issued_by')
        date_of_issue = request.data.get('date_of_issue')
        
        # Check for duplicate certification entry
        if title and issued_by and date_of_issue:
            existing = Certification.objects.filter(
                doctor=doctor_instance,
                title__iexact=title,
                issued_by__iexact=issued_by,
                date_of_issue=date_of_issue
            ).first()
            
            if existing:
                # Update existing certification instead of creating duplicate
                serializer = self.get_serializer(existing, data=request.data, partial=True, context={'request': request})
                serializer.is_valid(raise_exception=True)
                instance = serializer.save()
                return Response({
                    "status": "success",
                    "message": "Certification updated successfully",
                    "data": self.get_serializer(instance).data
                }, status=status.HTTP_200_OK)
        
        # Create new certification
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

class UploadRegistrationCertificateView(APIView):
    permission_classes = [IsAuthenticated, IsDoctor]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request):
        try:
            doctor_instance = request.user.doctor
        except doctor.DoesNotExist:
            return Response({"error": "Doctor profile not found."}, status=status.HTTP_404_NOT_FOUND)

        registration, _ = Registration.objects.get_or_create(doctor=doctor_instance)
        serializer = RegistrationDocumentUploadSerializer(registration, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "success",
                "message": "Registration document uploaded successfully.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        return Response({
            "status": "error",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class UploadEducationCertificateView(APIView):
    permission_classes = [IsAuthenticated, IsDoctor]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request, *args, **kwargs):
        try:
            doctor_instance = request.user.doctor
        except doctor.DoesNotExist:
            return Response({"error": "Doctor profile not found."}, status=status.HTTP_404_NOT_FOUND)

        qualification = request.data.get('qualification')
        institute = request.data.get('institute')
        year = request.data.get('year_of_completion')

        if not qualification or not institute or not year:
            return Response({"error": "qualification, institute, and year_of_completion are required."}, status=400)

        try:
            education = Education.objects.get(
                doctor=doctor_instance,
                qualification=qualification,
                institute=institute,
                year_of_completion=year
            )
        except Education.DoesNotExist:
            return Response({"error": "Education record not found."}, status=404)

        serializer = EducationCertificateUploadSerializer(education, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "success",
                "message": "Education certificate uploaded successfully.",
                "data": serializer.data
            }, status=200)

        return Response({"status": "error", "errors": serializer.errors}, status=400)

class UploadGovernmentIDView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def patch(self, request):
        doctor = request.user.doctor
        try:
            gov_id = doctor.government_ids
        except GovernmentID.DoesNotExist:
            return Response({
                "error": "Government ID record not found."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = GovernmentIDUploadSerializer(gov_id, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "success",
                "message": "Government ID updated.",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        return Response({
            "status": "error",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class DoctorKYCStatusView(APIView):
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request):
        user = request.user

        try:
            doc = user.doctor
        except doctor.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Doctor profile not found."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = KYCStatusSerializer(doc)
        return Response({
            "status": "success",
            "message": "KYC status fetched successfully.",
            "data": serializer.data
        }, status=status.HTTP_200_OK)


class KYCVerifyView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, doctor_id):
        try:
            doctor_obj = doctor.objects.get(id=doctor_id)
            kyc_status, _ = KYCStatus.objects.get_or_create(doctor=doctor_obj)
        except doctor.DoesNotExist:
            return Response({"error": "Doctor not found."}, status=404)

        serializer = KYCVerifySerializer(instance=kyc_status, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "success",
                "message": "KYC verification updated successfully.",
                "data": KYCVerifySerializer(instance=kyc_status).data
            })
        return Response({
            "status": "error",
            "message": "Validation failed",
            "errors": serializer.errors
        }, status=400)

class UploadDigitalSignatureView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request):
        print("UploadDigitalSignatureView request received")
        doctor = request.user.doctor
        try:
            kyc_status, _ = KYCStatus.objects.get_or_create(doctor=doctor)
            print(f"KYC Status retrieved: {kyc_status.id}, Doctor: {doctor.id}")
        except Exception as e:
            logger.error(f"Failed to get or create KYC status: {str(e)}")
            return Response({
                "status": "error",
                "message": f"Failed to get or create KYC status: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Check if file is in request
        if 'digital_signature' not in request.FILES:
            return Response({
                "status": "error",
                "message": "No file provided in request"
            }, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['digital_signature']
        print(f"File received: {file.name}, Size: {file.size}, Content type: {file.content_type}")

        # Use serializer for validation and file upload (same pattern as PAN/Aadhaar)
        serializer = DigitalSignatureUploadSerializer(kyc_status, data=request.data, partial=True)
        if serializer.is_valid():
            instance = serializer.save()
            print(f"File saved. Digital signature path: {instance.digital_signature.name if instance.digital_signature else 'None'}")
            print(f"Digital signature URL: {instance.digital_signature.url if instance.digital_signature else 'None'}")
            
            # Refresh from DB to ensure we have the latest data
            instance.refresh_from_db()
            
            return Response({
                "status": "success",
                "message": "Digital signature uploaded successfully.",
                "data": {
                    "digital_signature": instance.digital_signature.url if instance.digital_signature else None,
                    "digital_signature_path": instance.digital_signature.name if instance.digital_signature else None
                }
            }, status=status.HTTP_200_OK)
        
        logger.error(f"Serializer validation failed: {serializer.errors}")
        return Response({
            "status": "error",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class DoctorSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("query", "").strip().lower()
        experience_min = request.query_params.get("min_experience")
        experience_max = request.query_params.get("max_experience")
        cost_min = request.query_params.get("min_cost")
        cost_max = request.query_params.get("max_cost")
        distance_limit = request.query_params.get("distance")  # in KM
        ordering = request.query_params.get("ordering")  # cost_asc, cost_desc, experience_asc, experience_desc, distance

        # Static user location (in real case, get from frontend or user profile)
        user_lat = 17.6840
        user_lon = 74.0080

        cache_key = f"doctor_search:{query}:{experience_min}:{experience_max}:{cost_min}:{cost_max}:{distance_limit}:{ordering}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response({"status": "success", "data": cached_data}, status=status.HTTP_200_OK)

        queryset = doctor.objects.select_related("user", "address").prefetch_related("clinics", "specializations", "services")

        if query:
            queryset = queryset.annotate(
                full_name=Concat(F("user__first_name"), Value(" "), F("user__last_name"))
            ).filter(
                Q(user__first_name__icontains=query) |
                Q(user__last_name__icontains=query) |
                Q(full_name__icontains=query) |
                Q(about__icontains=query) |
                Q(clinics__name__icontains=query) |
                Q(specializations__specialization__icontains=query) |
                Q(specializations__custom_specialization__name__icontains=query)
            ).distinct()

        # Experience filters
        if experience_min:
            queryset = queryset.filter(years_of_experience__gte=experience_min)
        if experience_max:
            queryset = queryset.filter(years_of_experience__lte=experience_max)

        # Cost (average service fee)
        queryset = queryset.annotate(
            avg_fee=Coalesce(Avg("services__fee"), 0.0, output_field=FloatField())
        )
        if cost_min:
            queryset = queryset.filter(avg_fee__gte=cost_min)
        if cost_max:
            queryset = queryset.filter(avg_fee__lte=cost_max)

        # Distance (Haversine)
        queryset = queryset.annotate(
            distance=ExpressionWrapper(
                6371 * ACos(
                    Cos(Radians(Value(user_lat))) * Cos(Radians(F("address__latitude"))) *
                    Cos(Radians(F("address__longitude")) - Radians(Value(user_lon))) +
                    Sin(Radians(Value(user_lat))) * Sin(Radians(F("address__latitude")))
                ),
                output_field=FloatField()
            )
        )
        if distance_limit:
            queryset = queryset.filter(distance__lte=float(distance_limit))

        # Sorting
        if ordering == "cost_asc":
            queryset = queryset.order_by("avg_fee")
        elif ordering == "cost_desc":
            queryset = queryset.order_by("-avg_fee")
        elif ordering == "experience_asc":
            queryset = queryset.order_by("years_of_experience")
        elif ordering == "experience_desc":
            queryset = queryset.order_by("-years_of_experience")
        elif ordering == "distance":
            queryset = queryset.order_by("distance")

        serializer = DoctorSearchSerializer(queryset, many=True, context={"request": request})
        cache.set(cache_key, serializer.data, timeout=300)
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

# Pagination
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class DoctorFeeStructureViewSet(viewsets.ModelViewSet):
    queryset = DoctorFeeStructure.objects.select_related('doctor', 'clinic').all()
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]
    serializer_class = DoctorFeeStructureSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['doctor', 'clinic', 'is_active']
    search_fields = ['doctor__user__first_name', 'doctor__user__last_name', 'clinic__name']
    ordering_fields = ['created_at', 'updated_at', 'first_time_consultation_fee', 'follow_up_fee']
    ordering = ['-created_at']
    
    def get_queryset(self):
        print("DoctorFeeStructureViewSet initialized")
        """Filter queryset based on user role"""
        user = self.request.user
        base_qs = DoctorFeeStructure.objects.select_related('doctor', 'clinic').all()
        
        if hasattr(user, 'doctor'):
            # Doctor can only see their own fee structures
            return base_qs.filter(doctor=user.doctor)
        elif hasattr(user, 'helpdesk'):
            # Helpdesk can see fee structures for their clinics
            return base_qs.filter(clinic__in=user.helpdesk.clinics.all())
        
        return base_qs.none()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create or update a doctor fee structure (upsert)"""
        # Ensure doctor can only create fee structures for themselves
        user = request.user
        doctor_id = request.data.get('doctor')
        clinic_id = request.data.get('clinic')
        
        if hasattr(user, 'doctor'):
            if doctor_id and str(user.doctor.id) != str(doctor_id):
                return Response({
                    "status": "error",
                    "message": "You can only create fee structures for yourself."
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if a fee structure already exists for this doctor and clinic
        if doctor_id and clinic_id:
            try:
                existing_instance = DoctorFeeStructure.objects.get(
                    doctor_id=doctor_id,
                    clinic_id=clinic_id
                )
                # Update existing instance
                update_serializer = self.get_serializer(
                    existing_instance, 
                    data=request.data, 
                    partial=True,
                    context={'request': request}
                )
                update_serializer.is_valid(raise_exception=True)
                instance = update_serializer.save()
                return Response({
                    "status": "success",
                    "message": "Fee structure updated successfully",
                    "data": self.get_serializer(instance).data
                }, status=status.HTTP_200_OK)
            except DoctorFeeStructure.DoesNotExist:
                # Create new instance
                serializer = self.get_serializer(data=request.data, context={'request': request})
                serializer.is_valid(raise_exception=True)
                instance = serializer.save()
                return Response({
                    "status": "success",
                    "message": "Fee structure created successfully",
                    "data": self.get_serializer(instance).data
                }, status=status.HTTP_201_CREATED)
        else:
            # If doctor_id or clinic_id not provided, create new instance
            serializer = self.get_serializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            return Response({
                "status": "success",
                "message": "Fee structure created successfully",
                "data": self.get_serializer(instance).data
            }, status=status.HTTP_201_CREATED)

    def list(self, request, *args, **kwargs):
        """List all fee structures for the authenticated user"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                "status": "success",
                "message": "Fee structures retrieved successfully",
                "data": serializer.data
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "status": "success",
            "message": "Fee structures retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        """Retrieve a specific fee structure"""
        try:
            instance = self.get_object()
        except Exception as e:
            logger.error(f"Error retrieving fee structure: {str(e)}")
            return Response({
                "status": "error",
                "message": "Fee structure not found or you do not have permission to access it."
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.get_serializer(instance)
        return Response({
            "status": "success",
            "message": "Fee structure retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Update an existing fee structure (full update)"""
        partial = kwargs.pop('partial', False)
        
        try:
            instance = self.get_object()
        except Exception as e:
            return Response({
                "status": "error",
                "message": "Fee structure not found or you do not have permission to access it."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Ensure user can only update their own fee structures
        user = request.user
        try:
            if hasattr(user, 'doctor'):
                # Check if doctor relationship exists
                try:
                    user_doctor = user.doctor
                except (doctor.DoesNotExist, AttributeError):
                    return Response({
                        "status": "error",
                        "message": "Doctor information not available. Please refresh the page."
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if instance.doctor != user_doctor:
                    return Response({
                        "status": "error",
                        "message": "You do not have permission to update this fee structure."
                    }, status=status.HTTP_403_FORBIDDEN)
        except AttributeError:
            return Response({
                "status": "error",
                "message": "Doctor information not available. Please refresh the page."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={'request': request})
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Validation failed",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save()
        
        return Response({
            "status": "success",
            "message": "Fee structure updated successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def get_object_by_doctor_clinic(self, doctor_id, clinic_id, user):
        """Get fee structure by doctor_id and clinic_id with permission check"""
        try:
            instance = DoctorFeeStructure.objects.select_related('doctor', 'clinic').get(
                doctor_id=doctor_id,
                clinic_id=clinic_id
            )
            
            # Ensure user can only access their own fee structures
            if hasattr(user, 'doctor'):
                try:
                    user_doctor = user.doctor
                    if instance.doctor != user_doctor:
                        return None, Response({
                            "status": "error",
                            "message": "You do not have permission to update this fee structure."
                        }, status=status.HTTP_403_FORBIDDEN)
                except (doctor.DoesNotExist, AttributeError):
                    return None, Response({
                        "status": "error",
                        "message": "Doctor information not available. Please refresh the page."
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            return instance, None
        except DoctorFeeStructure.DoesNotExist:
            return None, Response({
                "status": "error",
                "message": "Fee structure not found for the given doctor and clinic."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving fee structure: {str(e)}")
            return None, Response({
                "status": "error",
                "message": "An error occurred while retrieving the fee structure."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_object(self):
        """Override to add better error handling"""
        try:
            return super().get_object()
        except Exception as e:
            # Log the error for debugging
            logger.error(f"Error retrieving fee structure: {str(e)}")
            raise

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        """Partially update an existing fee structure using doctor_id and clinic_id"""
        doctor_id = request.data.get('doctor_id') or request.query_params.get('doctor_id')
        clinic_id = request.data.get('clinic_id') or request.query_params.get('clinic_id')
        
        # If doctor_id and clinic_id are provided, use them to find the instance
        if doctor_id and clinic_id:
            instance, error_response = self.get_object_by_doctor_clinic(doctor_id, clinic_id, request.user)
            if error_response:
                return error_response
        else:
            # Fall back to using the URL parameter (pk)
            try:
                instance = self.get_object()
            except Exception as e:
                return Response({
                    "status": "error",
                    "message": "Fee structure not found. Please provide doctor_id and clinic_id, or use the instance ID in the URL."
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Ensure user can only update their own fee structures
        user = request.user
        try:
            if hasattr(user, 'doctor'):
                try:
                    user_doctor = user.doctor
                except (doctor.DoesNotExist, AttributeError):
                    return Response({
                        "status": "error",
                        "message": "Doctor information not available. Please refresh the page."
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if instance.doctor != user_doctor:
                    return Response({
                        "status": "error",
                        "message": "You do not have permission to update this fee structure."
                    }, status=status.HTTP_403_FORBIDDEN)
        except AttributeError:
            return Response({
                "status": "error",
                "message": "Doctor information not available. Please refresh the page."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Remove doctor_id and clinic_id from request data if present (they're only for lookup)
        update_data = request.data.copy()
        if 'doctor_id' in update_data:
            del update_data['doctor_id']
        if 'clinic_id' in update_data:
            del update_data['clinic_id']
        
        serializer = self.get_serializer(instance, data=update_data, partial=True, context={'request': request})
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Validation failed",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save()
        
        return Response({
            "status": "success",
            "message": "Fee structure updated successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """Delete a fee structure"""
        instance = self.get_object()
        
        # Ensure user can only delete their own fee structures
        user = request.user
        if hasattr(user, 'doctor') and instance.doctor != user.doctor:
            return Response({
                "status": "error",
                "message": "You do not have permission to delete this fee structure."
            }, status=status.HTTP_403_FORBIDDEN)
        
        self.perform_destroy(instance)
        return Response({
            "status": "success",
            "message": "Fee structure deleted successfully"
        }, status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['patch'], url_path='update')
    @transaction.atomic
    def update_by_doctor_clinic(self, request):
        """Update fee structure using doctor_id and clinic_id in request body (PATCH on base URL)"""
        doctor_id = request.data.get('doctor_id') or request.query_params.get('doctor_id')
        clinic_id = request.data.get('clinic_id') or request.query_params.get('clinic_id')
        
        if not doctor_id or not clinic_id:
            return Response({
                "status": "error",
                "message": "Both doctor_id and clinic_id are required in request body or query parameters"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        instance, error_response = self.get_object_by_doctor_clinic(doctor_id, clinic_id, request.user)
        if error_response:
            return error_response
        
        # Remove doctor_id and clinic_id from request data if present (they're only for lookup)
        update_data = request.data.copy()
        if 'doctor_id' in update_data:
            del update_data['doctor_id']
        if 'clinic_id' in update_data:
            del update_data['clinic_id']
        
        serializer = self.get_serializer(instance, data=update_data, partial=True, context={'request': request})
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Validation failed",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save()
        
        return Response({
            "status": "success",
            "message": "Fee structure updated successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='by-doctor-clinic')
    def retrieve_by_doctor_clinic(self, request):
        """Retrieve a single fee structure by doctor_id and clinic_id"""
        doctor_id = request.query_params.get('doctor_id')
        clinic_id = request.query_params.get('clinic_id')
        
        if not doctor_id or not clinic_id:
            return Response({
                "status": "error",
                "message": "Both doctor_id and clinic_id are required"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Apply user-based filtering first
        queryset = self.filter_queryset(self.get_queryset())
        
        try:
            instance = queryset.get(doctor_id=doctor_id, clinic_id=clinic_id)
            serializer = self.get_serializer(instance)
            return Response({
                "status": "success",
                "message": "Fee structure retrieved successfully",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        except DoctorFeeStructure.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Fee structure not found for the given doctor and clinic."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving fee structure: {str(e)}")
            return Response({
                "status": "error",
                "message": "An error occurred while retrieving the fee structure."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FollowUpPolicyViewSet(viewsets.ModelViewSet):
    queryset = FollowUpPolicy.objects.select_related('doctor', 'clinic').all()
    serializer_class = FollowUpPolicySerializer
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['doctor', 'clinic', 'allow_free_follow_up', 'allow_online_follow_up']
    search_fields = ['doctor__user__first_name', 'doctor__user__last_name', 'clinic__name']
    ordering_fields = ['created_at', 'updated_at', 'follow_up_fee', 'online_follow_up_fee', 'follow_up_duration']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter queryset based on user role"""
        user = self.request.user
        base_qs = FollowUpPolicy.objects.select_related('doctor', 'clinic').all()
        
        if hasattr(user, 'doctor'):
            # Doctor can only see their own policies
            return base_qs.filter(doctor=user.doctor)
        elif hasattr(user, 'helpdesk'):
            # Helpdesk can see policies for their clinics
            return base_qs.filter(clinic__in=user.helpdesk.clinics.all())
        
        return base_qs.none()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create or update a follow-up policy (upsert)"""
        # Ensure doctor can only create policies for themselves
        user = request.user
        doctor_id = request.data.get('doctor')
        clinic_id = request.data.get('clinic')
        
        if hasattr(user, 'doctor'):
            if doctor_id and str(user.doctor.id) != str(doctor_id):
                return Response({
                    "status": "error",
                    "message": "You can only create follow-up policies for yourself."
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if a follow-up policy already exists for this doctor and clinic
        if doctor_id and clinic_id:
            try:
                existing_instance = FollowUpPolicy.objects.get(
                    doctor_id=doctor_id,
                    clinic_id=clinic_id
                )
                # Update existing instance
                update_serializer = self.get_serializer(
                    existing_instance, 
                    data=request.data, 
                    partial=True,
                    context={'request': request}
                )
                update_serializer.is_valid(raise_exception=True)
                instance = update_serializer.save()
                return Response({
                    "status": "success",
                    "message": "Follow-up policy updated successfully",
                    "data": self.get_serializer(instance).data
                }, status=status.HTTP_200_OK)
            except FollowUpPolicy.DoesNotExist:
                # Create new instance
                serializer = self.get_serializer(data=request.data, context={'request': request})
                serializer.is_valid(raise_exception=True)
                instance = serializer.save()
                return Response({
                    "status": "success",
                    "message": "Follow-up policy created successfully",
                    "data": self.get_serializer(instance).data
                }, status=status.HTTP_201_CREATED)
        else:
            # If doctor_id or clinic_id not provided, create new instance
            serializer = self.get_serializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            return Response({
                "status": "success",
                "message": "Follow-up policy created successfully",
                "data": self.get_serializer(instance).data
            }, status=status.HTTP_201_CREATED)

    def list(self, request, *args, **kwargs):
        """List all follow-up policies for the authenticated user"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                "status": "success",
                "message": "Follow-up policies retrieved successfully",
                "data": serializer.data
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "status": "success",
            "message": "Follow-up policies retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        """Retrieve a specific follow-up policy"""
        try:
            instance = self.get_object()
        except Exception as e:
            logger.error(f"Error retrieving follow-up policy: {str(e)}")
            return Response({
                "status": "error",
                "message": "Follow-up policy not found or you do not have permission to access it."
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.get_serializer(instance)
        return Response({
            "status": "success",
            "message": "Follow-up policy retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def get_object_by_doctor_clinic(self, doctor_id, clinic_id, user):
        """Get follow-up policy by doctor_id and clinic_id with permission check"""
        try:
            instance = FollowUpPolicy.objects.select_related('doctor', 'clinic').get(
                doctor_id=doctor_id,
                clinic_id=clinic_id
            )
            
            # Ensure user can only access their own policies
            if hasattr(user, 'doctor'):
                try:
                    user_doctor = user.doctor
                    if instance.doctor != user_doctor:
                        return None, Response({
                            "status": "error",
                            "message": "You do not have permission to update this follow-up policy."
                        }, status=status.HTTP_403_FORBIDDEN)
                except (doctor.DoesNotExist, AttributeError):
                    return None, Response({
                        "status": "error",
                        "message": "Doctor information not available. Please refresh the page."
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            return instance, None
        except FollowUpPolicy.DoesNotExist:
            return None, Response({
                "status": "error",
                "message": "Follow-up policy not found for the given doctor and clinic."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving follow-up policy: {str(e)}")
            return None, Response({
                "status": "error",
                "message": "An error occurred while retrieving the follow-up policy."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Update an existing follow-up policy (full update)"""
        partial = kwargs.pop('partial', False)
        
        try:
            instance = self.get_object()
        except Exception as e:
            return Response({
                "status": "error",
                "message": "Follow-up policy not found or you do not have permission to access it."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Ensure user can only update their own policies
        user = request.user
        try:
            if hasattr(user, 'doctor'):
                try:
                    user_doctor = user.doctor
                except (doctor.DoesNotExist, AttributeError):
                    return Response({
                        "status": "error",
                        "message": "Doctor information not available. Please refresh the page."
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if instance.doctor != user_doctor:
                    return Response({
                        "status": "error",
                        "message": "You do not have permission to update this follow-up policy."
                    }, status=status.HTTP_403_FORBIDDEN)
        except AttributeError:
            return Response({
                "status": "error",
                "message": "Doctor information not available. Please refresh the page."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={'request': request})
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Validation failed",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save()
        
        return Response({
            "status": "success",
            "message": "Follow-up policy updated successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        """Partially update an existing follow-up policy using doctor_id and clinic_id"""
        doctor_id = request.data.get('doctor_id') or request.query_params.get('doctor_id')
        clinic_id = request.data.get('clinic_id') or request.query_params.get('clinic_id')
        
        # If doctor_id and clinic_id are provided, use them to find the instance
        if doctor_id and clinic_id:
            instance, error_response = self.get_object_by_doctor_clinic(doctor_id, clinic_id, request.user)
            if error_response:
                return error_response
        else:
            # Fall back to using the URL parameter (pk)
            try:
                instance = self.get_object()
            except Exception as e:
                return Response({
                    "status": "error",
                    "message": "Follow-up policy not found. Please provide doctor_id and clinic_id, or use the instance ID in the URL."
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Ensure user can only update their own policies
        user = request.user
        try:
            if hasattr(user, 'doctor'):
                try:
                    user_doctor = user.doctor
                except (doctor.DoesNotExist, AttributeError):
                    return Response({
                        "status": "error",
                        "message": "Doctor information not available. Please refresh the page."
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if instance.doctor != user_doctor:
                    return Response({
                        "status": "error",
                        "message": "You do not have permission to update this follow-up policy."
                    }, status=status.HTTP_403_FORBIDDEN)
        except AttributeError:
            return Response({
                "status": "error",
                "message": "Doctor information not available. Please refresh the page."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Remove doctor_id and clinic_id from request data if present (they're only for lookup)
        update_data = request.data.copy()
        if 'doctor_id' in update_data:
            del update_data['doctor_id']
        if 'clinic_id' in update_data:
            del update_data['clinic_id']
        
        serializer = self.get_serializer(instance, data=update_data, partial=True, context={'request': request})
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Validation failed",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save()
        
        return Response({
            "status": "success",
            "message": "Follow-up policy updated successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """Delete a follow-up policy"""
        try:
            instance = self.get_object()
        except Exception as e:
            logger.error(f"Error retrieving follow-up policy for deletion: {str(e)}")
            return Response({
                "status": "error",
                "message": "Follow-up policy not found or you do not have permission to access it."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Ensure user can only delete their own policies
        user = request.user
        try:
            if hasattr(user, 'doctor'):
                try:
                    user_doctor = user.doctor
                    if instance.doctor != user_doctor:
                        return Response({
                            "status": "error",
                            "message": "You do not have permission to delete this follow-up policy."
                        }, status=status.HTTP_403_FORBIDDEN)
                except (doctor.DoesNotExist, AttributeError):
                    return Response({
                        "status": "error",
                        "message": "Doctor information not available. Please refresh the page."
                    }, status=status.HTTP_400_BAD_REQUEST)
        except AttributeError:
            return Response({
                "status": "error",
                "message": "Doctor information not available. Please refresh the page."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        self.perform_destroy(instance)
        return Response({
            "status": "success",
            "message": "Follow-up policy deleted successfully"
        }, status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['patch'], url_path='update')
    @transaction.atomic
    def update_by_doctor_clinic(self, request):
        """Update follow-up policy using doctor_id and clinic_id in request body (PATCH on base URL)"""
        doctor_id = request.data.get('doctor_id') or request.query_params.get('doctor_id')
        clinic_id = request.data.get('clinic_id') or request.query_params.get('clinic_id')
        
        if not doctor_id or not clinic_id:
            return Response({
                "status": "error",
                "message": "Both doctor_id and clinic_id are required in request body or query parameters"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        instance, error_response = self.get_object_by_doctor_clinic(doctor_id, clinic_id, request.user)
        if error_response:
            return error_response
        
        # Remove doctor_id and clinic_id from request data if present (they're only for lookup)
        update_data = request.data.copy()
        if 'doctor_id' in update_data:
            del update_data['doctor_id']
        if 'clinic_id' in update_data:
            del update_data['clinic_id']
        
        serializer = self.get_serializer(instance, data=update_data, partial=True, context={'request': request})
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Validation failed",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save()
        
        return Response({
            "status": "success",
            "message": "Follow-up policy updated successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='by-doctor')
    def list_by_doctor(self, request):
        """List follow-up policies by doctor ID"""
        doctor_id = request.query_params.get('doctor_id')
        if not doctor_id:
            return Response({
                "status": "error",
                "message": "doctor_id is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Apply user-based filtering first
        queryset = self.filter_queryset(self.get_queryset())
        policies = queryset.filter(doctor_id=doctor_id)
        
        if not policies.exists():
            return Response({
                "status": "success",
                "message": "No policies found for this doctor",
                "data": []
            }, status=status.HTTP_200_OK)

        page = self.paginate_queryset(policies)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                "status": "success",
                "message": "Follow-up policies retrieved successfully",
                "data": serializer.data
            })
        
        serializer = self.get_serializer(policies, many=True)
        return Response({
            "status": "success",
            "message": "Follow-up policies retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='by-clinic')
    def list_by_clinic(self, request):
        """List follow-up policies by clinic ID"""
        clinic_id = request.query_params.get('clinic_id')
        if not clinic_id:
            return Response({
                "status": "error",
                "message": "clinic_id is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Apply user-based filtering first
        queryset = self.filter_queryset(self.get_queryset())
        policies = queryset.filter(clinic_id=clinic_id)
        
        if not policies.exists():
            return Response({
                "status": "success",
                "message": "No policies found for this clinic",
                "data": []
            }, status=status.HTTP_200_OK)

        page = self.paginate_queryset(policies)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                "status": "success",
                "message": "Follow-up policies retrieved successfully",
                "data": serializer.data
            })
        
        serializer = self.get_serializer(policies, many=True)
        return Response({
            "status": "success",
            "message": "Follow-up policies retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='by-doctor-clinic')
    def retrieve_by_doctor_clinic(self, request):
        """Retrieve a single follow-up policy by doctor_id and clinic_id"""
        doctor_id = request.query_params.get('doctor_id')
        clinic_id = request.query_params.get('clinic_id')
        
        if not doctor_id or not clinic_id:
            return Response({
                "status": "error",
                "message": "Both doctor_id and clinic_id are required"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Apply user-based filtering first
        queryset = self.filter_queryset(self.get_queryset())
        
        try:
            instance = queryset.get(doctor_id=doctor_id, clinic_id=clinic_id)
            serializer = self.get_serializer(instance)
            return Response({
                "status": "success",
                "message": "Follow-up policy retrieved successfully",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        except FollowUpPolicy.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Follow-up policy not found for the given doctor and clinic."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving follow-up policy: {str(e)}")
            return Response({
                "status": "error",
                "message": "An error occurred while retrieving the follow-up policy."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CancellationPolicyViewSet(viewsets.ModelViewSet):
    queryset = CancellationPolicy.objects.select_related('doctor', 'clinic').all()
    serializer_class = CancellationPolicySerializer
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['doctor', 'clinic', 'is_active', 'allow_cancellation', 'allow_refund']
    search_fields = ['doctor__user__first_name', 'doctor__user__last_name', 'clinic__name']
    ordering_fields = ['created_at', 'updated_at', 'cancellation_fee', 'rescheduling_fee', 'cancellation_window_hours']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter queryset based on user role"""
        user = self.request.user
        base_qs = CancellationPolicy.objects.select_related('doctor', 'clinic').all()
        
        if hasattr(user, 'doctor'):
            # Doctor can only see their own policies
            return base_qs.filter(doctor=user.doctor)
        elif hasattr(user, 'helpdesk'):
            # Helpdesk can see policies for their clinics
            return base_qs.filter(clinic__in=user.helpdesk.clinics.all())
        
        return base_qs.none()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create or update a cancellation policy (upsert)"""
        # Ensure doctor can only create policies for themselves
        user = request.user
        doctor_id = request.data.get('doctor')
        clinic_id = request.data.get('clinic')
        
        if hasattr(user, 'doctor'):
            if doctor_id and str(user.doctor.id) != str(doctor_id):
                return Response({
                    "status": "error",
                    "message": "You can only create cancellation policies for yourself."
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if a cancellation policy already exists for this doctor and clinic
        if doctor_id and clinic_id:
            try:
                existing_instance = CancellationPolicy.objects.get(
                    doctor_id=doctor_id,
                    clinic_id=clinic_id
                )
                # Update existing instance
                update_serializer = self.get_serializer(
                    existing_instance, 
                    data=request.data, 
                    partial=True,
                    context={'request': request}
                )
                update_serializer.is_valid(raise_exception=True)
                instance = update_serializer.save()
                return Response({
                    "status": "success",
                    "message": "Cancellation policy updated successfully",
                    "data": self.get_serializer(instance).data
                }, status=status.HTTP_200_OK)
            except CancellationPolicy.DoesNotExist:
                # Create new instance
                serializer = self.get_serializer(data=request.data, context={'request': request})
                serializer.is_valid(raise_exception=True)
                instance = serializer.save()
                return Response({
                    "status": "success",
                    "message": "Cancellation policy created successfully",
                    "data": self.get_serializer(instance).data
                }, status=status.HTTP_201_CREATED)
        else:
            # If doctor_id or clinic_id not provided, create new instance
            serializer = self.get_serializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            return Response({
                "status": "success",
                "message": "Cancellation policy created successfully",
                "data": self.get_serializer(instance).data
            }, status=status.HTTP_201_CREATED)

    def list(self, request, *args, **kwargs):
        """List all cancellation policies for the authenticated user"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                "status": "success",
                "message": "Cancellation policies retrieved successfully",
                "data": serializer.data
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "status": "success",
            "message": "Cancellation policies retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        """Retrieve a specific cancellation policy"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            "status": "success",
            "message": "Cancellation policy retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Update an existing cancellation policy (full update)"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Ensure user can only update their own policies
        user = request.user
        if hasattr(user, 'doctor') and instance.doctor != user.doctor:
            return Response({
                "status": "error",
                "message": "You do not have permission to update this cancellation policy."
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response({
            "status": "success",
            "message": "Cancellation policy updated successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        """Partially update an existing cancellation policy"""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """Delete a cancellation policy"""
        instance = self.get_object()
        
        # Ensure user can only delete their own policies
        user = request.user
        if hasattr(user, 'doctor') and instance.doctor != user.doctor:
            return Response({
                "status": "error",
                "message": "You do not have permission to delete this cancellation policy."
            }, status=status.HTTP_403_FORBIDDEN)
        
        self.perform_destroy(instance)
        return Response({
            "status": "success",
            "message": "Cancellation policy deleted successfully"
        }, status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['patch'], url_path='update')
    @transaction.atomic
    def update_by_doctor_clinic(self, request):
        """Update cancellation policy using doctor_id and clinic_id in request body (PATCH on base URL)"""
        doctor_id = request.data.get('doctor_id') or request.query_params.get('doctor_id')
        clinic_id = request.data.get('clinic_id') or request.query_params.get('clinic_id')
        
        if not doctor_id or not clinic_id:
            return Response({
                "status": "error",
                "message": "Both doctor_id and clinic_id are required in request body or query parameters"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the instance using doctor_id and clinic_id
        queryset = self.filter_queryset(self.get_queryset())
        try:
            instance = queryset.get(doctor_id=doctor_id, clinic_id=clinic_id)
        except CancellationPolicy.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Cancellation policy not found for the given doctor and clinic."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving cancellation policy: {str(e)}")
            return Response({
                "status": "error",
                "message": "An error occurred while retrieving the cancellation policy."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Ensure user can only update their own policies
        user = request.user
        try:
            if hasattr(user, 'doctor'):
                try:
                    user_doctor = user.doctor
                    if instance.doctor != user_doctor:
                        return Response({
                            "status": "error",
                            "message": "You do not have permission to update this cancellation policy."
                        }, status=status.HTTP_403_FORBIDDEN)
                except (doctor.DoesNotExist, AttributeError):
                    return Response({
                        "status": "error",
                        "message": "Doctor information not available. Please refresh the page."
                    }, status=status.HTTP_400_BAD_REQUEST)
        except AttributeError:
            return Response({
                "status": "error",
                "message": "Doctor information not available. Please refresh the page."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Remove doctor_id and clinic_id from request data if present (they're only for lookup)
        update_data = request.data.copy()
        if 'doctor_id' in update_data:
            del update_data['doctor_id']
        if 'clinic_id' in update_data:
            del update_data['clinic_id']
        
        serializer = self.get_serializer(instance, data=update_data, partial=True, context={'request': request})
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Validation failed",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save()
        
        return Response({
            "status": "success",
            "message": "Cancellation policy updated successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='by-doctor')
    def list_by_doctor(self, request):
        """List cancellation policies by doctor ID"""
        doctor_id = request.query_params.get('doctor_id')
        if not doctor_id:
            return Response({
                "status": "error",
                "message": "doctor_id is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Apply user-based filtering first
        queryset = self.filter_queryset(self.get_queryset())
        policies = queryset.filter(doctor_id=doctor_id)
        
        if not policies.exists():
            return Response({
                "status": "success",
                "message": "No policies found for this doctor",
                "data": []
            }, status=status.HTTP_200_OK)

        page = self.paginate_queryset(policies)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                "status": "success",
                "message": "Cancellation policies retrieved successfully",
                "data": serializer.data
            })
        
        serializer = self.get_serializer(policies, many=True)
        return Response({
            "status": "success",
            "message": "Cancellation policies retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='by-clinic')
    def list_by_clinic(self, request):
        """List cancellation policies by clinic ID"""
        clinic_id = request.query_params.get('clinic_id')
        if not clinic_id:
            return Response({
                "status": "error",
                "message": "clinic_id is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Apply user-based filtering first
        queryset = self.filter_queryset(self.get_queryset())
        policies = queryset.filter(clinic_id=clinic_id)
        
        if not policies.exists():
            return Response({
                "status": "success",
                "message": "No policies found for this clinic",
                "data": []
            }, status=status.HTTP_200_OK)

        page = self.paginate_queryset(policies)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                "status": "success",
                "message": "Cancellation policies retrieved successfully",
                "data": serializer.data
            })
        
        serializer = self.get_serializer(policies, many=True)
        return Response({
            "status": "success",
            "message": "Cancellation policies retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='by-doctor-clinic')
    def retrieve_by_doctor_clinic(self, request):
        """Retrieve a single cancellation policy by doctor_id and clinic_id"""
        doctor_id = request.query_params.get('doctor_id')
        clinic_id = request.query_params.get('clinic_id')
        
        if not doctor_id or not clinic_id:
            return Response({
                "status": "error",
                "message": "Both doctor_id and clinic_id are required"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Apply user-based filtering first
        queryset = self.filter_queryset(self.get_queryset())
        
        try:
            instance = queryset.get(doctor_id=doctor_id, clinic_id=clinic_id)
            serializer = self.get_serializer(instance)
            return Response({
                "status": "success",
                "message": "Cancellation policy retrieved successfully",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        except CancellationPolicy.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Cancellation policy not found for the given doctor and clinic."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving cancellation policy: {str(e)}")
            return Response({
                "status": "error",
                "message": "An error occurred while retrieving the cancellation policy."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DoctorAvailabilityView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdeskOrPatient]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        doctor_id = request.query_params.get("doctor_id")
        clinic_id = request.query_params.get("clinic_id")

        if not doctor_id or not clinic_id:
            return Response({"error": "doctor_id and clinic_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            availability = DoctorAvailability.objects.get(doctor_id=doctor_id, clinic_id=clinic_id)
            serializer = DoctorAvailabilitySerializer(availability)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except DoctorAvailability.DoesNotExist:
            return Response({"error": "Availability not found"}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        serializer = DoctorAvailabilitySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        doctor_id = request.data.get("doctor_id")
        clinic_id = request.data.get("clinic_id")
        if not doctor_id or not clinic_id:
            return Response({"error": "doctor_id and clinic_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            availability = DoctorAvailability.objects.get(doctor_id=doctor_id, clinic_id=clinic_id)
        except DoctorAvailability.DoesNotExist:
            return Response({"error": "Availability not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = DoctorAvailabilitySerializer(availability, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        print("DELETE request received")
        # doctor_id = request.data.get("doctor_id")
        # clinic_id = request.data.get("clinic_id")
        doctor_id = request.query_params.get("doctor_id")
        clinic_id = request.query_params.get("clinic_id")

        print("DELETE request - doctor_id:", doctor_id)
        print("DELETE request - clinic_id:", clinic_id)

        if not doctor_id or not clinic_id:
            return Response({"error": "doctor_id and clinic_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            availability = DoctorAvailability.objects.get(doctor_id=doctor_id, clinic_id=clinic_id)
            availability.delete()
            return Response({"message": "Availability deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
        except DoctorAvailability.DoesNotExist:
            return Response({"error": "Availability not found"}, status=status.HTTP_404_NOT_FOUND)

class DoctorLeaveCreateView(generics.CreateAPIView):
    """POST /doctors/leaves/ - Apply for leave"""
    queryset = DoctorLeave.objects.all()
    serializer_class = DoctorLeaveSerializer
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create leave with validation"""
        try:
            # If user is a doctor, ensure they can only create leaves for themselves
            if hasattr(request.user, 'doctor'):
                request.data['doctor'] = str(request.user.doctor.id)
            
            clinic_id = request.data.get('clinic')
            if clinic_id and hasattr(request.user, 'doctor'):
                # Verify doctor is linked to clinic
                try:
                    clinic = Clinic.objects.get(id=clinic_id)
                    if clinic not in request.user.doctor.clinics.all():
                        return Response({
                            "status": "error",
                            "message": "You are not associated with this clinic"
                        }, status=status.HTTP_403_FORBIDDEN)
                except Clinic.DoesNotExist:
                    return Response({
                        "status": "error",
                        "message": "Clinic not found"
                    }, status=status.HTTP_404_NOT_FOUND)
            
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                # Check for unique constraint error and provide better message
                errors = serializer.errors
                if 'non_field_errors' in errors:
                    non_field_errors = errors['non_field_errors']
                    if isinstance(non_field_errors, list):
                        for error in non_field_errors:
                            if 'unique' in str(error).lower():
                                return Response({
                                    "status": "error",
                                    "message": "A leave for this date range already exists. Please use a different date range or update the existing leave.",
                                    "errors": errors
                                }, status=status.HTTP_400_BAD_REQUEST)
                
                return Response({
                    "status": "error",
                    "message": "Validation failed",
                    "errors": errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Proceed with creation - let the serializer validation handle unique constraints
            # The serializer will raise a ValidationError if a duplicate exists
            self.perform_create(serializer)
            
            return Response({
                "status": "success",
                "message": "Leave created successfully",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)
        except serializers.ValidationError as e:
            logger.error(f"Validation error in DoctorLeaveCreateView: {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": "Validation failed",
                "errors": e.detail if hasattr(e, 'detail') else str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in DoctorLeaveCreateView: {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": "An error occurred while creating leave",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DoctorLeaveListView(generics.ListAPIView):
    """GET /doctors/leaves/?doctor_id=<id>&date_filter=month - Fetch leave records"""
    serializer_class = DoctorLeaveSerializer
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["doctor", "clinic", "start_date", "end_date"]
    ordering_fields = ["start_date"]

    def get_queryset(self):
        doctor_id = self.request.query_params.get("doctor_id")
        date_filter = self.request.query_params.get("date_filter")

        queryset = DoctorLeave.objects.all()

        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)

        if date_filter == "week":
            queryset = queryset.filter(start_date__gte=date.today(), end_date__lte=date.today() + timedelta(days=7))
        elif date_filter == "month":
            queryset = queryset.filter(start_date__gte=date.today().replace(day=1))

        return queryset

class DoctorLeaveUpdateView(generics.UpdateAPIView):
    """PATCH /doctors/leaves/{leave_id}/ - Update leave"""
    queryset = DoctorLeave.objects.all()
    serializer_class = DoctorLeaveSerializer
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        """Filter queryset to only allow doctors to update their own leaves"""
        queryset = super().get_queryset()
        # If user is a doctor, only show their own leaves
        if hasattr(self.request.user, 'doctor'):
            queryset = queryset.filter(doctor=self.request.user.doctor)
        return queryset

    def update(self, request, *args, **kwargs):
        """Override update to handle validation errors better"""
        try:
            instance = self.get_object()
            partial = kwargs.pop('partial', True)
            
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            if not serializer.is_valid():
                errors = serializer.errors
                # Check for unique constraint error
                if 'non_field_errors' in errors:
                    non_field_errors = errors['non_field_errors']
                    if isinstance(non_field_errors, list):
                        for error in non_field_errors:
                            if 'unique' in str(error).lower() or 'overlapping' in str(error).lower():
                                return Response({
                                    "status": "error",
                                    "message": "A leave for this date range already exists. Please use a different date range.",
                                    "errors": errors
                                }, status=status.HTTP_400_BAD_REQUEST)
                
                return Response({
                    "status": "error",
                    "message": "Validation failed",
                    "errors": errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            self.perform_update(serializer)
            
            return Response({
                "status": "success",
                "message": "Leave updated successfully",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        except DoctorLeave.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Leave not found"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error updating leave: {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": "An error occurred while updating leave",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DoctorLeaveDeleteView(generics.DestroyAPIView):
    """DELETE /doctors/leaves/{leave_id}/ - Delete leave"""
    queryset = DoctorLeave.objects.all()
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        """Filter queryset to only allow doctors to delete their own leaves"""
        queryset = super().get_queryset()
        # If user is a doctor, only show their own leaves
        if hasattr(self.request.user, 'doctor'):
            queryset = queryset.filter(doctor=self.request.user.doctor)
        return queryset

    def destroy(self, request, *args, **kwargs):
        """Override destroy to ensure proper deletion and logging"""
        try:
            instance = self.get_object()
            leave_id = instance.id
            doctor_name = instance.doctor.get_name if hasattr(instance.doctor, 'get_name') else str(instance.doctor)
            clinic_name = instance.clinic.name if instance.clinic else "Unknown"
            
            # Perform the actual deletion (hard delete from database)
            self.perform_destroy(instance)
            
            logger.info(f"Leave {leave_id} deleted by {request.user.username} for doctor {doctor_name} at clinic {clinic_name}")
            
            return Response(
                {
                    "status": "success",
                    "message": "Leave deleted successfully"
                },
                status=status.HTTP_200_OK
            )
        except DoctorLeave.DoesNotExist:
            return Response(
                {
                    "status": "error",
                    "message": "Leave not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error deleting leave: {str(e)}", exc_info=True)
            return Response(
                {
                    "status": "error",
                    "message": "An error occurred while deleting leave",
                    "detail": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class DoctorOPDStatusViewSet(viewsets.ModelViewSet):
    queryset = DoctorOPDStatus.objects.select_related('doctor', 'clinic').order_by('-updated_at')
    serializer_class = DoctorOPDStatusSerializer
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        queryset = self.queryset

        doctor_id = self.request.query_params.get('doctor_id')
        clinic_id = self.request.query_params.get('clinic_id')
        is_available = self.request.query_params.get('is_available')

        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        if clinic_id:
            queryset = queryset.filter(clinic_id=clinic_id)
        if is_available in ['true', 'false']:
            queryset = queryset.filter(is_available=(is_available.lower() == 'true'))

        return queryset

    @action(detail=True, methods=['post'], url_path='toggle')
    def toggle_availability(self, request, pk=None):
        try:
            instance = self.get_object()
            instance.is_available = not instance.is_available
            if instance.is_available:
                instance.check_in_time = timezone.now()
                instance.check_out_time = None
            else:
                instance.check_out_time = timezone.now()
            instance.save()
            return Response(self.get_serializer(instance).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DoctorBankDetailsViewSet(viewsets.ViewSet):
    """
    ViewSet for managing doctor bank details.
    Supports: Create, Get, Update, Partial Update, Delete
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_object(self, doctor):
        """Get the active bank details for the doctor"""
        try:
            return DoctorBankDetails.objects.get(doctor=doctor, is_active=True)
        except DoctorBankDetails.DoesNotExist:
            raise NotFound("Bank details not found.")
        except DoctorBankDetails.MultipleObjectsReturned:
            # If multiple active records exist, get the most recent one
            return DoctorBankDetails.objects.filter(doctor=doctor, is_active=True).latest('created_at')

    def create(self, request):
        """
        POST /api/doctor/bank-details/
        Create bank details for the logged-in doctor.
        Only one active bank account allowed per doctor.
        """
        doctor = request.user.doctor
        
        # Check if doctor already has an active bank account
        existing_active = DoctorBankDetails.objects.filter(doctor=doctor, is_active=True).first()
        if existing_active:
            return Response(
                {
                    "status": "error",
                    "message": "You already have an active bank account. Please update or delete the existing one first."
                },
                status=status.HTTP_409_CONFLICT
            )

        serializer = DoctorBankDetailsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            bank_details = serializer.save(
                doctor=doctor,
                verification_status="pending"
            )

        return Response(
            {
                "status": "success",
                "message": "Bank details submitted for verification",
                "data": DoctorBankDetailsSerializer(bank_details).data
            },
            status=status.HTTP_201_CREATED
        )

    def retrieve(self, request):
        """
        GET /api/doctor/bank-details/
        Fetch current bank details of the logged-in doctor.
        """
        doctor = request.user.doctor
        bank_details = self.get_object(doctor)
        serializer = DoctorBankDetailsSerializer(bank_details)
        return Response(
            {
                "status": "success",
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )

    def update(self, request, pk=None):
        """
        PUT /api/doctor/bank-details/{id}/
        Full update of bank details.
        Not allowed if status is "verified".
        Resets verification status to "pending".
        """
        doctor = request.user.doctor
        
        # Get bank details by pk if provided, otherwise get active one
        if pk:
            try:
                bank_details = DoctorBankDetails.objects.get(id=pk, doctor=doctor)
            except DoctorBankDetails.DoesNotExist:
                return Response(
                    {"status": "error", "message": "Bank details not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            bank_details = self.get_object(doctor)
        
        # Cannot modify if status is "verified"
        if bank_details.verification_status == "verified":
            return Response(
                {
                    "status": "error",
                    "message": "You are not allowed to modify verified bank details. Please contact admin."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = DoctorBankDetailsSerializer(bank_details, data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            # Reset verification status on update
            bank_details = serializer.save(
                verification_status="pending",
                verified_at=None,
                rejection_reason=None
            )

        return Response(
            {
                "status": "success",
                "message": "Bank details updated and sent for verification",
                "data": DoctorBankDetailsSerializer(bank_details).data
            },
            status=status.HTTP_200_OK
        )

    def partial_update(self, request, pk=None):
        """
        PATCH /api/doctor/bank-details/{id}/
        Partial update of bank details.
        Same rules as PUT - cannot modify if status is "verified".
        """
        doctor = request.user.doctor
        
        # Get bank details by pk if provided, otherwise get active one
        if pk:
            try:
                bank_details = DoctorBankDetails.objects.get(id=pk, doctor=doctor)
            except DoctorBankDetails.DoesNotExist:
                return Response(
                    {"status": "error", "message": "Bank details not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            bank_details = self.get_object(doctor)
        
        # Cannot modify if status is "verified"
        if bank_details.verification_status == "verified":
            return Response(
                {
                    "status": "error",
                    "message": "You are not allowed to modify verified bank details. Please contact admin."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = DoctorBankDetailsSerializer(bank_details, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            # Reset verification status on update
            bank_details = serializer.save(
                verification_status="pending",
                verified_at=None,
                rejection_reason=None
            )

        return Response(
            {
                "status": "success",
                "message": "Bank details updated and sent for verification",
                "data": DoctorBankDetailsSerializer(bank_details).data
            },
            status=status.HTTP_200_OK
        )

    def destroy(self, request, pk=None):
        """
        DELETE /api/doctor/bank-details/{id}/
        Soft delete bank details (sets is_active=False).
        Not allowed if status is "verified".
        """
        doctor = request.user.doctor
        
        # Get bank details by pk if provided, otherwise get active one
        if pk:
            try:
                bank_details = DoctorBankDetails.objects.get(id=pk, doctor=doctor)
            except DoctorBankDetails.DoesNotExist:
                return Response(
                    {"status": "error", "message": "Bank details not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            bank_details = self.get_object(doctor)
        
        # Cannot delete if status is "verified"
        if bank_details.verification_status == "verified":
            return Response(
                {
                    "status": "error",
                    "message": "You cannot delete verified bank details. Please contact admin."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        with transaction.atomic():
            # Soft delete
            bank_details.is_active = False
            bank_details.save()

        return Response(
            {
                "status": "success",
                "message": "Bank details removed successfully"
            },
            status=status.HTTP_200_OK
        )


# ============================================================================
# DOCTOR WORKING HOURS & SCHEDULING APIs
# ============================================================================

class DoctorWorkingHoursView(APIView):
    """
    Create or Update working hours for a doctor in a clinic (UPSERT behavior)
    POST /api/doctor/working-hours/
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    @transaction.atomic
    def post(self, request):
        """Create or update working hours"""
        try:
            doctor_instance = request.user.doctor
            clinic_id = request.data.get('clinic_id')
            
            if not clinic_id:
                return Response({
                    "status": "error",
                    "message": "clinic_id is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify doctor is linked to clinic
            try:
                clinic = Clinic.objects.get(id=clinic_id)
            except Clinic.DoesNotExist:
                return Response({
                    "status": "error",
                    "message": "Clinic not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            if clinic not in doctor_instance.clinics.all():
                return Response({
                    "status": "error",
                    "message": "You are not associated with this clinic"
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if working hours already exist
            try:
                availability = DoctorAvailability.objects.get(
                    doctor=doctor_instance,
                    clinic=clinic
                )
                # Update existing
                serializer = DoctorAvailabilitySerializer(
                    availability,
                    data=request.data,
                    partial=True,
                    context={'request': request}
                )
                if serializer.is_valid():
                    serializer.save()
                    return Response({
                        "status": "success",
                        "message": "Working hours updated successfully",
                        "data": serializer.data
                    }, status=status.HTTP_200_OK)
                return Response({
                    "status": "error",
                    "message": "Validation failed",
                    "errors": serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            except DoctorAvailability.DoesNotExist:
                # Create new
                request.data['doctor'] = str(doctor_instance.id)
                request.data['clinic'] = str(clinic_id)
                serializer = DoctorAvailabilitySerializer(
                    data=request.data,
                    context={'request': request}
                )
                if serializer.is_valid():
                    serializer.save()
                    return Response({
                        "status": "success",
                        "message": "Working hours created successfully",
                        "data": serializer.data
                    }, status=status.HTTP_201_CREATED)
                return Response({
                    "status": "error",
                    "message": "Validation failed",
                    "errors": serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in DoctorWorkingHoursView.post: {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": "An error occurred while saving working hours",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request):
        """Get working hours for a clinic"""
        try:
            doctor_instance = request.user.doctor
            clinic_id = request.query_params.get('clinic_id')
            
            if not clinic_id:
                return Response({
                    "status": "error",
                    "message": "clinic_id is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                clinic = Clinic.objects.get(id=clinic_id)
            except Clinic.DoesNotExist:
                return Response({
                    "status": "error",
                    "message": "Clinic not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            if clinic not in doctor_instance.clinics.all():
                return Response({
                    "status": "error",
                    "message": "You are not associated with this clinic"
                }, status=status.HTTP_403_FORBIDDEN)
            
            try:
                availability = DoctorAvailability.objects.get(
                    doctor=doctor_instance,
                    clinic=clinic
                )
                serializer = DoctorAvailabilitySerializer(availability)
                return Response({
                    "status": "success",
                    "message": "Working hours retrieved successfully",
                    "data": serializer.data
                }, status=status.HTTP_200_OK)
            except DoctorAvailability.DoesNotExist:
                return Response({
                    "status": "success",
                    "message": "No working hours configured yet",
                    "data": None
                }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in DoctorWorkingHoursView.get: {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": "An error occurred while fetching working hours",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DoctorAvailabilityPreviewView(APIView):
    """
    Preview generated slots based on working hours configuration
    GET /api/doctor/availability-preview/?clinic_id=uuid
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request):
        """Preview generated slots"""
        try:
            doctor_instance = request.user.doctor
            clinic_id = request.query_params.get('clinic_id')
            
            if not clinic_id:
                return Response({
                    "status": "error",
                    "message": "clinic_id is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                clinic = Clinic.objects.get(id=clinic_id)
            except Clinic.DoesNotExist:
                return Response({
                    "status": "error",
                    "message": "Clinic not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            if clinic not in doctor_instance.clinics.all():
                return Response({
                    "status": "error",
                    "message": "You are not associated with this clinic"
                }, status=status.HTTP_403_FORBIDDEN)
            
            try:
                availability = DoctorAvailability.objects.get(
                    doctor=doctor_instance,
                    clinic=clinic
                )
                slots = availability.get_all_slots()
                return Response({
                    "status": "success",
                    "message": "Slot preview generated successfully",
                    "data": slots
                }, status=status.HTTP_200_OK)
            except DoctorAvailability.DoesNotExist:
                return Response({
                    "status": "error",
                    "message": "Working hours not configured. Please set up working hours first."
                }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in DoctorAvailabilityPreviewView: {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": "An error occurred while generating slot preview",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DoctorSchedulingRulesViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing doctor scheduling rules.
    
    Provides full CRUD operations for scheduling rules that control
    appointment booking behavior for a doctor at a clinic.
    
    Endpoints:
    - POST   /api/doctor/scheduling-rules/              - Create new rules
    - GET    /api/doctor/scheduling-rules/               - List all rules (filtered by user)
    - GET    /api/doctor/scheduling-rules/{id}/          - Retrieve specific rules
    - PUT    /api/doctor/scheduling-rules/{id}/          - Full update
    - PATCH  /api/doctor/scheduling-rules/{id}/          - Partial update
    - DELETE /api/doctor/scheduling-rules/{id}/          - Delete rules
    - GET    /api/doctor/scheduling-rules/by-doctor-clinic/?doctor_id=&clinic_id= - Get by doctor/clinic
    - PATCH  /api/doctor/scheduling-rules/update/?doctor_id=&clinic_id= - Update by doctor/clinic
    """
    queryset = DoctorSchedulingRules.objects.select_related('doctor', 'clinic').all()
    serializer_class = DoctorSchedulingRulesSerializer
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['doctor', 'clinic', 'is_active', 'allow_same_day_appointments', 
                        'allow_concurrent_appointments', 'auto_confirm_appointments']
    search_fields = ['doctor__user__first_name', 'doctor__user__last_name', 'clinic__name']
    ordering_fields = ['created_at', 'updated_at', 'advance_booking_days']
    ordering = ['-updated_at']

    def get_queryset(self):
        """Filter queryset based on user role"""
        user = self.request.user
        base_qs = DoctorSchedulingRules.objects.select_related('doctor', 'clinic').all()
        
        if hasattr(user, 'doctor'):
            # Doctor can only see their own scheduling rules
            return base_qs.filter(doctor=user.doctor)
        elif hasattr(user, 'helpdesk'):
            # Helpdesk can see scheduling rules for their clinics
            return base_qs.filter(clinic__in=user.helpdesk.clinics.all())
        
        return base_qs.none()

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create new scheduling rules"""
        try:
            user = request.user
            data = request.data.copy()
            
            # Auto-set doctor from authenticated user if doctor
            if hasattr(user, 'doctor'):
                data['doctor'] = str(user.doctor.id)
            elif 'doctor' not in data:
                return Response({
                    "status": "error",
                    "message": "doctor field is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate clinic_id
            clinic_id = data.get('clinic_id') or data.get('clinic')
            if not clinic_id:
                return Response({
                    "status": "error",
                    "message": "clinic_id is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify clinic exists
            try:
                clinic = Clinic.objects.get(id=clinic_id)
            except Clinic.DoesNotExist:
                return Response({
                    "status": "error",
                    "message": "Clinic not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Verify doctor-clinic association
            if hasattr(user, 'doctor'):
                if clinic not in user.doctor.clinics.all():
                    return Response({
                        "status": "error",
                        "message": "You are not associated with this clinic"
                    }, status=status.HTTP_403_FORBIDDEN)
            elif hasattr(user, 'helpdesk'):
                if clinic not in user.helpdesk.clinics.all():
                    return Response({
                        "status": "error",
                        "message": "You are not associated with this clinic"
                    }, status=status.HTTP_403_FORBIDDEN)
            
            # Check for existing rules
            doctor_id = data.get('doctor')
            if DoctorSchedulingRules.objects.filter(doctor_id=doctor_id, clinic=clinic).exists():
                return Response({
                    "status": "error",
                    "message": "Scheduling rules already exist for this doctor and clinic. Use update instead."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            data['clinic'] = str(clinic_id)
            if 'clinic_id' in data:
                del data['clinic_id']
            
            serializer = self.get_serializer(data=data, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "status": "success",
                    "message": "Scheduling rules created successfully",
                    "data": serializer.data
                }, status=status.HTTP_201_CREATED)
            
            return Response({
                "status": "error",
                "message": "Validation failed",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error creating scheduling rules: {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": "An error occurred while creating scheduling rules",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def list(self, request, *args, **kwargs):
        """List scheduling rules with optional filtering"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Optional: Filter by clinic_id query parameter
        clinic_id = request.query_params.get('clinic_id')
        if clinic_id:
            queryset = queryset.filter(clinic_id=clinic_id)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "status": "success",
            "message": "Scheduling rules retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        """Retrieve a specific scheduling rule"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            "status": "success",
            "message": "Scheduling rules retrieved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Full update of scheduling rules"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Ensure doctor and clinic cannot be changed
        data = request.data.copy()
        if 'doctor' in data:
            del data['doctor']
        if 'clinic' in data:
            del data['clinic']
        if 'clinic_id' in data:
            del data['clinic_id']
        
        serializer = self.get_serializer(instance, data=data, partial=partial, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "success",
                "message": "Scheduling rules updated successfully",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response({
            "status": "error",
            "message": "Validation failed",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        """Partial update of scheduling rules"""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """Delete scheduling rules (only if no active appointments)"""
        instance = self.get_object()
        
        # Check if there are any active appointments
        # Note: You may want to import Appointment model and check
        # For now, we'll allow deletion but you can add this check:
        # from appointments.models import Appointment
        # active_appointments = Appointment.objects.filter(
        #     doctor=instance.doctor,
        #     clinic=instance.clinic,
        #     status__in=['scheduled', 'confirmed']
        # ).exists()
        # if active_appointments:
        #     return Response({
        #         "status": "error",
        #         "message": "Cannot delete scheduling rules with active appointments"
        #     }, status=status.HTTP_409_CONFLICT)
        
        try:
            self.perform_destroy(instance)
            return Response({
                "status": "success",
                "message": "Scheduling rules deleted successfully"
            }, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"Error deleting scheduling rules: {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": "An error occurred while deleting scheduling rules",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_destroy(self, instance):
        """Perform the actual deletion"""
        instance.delete()

    @action(detail=False, methods=['get'], url_path='by-doctor-clinic')
    def retrieve_by_doctor_clinic(self, request):
        """Retrieve scheduling rules by doctor_id and clinic_id"""
        doctor_id = request.query_params.get('doctor_id')
        clinic_id = request.query_params.get('clinic_id')
        
        if not doctor_id or not clinic_id:
            return Response({
                "status": "error",
                "message": "Both doctor_id and clinic_id are required"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Apply user-based filtering first
        queryset = self.filter_queryset(self.get_queryset())
        
        try:
            instance = queryset.get(doctor_id=doctor_id, clinic_id=clinic_id)
            serializer = self.get_serializer(instance)
            return Response({
                "status": "success",
                "message": "Scheduling rules retrieved successfully",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        except DoctorSchedulingRules.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Scheduling rules not found for the given doctor and clinic."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving scheduling rules: {str(e)}")
            return Response({
                "status": "error",
                "message": "An error occurred while retrieving the scheduling rules."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['patch'], url_path='update')
    @transaction.atomic
    def update_by_doctor_clinic(self, request):
        """Update scheduling rules by doctor_id and clinic_id (UPSERT behavior)"""
        doctor_id = request.query_params.get('doctor_id')
        clinic_id = request.query_params.get('clinic_id')
        
        if not doctor_id or not clinic_id:
            return Response({
                "status": "error",
                "message": "Both doctor_id and clinic_id are required"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verify clinic exists
        try:
            clinic = Clinic.objects.get(id=clinic_id)
        except Clinic.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Clinic not found"
            }, status=status.HTTP_404_NOT_FOUND)

        # Verify doctor exists
        try:
            doctor_instance = doctor.objects.get(id=doctor_id)
        except doctor.DoesNotExist:
            return Response({
                "status": "error",
                "message": "Doctor not found"
            }, status=status.HTTP_404_NOT_FOUND)

        # Check user permissions
        user = request.user
        if hasattr(user, 'doctor'):
            if user.doctor != doctor_instance:
                return Response({
                    "status": "error",
                    "message": "You can only update your own scheduling rules"
                }, status=status.HTTP_403_FORBIDDEN)
            if clinic not in doctor_instance.clinics.all():
                return Response({
                    "status": "error",
                    "message": "You are not associated with this clinic"
                }, status=status.HTTP_403_FORBIDDEN)
        elif hasattr(user, 'helpdesk'):
            if clinic not in user.helpdesk.clinics.all():
                return Response({
                    "status": "error",
                    "message": "You are not associated with this clinic"
                }, status=status.HTTP_403_FORBIDDEN)

        # Get or create rules
        instance, created = DoctorSchedulingRules.objects.get_or_create(
            doctor=doctor_instance,
            clinic=clinic,
            defaults={
                'allow_same_day_appointments': True,
                'allow_concurrent_appointments': False,
                'max_concurrent_appointments': 1,
                'require_approval_for_new_patients': False,
                'auto_confirm_appointments': True,
                'allow_patient_rescheduling': True,
                'reschedule_cutoff_hours': 6,
                'allow_patient_cancellation': True,
                'cancellation_cutoff_hours': 4,
                'advance_booking_days': 14,
                'allow_emergency_slots': True,
                'emergency_slots_per_day': 2,
                'is_active': True,
            }
        )

        # Remove clinic_id from update data
        update_data = request.data.copy()
        if 'clinic_id' in update_data:
            del update_data['clinic_id']
        if 'doctor_id' in update_data:
            del update_data['doctor_id']
        if 'doctor' in update_data:
            del update_data['doctor']
        if 'clinic' in update_data:
            del update_data['clinic']
        
        serializer = self.get_serializer(instance, data=update_data, partial=True, context={'request': request})
        if not serializer.is_valid():
            return Response({
                "status": "error",
                "message": "Validation failed",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save()
        
        message = "Scheduling rules created successfully" if created else "Scheduling rules updated successfully"
        return Response({
            "status": "success",
            "message": message,
            "data": serializer.data
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class DoctorOPDCheckInView(APIView):
    """
    Check-in to OPD
    POST /api/doctor/opd-status/check-in/
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    @transaction.atomic
    def post(self, request):
        """Check-in to OPD"""
        try:
            doctor_instance = request.user.doctor
            clinic_id = request.data.get('clinic_id')
            
            if not clinic_id:
                return Response({
                    "status": "error",
                    "message": "clinic_id is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                clinic = Clinic.objects.get(id=clinic_id)
            except Clinic.DoesNotExist:
                return Response({
                    "status": "error",
                    "message": "Clinic not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            if clinic not in doctor_instance.clinics.all():
                return Response({
                    "status": "error",
                    "message": "You are not associated with this clinic"
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if doctor is on leave
            today = date.today()
            active_leave = DoctorLeave.objects.filter(
                doctor=doctor_instance,
                clinic=clinic,
                start_date__lte=today,
                end_date__gte=today,
                approved=True
            ).exists()
            
            if active_leave:
                return Response({
                    "status": "error",
                    "message": "Cannot check-in while on approved leave"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get or create OPD status
            opd_status, created = DoctorOPDStatus.objects.get_or_create(
                doctor=doctor_instance,
                clinic=clinic,
                defaults={
                    'is_available': True,
                    'check_in_time': timezone.now(),
                    'check_out_time': None
                }
            )
            
            if not created:
                if opd_status.is_available:
                    return Response({
                        "status": "error",
                        "message": "You are already checked in"
                    }, status=status.HTTP_400_BAD_REQUEST)
                opd_status.is_available = True
                opd_status.check_in_time = timezone.now()
                opd_status.check_out_time = None
                opd_status.save()
            
            serializer = DoctorOPDStatusSerializer(opd_status)
            return Response({
                "status": "success",
                "message": "Checked in successfully",
                "data": serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in DoctorOPDCheckInView: {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": "An error occurred while checking in",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DoctorOPDCheckOutView(APIView):
    """
    Check-out from OPD
    POST /api/doctor/opd-status/check-out/
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]

    @transaction.atomic
    def post(self, request):
        """Check-out from OPD"""
        try:
            doctor_instance = request.user.doctor
            clinic_id = request.data.get('clinic_id')
            
            if not clinic_id:
                return Response({
                    "status": "error",
                    "message": "clinic_id is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                clinic = Clinic.objects.get(id=clinic_id)
            except Clinic.DoesNotExist:
                return Response({
                    "status": "error",
                    "message": "Clinic not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            if clinic not in doctor_instance.clinics.all():
                return Response({
                    "status": "error",
                    "message": "You are not associated with this clinic"
                }, status=status.HTTP_403_FORBIDDEN)
            
            try:
                opd_status = DoctorOPDStatus.objects.get(
                    doctor=doctor_instance,
                    clinic=clinic
                )
                
                if not opd_status.is_available:
                    return Response({
                        "status": "error",
                        "message": "You are not checked in"
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                opd_status.is_available = False
                opd_status.check_out_time = timezone.now()
                opd_status.save()
                
                serializer = DoctorOPDStatusSerializer(opd_status)
                return Response({
                    "status": "success",
                    "message": "Checked out successfully",
                    "data": serializer.data
                }, status=status.HTTP_200_OK)
            except DoctorOPDStatus.DoesNotExist:
                return Response({
                    "status": "error",
                    "message": "No active OPD session found"
                }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in DoctorOPDCheckOutView: {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": "An error occurred while checking out",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DoctorOPDStatusGetView(APIView):
    """
    Get live OPD status
    GET /api/doctor/opd-status/?clinic_id=uuid
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdeskOrPatient]

    def get(self, request):
        """Get live OPD status"""
        try:
            clinic_id = request.query_params.get('clinic_id')
            doctor_id = request.query_params.get('doctor_id')
            
            if not clinic_id:
                return Response({
                    "status": "error",
                    "message": "clinic_id is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                clinic = Clinic.objects.get(id=clinic_id)
            except Clinic.DoesNotExist:
                return Response({
                    "status": "error",
                    "message": "Clinic not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # If doctor_id provided, get specific doctor's status
            if doctor_id:
                try:
                    doctor_instance = doctor.objects.get(id=doctor_id)
                    if clinic not in doctor_instance.clinics.all():
                        return Response({
                            "status": "error",
                            "message": "Doctor is not associated with this clinic"
                        }, status=status.HTTP_403_FORBIDDEN)
                    
                    try:
                        opd_status = DoctorOPDStatus.objects.get(
                            doctor=doctor_instance,
                            clinic=clinic
                        )
                        serializer = DoctorOPDStatusSerializer(opd_status)
                        return Response({
                            "status": "success",
                            "message": "OPD status retrieved successfully",
                            "data": serializer.data
                        }, status=status.HTTP_200_OK)
                    except DoctorOPDStatus.DoesNotExist:
                        return Response({
                            "status": "success",
                            "message": "No OPD status found",
                            "data": {
                                "is_available": False,
                                "check_in_time": None,
                                "check_out_time": None
                            }
                        }, status=status.HTTP_200_OK)
                except doctor.DoesNotExist:
                    return Response({
                        "status": "error",
                        "message": "Doctor not found"
                    }, status=status.HTTP_404_NOT_FOUND)
            else:
                # If authenticated user is a doctor, get their own status
                if hasattr(request.user, 'doctor'):
                    doctor_instance = request.user.doctor
                    if clinic not in doctor_instance.clinics.all():
                        return Response({
                            "status": "error",
                            "message": "You are not associated with this clinic"
                        }, status=status.HTTP_403_FORBIDDEN)
                    
                    try:
                        opd_status = DoctorOPDStatus.objects.get(
                            doctor=doctor_instance,
                            clinic=clinic
                        )
                        serializer = DoctorOPDStatusSerializer(opd_status)
                        return Response({
                            "status": "success",
                            "message": "OPD status retrieved successfully",
                            "data": serializer.data
                        }, status=status.HTTP_200_OK)
                    except DoctorOPDStatus.DoesNotExist:
                        return Response({
                            "status": "success",
                            "message": "No OPD status found",
                            "data": {
                                "is_available": False,
                                "check_in_time": None,
                                "check_out_time": None
                            }
                        }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        "status": "error",
                        "message": "doctor_id is required for non-doctor users"
                    }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in DoctorOPDStatusGetView: {str(e)}", exc_info=True)
            return Response({
                "status": "error",
                "message": "An error occurred while fetching OPD status",
                "detail": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)