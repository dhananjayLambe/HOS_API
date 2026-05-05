import redis
import logging
import threading
from django.conf import settings
from django.utils.timezone import localdate
from django.db.models import F, Q
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from appointments.models import Appointment
from consultations_core.services.encounter_service import EncounterService
from consultations_core.services.queue_consultation_bridge import start_consultation_from_queue_entry
from doctor.models import doctor as DoctorModel
from queue_management.models import Queue
from patient_account.models import PatientAccount, PatientProfile
from rest_framework.generics import get_object_or_404,RetrieveAPIView
from clinic.models import Clinic
from queue_management.api.serializers import (
    DoctorActiveQueueSerializer,
    HelpdeskQueueRowSerializer,
    QueueSerializer,
    QueueUpdateSerializer,
    QueuePatientSerializer,
    QueueReorderSerializer,
)
from account.permissions import IsDoctor, IsDoctorOrHelpdesk,IsHelpdesk
from django.db import IntegrityError, transaction
from queue_management.services.queue_realtime import (
    publish_queue_update,
    queue_reorder_lock,
    update_queue_sorted_set,
)
from queue_management.services.queue_service import add_to_queue
from queue_management.services.queue_sync import _sync_queue_realtime
from queue_management.tasks import sync_queue_realtime_task

# Hide helpdesk "today" rows when the *clinical* visit is finished/cancelled but the Queue row was
# never updated (stale waiting row). Do NOT exclude consultation_in_progress / in_consultation:
# if consultation started but PATCH /queue/start/ failed, encounter advances while Queue.status
# can still be waiting — those patients must remain visible for helpdesk triage.
HELPDESK_TODAY_EXCLUDE_IF_ENCOUNTER_STATUS_IN = (
    "consultation_completed",
    "closed",
    "cancelled",
    "no_show",
    "completed",
)

# Initialize Redis connection
redis_client = redis.StrictRedis(host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=0, decode_responses=True)

# 1. POST /queue/check-in/ – Add a patient to the queue
class CheckInQueueAPIView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        clinic_id = request.data.get("clinic_id")
        patient_account_id = request.data.get("patient_account_id")
        patient_profile_id = request.data.get("patient_profile_id")
        doctor_id = request.data.get("doctor_id")
        appointment_id = request.data.get("appointment_id", None)
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

        doctor_obj = get_object_or_404(DoctorModel, id=doctor_id)
        appointment = None
        if appointment_id:
            appointment = Appointment.objects.filter(id=appointment_id).first()

        # Inner atomic so IntegrityError only rolls back the create; queries in except
        # must not run inside a doomed outer block (see StartNewVisitAPIView).
        try:
            with transaction.atomic():
                encounter, _enc_created = EncounterService.get_or_create_encounter(
                    clinic=clinic,
                    patient_account=patient_account,
                    patient_profile=patient_profile,
                    doctor=doctor_obj,
                    appointment=appointment,
                    encounter_type="walk_in",
                    entry_mode="helpdesk",
                    created_by=request.user,
                    consultation_type="FULL",
                )
        except IntegrityError:
            encounter = EncounterService.get_active_encounter(patient_account, clinic)
            if encounter is None:
                return Response(
                    {"error": "Could not resolve active encounter. Please retry check-in."},
                    status=status.HTTP_409_CONFLICT,
                )

        with transaction.atomic():
            update_fields = []
            if encounter.doctor_id != doctor_obj.id:
                encounter.doctor = doctor_obj
                update_fields.append("doctor")
            appt_id = appointment.id if appointment else None
            if encounter.appointment_id != appt_id:
                encounter.appointment = appointment
                update_fields.append("appointment")
            if update_fields:
                encounter.updated_by = request.user
                encounter.save(update_fields=update_fields + ["updated_by"])

            queue_entry = add_to_queue(encounter, request.user)
            logging.getLogger(__name__).info(
                "encounter.lifecycle.queue.checkin queue_id=%s encounter_id=%s visit_pnr=%s clinic_id=%s doctor_id=%s patient_profile_id=%s",
                queue_entry.id,
                getattr(encounter, "id", None),
                getattr(encounter, "visit_pnr", None),
                clinic_id,
                doctor_id,
                patient_profile_id,
            )

        queue_entry = Queue.objects.select_related("patient", "appointment", "encounter").get(pk=queue_entry.pk)
        return Response(HelpdeskQueueRowSerializer(queue_entry).data, status=status.HTTP_201_CREATED)

