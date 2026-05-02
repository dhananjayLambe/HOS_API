import logging
from zoneinfo import ZoneInfo

from django.core.cache import cache
from django.core.paginator import Paginator
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.timezone import localdate, localtime, now, timedelta
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from account.permissions import IsDoctorOrHelpdesk, IsDoctorOrHelpdeskOrPatient, IsHelpdeskOrPatient
from appointments.api.serializers import (
    AppointmentCreatedResponseSerializer,
    AppointmentCreateSerializer,
    AppointmentHistorySerializer,
    AppointmentRescheduleSerializer,
    AppointmentSerializer,
    AppointmentStatusUpdateSerializer,
    DoctorAppointmentFilterSerializer,
    DoctorAppointmentSerializer,
    PatientAppointmentFilterSerializer,
    PatientAppointmentSerializer,
    WalkInAppointmentSerializer,
)
from appointments.models import Appointment, AppointmentHistory
from appointments.utils.history import log_appointment_history
from clinic.models import Clinic
from doctor.models import DoctorAvailability, DoctorLeave, doctor

logger = logging.getLogger(__name__)
IST = ZoneInfo("Asia/Kolkata")
CACHE_TIMEOUT = 300


class AppointmentCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated, IsHelpdeskOrPatient]
    authentication_classes = [JWTAuthentication]
    queryset = Appointment.objects.all()
    serializer_class = AppointmentCreateSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save()
        appointment = Appointment.objects.select_related(
            "patient_profile", "doctor__user"
        ).get(pk=appointment.pk)
        logger.info(
            "appointment_created appointment_id=%s doctor_id=%s clinic_id=%s patient_account_id=%s",
            appointment.id,
            appointment.doctor_id,
            appointment.clinic_id,
            appointment.patient_account_id,
        )
        body = AppointmentCreatedResponseSerializer().to_representation(appointment)
        return Response(body, status=status.HTTP_201_CREATED)


