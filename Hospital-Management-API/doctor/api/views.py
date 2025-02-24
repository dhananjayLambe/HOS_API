from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.core.exceptions import PermissionDenied


from django.contrib.auth.models import Group

from patient.models import Appointment
from doctor.models import doctor
from account.models import User

from .serializers import (
    DoctorRegistrationSerializer,
    doctorAppointmentSerializer,
    UserSerializer,
    ProfileSerializer,
    DoctorSerializer,
    DoctorProfileUpdateSerializer,HelpdeskApprovalSerializer,
    PendingHelpdeskUserSerializer
)
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK
from django.shortcuts import get_object_or_404
from helpdesk.models import HelpdeskClinicUser
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from account.permissions import IsDoctor

# class IsDoctor(BasePermission):
#     """custom Permission class for Doctor"""
#     def has_permission(self, request, view):
#         return bool(request.user and request.user.groups.filter(name='doctor').exists())

# class CustomAuthToken(ObtainAuthToken):

#     """This class returns custom Authentication token only for Doctor"""

#     def post(self, request, *args, **kwargs):
#         serializer = self.serializer_class(data=request.data,
#                                            context={'request': request})
#         serializer.is_valid(raise_exception=True)
#         user = serializer.validated_data['user']
#         account_approval = user.groups.filter(name='doctor').exists()
#         if user.status==False:
#             return Response(
#                 {
#                     'message': "Your account is not approved by admin yet!"
#                 },
#                 status=status.HTTP_403_FORBIDDEN
#             )
#         elif account_approval==False:
#             return Response(
#                 {
#                     'message': "You are not authorised to login as a doctor"
#                 },
#                 status=status.HTTP_403_FORBIDDEN
#             )
#         else:
#             token, created = Token.objects.get_or_create(user=user)
#             return Response({
#                 'id': user.id,
#                 'token': token.key
#             },status=status.HTTP_200_OK)

class DoctorRegistrationView(APIView):
    permission_classes=[]
    def post(self, request, *args, **kwargs):
        serializer = DoctorRegistrationSerializer(data=request.data)      
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Doctor registered successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            "id": user.id,
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
    """
    API view to handle authenticated doctor's profile.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated,IsDoctor]

    def get(self, request):
        try:
            user = request.user
            doctor_instance = doctor.objects.get(user=user)
            serializer = DoctorProfileUpdateSerializer(doctor_instance)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except doctor.DoesNotExist:
            return Response({"error": "Doctor profile not found"}, status=status.HTTP_404_NOT_FOUND)
    def post(self, request):
        user = request.user
        if hasattr(user, 'doctor'):
            return Response({"error": "Doctor profile already exists"}, status=status.HTTP_400_BAD_REQUEST)        
        serializer = DoctorProfileUpdateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=user)  # Link doctor to the authenticated user
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        try:
            user = request.user
            doctor_instance = doctor.objects.get(user=user)
            serializer = DoctorProfileUpdateSerializer(doctor_instance, data=request.data)
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
            serializer = DoctorProfileUpdateSerializer(doctor_instance, data=request.data, partial=True)
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