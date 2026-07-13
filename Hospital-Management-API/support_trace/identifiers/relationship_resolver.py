"""Resolves identifier workflow chains across SupportTrace rows."""

from __future__ import annotations

from support_trace.identifiers.lookup_keys import IDENTIFIER_FIELDS, identifiers_from_trace
from support_trace.identifiers.types import IdentifierType
from support_trace.models import SupportTrace

IDENTIFIER_WORKFLOW_CHAIN: tuple[IdentifierType, ...] = (
    IdentifierType.PATIENT_ACCOUNT,
    IdentifierType.CONSULTATION,
    IdentifierType.RECOMMENDATION,
    IdentifierType.BOOKING,
    IdentifierType.ROUTING,
    IdentifierType.REPORT,
    IdentifierType.WHATSAPP_MESSAGE,
)

_FIELD_BY_TYPE: dict[IdentifierType, str] = {
    IdentifierType.PATIENT_ACCOUNT: "patient_account_id",
    IdentifierType.PATIENT_PROFILE: "patient_profile_id",
    IdentifierType.CONSULTATION: "consultation_id",
    IdentifierType.ENCOUNTER: "encounter_id",
    IdentifierType.RECOMMENDATION: "recommendation_id",
    IdentifierType.BOOKING: "booking_id",
    IdentifierType.ROUTING: "routing_id",
    IdentifierType.REPORT: "report_id",
    IdentifierType.PRESCRIPTION: "prescription_id",
    IdentifierType.ORDER: "order_id",
    IdentifierType.PAYMENT: "payment_id",
    IdentifierType.INVOICE: "invoice_id",
    IdentifierType.LABORATORY: "laboratory_id",
    IdentifierType.BRANCH: "branch_id",
    IdentifierType.PROVIDER_REFERENCE: "provider_reference",
    IdentifierType.WHATSAPP_MESSAGE: "whatsapp_message_id",
    IdentifierType.PHONE: "phone_number",
}


class RelationshipResolver:
    @classmethod
    def collect_identifiers(cls, trace: SupportTrace) -> dict[str, str]:
        return identifiers_from_trace(trace)

    @classmethod
    def resolve_related_traces(cls, trace: SupportTrace) -> list[SupportTrace]:
        return cls.expand([trace])

    @classmethod
    def expand(cls, traces: list[SupportTrace]) -> list[SupportTrace]:
        if not traces:
            return []
        seen: set[str] = set()
        related: list[SupportTrace] = []
        seed_ids = {t.workflow_instance_id for t in traces}
        correlation_ids = {t.correlation_id for t in traces if t.correlation_id}

        for trace in traces:
            ids = identifiers_from_trace(trace)
            for field in IDENTIFIER_FIELDS:
                value = ids.get(field)
                if not value:
                    continue
                for match in SupportTrace.objects.filter(**{field: value}).order_by(
                    "-updated_at"
                ):
                    if match.workflow_instance_id in seen:
                        continue
                    if match.workflow_instance_id in seed_ids:
                        continue
                    seen.add(match.workflow_instance_id)
                    related.append(match)

            if trace.parent_workflow_instance_id:
                parent = SupportTrace.objects.filter(
                    workflow_instance_id=trace.parent_workflow_instance_id
                ).first()
                if parent and parent.workflow_instance_id not in seen:
                    if parent.workflow_instance_id not in seed_ids:
                        seen.add(parent.workflow_instance_id)
                        related.append(parent)

            children = SupportTrace.objects.filter(
                parent_workflow_instance_id=trace.workflow_instance_id
            ).order_by("-updated_at")
            for child in children:
                if child.workflow_instance_id not in seen and child.workflow_instance_id not in seed_ids:
                    seen.add(child.workflow_instance_id)
                    related.append(child)

        for corr in correlation_ids:
            for match in SupportTrace.objects.filter(correlation_id=corr).order_by(
                "-updated_at"
            ):
                if match.workflow_instance_id not in seen and match.workflow_instance_id not in seed_ids:
                    seen.add(match.workflow_instance_id)
                    related.append(match)

        return related
