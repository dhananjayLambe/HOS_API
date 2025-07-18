from django.conf import settings
from datetime import datetime, timedelta
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status,viewsets
from django.utils import timezone
from patient.models import (patient_history,
                            Appointment)
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.permissions import BasePermission, IsAuthenticated
from django.contrib.auth.models import Group
from account.models import User
from . serializers import (
                           doctorRegistrationSerializerAdmin,
                           doctorRegistrationProfileSerializerAdmin,
                           appointmentSerializerAdmin,
                            patientRegistrationSerializerAdmin,
                            patientRegistrationProfileSerializerAdmin,
                            patientAccountSerializerAdmin,
                            patientHistorySerializerAdmin,
                            DoctorRegistrationSerializer,
                            )
from clinic.models import ClinicAdminProfile
from clinic.api.serializers import PendingClinicAdminSerializer
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework import generics

from doctor.models import doctor as Doctor
from doctor.api.serializers import DoctorDetailSerializer,DoctorApprovalSerializer
class IsAdmin(BasePermission):
    """custom Permission class for Admin"""

    def has_permission(self, request, view):
        return bool(request.user and request.user.groups.filter(name='admin').exists())

#Custom Auth token for Admin
class CustomAuthToken(ObtainAuthToken):

    """This class returns custom Authentication token only for admin"""

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        account_approval = user.groups.filter(name='admin').exists()
        if account_approval == False:
            return Response(
                {
                    'message': "You are not authorised to login as an admin"
                },
                status=status.HTTP_403_FORBIDDEN
            )
        token, created = Token.objects.get_or_create(user=user)
        '''
        return Response({
            'token': token.key,
            'created': token.created
        }, status=status.HTTP_200_OK)
        '''
        # Get the token lifetime from the settings file
        token_lifetime = self.get_token_lifetime(user)

        # Update the token's expires field
        token.expires = datetime.now() + token_lifetime
        token.save()

        return Response({
            'token': token.key,
            'created': token.created,
            'expires': token.expires,
            'user_id': user.id,
            'user_name': user.username,
        })

    def get_token_lifetime(self, user):
        # Get the user's group
        group = user.groups.first()

        # Get the token lifetime from the settings file
        if group:
            return settings.REST_FRAMEWORK['DEFAULT_TOKEN_LIFETIME'].get(group.name, timedelta(days=30))
        else:
            return timedelta(days=30)

