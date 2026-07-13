"""Unit tests for BookingPayloadBuilder."""

from __future__ import annotations

import uuid

from django.test import TestCase

from business_audit.booking.constants import COLLECTION_MODE_HOME, COLLECTION_MODE_VISIT, STAGE_CREATION
from business_audit.booking.payload_builder import BookingPayloadBuilder
from business_audit.tests.booking.support import create_booking_order, order_stub, setup_booking_context
from shared.logging.context import LogContext, get_context_manager


class BookingPayloadBuilderTests(TestCase):
    def tearDown(self) -> None:
        get_context_manager().clear()

    def test_build_created_includes_booking_metadata(self) -> None:
        order = order_stub(recommendation_id=str(uuid.uuid4()))
        payload = BookingPayloadBuilder.build_created(
            order,
            downstream_systems=["DiagnosticOrderCreationService"],
        )
        self.assertEqual(payload["operational_stage"], STAGE_CREATION)
        self.assertEqual(payload["booking_id"], str(order.pk))
        self.assertEqual(payload["recommendation_id"], order.operational_metadata["recommendation_id"])
        self.assertEqual(payload["price"], "850.00")
        self.assertEqual(payload["discount"], "120.00")
        self.assertIsNone(payload["coupon"])

    def test_collection_mode_home(self) -> None:
        payload = BookingPayloadBuilder.build_created(
            order_stub(collection_mode="home"),
            downstream_systems=[],
        )
        self.assertEqual(payload["collection_mode"], COLLECTION_MODE_HOME)
        self.assertTrue(payload["home_collection"])

    def test_collection_mode_visit(self) -> None:
        payload = BookingPayloadBuilder.build_created(
            order_stub(collection_mode="lab"),
            downstream_systems=[],
        )
        self.assertEqual(payload["collection_mode"], COLLECTION_MODE_VISIT)
        self.assertFalse(payload["home_collection"])

    def test_recommendation_id_from_log_context(self) -> None:
        rec_id = str(uuid.uuid4())
        get_context_manager().set(
            LogContext(
                correlation_id=str(uuid.uuid4()),
                parent_workflow_instance_id=rec_id,
            )
        )
        payload = BookingPayloadBuilder.build_created(order_stub(), downstream_systems=[])
        self.assertEqual(payload["recommendation_id"], rec_id)

    def test_build_modified_includes_version_and_snapshot(self) -> None:
        order = order_stub()
        snapshot = {"before": {"slot": {"date": "2026-07-10"}}, "after": {"slot": {"date": "2026-07-12"}}}
        payload = BookingPayloadBuilder.build_modified(
            order,
            downstream_systems=["VisitWorkflowService"],
            modification_reason="slot_reschedule",
            modification_version=2,
            change_snapshot=snapshot,
        )
        self.assertEqual(payload["modification_version"], 2)
        self.assertEqual(payload["change_snapshot"], snapshot)

    def test_build_from_real_order(self) -> None:
        ctx = setup_booking_context()
        order = create_booking_order(ctx)
        payload = BookingPayloadBuilder.build_created(order, downstream_systems=[])
        self.assertEqual(payload["consultation_id"], str(ctx["consultation"].id))
        self.assertEqual(payload["recommendation_id"], ctx["recommendation_id"])
