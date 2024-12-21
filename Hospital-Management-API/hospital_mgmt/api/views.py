from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from hospital_mgmt.models import Hospital, FrontDeskUser
from .serializers import HospitalSerializer, FrontDeskUserSerializer
from rest_framework.permissions import BasePermission



class IsAdmin(BasePermission):
    """custom Permission class for Admin"""

    def has_permission(self, request, view):
        return bool(request.user and request.user.groups.filter(name='admin').exists())

class HospitalViewSet(viewsets.ModelViewSet):
    queryset = Hospital.objects.all()
    serializer_class = HospitalSerializer
    permission_classes = [IsAdmin]

class FrontDeskUserViewSet(viewsets.ModelViewSet):
    queryset = FrontDeskUser.objects.all()
    serializer_class = FrontDeskUserSerializer
    #permission_classes = [AllowAny]