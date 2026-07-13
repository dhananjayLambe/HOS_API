"""Facade that dispatches audit actions to per-workflow registries."""

from __future__ import annotations

from business_audit.enums import WorkflowType
from support_trace.enums import TraceSource
from support_trace.workflow.registries.booking import BookingRegistry
from support_trace.workflow.registries.consultation import ConsultationRegistry
from support_trace.workflow.registries.diagnostic_report import DiagnosticReportRegistry
from support_trace.workflow.registries.prescription import PrescriptionRegistry
from support_trace.workflow.registries.recommendation import RecommendationRegistry
from support_trace.workflow.registries.report_delivery import ReportDeliveryRegistry
from support_trace.workflow.registries.routing import RoutingRegistry
from support_trace.workflow.types import WorkflowStateTransition

_BY_TYPE: dict[str, object] = {
    WorkflowType.RECOMMENDATION: RecommendationRegistry(),
    WorkflowType.BOOKING: BookingRegistry(),
    WorkflowType.ROUTING: RoutingRegistry(),
    WorkflowType.REPORT_DELIVERY: ReportDeliveryRegistry(),
    WorkflowType.CONSULTATION: ConsultationRegistry(),
    WorkflowType.PRESCRIPTION: PrescriptionRegistry(),
    WorkflowType.DIAGNOSTIC_REPORT: DiagnosticReportRegistry(),
}

# Clinical action prefixes → workflow type when SyncEvent lacks type
_CLINICAL_ACTION_PREFIXES: list[tuple[str, str]] = [
    ("consultation.", WorkflowType.CONSULTATION),
    ("diagnosis.", WorkflowType.CONSULTATION),
    ("vitals.", WorkflowType.CONSULTATION),
    ("symptoms.", WorkflowType.CONSULTATION),
    ("allergy.", WorkflowType.CONSULTATION),
    ("prescription.", WorkflowType.PRESCRIPTION),
    ("report.", WorkflowType.DIAGNOSTIC_REPORT),
]


def infer_workflow_type_from_action(
    action: str,
    *,
    source: TraceSource | str | None = None,
    explicit: str | None = None,
) -> str | None:
    if explicit:
        return str(explicit)
    action_s = str(action)
    source_s = (
        source.value if isinstance(source, TraceSource) else (str(source) if source else "")
    )
    if source_s == TraceSource.CLINICAL_AUDIT or source_s == "ClinicalAudit":
        for prefix, wf_type in _CLINICAL_ACTION_PREFIXES:
            if action_s.startswith(prefix):
                return wf_type
    # Business: try each registry
    for wf_type, registry in _BY_TYPE.items():
        if registry.resolve(action_s) is not None:  # type: ignore[attr-defined]
            return wf_type
    return None


def resolve_transition(
    action: str,
    *,
    workflow_type: str | None = None,
    source: TraceSource | str | None = None,
) -> WorkflowStateTransition | None:
    wf = workflow_type or infer_workflow_type_from_action(action, source=source)
    if not wf:
        return None
    registry = _BY_TYPE.get(str(wf))
    if registry is None:
        return None
    return registry.resolve(str(action))  # type: ignore[attr-defined]
