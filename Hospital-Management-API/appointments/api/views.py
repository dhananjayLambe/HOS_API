from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from appointments.models import DoctorAvailability,DoctorLeave,Appointment
from appointments.api.serializers import DoctorAvailabilitySerializer,AppointmentSerializer\
    ,AppointmentCreateSerializer,AppointmentCancelSerializer,AppointmentRescheduleSerializer \
    ,PatientAppointmentSerializer
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from django.core.exceptions import ValidationError
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from account.permissions import IsDoctorOrHelpdeskOrPatient


class DoctorAvailabilityView(APIView):
    permission_classes = [IsAuthenticated,IsDoctorOrHelpdeskOrPatient]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        doctor_id = request.data.get("doctor_id")
        clinic_id = request.data.get("clinic_id")
        if not doctor_id or not clinic_id:
            return Response({"error": "doctor_id and clinic_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            availability = DoctorAvailability.objects.get(doctor_id=doctor_id, clinic_id=clinic_id)
            serializer = DoctorAvailabilitySerializer(availability)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except DoctorAvailability.DoesNotExist:
            return Response({"error": "Availability not found"}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        serializer = DoctorAvailabilitySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        doctor_id = request.data.get("doctor_id")
        clinic_id = request.data.get("clinic_id")

        if not doctor_id or not clinic_id:
            return Response({"error": "doctor_id and clinic_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            availability = DoctorAvailability.objects.get(doctor_id=doctor_id, clinic_id=clinic_id)
            serializer = DoctorAvailabilitySerializer(availability, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except DoctorAvailability.DoesNotExist:
            return Response({"error": "Availability not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request):
        doctor_id = request.data.get("doctor_id")
        clinic_id = request.data.get("clinic_id")

        if not doctor_id or not clinic_id:
            return Response({"error": "doctor_id and clinic_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            availability = DoctorAvailability.objects.get(doctor_id=doctor_id, clinic_id=clinic_id)
            availability.delete()
            return Response({"message": "Availability deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
        except DoctorAvailability.DoesNotExist:
            return Response({"error": "Availability not found"}, status=status.HTTP_404_NOT_FOUND)

#1. Book an Appointment (POST)
class AppointmentCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated,IsDoctorOrHelpdeskOrPatient]
    authentication_classes = [JWTAuthentication]
    queryset = Appointment.objects.all()
    serializer_class = AppointmentCreateSerializer

# 2. Fetch Appointment Details (GET)
class AppointmentDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated,IsDoctorOrHelpdeskOrPatient]
    authentication_classes = [JWTAuthentication]
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    #lookup_field = 'id'  # Use appointment ID to fetch details
    def post(self, request):
        appointment_id = request.data.get('id')
        try:
            appointment = Appointment.objects.get(id=appointment_id)
            serializer = self.serializer_class(appointment)
            return Response(serializer.data)
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)

# 3. Cancel an Appointment (PATCH)
class AppointmentCancelView(APIView):
    permission_classes = [IsAuthenticated,IsDoctorOrHelpdeskOrPatient]
    authentication_classes = [JWTAuthentication]

    def patch(self, request):
        try:
            appointment_id = request.data.get('id')
            appointment = Appointment.objects.get(id=appointment_id, status='scheduled')
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found or already modified."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AppointmentCancelSerializer(appointment, data={'status': 'cancelled'}, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Appointment cancelled successfully."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# 4. Reschedule an Appointment (PATCH)
class AppointmentRescheduleView(APIView):
    permission_classes = [IsAuthenticated,IsDoctorOrHelpdeskOrPatient]
    authentication_classes = [JWTAuthentication]

    def patch(self, request):
        try:
            appointment_id = request.data.get('id')
            appointment = Appointment.objects.get(id=appointment_id, status='scheduled')
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found or already modified."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AppointmentRescheduleSerializer(appointment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Appointment rescheduled successfully."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PatientAppointmentsView(generics.ListAPIView):
    serializer_class = PatientAppointmentSerializer
    permission_classes = [IsAuthenticated,IsDoctorOrHelpdeskOrPatient]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        patient_account_id = self.request.data.get("patient_account")
        patient_profile_id = self.request.data.get("patient_profile")

        if not patient_account_id or not patient_profile_id:
            return Appointment.objects.none()

        return Appointment.objects.filter(
            patient_account_id=patient_account_id,
            patient_profile_id=patient_profile_id
        )
    
    def get(self, request, *args, **kwargs):
        patient_account_id = self.request.data.get("patient_account")
        patient_profile_id = self.request.data.get("patient_profile")

        if not patient_account_id or not patient_profile_id:
            return Response({"error": "Missing patient_account or patient_profile"}, status=status.HTTP_400_BAD_REQUEST)

        appointments = self.get_queryset()
        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
