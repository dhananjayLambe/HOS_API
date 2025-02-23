from rest_framework import generics, permissions,status
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED
from helpdesk.api.serializers import (
     HelpdeskUserRegistrationSerializer,HelpdeskLoginSerializer,HelpdeskLogoutSerializer
    )
from helpdesk.models import HelpdeskClinicUser
from helpdesk.api.serializers import HelpdeskClinicUserSerializer
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

class HelpdeskUserRegisterView(generics.CreateAPIView):
    serializer_class = HelpdeskUserRegistrationSerializer
    permission_classes = [permissions.AllowAny]  # Open for self-registration

    def perform_create(self, serializer):
        user = serializer.save()
        return Response(
            {"message": "Helpdesk user registered. Pending admin approval.", "user_id": user.id},
            status=HTTP_201_CREATED
        )

class HelpdeskLoginView(generics.GenericAPIView):
    serializer_class = HelpdeskLoginSerializer
    permission_classes = []
    authentication_classes = []
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)

class HelpdeskLogoutView(generics.GenericAPIView):
    serializer_class = HelpdeskLogoutSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response({"message": "Successfully logged out"}, status=status.HTTP_205_RESET_CONTENT)


class HelpdeskClinicUserDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            # Fetch the helpdesk user details based on the authenticated user
            helpdesk_user = HelpdeskClinicUser.objects.get(user=request.user)
            serializer = HelpdeskClinicUserSerializer(helpdesk_user)
            return Response(serializer.data, status=200)
        except HelpdeskClinicUser.DoesNotExist:
            return Response({"error": "Helpdesk user not found"}, status=404)