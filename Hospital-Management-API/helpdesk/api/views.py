from rest_framework import generics, permissions,status
from rest_framework.response import Response
from rest_framework.status import HTTP_201_CREATED
from helpdesk.api.serializers import (
     HelpdeskUserRegistrationSerializer,HelpdeskLoginSerializer,HelpdeskLogoutSerializer
    )

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