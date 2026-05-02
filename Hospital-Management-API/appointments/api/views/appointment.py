import calendar
import logging
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.cache import cache
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.timezone import localdate, localtime, now, timedelta
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
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
    AppointmentListSerializer,
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
from appointments.utils.booking_validation import MAX_BOOKING_DAYS as DEFAULT_MAX_BOOKING_DAYS
from appointments.utils.default_doctor_availability import ensure_doctor_availability
from appointments.utils.slot_generation import (
    format_slot_time,
    generate_slots,
    ordered_day_windows,
    parse_time_string,
    slot_bucket_counts,
)
from clinic.models import Clinic
from doctor.models import DoctorLeave, doctor

logger = logging.getLogger(__name__)
IST = ZoneInfo("Asia/Kolkata")
CACHE_TIMEOUT = 300

APPOINTMENT_LIST_TABS = frozenset({"today", "upcoming", "completed", "cancelled"})
CANCELLED_LIKE_STATUSES = ("cancelled", "no_show")


class AppointmentListView(generics.ListCreateAPIView):
    """
    GET /api/appointments/ — tabbed, filterable list for helpdesk UI.
    POST /api/appointments/ — create appointment (unchanged contract).
    """

    permission_classes = [IsAuthenticated, IsHelpdeskOrPatient]
    authentication_classes = [JWTAuthentication]
    queryset = Appointment.objects.none()
    pagination_class = None

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AppointmentCreateSerializer
        return AppointmentListSerializer

    def get_queryset(self):
        request = self.request
        user = request.user
        qs = Appointment.objects.select_related(
            "patient_profile",
            "doctor__user",
            "clinic",
            "patient_account__user",
        )

        if user.is_superuser:
            pass
        elif user.groups.filter(name="patient").exists():
            qs = qs.filter(patient_account__user=user)
        elif user.groups.filter(name__in=["helpdesk", "helpdesk_admin"]).exists():
            hp = getattr(user, "helpdesk_profile", None)
            if hp is None:
                raise PermissionDenied("No helpdesk clinic assignment for this user.")
            qs = qs.filter(clinic_id=hp.clinic_id)
            clinic_param = request.query_params.get("clinic_id")
            if clinic_param and str(hp.clinic_id) != str(clinic_param):
                raise ValidationError(
                    {"clinic_id": "Does not match your assigned clinic."},
                )
        else:
            return Appointment.objects.none()

        tab = request.query_params.get("tab") or "today"
        if tab not in APPOINTMENT_LIST_TABS:
            raise ValidationError(
                {"tab": f"Invalid tab. Allowed: {', '.join(sorted(APPOINTMENT_LIST_TABS))}."},
            )

        today = localdate()
        non_cancelled = ~Q(status__in=CANCELLED_LIKE_STATUSES)

        if tab == "today":
            qs = qs.filter(appointment_date=today).filter(non_cancelled)
        elif tab == "upcoming":
            qs = qs.filter(appointment_date__gt=today).filter(non_cancelled)
        elif tab == "completed":
            qs = qs.filter(status="completed")
        elif tab == "cancelled":
            qs = qs.filter(status__in=CANCELLED_LIKE_STATUSES)

        doctor_id = request.query_params.get("doctor_id")
        if doctor_id:
            qs = qs.filter(doctor_id=doctor_id)

        clinic_id = request.query_params.get("clinic_id")
        if clinic_id:
            qs = qs.filter(clinic_id=clinic_id)

        date_str = request.query_params.get("date")
        if date_str:
            try:
                exact_date = timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                raise ValidationError({"date": "Invalid date. Use YYYY-MM-DD."})
            qs = qs.filter(appointment_date=exact_date)

        status_override = request.query_params.get("status")
        if status_override:
            qs = qs.filter(status=status_override)

        if tab in ("completed", "cancelled"):
            qs = qs.order_by("-appointment_date", "-slot_start_time")
        else:
            qs = qs.order_by("appointment_date", "slot_start_time")

        return qs

    def list(self, request, *args, **kwargs):
        tab = request.query_params.get("tab") or "today"
        logger.info(
            "appointment_list tab=%s doctor_id=%s clinic_id=%s user_id=%s",
            tab,
            request.query_params.get("doctor_id"),
            request.query_params.get("clinic_id"),
            getattr(request.user, "id", None),
        )
        return super().list(request, *args, **kwargs)

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


