from django.shortcuts import render
from rest_framework import  viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny
from patient_account.models import PatientAccount
from account.models import User
from django.contrib.auth.models import Group
from django.core.cache import cache
import random
import time
from patient_account.models import OTP
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import IsAuthenticated
from patient_account.api.serializers import(
PatientProfileSerializer, PatientProfileUpdateSerializer, PatientProfileDetailsSerializer)
from patient_account.models import PatientProfile,PatientProfileDetails

#Determines if the user is new or existing.
class CheckUserStatusView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        phone_number = request.data.get('phone_number')
        if User.objects.filter(username=phone_number).exists():
            return Response({"status": "existing_user"}, status=status.HTTP_200_OK)
        return Response({"status": "new_user"}, status=status.HTTP_200_OK)

#Send OTP to the user's phone number.
class SendOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        phone_number = request.data.get('phone_number')
        if not phone_number:
            return Response({"message": "Phone number is required"}, status=status.HTTP_400_BAD_REQUEST)
        # Check if an OTP already exists in cache
        existing_otp = cache.get(phone_number)
        otp_timestamp = cache.get(f"otp_timestamp_{phone_number}")
        # If OTP exists and is still within the valid time frame, return the same OTP
        if existing_otp and otp_timestamp and (time.time() - otp_timestamp) < 60:
            return Response({
                "message": "OTP already sent. Please wait before requesting a new one.",
                "otp": existing_otp  # Show only for debugging; remove in production
            }, status=status.HTTP_200_OK)
        # Generate a new OTP since no valid OTP exists
        new_otp = random.randint(100000, 999999)
        # Store the OTP and the current timestamp
        cache.set(phone_number, new_otp, timeout=60)  # OTP valid for 1 minute
        cache.set(f"otp_timestamp_{phone_number}", time.time(), timeout=60)
        return Response({
            "message": "OTP sent successfully",
            "otp": new_otp  # Show only for debugging; remove in production
        }, status=status.HTTP_200_OK)

class VerifyOTPView(APIView):
    #Permision need to handle the OTP verification
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        phone_number = request.data.get('phone_number')
        otp = request.data.get('otp')
        cached_otp = cache.get(phone_number)
        if str(cached_otp) != str(otp):
            return Response({"message": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)
        user, created = User.objects.get_or_create(username=phone_number)
        user.is_active = True
        user.status = True
        # Add the user to the "patient" group
        patient_group, _ = Group.objects.get_or_create(name="patient")
        user.groups.add(patient_group)
        user.save()
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)      
        return Response(
            {
            "message": "Login successful",
            "access": access_token,  # Include access token
            "refresh": str(refresh),  # Include refresh token
            "user": {
                "id": user.id,
                "username": user.username,
                "phone_number": user.username,
                "is_active": user.is_active
                },
            "is_new": created,  # Returns True if the user was created now, False if already exists
        }, status=status.HTTP_200_OK)
    
class CustomTokenRefreshView(TokenRefreshView):
    pass

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_patient_account(request):
    try:
        patient_account = PatientAccount.objects.get(user=request.user)
        return Response({"id": patient_account.id})
    except PatientAccount.DoesNotExist:
        return Response({"error": "Patient account not found"}, status=404)