# 2. GET /queue/doctor/{id}/ – Get today’s live queue for a doctor at a clinic
class DoctorQueueAPIView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def get(self, request, doctor_id, clinic_id):
        if request.user.groups.filter(name="doctor").exists():
            doctor_profile = getattr(request.user, "doctor", None)
            if doctor_profile is None or str(doctor_profile.id) != str(doctor_id):
                return Response({"detail": "Invalid queue scope."}, status=status.HTTP_403_FORBIDDEN)
        today = localdate()
        queue = (
            Queue.objects.filter(
                doctor_id=doctor_id,
                clinic_id=clinic_id,
                created_at__date=today,
                status__in=("waiting", "vitals_done"),
            )
            .select_related(
                "patient",
                "appointment",
                "encounter",
                "encounter__pre_consultation",
                "encounter__pre_consultation__preconsultationvitals",
            )
            .only(
                "id",
                "encounter_id",
                "patient_id",
                "appointment_id",
                "status",
                "position_in_queue",
                "created_at",
                "patient__first_name",
                "patient__last_name",
                "patient__public_id",
                "patient__gender",
                "patient__date_of_birth",
                "patient__age_years",
                "encounter__visit_pnr",
                "encounter__pre_consultation__id",
                "encounter__pre_consultation__preconsultationvitals__data",
            )
            .order_by("position_in_queue")
        )
        return Response(DoctorActiveQueueSerializer(queue, many=True).data)


class HelpdeskClinicQueueAPIView(APIView):
    """
    GET /queue/helpdesk/today/ — today's queue rows for the helpdesk user's clinic
    (all approved doctors at that clinic). No hardcoded doctor/clinic in the client.
    """

    permission_classes = [IsAuthenticated, IsHelpdesk]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        hp = getattr(request.user, "helpdesk_profile", None)
        if hp is None:
            return Response(
                {"detail": "No helpdesk clinic assignment for this user."},
                status=status.HTTP_403_FORBIDDEN,
            )
        clinic = hp.clinic
        doctor_ids = list(
            DoctorModel.objects.filter(clinics__id=clinic.id, is_approved=True)
            .values_list("id", flat=True)
            .distinct()
        )
        today = localdate()
        if not doctor_ids:
            resp = Response([], status=status.HTTP_200_OK)
            resp["X-Queue-Calendar-Date"] = today.isoformat()
            return resp
        queue = (
            Queue.objects.filter(
                clinic_id=clinic.id,
                doctor_id__in=doctor_ids,
                created_at__date=today,
                status__in=("waiting", "vitals_done"),
            )
            .filter(
                Q(encounter__isnull=True)
                | ~Q(encounter__status__in=HELPDESK_TODAY_EXCLUDE_IF_ENCOUNTER_STATUS_IN)
            )
            .select_related(
                "patient",
                "appointment",
                "encounter",
                "encounter__pre_consultation",
                "encounter__pre_consultation__preconsultationvitals",
                "patient_account__user",
            )
            .order_by("doctor_id", "position_in_queue")
        )
        body = HelpdeskQueueRowSerializer(queue, many=True).data
        resp = Response(body, status=status.HTTP_200_OK)
        resp["X-Queue-Calendar-Date"] = today.isoformat()
        return resp


