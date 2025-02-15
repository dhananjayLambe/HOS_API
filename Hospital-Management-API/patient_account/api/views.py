from django.shortcuts import render
from rest_framework import  viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny
from datetime import datetime
from patient_account.models import PatientAccount, Address
from patient_account.api.serializers import PatientRegistrationSerializer, PatientProfileCompletionSerializer
from account.models import User
from django.contrib.auth.models import Group

#User = get_user_model()
class PatientRegistrationViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = PatientRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            patient = serializer.save()
            # Add the user to the "patient" group
            patient_group, created = Group.objects.get_or_create(name="patient")
            patient.user.groups.add(patient_group)
            patient.user.is_active = True
            patient.user.status = True
            patient.user.save()
            patient.status = True
            patient.save()
            #Dummy OTP generation logic
            return Response({"message": "OTP sent for verification.", "patient_id": str(patient.id)}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def verify_otp(self, request):
        mobile = request.data.get('mobile')
        otp = request.data.get('otp')
        # Dummy OTP verification logic
        if otp == "123456":
            user = User.objects.get(username=mobile)
            user.is_active = True
            user.save()
            return Response({"message": "OTP verified successfully!"}, status=status.HTTP_200_OK)
        return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def complete_profile(self, request):
        user = request.user
        patient = PatientAccount.objects.get(user=user)
        serializer = PatientProfileCompletionSerializer(patient, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Profile updated successfully."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
