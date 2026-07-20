from django.conf import settings
from datetime import datetime, timedelta
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status, viewsets
from django.utils import timezone
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.permissions import BasePermission, IsAuthenticated
from account.models import User
from .serializers import (
    doctorRegistrationSerializerAdmin,
    doctorRegistrationProfileSerializerAdmin,
    DoctorRegistrationSerializer,
)
from clinic.models import ClinicAdminProfile
from clinic.api.serializers import PendingClinicAdminSerializer
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from shared.logging import LogModule, logger
from rest_framework_simplejwt.views import TokenRefreshView

from doctor.models import doctor as Doctor
from doctor.api.serializers import DoctorDetailSerializer, DoctorApprovalSerializer


class IsAdmin(BasePermission):
    """custom Permission class for Admin"""

    def has_permission(self, request, view):
        return bool(request.user and request.user.groups.filter(name='admin').exists())


# Custom Auth token for Admin
class CustomAuthToken(ObtainAuthToken):
    """This class returns custom Authentication token only for admin"""

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        account_approval = user.groups.filter(name='admin').exists()
        if account_approval is False:
            return Response(
                {'message': "You are not authorised to login as an admin"},
                status=status.HTTP_403_FORBIDDEN,
            )
        token, created = Token.objects.get_or_create(user=user)
        token_lifetime = self.get_token_lifetime(user)
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
        group = user.groups.first()
        if group:
            return settings.REST_FRAMEWORK['DEFAULT_TOKEN_LIFETIME'].get(
                group.name, timedelta(days=30)
            )
        return timedelta(days=30)


class DoctorRegistrationView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = DoctorRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Doctor registered successfully"},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class docregistrationViewAdmin(APIView):
    """API endpoint for creating doctor account- only accessible by Admin"""

    permission_classes = [IsAdmin]

    def post(self, request, format=None):
        registrationSerializer = doctorRegistrationSerializerAdmin(
            data=request.data.get('user_data')
        )
        profileSerializer = doctorRegistrationProfileSerializerAdmin(
            data=request.data.get('profile_data')
        )
        checkregistration = registrationSerializer.is_valid()
        checkprofile = profileSerializer.is_valid()
        if checkregistration and checkprofile:
            doctor = registrationSerializer.save()
            profileSerializer.save(user=doctor)
            return Response({
                'user_data': registrationSerializer.data,
                'profile_data': profileSerializer.data,
            }, status=status.HTTP_201_CREATED)
        return Response({
            'user_data': registrationSerializer.errors,
            'profile_data': profileSerializer.errors,
        }, status=status.HTTP_400_BAD_REQUEST)


class doctorAccountViewAdmin(APIView):
    """API endpoint for getting info of all/particular doctor,
    update/delete doctor's info - only accessible by Admin"""

    permission_classes = [IsAdmin]

    def get_object(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            raise Http404

    def get(self, request, pk=None, format=None):
        if pk:
            doctor_detail = self.get_object(pk)
            doctor_obj = getattr(doctor_detail, 'doctor', None)
            data = DoctorDetailSerializer(doctor_obj).data if doctor_obj else {
                'id': str(doctor_detail.id),
                'username': doctor_detail.username,
            }
            return Response({'doctors': data}, status=status.HTTP_200_OK)
        pending = Doctor.objects.filter(user__status=True)
        serializer = DoctorDetailSerializer(pending, many=True)
        return Response({'doctors': serializer.data}, status=status.HTTP_200_OK)

    def put(self, request, pk):
        saved_user = self.get_object(pk)
        doctor_obj = getattr(saved_user, 'doctor', None)
        if not doctor_obj:
            return Response(
                {'doctors': 'Doctor profile not found'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = DoctorDetailSerializer(
            doctor_obj, data=request.data.get('doctors', request.data), partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response({'doctors': serializer.data}, status=status.HTTP_200_OK)
        return Response({'doctors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        saved_user = self.get_object(pk)
        saved_user.delete()
        return Response(
            {"message": "User with id `{}` has been deleted.".format(pk)},
            status=status.HTTP_204_NO_CONTENT,
        )


class AdminLogoutView(APIView):
    def post(self, request):
        try:
            token = Token.objects.get(user=request.user)
            token.delete()
            return Response({"message": "Logout successful."}, status=200)
        except Token.DoesNotExist:
            return Response(
                {"error": "Token not found or user already logged out."}, status=400
            )


class AdminLoginJwtView(APIView):
    """Custom JWT login for Admin only"""
    permission_classes = []
    authentication_classes = []

    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if not user:
            return Response(
                {"message": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.groups.filter(name='admin').exists():
            return Response(
                {"message": "You are not authorized to log in as a admin"},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            "id": user.id,
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
        }, status=status.HTTP_200_OK)


class AdminTokenRefreshView(TokenRefreshView):
    """Refresh JWT access token"""
    permission_classes = []
    authentication_classes = []
    pass


class AdminLogoutJwtView(APIView):
    """Custom JWT logout for Admin only"""
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        logger.info(
            "Admin JWT logout requested",
            module=LogModule.AUTHENTICATION,
            action="admin.logout",
        )
        try:
            refresh_token = request.data["refresh_token"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Logout successful"}, status=status.HTTP_200_OK)
        except Exception:
            logger.warning(
                "Admin JWT logout failed",
                module=LogModule.AUTHENTICATION,
                action="admin.logout",
            )
            return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)


class ClinicAdminApprovalViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]

    @action(detail=False, methods=["get"], url_path="pending")
    def list_pending(self, request):
        queryset = ClinicAdminProfile.objects.filter(
            kya_completed=False, kya_verified=False
        )
        serializer = PendingClinicAdminSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        try:
            profile = ClinicAdminProfile.objects.get(pk=pk)
        except ClinicAdminProfile.DoesNotExist:
            return Response(
                {"detail": "Clinic Admin not found."}, status=status.HTTP_404_NOT_FOUND
            )

        profile.kya_verified = True
        profile.kya_completed = True
        profile.approval_date = timezone.now()
        profile.user.is_active = True
        profile.user.save()
        profile.save()

        return Response(
            {"detail": "Clinic Admin approved successfully."},
            status=status.HTTP_200_OK,
        )


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
