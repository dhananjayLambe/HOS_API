from datetime import date, timedelta
from rest_framework import status, generics, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django_filters.rest_framework import DjangoFilterBackend
from account.permissions import IsDoctorOrHelpdeskOrPatient, IsDoctorOrHelpdesk
from django.utils.timezone import localdate, timedelta
from django.core.paginator import Paginator
from appointments.models import DoctorLeave
from appointments.models import (
    DoctorAvailability,DoctorLeave,
    Appointment,DoctorLeave)
from appointments.api.serializers import (DoctorAvailabilitySerializer,AppointmentSerializer\
    ,AppointmentCreateSerializer,AppointmentCancelSerializer,
    AppointmentRescheduleSerializer \
    ,PatientAppointmentSerializer,DoctorAppointmentSerializer,
    DoctorAppointmentFilterSerializer\
    ,PatientAppointmentFilterSerializer,DoctorLeaveSerializer)



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

class DoctorAppointmentsView(generics.GenericAPIView):
    serializer_class = DoctorAppointmentSerializer
    permission_classes = [IsAuthenticated,IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        doctor_id = request.data.get("doctor_id")
        if not doctor_id:
            return Response({"error": "doctor_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        filter_serializer = DoctorAppointmentFilterSerializer(data=request.data)
        if not filter_serializer.is_valid():
            return Response(filter_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        filters = filter_serializer.validated_data
        clinic_id = filters.get("clinic_id")
        date_filter = filters.get("date_filter")
        custom_start_date = filters.get("custom_start_date")
        custom_end_date = filters.get("custom_end_date")
        appointment_status = filters.get("appointment_status")
        payment_status = filters.get("payment_status")
        sort_by = filters.get("sort_by", "appointment_date")
        page = filters.get("page", 1)
        page_size = filters.get("page_size", 10)

        queryset = Appointment.objects.filter(doctor_id=doctor_id)

        # Filter by clinic
        if clinic_id:
            queryset = queryset.filter(clinic_id=clinic_id)

        # Date filters
        today = localdate()
        if date_filter == "today":
            queryset = queryset.filter(appointment_date=today)
        elif date_filter == "tomorrow":
            queryset = queryset.filter(appointment_date=today + timedelta(days=1))
        elif date_filter == "week":
            week_start = today - timedelta(days=today.weekday())  # Start of the week (Monday)
            week_end = week_start + timedelta(days=6)  # End of the week (Sunday)
            queryset = queryset.filter(appointment_date__range=[week_start, week_end])
        elif date_filter == "custom" and custom_start_date and custom_end_date:
            queryset = queryset.filter(appointment_date__range=[custom_start_date, custom_end_date])

        # Filter by status
        if appointment_status:
            queryset = queryset.filter(status=appointment_status)

        # Filter by payment status
        if payment_status is not None:
            queryset = queryset.filter(payment_status=payment_status)

        # Sorting
        if sort_by in ["appointment_date", "appointment_time", "clinic_name"]:
            queryset = queryset.order_by(sort_by)

        # Pagination
        paginator = Paginator(queryset, page_size)
        paginated_appointments = paginator.get_page(page)

        serializer = DoctorAppointmentSerializer(paginated_appointments, many=True)
        return Response({
            "total_appointments": paginator.count,
            "total_pages": paginator.num_pages,
            "current_page": page,
            "appointments": serializer.data
        })

class PatientAppointmentsView(generics.GenericAPIView):
    serializer_class = PatientAppointmentSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        filter_serializer = PatientAppointmentFilterSerializer(data=request.data)
        if not filter_serializer.is_valid():
            return Response(filter_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        filters = filter_serializer.validated_data
        patient_account_id = filters.get("patient_account_id")
        patient_profile_ids = filters.get("patient_profile_ids", [])
        doctor_id = filters.get("doctor_id")
        clinic_id = filters.get("clinic_id")
        date_filter = filters.get("date_filter")
        custom_start_date = filters.get("custom_start_date")
        custom_end_date = filters.get("custom_end_date")
        appointment_status = filters.get("appointment_status")
        payment_status = filters.get("payment_status")
        sort_by = filters.get("sort_by", "appointment_date")
        page = filters.get("page", 1)
        page_size = filters.get("page_size", 10)

        # Base Queryset: Filter by Patient Account
        queryset = Appointment.objects.filter(patient_account_id=patient_account_id)

        # Filter by one or more patient profiles
        if patient_profile_ids:
            queryset = queryset.filter(patient_profile_id__in=patient_profile_ids)

        # Filter by Doctor ID (if provided)
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)

        # Filter by Clinic ID (if provided)
        if clinic_id:
            queryset = queryset.filter(clinic_id=clinic_id)

        # Date filters
        today = localdate()
        if date_filter == "today":
            queryset = queryset.filter(appointment_date=today)
        elif date_filter == "tomorrow":
            queryset = queryset.filter(appointment_date=today + timedelta(days=1))
        elif date_filter == "week":
            week_start = today - timedelta(days=today.weekday())  # Start of the week (Monday)
            week_end = week_start + timedelta(days=6)  # End of the week (Sunday)
            queryset = queryset.filter(appointment_date__range=[week_start, week_end])
        elif date_filter == "custom" and custom_start_date and custom_end_date:
            queryset = queryset.filter(appointment_date__range=[custom_start_date, custom_end_date])

        # Filter by appointment status
        if appointment_status:
            queryset = queryset.filter(status=appointment_status)

        # Filter by payment status
        if payment_status is not None:
            queryset = queryset.filter(payment_status=payment_status)

        # Sorting
        if sort_by in ["appointment_date", "appointment_time", "status", "clinic_name"]:
            queryset = queryset.order_by(sort_by)

        # Pagination
        paginator = Paginator(queryset, page_size)
        paginated_appointments = paginator.get_page(page)

        serializer = PatientAppointmentSerializer(paginated_appointments, many=True)
        return Response({
            "total_appointments": paginator.count,
            "total_pages": paginator.num_pages,
            "current_page": page,
            "appointments": serializer.data
        })

# class DoctorLeaveCreateView(generics.CreateAPIView):
#     """POST /doctors/leave/ - Apply for leave"""
#     serializer_class = DoctorLeaveSerializer
#     permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
#     authentication_classes = [JWTAuthentication]


#     def perform_create(self, serializer):
#         serializer.save(doctor=self.request.user.doctor)

# class DoctorLeaveListView(generics.ListAPIView):
#     """GET /doctors/leaves/ - Fetch leave records with filters"""
#     serializer_class = DoctorLeaveSerializer
#     permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
#     authentication_classes = [JWTAuthentication]

#     def get_queryset(self):
#         doctor_id = self.request.query_params.get("doctor_id")
#         date_filter = self.request.query_params.get("date_filter")
#         start_date = self.request.query_params.get("start_date")
#         end_date = self.request.query_params.get("end_date")

#         queryset = DoctorLeave.objects.filter(doctor_id=doctor_id)

#         if date_filter == "week":
#             start = date.today()
#             end = start + timedelta(days=7)
#             queryset = queryset.filter(start_date__gte=start, end_date__lte=end)
#         elif date_filter == "month":
#             start = date.today().replace(day=1)
#             end = (start + timedelta(days=31)).replace(day=1) - timedelta(days=1)
#             queryset = queryset.filter(start_date__gte=start, end_date__lte=end)
#         elif start_date and end_date:
#             queryset = queryset.filter(start_date__gte=start_date, end_date__lte=end_date)

#         return queryset

# class DoctorLeaveUpdateView(generics.UpdateAPIView):
#     """PUT /doctors/leave/{leave_id}/ - Update leave"""
#     serializer_class = DoctorLeaveSerializer
#     permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
#     authentication_classes = [JWTAuthentication]
#     queryset = DoctorLeave.objects.all()

# class DoctorLeaveDeleteView(generics.DestroyAPIView):
#     """DELETE /doctors/leave/{leave_id}/ - Delete leave"""
#     permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
#     authentication_classes = [JWTAuthentication]
#     queryset = DoctorLeave.objects.all()

class DoctorLeaveCreateView(generics.CreateAPIView):
    """POST /doctors/leaves/ - Apply for leave"""
    queryset = DoctorLeave.objects.all()
    serializer_class = DoctorLeaveSerializer
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

class DoctorLeaveListView(generics.ListAPIView):
    """GET /doctors/leaves/?doctor_id=<id>&date_filter=month - Fetch leave records"""
    serializer_class = DoctorLeaveSerializer
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["doctor", "clinic", "start_date", "end_date"]
    ordering_fields = ["start_date"]

    def get_queryset(self):
        doctor_id = self.request.query_params.get("doctor_id")
        date_filter = self.request.query_params.get("date_filter")

        queryset = DoctorLeave.objects.all()

        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)

        if date_filter == "week":
            queryset = queryset.filter(start_date__gte=date.today(), end_date__lte=date.today() + timedelta(days=7))
        elif date_filter == "month":
            queryset = queryset.filter(start_date__gte=date.today().replace(day=1))

        return queryset

class DoctorLeaveUpdateView(generics.UpdateAPIView):
    """PATCH /doctors/leaves/{leave_id}/ - Update leave"""
    queryset = DoctorLeave.objects.all()
    serializer_class = DoctorLeaveSerializer
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

class DoctorLeaveDeleteView(generics.DestroyAPIView):
    """DELETE /doctors/leaves/{leave_id}/ - Delete leave"""
    queryset = DoctorLeave.objects.all()
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]