# Backward compatibility for imports and URL name.
AppointmentCreateView = AppointmentListView


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

        body = AppointmentListSerializer(appointment).data
        return Response(
            {"status": "success", "message": "Appointment fetched successfully", "data": body},
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
    """PATCH /api/appointments/<id>/reschedule/ — slot-based reschedule (helpdesk / patient)."""

    permission_classes = [IsAuthenticated, IsHelpdeskOrPatient]
    authentication_classes = [JWTAuthentication]

    def _get_reschedule_appointment(self, request, pk):
        user = request.user
        qs = Appointment.objects.select_related(
            "doctor",
            "clinic",
            "patient_profile",
            "patient_account",
        )
        if user.is_superuser:
            return qs.get(id=pk)
        if user.groups.filter(name="patient").exists():
            return qs.get(id=pk, patient_account__user=user)
        if user.groups.filter(name__in=["helpdesk", "helpdesk_admin"]).exists():
            hp = getattr(user, "helpdesk_profile", None)
            if hp is None:
                raise PermissionDenied("No helpdesk clinic assignment for this user.")
            return qs.get(id=pk, clinic_id=hp.clinic_id)
        raise PermissionDenied("You do not have permission to reschedule this appointment.")

    @transaction.atomic
    def patch(self, request, pk):
        try:
            appointment = self._get_reschedule_appointment(request, pk)
        except Appointment.DoesNotExist:
            logger.warning("Reschedule: appointment not found or out of scope pk=%s", pk)
            return Response(
                {"detail": "Not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = AppointmentRescheduleSerializer(
            appointment,
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        if not serializer._reschedule_no_op:
            log_appointment_history(
                appointment=instance,
                status="scheduled",
                changed_by=request.user,
                comment="Rescheduled",
            )
        body = AppointmentCreatedResponseSerializer().to_representation(instance)
        return Response(body, status=status.HTTP_200_OK)


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

        if sort_by in ["appointment_date", "slot_start_time", "clinic_name"]:
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
    scope = "appointment_slots"


def _availability_entry_day_raw(entry: dict) -> str:
    raw = entry.get("day")
    if raw is None:
        return ""
    return str(raw).strip().lower()


# Map short / alternate labels to calendar.day_name values (all lowercase).
_DAY_ABBREV_TO_FULL = {
    "sun": "sunday",
    "mon": "monday",
    "tue": "tuesday",
    "tues": "tuesday",
    "wed": "wednesday",
    "thu": "thursday",
    "thur": "thursday",
    "thurs": "thursday",
    "fri": "friday",
    "sat": "saturday",
}


def _normalize_weekday_name(token: str) -> str:
    t = (token or "").strip().lower()
    if not t:
        return ""
    return _DAY_ABBREV_TO_FULL.get(t, t)


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
                target_date = timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"status": "error", "message": "Invalid date format. Use YYYY-MM-DD.", "data": None},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            today = timezone.localdate()
            if target_date < today:
                return Response(
                    {"status": "error", "message": "Date cannot be in the past.", "data": None},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            max_days = int(getattr(settings, "MAX_BOOKING_DAYS", DEFAULT_MAX_BOOKING_DAYS))
            if target_date > today + timedelta(days=max_days):
                return Response(
                    {
                        "status": "error",
                        "message": f"Date must be within {max_days} days from today.",
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                doctor_obj = doctor.objects.get(id=doctor_id)
            except doctor.DoesNotExist:
                return Response(
                    {"status": "error", "message": "Doctor not found.", "data": None},
                    status=status.HTTP_404_NOT_FOUND,
                )

            try:
                clinic = Clinic.objects.get(id=clinic_id)
            except Clinic.DoesNotExist:
                return Response(
                    {"status": "error", "message": "Clinic not found.", "data": None},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if not doctor_obj.clinics.filter(id=clinic.id).exists():
                return Response(
                    {"status": "error", "message": "Doctor is not associated with this clinic.", "data": None},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            is_on_leave = DoctorLeave.objects.filter(
                doctor=doctor_obj,
                clinic=clinic,
                start_date__lte=target_date,
                end_date__gte=target_date,
            ).exists()

            availability, availability_bootstrapped = ensure_doctor_availability(doctor_obj, clinic)

            # English weekday name only — strftime("%A") follows server locale and may not match JSON "monday".
            weekday = calendar.day_name[target_date.weekday()].lower()

            availability_days = availability.availability
            if not isinstance(availability_days, list) or len(availability_days) == 0:
                return Response(
                    {
                        "status": "success",
                        "message": "Doctor availability data is invalid. Contact support.",
                        "data": {
                            "date": date_str,
                            "doctor_id": str(doctor_id),
                            "clinic_id": str(clinic_id),
                            "slots": [],
                            "summary": {"morning": 0, "afternoon": 0, "evening": 0},
                            "meta": {
                                "day_name": weekday.capitalize(),
                                "is_on_leave": is_on_leave,
                                "reason": "availability_invalid",
                            },
                        },
                    },
                    status=status.HTTP_200_OK,
                )

            day_availability = next(
                (
                    entry
                    for entry in availability_days
                    if isinstance(entry, dict)
                    and _normalize_weekday_name(_availability_entry_day_raw(entry)) == weekday
                ),
                None,
            )

            if not day_availability:
                return Response(
                    {
                        "status": "success",
                        "message": f"Doctor is not available on {weekday}.",
                        "data": {
                            "date": date_str,
                            "doctor_id": str(doctor_id),
                            "clinic_id": str(clinic_id),
                            "slots": [],
                            "summary": {"morning": 0, "afternoon": 0, "evening": 0},
                            "meta": {
                                "day_name": weekday.capitalize(),
                                "is_on_leave": is_on_leave,
                                "reason": "closed_weekday",
                            },
                        },
                    },
                    status=status.HTTP_200_OK,
                )

            if isinstance(day_availability, dict) and day_availability.get("is_working") is False:
                return Response(
                    {
                        "status": "success",
                        "message": "Doctor is not scheduled to work on this day.",
                        "data": {
                            "date": date_str,
                            "doctor_id": str(doctor_id),
                            "clinic_id": str(clinic_id),
                            "slots": [],
                            "summary": {"morning": 0, "afternoon": 0, "evening": 0},
                            "meta": {
                                "day_name": weekday.capitalize(),
                                "is_on_leave": is_on_leave,
                                "reason": "not_working_day",
                            },
                        },
                    },
                    status=status.HTTP_200_OK,
                )

            duration = max(1, int(availability.slot_duration or 0))
            buffer_min = max(0, int(availability.buffer_time or 0))

            flat_slots = []
            for start_str, end_str in ordered_day_windows(day_availability):
                ws = parse_time_string(start_str)
                we = parse_time_string(end_str)
                if not ws or not we:
                    continue
                for slot in generate_slots(target_date, ws, we, duration, buffer_min):
                    flat_slots.append(slot)

            booked_times = set(
                Appointment.objects.filter(
                    doctor_id=doctor_id,
                    clinic_id=clinic_id,
                    appointment_date=target_date,
                    status__in=["scheduled", "checked_in", "in_consultation"],
                ).values_list("slot_start_time", flat=True)
            )

            out_slots = []
            for slot in flat_slots:
                st = slot["start_time"]
                et = slot["end_time"]
                if is_on_leave:
                    slot_status = "blocked"
                elif st in booked_times:
                    slot_status = "booked"
                else:
                    slot_status = "available"
                out_slots.append(
                    {
                        "start_time": format_slot_time(st),
                        "end_time": format_slot_time(et),
                        "status": slot_status,
                    }
                )

            summary = slot_bucket_counts([s["start_time"] for s in flat_slots])

            response_data = {
                "date": date_str,
                "doctor_id": str(doctor_id),
                "clinic_id": str(clinic_id),
                "slots": out_slots,
                "summary": summary,
                "meta": {
                    "day_name": weekday.capitalize(),
                    "is_on_leave": is_on_leave,
                    "slot_duration": availability.slot_duration,
                    "buffer_time": availability.buffer_time,
                    "availability_bootstrapped": availability_bootstrapped,
                },
            }

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
                        "slot_start_time": str(appointment.slot_start_time),
                        "slot_end_time": str(appointment.slot_end_time),
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
        ).order_by("appointment_date", "slot_start_time")

        calendar_data = {}
        for appt in appointments:
            date_str = appt.appointment_date.strftime("%Y-%m-%d")
            calendar_data.setdefault(date_str, []).append(
                {
                    "id": str(appt.id),
                    "time": appt.slot_start_time.strftime("%H:%M"),
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
