"""Serializer contract tests for visit appointments API."""

from __future__ import annotations

from datetime import date

from django.test import TestCase
from django.utils import timezone

from labs.api.serializers.visit_appointments import (
    VisitAppointmentListItemSerializer,
    VisitAppointmentsSummarySerializer,
    VisitCheckInSerializer,
    VisitCompleteSerializer,
    VisitConfirmSerializer,
    VisitMarkNoShowSerializer,
    VisitWorkflowResponseSerializer,
    visit_list_dto_to_representation,
    visit_workflow_response_to_representation,
)
from labs.api.services.visit_appointments_list_service import build_summary_counts
from labs.api.services.visit_appointments_presenter import (
    VisitAppointmentListRowDTO,
    VisitTimelineEventDTO,
    build_visit_appointment_row_dto,
)
from labs.choices.workflow import AppointmentStatus
from labs.services.visit_workflow import workflow_response_fields
from labs.tests.support.workflow_factories import accept_lab_visit, lab_admin_client, lab_mode_assignment


class VisitAppointmentsSerializerTests(TestCase):
    def setUp(self):
        self.client, self.lab_user, self.branch, _org = lab_admin_client()

    def test_list_dto_round_trip_via_factory_visit(self):
        assignment, _ = lab_mode_assignment(self.branch)
        visit = accept_lab_visit(self.client, assignment)
        dto = build_visit_appointment_row_dto(visit)
        payload = visit_list_dto_to_representation(dto)
        serializer = VisitAppointmentListItemSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["order_number"], visit.diagnostic_order.order_number)

    def test_list_legacy_null_safe_payload(self):
        now = timezone.now()
        dto = VisitAppointmentListRowDTO(
            id="00000000-0000-0000-0000-000000000001",
            appointment_id="APT-TEST",
            order_number="ORD-1",
            order_uuid="00000000-0000-0000-0000-000000000002",
            patient_name="",
            patient_phone="",
            patient_age=None,
            patient_gender="",
            test_count=0,
            test_names=[],
            test_names_overflow=0,
            appointment_date=date.today(),
            appointment_slot="",
            slot_date_label="Today",
            slot_time_label="—",
            fasting_required=False,
            prep_tags=[],
            prep_summary="",
            instructions="",
            appointment_status=AppointmentStatus.PENDING,
            workflow_hint="",
            allowed_actions=[],
            patient_notes=None,
            status_updated_at=now,
            confirmed_at=None,
            checked_in_at=None,
            completed_at=None,
            no_show_at=None,
            cancelled_at=None,
            timeline_events=[],
        )
        payload = visit_list_dto_to_representation(dto)
        serializer = VisitAppointmentListItemSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_workflow_response_maps_status_changed_at(self):
        assignment, _ = lab_mode_assignment(self.branch)
        visit = accept_lab_visit(self.client, assignment)
        visit.status_changed_at = timezone.now()
        visit.save(update_fields=["status_changed_at", "updated_at"])

        raw = workflow_response_fields(visit, message="ok")
        self.assertIn("status_changed_at", raw)
        mapped = visit_workflow_response_to_representation(raw)
        self.assertEqual(mapped["status_updated_at"], raw["status_changed_at"])
        self.assertNotIn("status_changed_at", mapped)

        serializer = VisitWorkflowResponseSerializer(data=mapped)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_empty_post_serializers_accept_empty_body(self):
        for ser_cls in (VisitConfirmSerializer, VisitCheckInSerializer, VisitCompleteSerializer):
            serializer = ser_cls(data={})
            self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_mark_no_show_reason_optional_and_max_length(self):
        self.assertTrue(VisitMarkNoShowSerializer(data={}).is_valid())
        self.assertTrue(VisitMarkNoShowSerializer(data={"reason": ""}).is_valid())
        self.assertTrue(VisitMarkNoShowSerializer(data={"reason": "Absent"}).is_valid())
        long_reason = "x" * 1001
        serializer = VisitMarkNoShowSerializer(data={"reason": long_reason})
        self.assertFalse(serializer.is_valid())
        self.assertIn("reason", serializer.errors)

    def test_summary_serializer_shape_from_service(self):
        assignment, _ = lab_mode_assignment(self.branch)
        accept_lab_visit(self.client, assignment)
        counts = build_summary_counts(self.lab_user, date_preset="today")
        serializer = VisitAppointmentsSummarySerializer(data=counts)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        for key in (
            "scheduled_today",
            "confirmed_today",
            "checked_in",
            "completed_today",
            "failed_no_show",
        ):
            self.assertIn(key, serializer.validated_data)

    def test_timeline_events_nested_serialization(self):
        now = timezone.now()
        dto = VisitAppointmentListRowDTO(
            id="00000000-0000-0000-0000-000000000001",
            appointment_id="APT-TEST",
            order_number="ORD-1",
            order_uuid="00000000-0000-0000-0000-000000000002",
            patient_name="Pat",
            patient_phone="+911",
            patient_age=30,
            patient_gender="M",
            test_count=1,
            test_names=["CBC"],
            test_names_overflow=0,
            appointment_date=date.today(),
            appointment_slot="09:00",
            slot_date_label="Today",
            slot_time_label="09:00",
            fasting_required=False,
            prep_tags=[],
            prep_summary="",
            instructions="",
            appointment_status=AppointmentStatus.CONFIRMED,
            workflow_hint="hint",
            allowed_actions=["check_in"],
            patient_notes=None,
            status_updated_at=now,
            confirmed_at=now,
            checked_in_at=None,
            completed_at=None,
            no_show_at=None,
            cancelled_at=None,
            timeline_events=[
                VisitTimelineEventDTO(
                    event="confirmed",
                    raw_event="confirmed",
                    timestamp=now.isoformat(),
                    label="Appointment confirmed",
                    detail="",
                    event_order=0,
                ),
            ],
        )
        payload = visit_list_dto_to_representation(dto)
        serializer = VisitAppointmentListItemSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(len(serializer.validated_data["timeline_events"]), 1)
