from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from appointments.models import DoctorAvailability
from appointments.api.serializers import DoctorAvailabilitySerializer

class DoctorAvailabilityView(APIView):
    def get(self, request, doctor_id):
        try:
            doctor_availability = DoctorAvailability.objects.get(doctor_id=doctor_id)
            serializer = DoctorAvailabilitySerializer(doctor_availability)
            return Response(serializer.data)
        except DoctorAvailability.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    def post(self, request, doctor_id):
        serializer = DoctorAvailabilitySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(doctor_id=doctor_id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, doctor_id):
        try:
            doctor_availability = DoctorAvailability.objects.get(doctor_id=doctor_id)
            serializer = DoctorAvailabilitySerializer(doctor_availability, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except DoctorAvailability.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)