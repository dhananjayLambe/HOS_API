from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers, status,viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.permissions import BasePermission
from rest_framework.permissions import AllowAny
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import Group
from django.http import Http404
from rest_framework.decorators import action
from django.db import transaction
from patient.models import Appointment
from doctor.models import (
    doctor, Registration, GovernmentID, Education,
    Specialization, Award, Certification, DoctorFeedback, DoctorLanguage)

from .serializers import (
    doctorAppointmentSerializer,
    DoctorRegistrationSerializer,UserSerializer, ProfileSerializer,
    RegistrationSerializer, GovernmentIDSerializer, EducationSerializer,
    SpecializationSerializer, AwardSerializer, CertificationSerializer,
    DoctorFeedbackSerializer, DoctorLanguageSerializer, DoctorSerializer,DoctorProfileUpdateSerializer
) 

class IsDoctor(BasePermission):
    """custom Permission class for Doctor"""
    def has_permission(self, request, view):
        #print(request.user.groups)  # Print the user's groups
        #print(request.user.get_all_permissions())  # Print the user's permissions
        return bool(request.user and request.user.groups.filter(name='doctor').exists())

class CustomAuthToken(ObtainAuthToken):

    """This class returns custom Authentication token only for Doctor"""

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        account_approval = user.groups.filter(name='doctor').exists()
        if user.status==False:
            return Response(
                {
                    'message': "Your account is not approved by admin yet!"
                },
                status=status.HTTP_403_FORBIDDEN
            )
        elif account_approval==False:
            return Response(
                {
                    'message': "You are not authorised to login as a doctor"
                },
                status=status.HTTP_403_FORBIDDEN
            )
        else:
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'id': user.id,
                'token': token.key
            },status=status.HTTP_200_OK)

##############OLD Reference###############
'''
class registrationView(APIView):

    """"API endpoint for doctor Registration"""

    permission_classes = []
    def post(self, request, format=None):
        registrationSerializer = doctorRegistrationSerializer(
            data=request.data.get('user_data'))
        profileSerializer = doctorProfileSerializer(
            data=request.data.get('profile_data'))
        checkregistration = registrationSerializer.is_valid()
        checkprofile = profileSerializer.is_valid()
        if checkregistration and checkprofile:
            doctor = registrationSerializer.save()
            profileSerializer.save(user=doctor)
            return Response({
                'user_data': registrationSerializer.data,
                'profile_data': profileSerializer.data
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'user_data': registrationSerializer.errors,
                'profile_data': profileSerializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

class doctorProfileView(APIView):
    """"API endpoint for doctor profile view/update-- Only accessble by doctors"""

    permission_classes=[IsDoctor]

    def get(self, request, format=None):
        user = request.user
        profile = doctor.objects.filter(user=user).get()
        userSerializer=doctorRegistrationSerializer(user)
        profileSerializer = doctorProfileSerializer(profile)
        return Response({
            'user_data':userSerializer.data,
            'profile_data':profileSerializer.data

        }, status=status.HTTP_200_OK)

    def put(self, request, format=None):
        user = request.user
        profile = doctor.objects.filter(user=user).get()
        profileSerializer = doctorProfileSerializer(
            instance=profile, data=request.data.get('profile_data'), partial=True)
        if profileSerializer.is_valid():
            profileSerializer.save()
            return Response({
                'profile_data':profileSerializer.data
            }, status=status.HTTP_200_OK)
        return Response({
                'profile_data':profileSerializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
'''

#############END################
class DoctorRegistrationView(APIView):
    permission_classes=[]
    def post(self, request, *args, **kwargs):
        serializer = DoctorRegistrationSerializer(data=request.data)      
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Doctor registered successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        user = request.user
        user.delete()
        return Response({"message": "User deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

class doctorAppointmentView(APIView):
    """API endpoint for getting all appointment detail-only accesible by doctor"""
    permission_classes = [IsDoctor]

    def get(self, request, format=None):
        user = request.user
        user_doctor = doctor.objects.filter(user=user).get()
        appointments=Appointment.objects.filter(doctor=user_doctor, status=True).order_by('appointment_date', 'appointment_time')
        appointmentSerializer=doctorAppointmentSerializer(appointments, many=True)
        return Response(appointmentSerializer.data, status=status.HTTP_200_OK)

class LogoutView(APIView):
    """
    API endpoint for logging out users.
    Deletes the user's authentication token.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            # Get the user's token and delete it
            token = Token.objects.get(user=request.user)
            token.delete()
            return Response({"message": "Logout successful."}, status=status.HTTP_200_OK)
        except Token.DoesNotExist:
            return Response({"error": "Token not found or user already logged out."}, status=status.HTTP_400_BAD_REQUEST)


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
            return Response({
                "message": "Doctor registered successfully.",
                "doctor_id": str(doctor_instance.id)
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DoctorProfileViewSet(viewsets.ModelViewSet):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsDoctor]
    #queryset = doctor.objects.all()
    serializer_class = DoctorProfileUpdateSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']  # Explicitly list allowed methods
    lookup_field = 'id'  # Add this line
    def get_queryset(self):
        return doctor.objects.filter(user=self.request.user)
    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except doctor.DoesNotExist:
            return Response({"error": "Doctor not found"}, status=status.HTTP_404_NOT_FOUND)

    def update(self, request, *args, **kwargs):
        try:
            print(f"Received PK: {kwargs.get('id')}")
            partial = kwargs.pop('partial', False)
            #instance = self.get_object()
            instance =doctor.objects.get(pk=kwargs.get('id'))
            #instance = self.get_queryset().get(pk=kwargs.get('id'))
            print(f"Found doctor: {instance}")
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
        except doctor.DoesNotExist:
            return Response({"error": "Doctor not found"}, status=status.HTTP_404_NOT_FOUND)
    # def get_queryset(self):
    #     #print(self.request.user.groups)  # Print the user's groups
    #     #print(self.request.user.get_all_permissions())  # Print the user's permissions
    #     return doctor.objects.all()

    # @action(detail=True, methods=['PUT'], url_path='update-profile')#, url_path='update-profile'
    # def update_profile(self, request, pk=None):
    #     print(f"Received PK: {pk}")
    #     #doctor = self.get_object()
    #     #doctor = self.get_queryset().get(pk=pk)
    #     #print(f"Found doctor: {doctor}")
    #     try:
    #         doctor_object = doctor.objects.get(pk=pk)
    #     except doctor.DoesNotExist:
    #         return Response({"error": "No doctor matches the given query."}, status=status.HTTP_404_NOT_FOUND)
    #     serializer = self.get_serializer(doctor_object, data=request.data, partial=True)
    #     serializer.is_valid(raise_exception=True)
    #     with transaction.atomic():
    #         serializer.save()
    #     return Response(serializer.data, status=status.HTTP_200_OK)