class RegisterPatientView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    def post(self, request):
        user = request.user
        if PatientAccount.objects.filter(user=user).exists():
            return Response(
                {"message": "Patient already registered"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        patient, created = PatientAccount.objects.get_or_create(user=user)
        return Response(
            {"message": "Patient registration successful",
            "patient_id": patient.id,
            "phone_number": user.username
            },
            status=status.HTTP_201_CREATED,
        )

class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response({"message": "Refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)
            token = RefreshToken(refresh_token)
            token.blacklist()  # Blacklist the refresh token
            return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"message": "Invalid token", "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class AddPatientProfileView(APIView):
    """
    API to create a new patient profile under an authenticated patient's account.
    - Ensures only one profile for 'self', 'father', 'mother', 'spouse'.
    - Allows multiple 'child' profiles but prevents duplicate first_name + date_of_birth.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    def post(self, request):
        user = request.user
        try:
            # Ensure the patient account exists
            patient_account = PatientAccount.objects.get(user=user)
        except PatientAccount.DoesNotExist:
            return Response({"message": "Patient account not found"}, status=status.HTTP_404_NOT_FOUND)
        # Extract data from request
        first_name = request.data.get("first_name")
        date_of_birth = request.data.get("date_of_birth")
        relation = request.data.get("relation")
        # Check for duplicate profiles (for 'self', 'father', 'mother', 'spouse')
        if relation in ["self", "father", "mother", "spouse"]:
            existing_profile = PatientProfile.objects.filter(account=patient_account, relation=relation).exists()
            if existing_profile:
                return Response(
                    {"message": f"A profile for {relation} already exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        # Check for duplicate child profiles (same first_name + date_of_birth)
        if relation == "child":
            duplicate_child = PatientProfile.objects.filter(
                account=patient_account, relation="child", first_name=first_name, date_of_birth=date_of_birth
            ).exists()
            if duplicate_child:
                return Response(
                    {"message": "A child profile with the same first name and date of birth already exists."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        # Serialize and save the profile
        serializer = PatientProfileSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save(account=patient_account)
            return Response(
                {"message": "Profile added successfully", "profile": serializer.data},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UpdatePatientProfileView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    def put(self, request, profile_id):
        try:
            # Get the profile for the logged-in user's PatientAccount
            profile = PatientProfile.objects.get(id=profile_id, account__user=request.user)
        except PatientProfile.DoesNotExist:
            return Response({"message": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = PatientProfileUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Profile updated successfully", "profile": serializer.data}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DeletePatientProfileView(APIView):
    """
    API to delete a patient profile under an authenticated patient's account.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def delete(self, request, profile_id):
        try:
            # Get the profile under the logged-in user's PatientAccount
            profile = PatientProfile.objects.get(id=profile_id, account__user=request.user)

            # Prevent deletion of "self" profile
            if profile.relation == "self":
                return Response(
                    {"message": "Cannot delete primary (self) profile"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            profile.delete()
            return Response({"message": "Profile deleted successfully"}, status=status.HTTP_200_OK)

        except PatientProfile.DoesNotExist:
            return Response({"message": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

class GetPatientProfilesView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        try:
            # Get the patient account of the logged-in user
            patient_account = PatientAccount.objects.get(user=request.user)
            
            # Retrieve all profiles linked to the patient account
            profiles = PatientProfile.objects.filter(account=patient_account)
            
            # Serialize and return profiles
            serializer = PatientProfileSerializer(profiles, many=True)
            return Response({"profiles": serializer.data}, status=status.HTTP_200_OK)

        except PatientAccount.DoesNotExist:
            return Response({"message": "Patient account not found"}, status=status.HTTP_404_NOT_FOUND)

class GetProfileByNameView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, first_name):
        try:
            # Get the patient account for the logged-in user
            patient_account = request.user.patientaccount

            # Search for profile by first name (case-insensitive)
            profile = PatientProfile.objects.filter(account=patient_account, first_name__iexact=first_name).first()

            if not profile:
                return Response({"message": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

            serializer = PatientProfileSerializer(profile)
            return Response({"profile": serializer.data}, status=status.HTTP_200_OK)

        except PatientProfile.DoesNotExist:
            return Response({"message": "Patient account not found"}, status=status.HTTP_404_NOT_FOUND)

class GetPrimaryProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get the "Self" profile for the logged-in user's PatientAccount
            primary_profile = PatientProfile.objects.get(account__user=request.user, relation="self")
            serializer = PatientProfileSerializer(primary_profile)
            return Response({"message": "Primary profile retrieved successfully", "profile": serializer.data}, status=status.HTTP_200_OK)
        except PatientProfile.DoesNotExist:
            return Response({"message": "No primary profile found"}, status=status.HTTP_404_NOT_FOUND)

class PatientProfileDetailsViewSet(viewsets.ModelViewSet):
    queryset = PatientProfileDetails.objects.all()
    serializer_class = PatientProfileDetailsSerializer