class HelpdeskQueueContextAPIView(APIView):
    """
    GET /queue/helpdesk/context/ — clinic + default doctor context for check-in calls.
    """

    permission_classes = [IsAuthenticated, IsHelpdesk]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        hp = getattr(request.user, "helpdesk_profile", None)
        if hp is None:
            return Response(
                {"detail": "No helpdesk clinic assignment for this user."},
                status=status.HTTP_403_FORBIDDEN,
            )
        clinic = hp.clinic
        doctors_qs = (
            DoctorModel.objects.filter(clinics__id=clinic.id, is_approved=True)
            .select_related("user")
            .distinct()
            .order_by("user__first_name", "user__last_name")
        )
        doctor_ids = list(doctors_qs.values_list("id", flat=True))
        if not doctor_ids:
            return Response(
                {"detail": "No approved doctor is currently assigned to this clinic."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        doctors_payload = [
            {
                "id": str(d.id),
                "name": (d.get_name or "").strip() or "Doctor",
                "specialization": (d.primary_specialization or "").strip(),
            }
            for d in doctors_qs
        ]
        return Response(
            {
                "clinic_id": str(clinic.id),
                "doctor_id": str(doctor_ids[0]),
                "doctor_ids": [str(did) for did in doctor_ids],
                "doctors": doctors_payload,
            },
            status=status.HTTP_200_OK,
        )


# 3. PATCH /queue/start/ – Mark a patient as In Consultation
class StartConsultationAPIView(APIView):
    permission_classes = [IsAuthenticated, IsDoctor]
    authentication_classes = [JWTAuthentication]

    def patch(self, request):
        queue_id = request.data.get("queue_id")
        encounter_id = request.data.get("encounter_id")
        clinic_id = request.data.get("clinic_id")

        if not clinic_id:
            return Response({"error": "Clinic ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not queue_id and not encounter_id:
            return Response(
                {"error": "Either queue_id or encounter_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        today = localdate()
        try:
            with transaction.atomic():
                # Avoid FOR UPDATE on nullable outer-join side (encounter is nullable FK).
                lookup_filters = {
                    "clinic_id": clinic_id,
                    "created_at__date": today,
                    "status__in": ("waiting", "vitals_done"),
                }
                if queue_id:
                    lookup_filters["id"] = queue_id
                else:
                    lookup_filters["encounter_id"] = encounter_id

                queue_entry = Queue.objects.select_for_update().get(**lookup_filters)
                queue_entry.status = "in_consultation"
                queue_entry.save()
                start_consultation_from_queue_entry(queue_entry, request.user)
                sync_doctor_id = str(queue_entry.doctor_id)
                sync_clinic_id = str(queue_entry.clinic_id)
                sync_queue_date = today
                logging.getLogger(__name__).info(
                    "encounter.lifecycle.queue.start queue_id=%s encounter_id=%s clinic_id=%s user_id=%s",
                    queue_entry.id,
                    getattr(queue_entry, "encounter_id", None),
                    clinic_id,
                    getattr(request.user, "id", None),
                )

            def _dispatch_realtime_sync():
                try:
                    sync_queue_realtime_task.delay(
                        doctor_id=sync_doctor_id,
                        clinic_id=sync_clinic_id,
                        queue_date_iso=sync_queue_date.isoformat(),
                    )
                except Exception:
                    logging.getLogger(__name__).exception(
                        "queue start: celery dispatch failed, falling back to thread"
                    )
                    threading.Thread(
                        target=_sync_queue_realtime,
                        kwargs={
                            "doctor_id": sync_doctor_id,
                            "clinic_id": sync_clinic_id,
                            "queue_date": sync_queue_date,
                        },
                        daemon=True,
                    ).start()

            transaction.on_commit(_dispatch_realtime_sync)
            return Response({"message": "Patient is now in consultation."}, status=status.HTTP_200_OK)
        except Queue.DoesNotExist:
            return Response(
                {"error": "Patient not found or not in waiting/vitals-done state."},
                status=status.HTTP_409_CONFLICT,
            )

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
            queue_entry = Queue.objects.get(id=queue_id, clinic_id=clinic_id,created_at__date=today, status="in_consultation")
            queue_doctor_id = queue_entry.doctor_id
            queue_clinic_id = queue_entry.clinic_id
            queue_entry.status = "completed"
            queue_entry.save()
            _sync_queue_realtime(
                doctor_id=queue_doctor_id,
                clinic_id=queue_clinic_id,
                queue_date=today,
            )
            return Response({"message": "Consultation completed."}, status=status.HTTP_200_OK)
        except Queue.DoesNotExist:
            return Response({"error": "Patient not found or not in consultation."}, status=status.HTTP_404_NOT_FOUND)

# 5. PATCH /queue/skip/ – Move patient to Skipped status
class SkipPatientAPIView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def patch(self, request):
        queue_id = request.data.get("queue_id")
        clinic_id = request.data.get("clinic_id")
        if not queue_id:
            return Response({"error": "Queue ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        today = localdate()
        try:
            query = Queue.objects.filter(
                id=queue_id,
                created_at__date=today,
                status__in=("waiting", "vitals_done", "in_consultation"),
            )
            if clinic_id:
                query = query.filter(clinic_id=clinic_id)
            queue_entry = query.get()
            queue_doctor_id = queue_entry.doctor_id
            queue_clinic_id = queue_entry.clinic_id
            queue_entry.status = "skipped"
            queue_entry.save()
            _sync_queue_realtime(
                doctor_id=queue_doctor_id,
                clinic_id=queue_clinic_id,
                queue_date=today,
            )
            return Response({"message": "Patient skipped."}, status=status.HTTP_200_OK)
        except Queue.DoesNotExist:
            return Response(
                {"error": "Patient not found or not in waiting / vitals-done status."},
                status=status.HTTP_404_NOT_FOUND,
            )


# 6. PATCH /queue/urgent/ – Prioritize an urgent patient in the queue
class UrgentPatientAPIView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def patch(self, request):
        queue_id = request.data.get("queue_id")
        if not queue_id:
            return Response({"error": "Queue ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            today = localdate()
            queue_entry = Queue.objects.get(
                id=queue_id,
                created_at__date=today,
                status__in=("waiting", "vitals_done"),
            )
            with transaction.atomic():
                active_scope_rows = list(
                    Queue.objects.select_for_update()
                    .filter(
                        doctor_id=queue_entry.doctor_id,
                        clinic_id=queue_entry.clinic_id,
                        created_at__date=today,
                        status__in=("waiting", "vitals_done", "in_consultation"),
                    )
                    .order_by("position_in_queue", "created_at", "id")
                )
                if not active_scope_rows:
                    return Response({"error": "No active queue rows found."}, status=status.HTTP_404_NOT_FOUND)

                movable_rows = [row for row in active_scope_rows if row.status in ("waiting", "vitals_done")]
                if not movable_rows:
                    return Response({"error": "No movable queue rows found."}, status=status.HTTP_404_NOT_FOUND)

                scope_by_id = {str(row.id): row for row in movable_rows}
                target = scope_by_id.get(str(queue_entry.id))
                if target is None:
                    return Response({"error": "Patient not found in active queue scope."}, status=status.HTTP_404_NOT_FOUND)

                reordered = [target] + [row for row in movable_rows if str(row.id) != str(target.id)]
                movable_slots = sorted(row.position_in_queue for row in movable_rows)
                for index, row in enumerate(reordered):
                    row.position_in_queue = movable_slots[index]

                # Two-phase write avoids transient unique collisions on active-position constraints.
                temp_offset = 10_000
                for row in reordered:
                    row.position_in_queue += temp_offset
                Queue.objects.bulk_update(reordered, ["position_in_queue"])

                for index, row in enumerate(reordered):
                    row.position_in_queue = movable_slots[index]
                Queue.objects.bulk_update(reordered, ["position_in_queue"])

            _sync_queue_realtime(
                doctor_id=queue_entry.doctor_id,
                clinic_id=queue_entry.clinic_id,
                queue_date=today,
            )
            return Response({"message": "Patient moved to urgent priority."}, status=status.HTTP_200_OK)
        except IntegrityError:
            return Response(
                {"error": "Queue changed during update. Please retry."},
                status=status.HTTP_409_CONFLICT,
            )
        except Queue.DoesNotExist:
            return Response(
                {"error": "Patient not found or not in waiting / vitals-done status."},
                status=status.HTTP_404_NOT_FOUND,
            )

class QueueDetailsView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]
    def get(self, request):
        queues = Queue.objects.all()
        serializer = QueueSerializer(queues, many=True)
        return Response(serializer.data)

class UpdateQueuePositionView(APIView):
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]
    def patch(self, request, queue_id):
        try:
            queue = Queue.objects.get(id=queue_id)
            new_position = request.data.get("new_position")
            if new_position is not None:
                queue.position_in_queue = new_position
                queue.save()
                serializer = QueueSerializer(queue)
                return Response(serializer.data)
            else:
                return Response({"error": "New position is required."}, status=400)
        except Queue.DoesNotExist:
            return Response({"error": "Queue not found."}, status=404)

class QueueReorderAPIView(APIView):
    """
    PATCH /queue/reorder/
    Updates queue positions dynamically based on provided ordered list of queue IDs.
    """
    permission_classes = [IsAuthenticated, IsDoctorOrHelpdesk]
    authentication_classes = [JWTAuthentication]

    def _error(self, code: str, message: str, http_status: int = status.HTTP_400_BAD_REQUEST):
        return Response({"error_code": code, "message": message}, status=http_status)

    def patch(self, request, *args, **kwargs):
        serializer = QueueReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        queue_items = serializer.validated_data["queue"]
        if not queue_items:
            return self._error("INVALID_PAYLOAD", "At least one queue item is required.")

        queue_ids = [str(item["id"]) for item in queue_items]
        positions = [item["position"] for item in queue_items]
        if len(set(queue_ids)) != len(queue_ids):
            return self._error("INVALID_PAYLOAD", "Duplicate queue IDs are not allowed.")
        if len(set(positions)) != len(positions):
            return self._error("INVALID_POSITION_SEQUENCE", "Duplicate positions are not allowed.")
        expected_positions = list(range(1, len(queue_items) + 1))
        if sorted(positions) != expected_positions:
            return self._error(
                "INVALID_POSITION_SEQUENCE",
                f"Positions must be contiguous from 1 to {len(queue_items)}.",
            )

        today = localdate()
        rows = list(Queue.objects.filter(id__in=queue_ids, created_at__date=today).select_related("doctor", "clinic"))
        if len(rows) != len(queue_ids):
            return self._error("NOT_FOUND", "One or more queue items are invalid.")
        by_id = {str(row.id): row for row in rows}

        first_row = rows[0]
        scope_doctor_id = first_row.doctor_id
        scope_clinic_id = first_row.clinic_id
        if any(row.doctor_id != scope_doctor_id or row.clinic_id != scope_clinic_id for row in rows):
            return self._error("INVALID_SCOPE", "Invalid queue scope: mixed doctor/clinic entries are not allowed.")

        is_helpdesk = request.user.groups.filter(name="helpdesk").exists()
        is_doctor = request.user.groups.filter(name="doctor").exists()
        if is_helpdesk:
            hp = getattr(request.user, "helpdesk_profile", None)
            if not hp or not hp.clinic_id:
                return self._error("INVALID_SCOPE", "No helpdesk clinic assignment for this user.", status.HTTP_403_FORBIDDEN)
            if scope_clinic_id != hp.clinic_id:
                return self._error("INVALID_SCOPE", "Invalid queue scope", status.HTTP_403_FORBIDDEN)
            allowed_doctor_ids = set(
                DoctorModel.objects.filter(clinics__id=hp.clinic_id, is_approved=True).values_list("id", flat=True)
            )
            if scope_doctor_id not in allowed_doctor_ids:
                return self._error("INVALID_SCOPE", "Invalid queue scope", status.HTTP_403_FORBIDDEN)
        elif is_doctor:
            doctor_profile = getattr(request.user, "doctor", None)
            if doctor_profile is None or str(doctor_profile.id) != str(scope_doctor_id):
                return self._error("INVALID_SCOPE", "Invalid queue scope", status.HTTP_403_FORBIDDEN)
        else:
            return self._error("INVALID_SCOPE", "Invalid queue scope", status.HTTP_403_FORBIDDEN)

        try:
            with queue_reorder_lock(str(scope_doctor_id), timeout_seconds=5):
                with transaction.atomic():
                    locked_scope_qs = Queue.objects.select_for_update().filter(
                        doctor_id=scope_doctor_id,
                        clinic_id=scope_clinic_id,
                        created_at__date=today,
                        status__in=("waiting", "vitals_done"),
                    )
                    locked_scope_rows = list(locked_scope_qs)
                    if len(locked_scope_rows) != len(queue_items):
                        return self._error("PARTIAL_QUEUE_UPDATE", "Full queue reorder required")
                    scope_ids = {str(row.id) for row in locked_scope_rows}
                    if scope_ids != set(queue_ids):
                        return self._error("PARTIAL_QUEUE_UPDATE", "Full queue reorder required")

                    allowed_statuses = {"waiting", "vitals_done"}
                    for item in queue_items:
                        row = by_id[str(item["id"])]
                        if row.status not in allowed_statuses:
                            return self._error(
                                "CONSULTATION_STARTED",
                                f"Cannot move patient {row.id} — consultation already started",
                            )

                    locked_by_id = {str(row.id): row for row in locked_scope_rows}
                    updates = []
                    for item in queue_items:
                        row = locked_by_id[str(item["id"])]
                        row.position_in_queue = item["position"]
                        updates.append(row)
                    # Two-phase write avoids transient duplicate key collisions on
                    # unique (doctor_id, clinic_id, position_in_queue) constraints.
                    temp_offset = 10_000
                    temp_updates = []
                    for row in updates:
                        row.position_in_queue = row.position_in_queue + temp_offset
                        temp_updates.append(row)
                    Queue.objects.bulk_update(temp_updates, ["position_in_queue"])

                    final_updates = []
                    for item in queue_items:
                        row = locked_by_id[str(item["id"])]
                        row.position_in_queue = item["position"]
                        final_updates.append(row)
                    Queue.objects.bulk_update(final_updates, ["position_in_queue"])
                    updates = final_updates

                    ordered_rows = sorted(
                        updates,
                        key=lambda x: x.position_in_queue,
                    )
                    redis_payload = [
                        {
                            "id": str(row.id),
                            "encounter_id": str(row.encounter_id) if row.encounter_id else None,
                            "position": row.position_in_queue,
                        }
                        for row in ordered_rows
                    ]
        except TimeoutError:
            return self._error("QUEUE_LOCK_TIMEOUT", "Queue is being updated. Please retry shortly.", status.HTTP_409_CONFLICT)

        update_queue_sorted_set(
            clinic_id=str(scope_clinic_id),
            doctor_id=str(scope_doctor_id),
            queue_date=today,
            queue_rows=redis_payload,
        )
        publish_queue_update(
            clinic_id=str(scope_clinic_id),
            doctor_id=str(scope_doctor_id),
            queue_date=today,
            queue_rows=redis_payload,
        )

        return Response({"message": "Queue reordered successfully"}, status=status.HTTP_200_OK)


class MarkPatientNotAvailableAPIView(APIView):
    """
    PATCH /queue/{id}/not-available/
    Temporarily marks a patient as not available in the queue.
    """
    permission_classes = [IsAuthenticated, IsHelpdesk]
    authentication_classes = [JWTAuthentication]

    def patch(self, request, id, *args, **kwargs):
        queue_entry = get_object_or_404(Queue, id=id)

        if queue_entry.status not in ["waiting", "vitals_done", "in_consultation"]:
            return Response({"error": "Cannot mark as not available in the current status"},
                            status=status.HTTP_400_BAD_REQUEST)

        queue_entry.status = "skipped"  # Mark as skipped (Can be re-added later)
        queue_entry.save()

        return Response({"message": "Patient marked as not available"}, status=status.HTTP_200_OK)


class CancelAppointmentAPIView(APIView):
    """
    DELETE /queue/{id}/
    Removes patient from the queue and cancels their appointment.
    """
    permission_classes = [IsAuthenticated, IsHelpdesk]
    authentication_classes = [JWTAuthentication]

    def delete(self, request, id, *args, **kwargs):
        queue_entry = get_object_or_404(Queue, id=id)

        with transaction.atomic():
            queue_entry.status = "cancelled"
            queue_entry.appointment.delete()  # Delete appointment record
            queue_entry.delete()  # Remove from queue

        return Response({"message": "Appointment cancelled and removed from queue"},
                        status=status.HTTP_204_NO_CONTENT)

class CancelAppointmentView(APIView):
    """
    Cancel the patient's appointment & remove them from the queue.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def delete(self, request, id):
        queue_entry = get_object_or_404(Queue, patient__id=id, status='waiting')
        queue_entry.status = 'cancelled'
        queue_entry.save(update_fields=['status'])

        return Response({"message": "Appointment cancelled successfully."}, status=status.HTTP_200_OK)


class QueuePatientView(RetrieveAPIView):
    """
    Get patient's queue position & estimated wait time for a specific doctor and clinic.
    Data is cached in Redis for real-time updates.
    """
    serializer_class = QueuePatientSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request, id):
        #patient_account = request.user.patientaccount
        doctor_id = request.query_params.get("doctor_id")
        clinic_id = request.query_params.get("clinic_id")

        if not doctor_id or not clinic_id:
            return Response({"error": "doctor_id and clinic_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        # Try fetching from Redis first
        redis_key = f"queue:patient:{id}:doctor:{doctor_id}:clinic:{clinic_id}"
        print(f"Redis Key: {redis_key}")
        cached_data = redis_client.get(redis_key)
        print(f"Cached Data: {cached_data}")
        if cached_data:
            return Response(eval(cached_data), status=status.HTTP_200_OK)

        # If not in Redis, fetch from DB
        queue_entry = get_object_or_404(Queue,patient__id=id, doctor__id=doctor_id, clinic__id=clinic_id, status='waiting')
        
        serializer = self.get_serializer(queue_entry)
        data = serializer.data

        # Cache the data in Redis for 10 seconds (adjustable)
        redis_client.setex(redis_key, 10, str(data))

        return Response(data, status=status.HTTP_200_OK)