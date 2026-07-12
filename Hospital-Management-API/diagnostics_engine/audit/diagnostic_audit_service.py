"""Thin facade for diagnostic test and report audit events."""

from __future__ import annotations

import logging
from typing import Any

from clinical_audit.domain.repository import ClinicalAuditRepository
from clinical_audit.domain.types import AuditRecordResult
from clinical_audit.domain.utils import audit_event_label
from clinical_audit.enums import AuditAction, AuditSource, ClinicalEntity
from clinical_audit.services import ClinicalAuditService

from diagnostics_engine.audit.constants import SERVICE_NAME, SOURCE_TO_AUDIT_SOURCE
from diagnostics_engine.audit.report_payload_builder import ReportPayloadBuilder
from diagnostics_engine.audit.test_payload_builder import TestPayloadBuilder

logger = logging.getLogger(__name__)


class DiagnosticAuditService:
    """Translate diagnostic test/report events into ClinicalAuditService.record() calls."""

    _repository = ClinicalAuditRepository()

    @classmethod
    def emit_test_ordered(
        cls,
        encounter,
        consultation,
        user,
        *,
        order,
        test_count: int | None = None,
        source: str = "doctor",
        correlation_id: str | None = None,
    ) -> AuditRecordResult | None:
        resource_id = str(order.id)
        if cls._has_existing_action(
            resource_type=ClinicalEntity.DIAGNOSTIC_TEST,
            resource_id=resource_id,
            action=AuditAction.TEST_ORDERED,
        ):
            return None
        count = test_count if test_count is not None else TestPayloadBuilder.order_test_count(order)
        payload = TestPayloadBuilder.build_ordered(
            test_count=count,
            order_source=TestPayloadBuilder.order_source_label(getattr(order, "source", None)),
            home_collection=TestPayloadBuilder.home_collection_for_order(order),
        )
        return cls._record(
            action=AuditAction.TEST_ORDERED,
            resource_type=ClinicalEntity.DIAGNOSTIC_TEST,
            resource_id=resource_id,
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_test_recommendation_sent(
        cls,
        encounter,
        consultation,
        user,
        *,
        recommendation_id,
        test_count: int = 0,
        recommendation_channel: str = "whatsapp",
        source: str = "system",
        correlation_id: str | None = None,
    ) -> AuditRecordResult | None:
        resource_id = str(recommendation_id)
        if cls._has_existing_action(
            resource_type=ClinicalEntity.RECOMMENDATION,
            resource_id=resource_id,
            action=AuditAction.RECOMMENDATION_SENT,
        ):
            return None
        payload = TestPayloadBuilder.build_recommendation_sent(
            recommendation_channel=recommendation_channel,
            test_count=test_count,
        )
        return cls._record(
            action=AuditAction.RECOMMENDATION_SENT,
            resource_type=ClinicalEntity.RECOMMENDATION,
            resource_id=resource_id,
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_report_uploaded(
        cls,
        encounter,
        consultation,
        user,
        *,
        report,
        artifact_type: str = "PDF",
        report_count: int = 1,
        verified: bool = True,
        source: str = "lab",
        correlation_id: str | None = None,
    ) -> AuditRecordResult | None:
        resource_id = str(report.id)
        if cls._has_existing_action(
            resource_type=ClinicalEntity.REPORT,
            resource_id=resource_id,
            action=AuditAction.REPORT_UPLOADED,
        ):
            return None
        payload = ReportPayloadBuilder.build_uploaded(
            artifact_type=artifact_type,
            report_count=report_count,
            verified=verified,
        )
        return cls._record(
            action=AuditAction.REPORT_UPLOADED,
            resource_type=ClinicalEntity.REPORT,
            resource_id=resource_id,
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_report_viewed(
        cls,
        encounter,
        consultation,
        user,
        *,
        report,
        viewer_role: str | None = None,
        viewer_platform: str = "Web",
        source: str = "doctor",
        correlation_id: str | None = None,
    ) -> AuditRecordResult:
        role = viewer_role or ReportPayloadBuilder.resolve_viewer_role(user)
        payload = ReportPayloadBuilder.build_viewed(
            viewer_role=role,
            viewer_platform=viewer_platform,
        )
        return cls._record(
            action=AuditAction.REPORT_VIEWED,
            resource_type=ClinicalEntity.REPORT,
            resource_id=str(report.id),
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_report_downloaded(
        cls,
        encounter,
        consultation,
        user,
        *,
        report,
        download_format: str = "PDF",
        download_channel: str = "Web",
        source: str = "patient",
        correlation_id: str | None = None,
    ) -> AuditRecordResult:
        payload = ReportPayloadBuilder.build_downloaded(
            download_format=download_format,
            download_channel=download_channel,
        )
        return cls._record(
            action=AuditAction.REPORT_DOWNLOADED,
            resource_type=ClinicalEntity.REPORT,
            resource_id=str(report.id),
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def emit_report_shared(
        cls,
        encounter,
        consultation,
        user,
        *,
        report,
        share_channel: str = "WhatsApp",
        recipient_type: str = "Patient",
        source: str = "lab",
        correlation_id: str | None = None,
    ) -> AuditRecordResult:
        payload = ReportPayloadBuilder.build_shared(
            share_channel=share_channel,
            recipient_type=recipient_type,
        )
        return cls._record(
            action=AuditAction.REPORT_SHARED,
            resource_type=ClinicalEntity.REPORT,
            resource_id=str(report.id),
            encounter=encounter,
            consultation=consultation,
            user=user,
            source=source,
            payload=payload,
            correlation_id=correlation_id,
        )

    @classmethod
    def resolve_context_from_order(cls, order) -> tuple[Any, Any]:
        encounter = getattr(order, "encounter", None)
        consultation = getattr(order, "consultation", None)
        return encounter, consultation

    @classmethod
    def resolve_context_from_report(cls, report) -> tuple[Any, Any]:
        order_test_line = getattr(report, "order_test_line", None)
        order = getattr(order_test_line, "order", None) if order_test_line else None
        encounter = getattr(order, "encounter", None) if order else None
        consultation = getattr(order, "consultation", None) if order else None
        return encounter, consultation

    @classmethod
    def resolve_context_from_message(cls, message) -> tuple[Any, Any, Any]:
        encounter = getattr(message, "encounter", None)
        consultation = None
        prescription = getattr(message, "prescription", None)
        if prescription is not None:
            consultation = getattr(prescription, "consultation", None)
            if encounter is None and consultation is not None:
                encounter = getattr(consultation, "encounter", None)
        payload = getattr(message, "request_payload", None) or {}
        if consultation is None and payload.get("consultation_id"):
            from consultations_core.models.consultation import Consultation

            try:
                consultation = Consultation.objects.select_related("encounter").get(
                    pk=payload["consultation_id"]
                )
                if encounter is None:
                    encounter = consultation.encounter
            except (Consultation.DoesNotExist, ValueError, TypeError):
                consultation = None
        return encounter, consultation, payload

    @classmethod
    def resolve_source_from_user(cls, user, *, default: str = "doctor") -> str:
        if user is None or not getattr(user, "is_authenticated", False):
            return default
        groups = set(
            user.groups.values_list("name", flat=True)
            if hasattr(user, "groups")
            else []
        )
        if "doctor" in groups:
            return "doctor"
        if "patient" in groups:
            return "patient"
        if "helpdesk" in groups:
            return "helpdesk"
        if "admin" in groups:
            return "admin"
        return default

    @classmethod
    def _record(
        cls,
        *,
        action: AuditAction,
        resource_type: ClinicalEntity,
        resource_id: str,
        encounter,
        consultation,
        user,
        source: str,
        payload: dict[str, Any],
        correlation_id: str | None = None,
    ) -> AuditRecordResult:
        audit_source = cls._map_source(source)
        user_id = ""
        if user is not None and getattr(user, "is_authenticated", False):
            user_id = str(getattr(user, "pk", ""))
        if not user_id:
            user_id = "anonymous"
        return ClinicalAuditService.record(
            action=action,
            event=audit_event_label(action),
            resource_type=resource_type,
            resource_id=resource_id,
            source=audit_source,
            user_id=user_id,
            organization_id=str(encounter.clinic_id),
            patient_account_id=str(encounter.patient_account_id),
            patient_profile_id=str(encounter.patient_profile_id),
            consultation_id=(
                str(consultation.id) if consultation is not None else None
            ),
            encounter_id=str(encounter.id),
            payload=payload,
            service_name=SERVICE_NAME,
            correlation_id=correlation_id,
        )

    @staticmethod
    def _map_source(source: str) -> AuditSource:
        mapped = SOURCE_TO_AUDIT_SOURCE.get(source, "system")
        return AuditSource(mapped)

    @classmethod
    def _has_existing_action(
        cls,
        *,
        resource_type: ClinicalEntity,
        resource_id: str,
        action: AuditAction,
    ) -> bool:
        rows = cls._repository.filter_by_resource(resource_type, resource_id)
        return any(row.action == action for row in rows)
