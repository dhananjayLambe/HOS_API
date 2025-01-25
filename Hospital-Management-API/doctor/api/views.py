from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers, status
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.permissions import BasePermission
from rest_framework.permissions import AllowAny
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django.http import Http404
from patient.models import Appointment
from doctor.models import (
    doctor, Registration, GovernmentID, Education,
    Specialization, Award, Certification, DoctorFeedback, DoctorLanguage)

from .serializers import (
    doctorAppointmentSerializer,
    DoctorRegistrationSerializer,UserSerializer, ProfileSerializer,
    RegistrationSerializer, GovernmentIDSerializer, EducationSerializer,
    SpecializationSerializer, AwardSerializer, CertificationSerializer,
    DoctorFeedbackSerializer, DoctorLanguageSerializer
) 

class IsDoctor(BasePermission):
    """custom Permission class for Doctor"""
    def has_permission(self, request, view):
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


class DoctorProfileUpdateView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def put(self, request, doctor_id):
        try:
            doctor_instance = doctor.objects.get(id=doctor_id)
        except doctor.DoesNotExist:
            return Response({"error": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)

        errors = {}
        success_updates = []

        # Update Registration
        registration_data = request.data.get("registration")
        if registration_data:
            registration_serializer = RegistrationSerializer(
                data=registration_data, instance=getattr(doctor_instance, 'registration', None)
            )
            if registration_serializer.is_valid():
                registration_serializer.save(doctor=doctor_instance)
                success_updates.append("registration")
            else:
                errors['registration'] = registration_serializer.errors

        # Update Government ID
        government_id_data = request.data.get("government_ids")
        if government_id_data:
            government_id_serializer = GovernmentIDSerializer(
                data=government_id_data, instance=getattr(doctor_instance, 'government_ids', None)
            )
            if government_id_serializer.is_valid():
                government_id_serializer.save(doctor=doctor_instance)
                success_updates.append("government_ids")
            else:
                errors['government_ids'] = government_id_serializer.errors

        # Update Education
        education_data = request.data.get("education", [])
        for edu_data in education_data:
            edu_serializer = EducationSerializer(data=edu_data)
            if edu_serializer.is_valid():
                Education.objects.create(doctor=doctor_instance, **edu_serializer.validated_data)
                success_updates.append("education")
            else:
                errors.setdefault('education', []).append(edu_serializer.errors)

        # Update Specializations
        specialization_data = request.data.get("specializations", [])
        for spec_data in specialization_data:
            spec_serializer = SpecializationSerializer(data=spec_data)
            if spec_serializer.is_valid():
                Specialization.objects.create(doctor=doctor_instance, **spec_serializer.validated_data)
                success_updates.append("specializations")
            else:
                errors.setdefault('specializations', []).append(spec_serializer.errors)

        # Update Awards
        awards_data = request.data.get("awards", [])
        for award_data in awards_data:
            award_serializer = AwardSerializer(data=award_data)
            if award_serializer.is_valid():
                Award.objects.create(doctor=doctor_instance, **award_serializer.validated_data)
                success_updates.append("awards")
            else:
                errors.setdefault('awards', []).append(award_serializer.errors)

        # Update Certifications
        certifications_data = request.data.get("certifications", [])
        for cert_data in certifications_data:
            cert_serializer = CertificationSerializer(data=cert_data)
            if cert_serializer.is_valid():
                Certification.objects.create(doctor=doctor_instance, **cert_serializer.validated_data)
                success_updates.append("certifications")
            else:
                errors.setdefault('certifications', []).append(cert_serializer.errors)

        # Update Feedback
        feedback_data = request.data.get("feedback", [])
        for feedback_item in feedback_data:
            feedback_serializer = DoctorFeedbackSerializer(data=feedback_item)
            if feedback_serializer.is_valid():
                DoctorFeedback.objects.create(doctor=doctor_instance, **feedback_serializer.validated_data)
                success_updates.append("feedback")
            else:
                errors.setdefault('feedback', []).append(feedback_serializer.errors)

        # Update Languages
        languages_data = request.data.get("languages", [])
        for lang_data in languages_data:
            lang_serializer = DoctorLanguageSerializer(data=lang_data)
            if lang_serializer.is_valid():
                DoctorLanguage.objects.create(doctor=doctor_instance, **lang_serializer.validated_data)
                success_updates.append("languages")
            else:
                errors.setdefault('languages', []).append(lang_serializer.errors)

        if errors:
            return Response(
                {
                    "message": "Some data was invalid.",
                    "errors": errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"message": "Doctor profile updated successfully.", "success_updates": success_updates},
            status=status.HTTP_200_OK,
        )

class DoctorRegistrationAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def post(self, request):
        serializer = DoctorRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            doctor_instance = serializer.save()
            return Response({
                "message": "Doctor registered successfully.",
                "doctor_id": str(doctor_instance.id)
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)