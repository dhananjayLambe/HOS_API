from django.utils.timezone import now, localdate
from django.db.models import F
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from queue_management.models import Queue
from patient_account.models import PatientAccount, PatientProfile
from clinic.models import Clinic
from queue_management.api.serializers import QueueSerializer, QueueUpdateSerializer
from account.permissions import IsDoctorOrHelpdesk

# 1. POST /queue/check-in/ – Add a patient to the queue
class CheckInQueueAPIView(APIView):
    print("CheckInQueueAPIView")
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        print("CheckInQueueAPIView.post")
        clinic_id = request.data.get("clinic_id")
        patient_account_id = request.data.get("patient_account_id")
        patient_profile_id = request.data.get("patient_profile_id")
        doctor_id = request.data.get("doctor_id")
        appointment_id = request.data.get("appointment_id", None)
        print(clinic_id, patient_account_id, patient_profile_id, doctor_id, appointment_id)

        if not clinic_id or not patient_account_id or not patient_profile_id or not doctor_id:
            return Response({"error": "Clinic ID, Patient Account ID, Patient Profile ID, and Doctor ID are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            clinic = Clinic.objects.get(id=clinic_id)
            patient_account = PatientAccount.objects.get(id=patient_account_id)
            patient_profile = PatientProfile.objects.get(id=patient_profile_id, account=patient_account)
        except Clinic.DoesNotExist:
            return Response({"error": "Invalid Clinic ID."}, status=status.HTTP_404_NOT_FOUND)
        except PatientAccount.DoesNotExist:
            return Response({"error": "Invalid Patient Account ID."}, status=status.HTTP_404_NOT_FOUND)
        except PatientProfile.DoesNotExist:
            return Response({"error": "Patient Profile does not belong to the given Patient Account."}, status=status.HTTP_404_NOT_FOUND)

        today = localdate()
        existing_entry = Queue.objects.filter(
            doctor_id=doctor_id, clinic_id=clinic_id, patient=patient_profile, created_at__date=today
        ).exists()

        if existing_entry:
            return Response({"error": "Patient is already checked in for today's queue at this clinic."}, status=status.HTTP_400_BAD_REQUEST)

        last_position = Queue.objects.filter(doctor_id=doctor_id, clinic_id=clinic_id, status='waiting', created_at__date=today).count()
        new_position = last_position + 1

        queue_entry = Queue.objects.create(
            doctor_id=doctor_id,
            clinic=clinic,
            patient_account=patient_account,
            patient=patient_profile,
            appointment_id=appointment_id,
            position_in_queue=new_position,
            status="waiting"
        )
        return Response(QueueSerializer(queue_entry).data, status=status.HTTP_201_CREATED)


# 2. GET /queue/doctor/{id}/ – Get today’s live queue for a doctor at a clinic
class DoctorQueueAPIView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def get(self, request, doctor_id, clinic_id):
        today = localdate()
        queue = Queue.objects.filter(doctor_id=doctor_id, clinic_id=clinic_id, created_at__date=today).order_by("position_in_queue")
        return Response(QueueSerializer(queue, many=True).data)


# 3. PATCH /queue/start/ – Mark a patient as In Consultation
class StartConsultationAPIView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def patch(self, request):
        queue_id = request.data.get("queue_id")
        clinic_id = request.data.get("clinic_id")

        if not queue_id or not clinic_id:
            return Response({"error": "Queue ID and Clinic ID are required."}, status=status.HTTP_400_BAD_REQUEST)

        today = localdate()
        try:
            queue_entry = Queue.objects.get(id=queue_id, clinic_id=clinic_id, created_at__date=today, status="waiting")
            queue_entry.status = "in_consultation"
            queue_entry.save()
            return Response({"message": "Patient is now in consultation."}, status=status.HTTP_200_OK)
        except Queue.DoesNotExist:
            return Response({"error": "Patient not found or not in waiting status."}, status=status.HTTP_404_NOT_FOUND)


# 4. PATCH /queue/complete/ – Mark consultation as Completed
class CompleteConsultationAPIView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def patch(self, request):
        queue_id = request.data.get("queue_id")
        clinic_id = request.data.get("clinic_id")

        if not queue_id or not clinic_id:
            return Response({"error": "Queue ID and Clinic ID are required."}, status=status.HTTP_400_BAD_REQUEST)

        today = localdate()
        try:
            queue_entry = Queue.objects.get(id=queue_id, clinic_id=clinic_id, created_at__date=today, status="in_consultation")
            queue_entry.status = "completed"
            queue_entry.save()
            return Response({"message": "Consultation completed."}, status=status.HTTP_200_OK)
        except Queue.DoesNotExist:
            return Response({"error": "Patient not found or not in consultation."}, status=status.HTTP_404_NOT_FOUND)

# 5. PATCH /queue/skip/ – Move patient to Skipped status
class SkipPatientAPIView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def patch(self, request):
        queue_id = request.data.get("queue_id")
        if not queue_id:
            return Response({"error": "Queue ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            queue_entry = Queue.objects.get(id=queue_id, status="waiting")
            queue_entry.status = "skipped"
            queue_entry.save()
            return Response({"message": "Patient skipped."}, status=status.HTTP_200_OK)
        except Queue.DoesNotExist:
            return Response({"error": "Patient not found or not in waiting status."}, status=status.HTTP_404_NOT_FOUND)


# 6. PATCH /queue/urgent/ – Prioritize an urgent patient in the queue
class UrgentPatientAPIView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def patch(self, request):
        queue_id = request.data.get("queue_id")
        if not queue_id:
            return Response({"error": "Queue ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            queue_entry = Queue.objects.get(id=queue_id, status="waiting")

            # Shift existing patients down
            Queue.objects.filter(
                doctor_id=queue_entry.doctor_id, 
                status="waiting", 
                position_in_queue__lt=queue_entry.position_in_queue
            ).update(position_in_queue=F("position_in_queue") + 1)

            # Move urgent patient to the top
            queue_entry.position_in_queue = 1
            queue_entry.save()

            return Response({"message": "Patient moved to urgent priority."}, status=status.HTTP_200_OK)
        except Queue.DoesNotExist:
            return Response({"error": "Patient not found or not in waiting status."}, status=status.HTTP_404_NOT_FOUND)