class DoctorRegistrationView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = DoctorRegistrationSerializer(data=request.data)      
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Doctor registered successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class docregistrationViewAdmin(APIView):

    """API endpoint for creating doctor account- only accessible by Admin"""


    permission_classes = [IsAdmin]

    def post(self, request, format=None):
        registrationSerializer = doctorRegistrationSerializerAdmin(
            data=request.data.get('user_data'))
        profileSerializer = doctorRegistrationProfileSerializerAdmin(
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

class doctorAccountViewAdmin(APIView):

    """API endpoint for getiing info of all/particular doctor,
     update/delete doctor's info
     - only accessible by Admin"""

    permission_classes = [IsAdmin]

    def get_object(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            raise Http404

    def get(self, request, pk=None, format=None):

        if pk:
            doctor_detail = self.get_object(pk)
            serializer = doctorAccountSerializerAdmin(doctor_detail)
            return Response({'doctors': serializer.data}, status=status.HTTP_200_OK)
        all_doctor = User.objects.filter(groups=1, status=True)
        serializer = doctorAccountSerializerAdmin(all_doctor, many=True)
        return Response({'doctors': serializer.data}, status=status.HTTP_200_OK)

    def put(self, request, pk):
        saved_user = self.get_object(pk)
        serializer = doctorAccountSerializerAdmin(
            instance=saved_user, data=request.data.get('doctors'), partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'doctors': serializer.data}, status=status.HTTP_200_OK)
        return Response({
            'doctors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        saved_user = self.get_object(pk)
        saved_user.delete()
        return Response({"message": "User with id `{}` has been deleted.".format(pk)}, status=status.HTTP_204_NO_CONTENT)

class approvePatientViewAdmin(APIView):
    """API endpoint for getting new patient request,
     update and delete approval requests.- only accessible by Admin"""

    permission_classes = [IsAdmin]

    def get_object(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            raise Http404

    def get(self, request, pk=None, format=None):

        if pk:
            doctor_detail = self.get_object(pk)
            serializer = patientAccountSerializerAdmin(doctor_detail)
            return Response({'patients': serializer.data}, status=status.HTTP_200_OK)
        all_patient = User.objects.filter(groups=2, status=False)
        serializer = patientAccountSerializerAdmin(all_patient, many=True)
        return Response({'patients': serializer.data}, status=status.HTTP_200_OK)

    def put(self, request, pk):
        saved_user = self.get_object(pk)
        serializer = patientAccountSerializerAdmin(
            instance=saved_user, data=request.data.get('patients'), partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'patients': serializer.data}, status=status.HTTP_200_OK)
        return Response({
            'patients': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        saved_user = self.get_object(pk)
        saved_user.delete()
        return Response({"message": "Patient approval request with id `{}` has been deleted.".format(pk)}, status=status.HTTP_204_NO_CONTENT)


class appointmentViewAdmin(APIView):

    """API endpoint for getting info of all/particular appointment,
     update/delete appointment - only accessible by Admin"""

    permission_classes = [IsAdmin]

    def get_object(self, pk):
        try:
            return Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            raise Http404

    def get(self, request, pk=None, format=None):

        if pk:
            appointment_detail = self.get_object(pk)
            serializer = appointmentSerializerAdmin(appointment_detail)
            return Response({'appointments': serializer.data}, status=status.HTTP_200_OK)
        all_appointment = Appointment.objects.filter(status=True)
        serializer = appointmentSerializerAdmin(all_appointment, many=True)
        return Response({'appointments': serializer.data}, status=status.HTTP_200_OK)

    def post(self, request, format=None):
        serializer = appointmentSerializerAdmin(
            data=request.data.get('appointments'))
        if serializer.is_valid():
            serializer.save()
            return Response({
                'appointments': serializer.data,
            }, status=status.HTTP_201_CREATED)
        return Response({
            'appointments': serializer.errors,
        }, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        saved_appointment= self.get_object(pk)
        serializer = appointmentSerializerAdmin(
            instance=saved_appointment, data=request.data.get('appointments'), partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'appointments': serializer.data}, status=status.HTTP_200_OK)
        return Response({
            'appointments': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)    

    def delete(self, request, pk):
        saved_appointment= self.get_object(pk)
        saved_appointment.delete()
        return Response({"message": "Appointment with id `{}` has been deleted.".format(pk)}, status=status.HTTP_204_NO_CONTENT)



class approveAppointmentViewAdmin(APIView):
    """API endpoint for getting info of all/particular unapproved appointment,
     update/delete  unapproved appointment - only accessible by Admin"""

    permission_classes = [IsAdmin]

    def get_object(self, pk):
        try:
            return Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            raise Http404
    
    def get(self, request, pk=None, format=None):

        if pk:
            appointment_detail = self.get_object(pk)
            serializer = appointmentSerializerAdmin(appointment_detail)
            return Response({'appointments': serializer.data}, status=status.HTTP_200_OK)
        all_appointment = Appointment.objects.filter(status=False)
        serializer = appointmentSerializerAdmin(all_appointment, many=True)
        return Response({'appointments': serializer.data}, status=status.HTTP_200_OK)

    def put(self, request, pk):
            saved_appointment= self.get_object(pk)
            serializer = appointmentSerializerAdmin(
                instance=saved_appointment, data=request.data.get('appointments'), partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({'appointments': serializer.data}, status=status.HTTP_200_OK)
            return Response({
                'appointments': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
    def delete(self, request, pk):
        saved_appointment= self.get_object(pk)
        saved_appointment.delete()
        return Response({"message": "Appointment with id `{}` has been deleted.".format(pk)}, status=status.HTTP_204_NO_CONTENT)


class patientRegistrationViewAdmin(APIView):
    """API endpoint for creating patients account- only accessible by Admin"""

    permission_classes = [IsAdmin]

    def post(self, request, format=None):
        registrationSerializer = patientRegistrationSerializerAdmin(
            data=request.data.get('user_data'))
        profileSerializer = patientRegistrationProfileSerializerAdmin(
            data=request.data.get('profile_data'))
        checkregistration = registrationSerializer.is_valid()
        checkprofile = profileSerializer.is_valid()
        if checkregistration and checkprofile:
            patient = registrationSerializer.save()
            profileSerializer.save(user=patient)
            return Response({
                'user_data': registrationSerializer.data,
                'profile_data': profileSerializer.data
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'user_data': registrationSerializer.errors,
                'profile_data': profileSerializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)


class patientAccountViewAdmin(APIView):

    """API endpoint for getiing info of all/particular patient,
     update/delete patient's info
     - only accessible by Admin"""

    permission_classes = [IsAdmin]

    def get_object(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            raise Http404

    def get(self, request, pk=None, format=None):

        if pk:
            patient_detail = self.get_object(pk)
            serializer = patientAccountSerializerAdmin(patient_detail)
            return Response({'patients': serializer.data}, status=status.HTTP_200_OK)
        all_patient = User.objects.filter(groups=2, status=True)
        serializer = patientAccountSerializerAdmin(all_patient, many=True)
        return Response({'patients': serializer.data}, status=status.HTTP_200_OK)

    def put(self, request, pk):
        saved_user = self.get_object(pk)
        serializer = patientAccountSerializerAdmin(
            instance=saved_user, data=request.data.get('patients'), partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'patients': serializer.data}, status=status.HTTP_200_OK)
        return Response({
            'patients': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        saved_user = self.get_object(pk)
        saved_user.delete()
        return Response({"message": "User with id `{}` has been deleted.".format(pk)}, status=status.HTTP_204_NO_CONTENT)


class patientHistoryViewAdmin(APIView):
    """API endpoint for getting info of all/particular patient's history,
     update/delete patient's history info
     - only accessible by Admin"""

    permission_classes = [IsAdmin]
    
    
    def get(self, request, pk, hid=None, format=None):
        user_patient = get_object_or_404(User,pk=pk).patient
        if hid:
            try:
                history=patient_history.objects.get(id=hid)
            except patient_history.DoesNotExist:
                raise Http404
            if history.patient==user_patient:
                serializer = patientHistorySerializerAdmin(history)
                return Response({'patient_history': serializer.data}, status=status.HTTP_200_OK)
            return Response({"message: This history id `{}` does not belong to the user".format(hid)}, status=status.HTTP_404_NOT_FOUND)

        
        patient_historys=user_patient.patient_history_set.all()
        serializer = patientHistorySerializerAdmin(patient_historys, many=True)
        return Response({'patient_history': serializer.data}, status=status.HTTP_200_OK)

    def put(self, request, pk, hid):
        user_patient = get_object_or_404(User,pk=pk).patient
        try:
            history=patient_history.objects.get(id=hid)
        except patient_history.DoesNotExist:
            raise Http404
        if history.patient==user_patient:
            serializer = patientHistorySerializerAdmin(instance=history,data=request.data.get('patient_history'), partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({'patient_history': serializer.data}, status=status.HTTP_200_OK)
            return Response({'patient_history': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message: This history id `{}` does not belong to the user".format(hid)}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk, hid):
        user_patient = get_object_or_404(User,pk=pk).patient
        try:
            history=patient_history.objects.get(id=hid)
        except patient_history.DoesNotExist:
            raise Http404
        if history.patient==user_patient:
            history.delete()
            return Response({"message": "History with id `{}` has been deleted.".format(hid)}, status=status.HTTP_204_NO_CONTENT)
        return Response({"message: This history id `{}` does not belong to the user".format(hid)}, status=status.HTTP_404_NOT_FOUND)

class AdminLogoutView(APIView):
    def post(self, request):
        try:
            token = Token.objects.get(user=request.user)
            token.delete()
            return Response({"message": "Logout successful."}, status=200)
        except Token.DoesNotExist:
            return Response({"error": "Token not found or user already logged out."}, status=400)
        
class AdminLoginJwtView(APIView):
    """Custom JWT login for Admin only"""
    permission_classes=[]
    authentication_classes=[]
    def post(self, request ,*args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if not user:
            return Response({"message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.groups.filter(name='admin').exists():
            return Response({"message": "You are not authorized to log in as a admin"},
                            status=status.HTTP_403_FORBIDDEN)

        # if not user.status:  # Assuming 'status' is the approval field
        #     return Response({"message": "Your account is not approved by admin yet!"},
        #                     status=status.HTTP_403_FORBIDDEN)

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            "id": user.id,
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
        }, status=status.HTTP_200_OK)


class AdminTokenRefreshView(TokenRefreshView):
    """Refresh JWT access token"""
    permission_classes=[]
    authentication_classes=[]
    pass
class AdminLogoutJwtView(APIView):
    """Custom JWT logout for Admin only"""
    permission_classes=[]
    authentication_classes=[]
    #print("AdminLogoutJwtView called")
    def post(self, request):
        print("Raw request body:", request.body)  # Debugging
        print("Parsed request data:", request.data)  # Debugging
        try:
            refresh_token = request.data["refresh_token"]
            token = RefreshToken(refresh_token)
            token.blacklist()  # Blacklist token so it can't be reused
            return Response({"message": "Logout successful"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)


class ClinicAdminApprovalViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]  # or [IsSuperAdmin]

    @action(detail=False, methods=["get"], url_path="pending")
    def list_pending(self, request):
        queryset = ClinicAdminProfile.objects.filter(kya_completed=False, kya_verified=False)
        serializer = PendingClinicAdminSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        try:
            profile = ClinicAdminProfile.objects.get(pk=pk)
        except ClinicAdminProfile.DoesNotExist:
            return Response({"detail": "Clinic Admin not found."}, status=status.HTTP_404_NOT_FOUND)

        #if not profile.kya_completed:
        #    return Response({"detail": "KYA is not completed yet."}, status=status.HTTP_400_BAD_REQUEST)

        profile.kya_verified = True
        profile.kya_completed = True
        profile.approval_date = timezone.now()
        profile.user.is_active = True  # optional if you're deactivating unverified accounts
        profile.user.save()
        profile.save()

        return Response({"detail": "Clinic Admin approved successfully."}, status=status.HTTP_200_OK)

class PendingDoctorListAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        pending_doctors = Doctor.objects.filter(is_approved=False)
        serializer = DoctorDetailSerializer(pending_doctors, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ApproveDoctorAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, doctor_id):
        doctor = get_object_or_404(Doctor, id=doctor_id)
        serializer = DoctorApprovalSerializer(doctor, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            response_data = DoctorDetailSerializer(doctor).data
            return Response(response_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

