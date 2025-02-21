from django.shortcuts import render
from rest_framework import  viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny
from datetime import datetime
from patient_account.models import PatientAccount, Address
from patient_account.api.serializers import (
    PatientRegistrationSerializer, PatientProfileCompletionSerializer,
    PatientLoginSerializer, RegisterSerializer)
from account.models import User
from django.contrib.auth.models import Group
from django.core.cache import cache
import random
import time
from twilio.rest import Client
from patient_account.models import OTP
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import OutstandingToken, BlacklistedToken
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework_simplejwt.tokens import AccessToken

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

        #user, created = User.objects.get_or_create(username=phone_number, defaults={"is_active": True})
        user, created = User.objects.get_or_create(username=phone_number)
        user.is_active = True
        user.status = True
        # Add the user to the "patient" group
        patient_group, _ = Group.objects.get_or_create(name="patient")
        user.groups.add(patient_group)
        user.save()
        # # Create patient entry if new user
        # if created:
        #     PatientAccount.objects.create(user=user, phone_number=user.username)
        # Generate JWT tokens
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
    print("I am in get_patient_account")
    try:
        print(request.user)
        print(request.data)
        #patient_account = PatientAccount.objects.get(user=request.user)
        patient_account = PatientAccount.objects.get(user=request.user)
        return Response({"id": patient_account.id})
    except PatientAccount.DoesNotExist:
        return Response({"error": "Patient account not found"}, status=404)

class RegisterPatientView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    def post(self, request):
        user = request.user
        if hasattr(user, "patient"):
            return Response({"message": "Patient already registered"}, status=status.HTTP_400_BAD_REQUEST)

        patient = PatientAccount.objects.create(user=user)
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
        print("i am in logout")
        print(request.data)
        try:
            refresh_token = request.data.get('refresh')

            if not refresh_token:
                return Response({"message": "Refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)

            token = RefreshToken(refresh_token)
            token.blacklist()  # Blacklist the refresh token

            return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"message": "Invalid token", "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)