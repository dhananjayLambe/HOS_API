"""Unit tests for visit appointment presenter formatting."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from diagnostics_engine.models import (
    DiagnosticCategory,
    DiagnosticOrder,
    DiagnosticOrderItem,
    DiagnosticOrderTestLine,
    DiagnosticServiceMaster,
)
from diagnostics_engine.models.choices import OrderLineType, OrderStatus
from diagnostics_engine.tests.test_order_creation_service import (
    _consultation_with_investigations,
    _doctor_user_and_profile,
    _lab_org_and_branch,
)
from labs.api.services.visit_appointments_presenter import (
    build_visit_appointment_row_dto,
    event_display_label,
    format_prep_summary,
    format_prep_tags,
    format_timeline_events,
)
from labs.choices.workflow import AppointmentStatus
from labs.models import LabVisitAppointment
from labs.services.visit_workflow import allowed_actions_for_status, workflow_hint_for_status
from labs.services.workflow_transitions import accept_assignment
from labs.tests.support.workflow_factories import accept_lab_visit, lab_admin_client, lab_mode_assignment


class VisitAppointmentsPresenterTests(TestCase):
    def setUp(self):
        self.client, self.lab_user, self.branch, _org = lab_admin_client()

    def _accept_visit(self, *, status: str = AppointmentStatus.PENDING) -> LabVisitAppointment:
        assignment, _ = lab_mode_assignment(self.branch)
        visit = accept_lab_visit(self.client, assignment)
        if status != AppointmentStatus.PENDING:
            visit.status = status
            visit.save(update_fields=["status", "updated_at"])
        return visit

    def test_format_prep_tags_keywords(self):
        tags = format_prep_tags("6h fasting required before contrast MRI; remove metallic objects")
        self.assertIn("Fasting", tags)
        self.assertIn("Contrast", tags)
        self.assertIn("MRI Metal Restriction", tags)

    def test_format_prep_summary_joins_tags(self):
        tags = ["Fasting", "Contrast"]
        self.assertEqual(format_prep_summary(tags, ""), "Fasting · Contrast")

    def test_format_prep_summary_truncates_instructions(self):
        long_text = "x" * 100
        summary = format_prep_summary([], long_text)
        self.assertEqual(len(summary), 80)
        self.assertTrue(summary.endswith("..."))

    def test_workflow_hint_and_actions_match_visit_workflow(self):
        visit = self._accept_visit(status=AppointmentStatus.CONFIRMED)
        dto = build_visit_appointment_row_dto(visit)
        self.assertEqual(dto.workflow_hint, workflow_hint_for_status(AppointmentStatus.CONFIRMED))
        self.assertEqual(dto.allowed_actions, allowed_actions_for_status(AppointmentStatus.CONFIRMED))

    def test_dto_mapping_core_fields(self):
        visit = self._accept_visit()
        visit.instructions = "Fasting required"
        visit.save(update_fields=["instructions", "updated_at"])
        dto = build_visit_appointment_row_dto(visit)
        self.assertEqual(dto.id, str(visit.id))
        self.assertTrue(dto.appointment_id.startswith("APT-"))
        self.assertEqual(dto.order_number, visit.diagnostic_order.order_number)
        self.assertGreaterEqual(dto.test_count, 1)
        self.assertEqual(dto.prep_summary, "Fasting")

    def test_status_updated_at_fallback(self):
        visit = self._accept_visit()
        visit.status_changed_at = None
        visit.save(update_fields=["status_changed_at", "updated_at"])
        dto = build_visit_appointment_row_dto(visit)
        self.assertEqual(dto.status_updated_at, visit.updated_at)

    def test_timeline_from_workflow_metadata(self):
        visit = self._accept_visit()
        visit.metadata = {
            "workflow_events": [
                {
                    "event": "confirmed",
                    "timestamp": "2026-05-18T08:00:00+00:00",
                    "performed_by_user_id": "1",
                    "previous_status": AppointmentStatus.PENDING,
                    "to_status": AppointmentStatus.CONFIRMED,
                },
                {
                    "event": "no_show",
                    "timestamp": "2026-05-18T10:00:00+00:00",
                    "performed_by_user_id": "1",
                    "previous_status": AppointmentStatus.CONFIRMED,
                    "to_status": AppointmentStatus.NO_SHOW,
                    "reason": "Absent",
                },
            ],
        }
        visit.save(update_fields=["metadata", "updated_at"])
        events = format_timeline_events(visit)
        self.assertEqual(len(events), 2)
        self.assertEqual(events[0].event, "no_show")
        self.assertEqual(events[0].label, event_display_label("no_show"))
        self.assertIn("Absent", events[0].detail)
        orders = [e.event_order for e in events]
        self.assertEqual(orders, sorted(orders, reverse=True))

    def test_timeline_legacy_audit_fallback(self):
        visit = self._accept_visit()
        now = timezone.now()
        visit.metadata = {}
        visit.confirmed_at = now - timedelta(hours=2)
        visit.checked_in_at = now - timedelta(hours=1)
        visit.completed_at = now
        visit.save(
            update_fields=[
                "metadata",
                "confirmed_at",
                "checked_in_at",
                "completed_at",
                "updated_at",
            ],
        )
        events = format_timeline_events(visit)
        self.assertEqual(len(events), 3)
        self.assertEqual(events[0].event, "completed")
        self.assertEqual(events[-1].event, "confirmed")
        event_orders = [e.event_order for e in events]
        self.assertEqual(len(set(event_orders)), 3)

    def test_timeline_event_order_stable(self):
        visit = self._accept_visit()
        visit.metadata = {
            "workflow_events": [
                {
                    "event": "confirmed",
                    "timestamp": "2026-05-18T08:00:00+00:00",
                    "performed_by_user_id": "1",
                    "previous_status": AppointmentStatus.PENDING,
                    "to_status": AppointmentStatus.CONFIRMED,
                },
            ],
        }
        visit.save(update_fields=["metadata", "updated_at"])
        first = format_timeline_events(visit)
        second = format_timeline_events(visit)
        self.assertEqual(first, second)

    def test_test_names_overflow(self):
        from clinic.models import Clinic

        branch = self.branch
        clinic = Clinic.objects.create(name="Overflow Clinic")
        doc_user, doc_profile = _doctor_user_and_profile(clinic)
        consultation, encounter, profile, _, _, _ = _consultation_with_investigations(
            doc_user,
            doc_profile,
            with_catalog=False,
        )
        order = DiagnosticOrder.objects.create(
            order_number=f"ORD-OVF-{int(timezone.now().timestamp()) % 100000:05d}",
            encounter=encounter,
            consultation=consultation,
            patient_profile=profile,
            doctor=doc_profile,
            branch=branch,
            sample_collection_mode="lab",
            status=OrderStatus.CREATED,
        )
        cat = DiagnosticCategory.objects.create(name="Cat OVF", code="COVF")
        services = []
        for idx in range(4):
            svc = DiagnosticServiceMaster.objects.create(
                code=f"svc_ovf_{idx}",
                name=f"Test {idx}",
                category=cat,
            )
            services.append(svc)
            oi = DiagnosticOrderItem.objects.create(
                order=order,
                line_type=OrderLineType.TEST,
                service=svc,
                name_snapshot=svc.name,
                price_snapshot=Decimal("10.00"),
                metadata_snapshot={},
            )
            DiagnosticOrderTestLine.objects.create(order=order, order_item=oi, service=svc)
        from labs.models import LabOrderAssignment

        assignment = LabOrderAssignment.objects.create(
            diagnostic_order=order,
            lab_branch=branch,
            status="ACCEPTED",
        )
        visit = LabVisitAppointment.objects.create(
            diagnostic_order=order,
            lab_branch=branch,
            appointment_date=timezone.localdate(),
            appointment_slot="09:00",
            status=AppointmentStatus.PENDING,
        )
        dto = build_visit_appointment_row_dto(visit)
        self.assertEqual(dto.test_count, 4)
        self.assertEqual(len(dto.test_names), 2)
        self.assertEqual(dto.test_names_overflow, 2)

    def test_null_safe_defaults(self):
        visit = self._accept_visit()
        visit.instructions = ""
        visit.appointment_slot = ""
        visit.metadata = {}
        visit.save(update_fields=["instructions", "appointment_slot", "metadata", "updated_at"])
        profile = visit.diagnostic_order.patient_profile
        user = profile.account.user
        user.username = ""
        user.save(update_fields=["username"])
        dto = build_visit_appointment_row_dto(visit)
        self.assertEqual(dto.patient_phone, "")
        self.assertEqual(dto.prep_tags, [])
        self.assertEqual(dto.prep_summary, "")
        self.assertEqual(dto.slot_time_label, "—")
        self.assertEqual(dto.timeline_events, format_timeline_events(visit))