class AppointmentDetailView(generics.GenericAPIView):
    serializer_class = AppointmentSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdeskOrPatient]

    def post(self, request):
        appointment_id = request.data.get("id")
        if not appointment_id:
            return Response(
                {"status": "error", "message": "Appointment ID is required", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            appointment = Appointment.objects.select_related("doctor", "clinic", "patient_profile", "patient_account").get(
                id=appointment_id
            )
        except Appointment.DoesNotExist:
            return Response(
                {"status": "error", "message": "Appointment not found", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(appointment)
        return Response(
            {"status": "success", "message": "Appointment fetched successfully", "data": serializer.data},
            status=status.HTTP_200_OK,
        )


class AppointmentCancelView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdeskOrPatient]
    authentication_classes = [JWTAuthentication]

    def patch(self, request):
        appointment_id = request.data.get("id")
        if not appointment_id:
            return Response(
                {"status": "error", "message": "Appointment ID is required.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            appointment = Appointment.objects.select_related("doctor", "clinic", "patient_profile", "patient_account").get(
                id=appointment_id, status="scheduled"
            )
        except Appointment.DoesNotExist:
            return Response(
                {"status": "error", "message": "Appointment not found or is not in scheduled state.", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )

        if appointment.status != "scheduled":
            return Response(
                {
                    "status": "error",
                    "message": f"Cannot cancel appointment as it is already {appointment.status}.",
                    "data": None,
                },
                status=status.HTTP_409_CONFLICT,
            )

        appointment.status = "cancelled"
        appointment.updated_at = now()
        appointment.save(update_fields=["status", "updated_at"])
        log_appointment_history(
            appointment=appointment,
            status="cancelled",
            changed_by=request.user,
            comment="Appointment cancelled via API",
        )

        return Response(
            {
                "status": "success",
                "message": "Appointment cancelled successfully.",
                "data": {"appointment_id": str(appointment.id), "status": appointment.status},
            },
            status=status.HTTP_200_OK,
        )


class AppointmentRescheduleView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdeskOrPatient]
    authentication_classes = [JWTAuthentication]

    @transaction.atomic
    def patch(self, request):
        appointment_id = request.data.get("id")
        if not appointment_id:
            return Response(
                {"status": "error", "message": "Appointment ID is required.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            appointment = Appointment.objects.select_related("doctor", "clinic", "patient_profile", "patient_account").get(
                id=appointment_id, status="scheduled"
            )
        except Appointment.DoesNotExist:
            logger.warning("Attempt to reschedule non-existing or modified appointment: %s", appointment_id)
            return Response(
                {"status": "error", "message": "Appointment not found or already modified.", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AppointmentRescheduleSerializer(appointment, data=request.data, partial=True)
        if not serializer.is_valid():
            logger.warning("Reschedule validation failed for appointment %s: %s", appointment_id, serializer.errors)
            return Response(
                {"status": "error", "message": "Validation failed.", "data": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            serializer.save(updated_at=now())
            log_appointment_history(
                appointment=appointment,
                status="rescheduled",
                changed_by=request.user,
                comment=(
                    f"Rescheduled to {serializer.validated_data.get('appointment_date')} "
                    f"{serializer.validated_data.get('appointment_time')}"
                ),
            )
            return Response(
                {"status": "success", "message": "Appointment rescheduled successfully.", "data": serializer.data},
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            logger.error("Failed to reschedule appointment %s: %s", appointment_id, str(exc))
            return Response(
                {"status": "error", "message": "Something went wrong during rescheduling.", "data": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class DoctorAppointmentsView(generics.GenericAPIView):
    serializer_class = DoctorAppointmentSerializer
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
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

        if clinic_id:
            queryset = queryset.filter(clinic_id=clinic_id)

        today = localdate()
        if date_filter == "today":
            queryset = queryset.filter(appointment_date=today)
        elif date_filter == "tomorrow":
            queryset = queryset.filter(appointment_date=today + timedelta(days=1))
        elif date_filter == "week":
            week_start = today - timedelta(days=today.weekday())
            week_end = week_start + timedelta(days=6)
            queryset = queryset.filter(appointment_date__range=[week_start, week_end])
        elif date_filter == "custom" and custom_start_date and custom_end_date:
            queryset = queryset.filter(appointment_date__range=[custom_start_date, custom_end_date])

        if appointment_status:
            queryset = queryset.filter(status=appointment_status)

        if payment_status is not None:
            queryset = queryset.filter(payment_status=payment_status)

        if sort_by in ["appointment_date", "appointment_time", "clinic_name"]:
            queryset = queryset.order_by(sort_by)

        paginator = Paginator(queryset, page_size)
        paginated_appointments = paginator.get_page(page)
        serializer = DoctorAppointmentSerializer(paginated_appointments, many=True)
        return Response(
            {
                "total_appointments": paginator.count,
                "total_pages": paginator.num_pages,
                "current_page": page,
                "appointments": serializer.data,
            }
        )


class PatientAppointmentsView(generics.GenericAPIView):
    serializer_class = PatientAppointmentSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        filter_serializer = PatientAppointmentFilterSerializer(data=request.data)
        if not filter_serializer.is_valid():
            return Response(
                {"status": "error", "message": "Validation failed", "data": filter_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        filters = filter_serializer.validated_data
        queryset = Appointment.objects.select_related("doctor", "clinic", "patient_profile", "patient_account").filter(
            patient_account_id=filters["patient_account_id"]
        )

        if filters.get("patient_profile_ids"):
            queryset = queryset.filter(patient_profile_id__in=filters["patient_profile_ids"])
        if filters.get("doctor_id"):
            queryset = queryset.filter(doctor_id=filters["doctor_id"])
        if filters.get("clinic_id"):
            queryset = queryset.filter(clinic_id=filters["clinic_id"])

        today = localdate()
        date_filter = filters.get("date_filter")
        if date_filter == "today":
            queryset = queryset.filter(appointment_date=today)
        elif date_filter == "tomorrow":
            queryset = queryset.filter(appointment_date=today + timedelta(days=1))
        elif date_filter == "week":
            start_of_week = today - timedelta(days=today.weekday())
            end_of_week = start_of_week + timedelta(days=6)
            queryset = queryset.filter(appointment_date__range=(start_of_week, end_of_week))
        elif date_filter == "custom" and filters.get("custom_start_date") and filters.get("custom_end_date"):
            queryset = queryset.filter(
                appointment_date__range=(filters["custom_start_date"], filters["custom_end_date"])
            )

        if filters.get("appointment_status"):
            queryset = queryset.filter(status=filters["appointment_status"])

        if filters.get("payment_status") is not None:
            queryset = queryset.filter(payment_status=filters["payment_status"])

        sort_by = filters.get("sort_by", "appointment_date")
        queryset = queryset.order_by(sort_by)

        page = filters.get("page", 1)
        page_size = filters.get("page_size", 10)
        paginator = Paginator(queryset, page_size)
        paginated_qs = paginator.get_page(page)
        serializer = self.get_serializer(paginated_qs, many=True)

        return Response(
            {
                "status": "success",
                "message": "Appointments fetched successfully.",
                "total_appointments": paginator.count,
                "total_pages": paginator.num_pages,
                "current_page": page,
                "appointments": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class DoctorSlotThrottle(UserRateThrottle):
    rate = "10/min"


class AppointmentSlotView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    throttle_classes = [DoctorSlotThrottle]

    def get(self, request):
        try:
            doctor_id = request.query_params.get("doctor_id")
            clinic_id = request.query_params.get("clinic_id")
            date_str = request.query_params.get("date")

            if not (doctor_id and clinic_id and date_str):
                return Response(
                    {"status": "error", "message": "doctor_id, clinic_id, and date are required.", "data": None},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                date = timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"status": "error", "message": "Invalid date format. Use YYYY-MM-DD.", "data": None},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            cache_key = f"slots_{doctor_id}_{clinic_id}_{date_str}"
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(
                    {"status": "success", "message": "Slots fetched from cache.", "data": cached_data},
                    status=status.HTTP_200_OK,
                )

            doctor_obj = get_object_or_404(doctor, id=doctor_id)
            clinic = get_object_or_404(Clinic, id=clinic_id)

            is_on_leave = DoctorLeave.objects.filter(
                doctor=doctor_obj,
                clinic=clinic,
                start_date__lte=date,
                end_date__gte=date,
            ).exists()

            availability = DoctorAvailability.objects.filter(doctor=doctor_obj, clinic=clinic).first()

            if not availability:
                return Response(
                    {"status": "error", "message": "Doctor availability not configured for this clinic.", "data": None},
                    status=status.HTTP_404_NOT_FOUND,
                )

            weekday = date.strftime("%A").lower()
            day_availability = next(
                (entry for entry in availability.availability if entry.get("day", "").lower() == weekday),
                None,
            )

            if not day_availability:
                return Response(
                    {"status": "error", "message": f"Doctor is not available on {weekday}.", "data": None},
                    status=status.HTTP_404_NOT_FOUND,
                )

            def generate_slots(start_time_str, end_time_str):
                slots = []
                if not start_time_str or not end_time_str:
                    return slots

                try:
                    start_time = timezone.datetime.strptime(start_time_str, "%H:%M:%S").time()
                    end_time = timezone.datetime.strptime(end_time_str, "%H:%M:%S").time()
                except ValueError:
                    return slots

                start = timezone.make_aware(timezone.datetime.combine(date, start_time))
                end = timezone.make_aware(timezone.datetime.combine(date, end_time))
                current = start
                duration = availability.slot_duration
                buffer = availability.buffer_time

                while current + timedelta(minutes=duration) <= end:
                    slot_end = current + timedelta(minutes=duration)
                    is_booked = Appointment.objects.filter(
                        doctor=doctor_obj,
                        clinic=clinic,
                        appointment_date=date,
                        appointment_time=current.time(),
                        status="scheduled",
                    ).exists()

                    slots.append(
                        {
                            "start_time": current.strftime("%H:%M:%S"),
                            "end_time": slot_end.strftime("%H:%M:%S"),
                            "available": not is_booked and not is_on_leave,
                        }
                    )
                    current = slot_end + timedelta(minutes=buffer)
                return slots

            slots = {
                "morning": generate_slots(day_availability.get("morning_start"), day_availability.get("morning_end")),
                "afternoon": generate_slots(
                    day_availability.get("afternoon_start"),
                    day_availability.get("afternoon_end"),
                ),
                "evening": generate_slots(day_availability.get("evening_start"), day_availability.get("evening_end")),
                "night": generate_slots(day_availability.get("night_start"), day_availability.get("night_end")),
            }

            response_data = {
                "doctor_id": str(doctor_id),
                "clinic_id": str(clinic_id),
                "date": date_str,
                "slots": slots,
                "meta": {
                    "day_name": weekday.capitalize(),
                    "is_on_leave": is_on_leave,
                    "slot_duration": availability.slot_duration,
                    "buffer_time": availability.buffer_time,
                },
            }

            cache.set(cache_key, response_data, timeout=30)
            logger.info("Slot availability fetched for doctor %s at clinic %s on %s", doctor_id, clinic_id, date_str)
            return Response(
                {"status": "success", "message": "Slot availability retrieved successfully.", "data": response_data},
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            logger.exception("Slot API error: %s", str(exc))
            return Response(
                {"status": "error", "message": "Internal Server Error", "data": None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AppointmentHistoryView(generics.ListAPIView):
    serializer_class = AppointmentHistorySerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        appointment_id = self.request.query_params.get("appointment_id")
        if not appointment_id:
            return AppointmentHistory.objects.none()
        return AppointmentHistory.objects.filter(appointment_id=appointment_id)

    def list(self, request, *args, **kwargs):
        appointment_id = request.query_params.get("appointment_id")
        if not appointment_id:
            return Response({"status": "error", "message": "appointment_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        queryset = self.get_queryset()
        if not queryset.exists():
            return Response(
                {"status": "success", "message": "No history available for this appointment", "data": []},
                status=status.HTTP_200_OK,
            )

        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "status": "success",
                "message": "Appointment history fetched successfully",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class AppointmentStatusUpdateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]

    @transaction.atomic
    def patch(self, request):
        serializer = AppointmentStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"status": "error", "message": "Invalid input", "data": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment_id = serializer.validated_data["id"]
        new_status = serializer.validated_data["status"]
        comment = serializer.validated_data.get("comment", "")

        try:
            appointment = Appointment.objects.select_related("doctor", "clinic", "patient_profile", "patient_account").get(
                id=appointment_id
            )
        except Appointment.DoesNotExist:
            return Response(
                {"status": "error", "message": "Appointment not found", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )

        if appointment.status in ["cancelled", "no_show", "completed"]:
            return Response(
                {
                    "status": "error",
                    "message": f"Cannot update status as the appointment is already '{appointment.status}'",
                    "data": None,
                },
                status=status.HTTP_409_CONFLICT,
            )

        appointment.status = new_status
        appointment.updated_at = now()
        appointment.save(update_fields=["status", "updated_at"])
        log_appointment_history(
            appointment=appointment,
            status=new_status,
            changed_by=request.user,
            comment=comment or f"Status manually set to {new_status}",
        )

        return Response(
            {
                "status": "success",
                "message": f"Appointment marked as {new_status} successfully",
                "data": {"appointment_id": str(appointment.id), "status": new_status},
            },
            status=status.HTTP_200_OK,
        )


class WalkInAppointmentCreateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        data = request.data.copy()

        if "appointment_date" not in data:
            data["appointment_date"] = timezone.localdate()

        serializer = WalkInAppointmentSerializer(data=data)
        if not serializer.is_valid():
            return Response(
                {"status": "error", "message": "Validation failed", "data": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            appointment = serializer.save()
            return Response(
                {
                    "status": "success",
                    "message": "Walk-in appointment created successfully",
                    "data": {
                        "appointment_id": str(appointment.id),
                        "doctor": appointment.doctor.get_name,
                        "clinic": appointment.clinic.name,
                        "appointment_date": appointment.appointment_date,
                        "appointment_time": str(appointment.appointment_time),
                        "status": appointment.status,
                    },
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as exc:
            return Response(
                {"status": "error", "message": "Internal server error", "data": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AppointmentTodayMetricsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]

    def get(self, request):
        doctor_id = request.query_params.get("doctor_id")
        clinic_id = request.query_params.get("clinic_id")

        if not doctor_id or not clinic_id:
            return Response(
                {"status": "error", "message": "doctor_id and clinic_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now_ist = localtime().astimezone(IST)
        today_ist = now_ist.date()

        cache_key = f"appointment_metrics:{doctor_id}:{clinic_id}:{today_ist}"
        cached_metrics = cache.get(cache_key)
        if cached_metrics:
            return Response(
                {
                    "status": "success",
                    "message": "Today's appointment metrics retrieved from cache",
                    "timestamp": now_ist.strftime("%Y-%m-%d %H:%M:%S"),
                    "data": cached_metrics,
                },
                status=status.HTTP_200_OK,
            )

        qs = Appointment.objects.filter(doctor_id=doctor_id, clinic_id=clinic_id, appointment_date=today_ist)
        metrics = {
            "date": str(today_ist),
            "scheduled": qs.filter(status="scheduled").count(),
            "completed": qs.filter(status="completed").count(),
            "cancelled": qs.filter(status="cancelled").count(),
            "no_show": qs.filter(status="no_show").count(),
        }

        cache.set(cache_key, metrics, timeout=CACHE_TIMEOUT)
        return Response(
            {
                "status": "success",
                "message": "Today's appointment metrics retrieved",
                "timestamp": now_ist.strftime("%Y-%m-%d %H:%M:%S"),
                "data": metrics,
            },
            status=status.HTTP_200_OK,
        )


class DoctorCalendarView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]

    def get(self, request):
        doctor_id = request.query_params.get("doctor_id")
        clinic_id = request.query_params.get("clinic_id")
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        if not doctor_id or not clinic_id:
            return Response(
                {"status": "error", "message": "doctor_id and clinic_id are required.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now_ist = localtime().astimezone(IST)

        try:
            start_date = timezone.datetime.strptime(start_date_str, "%Y-%m-%d").date() if start_date_str else now_ist.date()
            end_date = (
                timezone.datetime.strptime(end_date_str, "%Y-%m-%d").date()
                if end_date_str
                else start_date + timedelta(days=6)
            )
        except ValueError:
            return Response(
                {"status": "error", "message": "Invalid date format. Use YYYY-MM-DD.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if start_date > end_date:
            return Response(
                {"status": "error", "message": "start_date cannot be after end_date.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (end_date - start_date).days > 31:
            return Response(
                {"status": "error", "message": "Date range cannot exceed 31 days.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cache_key = f"calendar_view:{doctor_id}:{clinic_id}:{start_date}:{end_date}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(
                {
                    "status": "success",
                    "message": "Doctor calendar fetched from cache.",
                    "timestamp": now_ist.strftime("%Y-%m-%d %H:%M:%S"),
                    "data": cached_data,
                },
                status=status.HTTP_200_OK,
            )

        appointments = Appointment.objects.filter(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            appointment_date__range=(start_date, end_date),
        ).order_by("appointment_date", "appointment_time")

        calendar_data = {}
        for appt in appointments:
            date_str = appt.appointment_date.strftime("%Y-%m-%d")
            calendar_data.setdefault(date_str, []).append(
                {
                    "id": str(appt.id),
                    "time": appt.appointment_time.strftime("%H:%M"),
                    "patient": appt.patient_profile.get_full_name(),
                    "status": appt.status,
                    "consultation_mode": appt.consultation_mode,
                    "booking_source": appt.booking_source,
                }
            )

        cache.set(cache_key, calendar_data, timeout=CACHE_TIMEOUT)
        return Response(
            {
                "status": "success",
                "message": "Doctor calendar fetched successfully.",
                "timestamp": now_ist.strftime("%Y-%m-%d %H:%M:%S"),
                "data": calendar_data,
            },
            status=status.HTTP_200_OK,
        )
