"""Laboratory routing decision audit integration hooks."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from business_audit.decision.routing.constants import (
    DECISION_PATH_FAILED,
    DECISION_PATH_SUCCESS,
    DECISION_PATH_SUCCESS_WITH_DISCOUNT,
)
from business_audit.decision.routing.routing_audit_service import RoutingAuditService
from business_audit.decision.types import DecisionTimings, ProviderResponse
from business_audit.domain.context import apply_workflow_context
from consultations_core.audit.commit import emit_after_commit
from diagnostics_engine.models.routing import RoutingRun

logger = logging.getLogger(__name__)


@dataclass
class RoutingDecisionContext:
    """Runtime context for one routing decision attempt."""

    decision_id: str
    routing_id: str
    booking_id: str | None
    attempt_number: int
    recommendation_id: str | None = None
    collection_mode: str | None = None
    engine_version: str | None = None
    organization_id: str | None = None
    confidence: str | None = None
    evaluation_time_ms: int = 0
    comparison_time_ms: int = 0
    discount_time_ms: int = 0
    routing_time_ms: int = 0
    all_evaluated: list[Any] = field(default_factory=list)
    ranked: list[Any] = field(default_factory=list)
    provider_response: ProviderResponse | None = None


def _resolve_recommendation_id(order) -> str | None:
    if order is None:
        return None
    meta = getattr(order, "operational_metadata", None) or {}
    rec_id = meta.get("recommendation_id")
    if rec_id:
        return str(rec_id)
    from shared.logging.context import get_context_manager

    ctx = get_context_manager().get()
    parent = ctx.parent_workflow_instance_id or ctx.recommendation_id
    return str(parent) if parent else None


def ensure_routing_decision_identity(
    routing_run: RoutingRun,
    *,
    order=None,
    persist: bool = True,
) -> tuple[str, int]:
    """Assign decision_id and attempt_number on RoutingRun.metadata (additive)."""
    meta = dict(routing_run.metadata or {})
    if not meta.get("decision_id"):
        meta["decision_id"] = str(uuid.uuid4())
    if "attempt_number" not in meta:
        if order is not None:
            prior = (
                RoutingRun.objects.filter(diagnostic_order=order)
                .exclude(pk=routing_run.pk)
                .count()
            )
            meta["attempt_number"] = prior + 1
        else:
            meta["attempt_number"] = 1
    if persist:
        routing_run.metadata = meta
        routing_run.save(update_fields=["metadata", "updated_at"])
    return str(meta["decision_id"]), int(meta["attempt_number"])


def build_routing_decision_context(
    routing_run: RoutingRun,
    *,
    order=None,
    recommendation_id: str | None = None,
    collection_mode: str | None = None,
    engine_version: str | None = None,
) -> RoutingDecisionContext:
    decision_id, attempt_number = ensure_routing_decision_identity(routing_run, order=order)
    booking_id = str(order.pk) if order is not None else None
    rec_id = recommendation_id or _resolve_recommendation_id(order)
    org_id = None
    if order is not None and getattr(order, "encounter", None) is not None:
        org_id = str(order.encounter.clinic_id)
    return RoutingDecisionContext(
        decision_id=decision_id,
        routing_id=str(routing_run.pk),
        booking_id=booking_id,
        attempt_number=attempt_number,
        recommendation_id=rec_id,
        collection_mode=collection_mode,
        engine_version=engine_version or getattr(routing_run, "routing_engine_version", None),
        organization_id=org_id,
    )


def _apply_routing_workflow(routing_id: str) -> None:
    apply_workflow_context(workflow_instance_id=routing_id)


def schedule_routing_decision_started(
    *,
    routing_run: RoutingRun,
    order=None,
    user=None,
    request_id: str | None = None,
) -> RoutingDecisionContext:
    """Emit routing.started after RoutingRun is created."""
    ctx = build_routing_decision_context(
        routing_run,
        order=order,
        collection_mode=getattr(order, "sample_collection_mode", None) if order else None,
        engine_version=getattr(routing_run, "routing_engine_version", None),
    )
    try:
        _apply_routing_workflow(ctx.routing_id)
        emit_after_commit(
            RoutingAuditService.emit_started,
            decision_id=ctx.decision_id,
            routing_id=ctx.routing_id,
            booking_id=ctx.booking_id,
            attempt_number=ctx.attempt_number,
            recommendation_id=ctx.recommendation_id,
            collection_mode=ctx.collection_mode,
            engine_version=ctx.engine_version,
            organization_id=ctx.organization_id,
            user=user,
            request_id=request_id,
        )
    except Exception:
        logger.warning(
            "routing_decision_started_schedule_failed",
            exc_info=True,
            extra={"routing_id": ctx.routing_id, "decision_id": ctx.decision_id},
        )
    return ctx


def schedule_routing_decision_evaluated(
    *,
    ctx: RoutingDecisionContext,
    user=None,
    request_id: str | None = None,
) -> None:
    """Emit rule_evaluated, lab_matched, and price_compared after eligibility + ranking."""
    try:
        _apply_routing_workflow(ctx.routing_id)
        eligible_count = len([c for c in ctx.all_evaluated if not c.ineligibility_reasons])
        evaluated_count = len(ctx.all_evaluated)

        emit_after_commit(
            RoutingAuditService.emit_rule_evaluated,
            decision_id=ctx.decision_id,
            routing_id=ctx.routing_id,
            booking_id=ctx.booking_id,
            attempt_number=ctx.attempt_number,
            all_evaluated=ctx.all_evaluated,
            evaluation_time_ms=ctx.evaluation_time_ms,
            recommendation_id=ctx.recommendation_id,
            collection_mode=ctx.collection_mode,
            organization_id=ctx.organization_id,
            user=user,
            request_id=request_id,
        )
        emit_after_commit(
            RoutingAuditService.emit_lab_matched,
            decision_id=ctx.decision_id,
            routing_id=ctx.routing_id,
            booking_id=ctx.booking_id,
            attempt_number=ctx.attempt_number,
            eligible_count=eligible_count,
            evaluated_count=evaluated_count,
            recommendation_id=ctx.recommendation_id,
            collection_mode=ctx.collection_mode,
            organization_id=ctx.organization_id,
            user=user,
            request_id=request_id,
        )
        emit_after_commit(
            RoutingAuditService.emit_price_compared,
            decision_id=ctx.decision_id,
            routing_id=ctx.routing_id,
            booking_id=ctx.booking_id,
            attempt_number=ctx.attempt_number,
            ranked=ctx.ranked,
            comparison_time_ms=ctx.comparison_time_ms,
            recommendation_id=ctx.recommendation_id,
            collection_mode=ctx.collection_mode,
            organization_id=ctx.organization_id,
            user=user,
            request_id=request_id,
        )
    except Exception:
        logger.warning(
            "routing_decision_evaluated_schedule_failed",
            exc_info=True,
            extra={"routing_id": ctx.routing_id, "decision_id": ctx.decision_id},
        )


def schedule_routing_decision_outcome(
    *,
    ctx: RoutingDecisionContext,
    assigned: bool,
    discount_amount: Decimal | float | None = None,
    savings: Decimal | float | None = None,
    failure_reason: str | None = None,
    user=None,
    request_id: str | None = None,
) -> None:
    """Emit discount_applied (when non-zero), lab_assigned, or failed after persist."""
    try:
        _apply_routing_workflow(ctx.routing_id)
        timings = DecisionTimings(
            evaluation_time_ms=ctx.evaluation_time_ms,
            comparison_time_ms=ctx.comparison_time_ms,
            discount_time_ms=ctx.discount_time_ms,
            routing_time_ms=ctx.routing_time_ms,
        )
        if assigned and ctx.ranked:
            discount_val = Decimal(str(discount_amount or 0))
            decision_path = DECISION_PATH_SUCCESS
            if discount_val > 0:
                decision_path = DECISION_PATH_SUCCESS_WITH_DISCOUNT
                emit_after_commit(
                    RoutingAuditService.emit_discount_applied,
                    decision_id=ctx.decision_id,
                    routing_id=ctx.routing_id,
                    booking_id=ctx.booking_id,
                    attempt_number=ctx.attempt_number,
                    discount_amount=discount_val,
                    savings=savings,
                    discount_time_ms=ctx.discount_time_ms,
                    recommendation_id=ctx.recommendation_id,
                    organization_id=ctx.organization_id,
                    user=user,
                    request_id=request_id,
                )
            emit_after_commit(
                RoutingAuditService.emit_lab_assigned,
                decision_id=ctx.decision_id,
                routing_id=ctx.routing_id,
                booking_id=ctx.booking_id,
                attempt_number=ctx.attempt_number,
                ranked=ctx.ranked,
                all_evaluated=ctx.all_evaluated,
                confidence=ctx.confidence,
                engine_version=ctx.engine_version,
                discount_amount=discount_val if discount_val > 0 else None,
                timings=timings,
                decision_path=decision_path,
                recommendation_id=ctx.recommendation_id,
                collection_mode=ctx.collection_mode,
                provider_response=ctx.provider_response,
                routing_time_ms=ctx.routing_time_ms,
                organization_id=ctx.organization_id,
                user=user,
                request_id=request_id,
            )
        else:
            emit_after_commit(
                RoutingAuditService.emit_failed,
                decision_id=ctx.decision_id,
                routing_id=ctx.routing_id,
                booking_id=ctx.booking_id,
                attempt_number=ctx.attempt_number,
                reason=failure_reason or "no_eligible_branches",
                all_evaluated=ctx.all_evaluated,
                ranked=ctx.ranked or None,
                confidence=ctx.confidence,
                engine_version=ctx.engine_version,
                timings=timings,
                decision_path=DECISION_PATH_FAILED,
                recommendation_id=ctx.recommendation_id,
                collection_mode=ctx.collection_mode,
                provider_response=ctx.provider_response,
                routing_time_ms=ctx.routing_time_ms,
                organization_id=ctx.organization_id,
                user=user,
                request_id=request_id,
            )
    except Exception:
        logger.warning(
            "routing_decision_outcome_schedule_failed",
            exc_info=True,
            extra={"routing_id": ctx.routing_id, "decision_id": ctx.decision_id},
        )


def schedule_routing_decision_pipeline_failed(
    *,
    routing_run: RoutingRun | None,
    order=None,
    reason: str = "routing_failed",
    user=None,
    request_id: str | None = None,
) -> None:
    """Emit routing.failed when the routing pipeline throws."""
    if routing_run is None:
        return
    try:
        ctx = build_routing_decision_context(routing_run, order=order)
        _apply_routing_workflow(ctx.routing_id)
        emit_after_commit(
            RoutingAuditService.emit_failed,
            decision_id=ctx.decision_id,
            routing_id=ctx.routing_id,
            booking_id=ctx.booking_id,
            attempt_number=ctx.attempt_number,
            reason=reason,
            all_evaluated=ctx.all_evaluated or None,
            ranked=ctx.ranked or None,
            confidence=ctx.confidence,
            engine_version=ctx.engine_version,
            decision_path=["failed"],
            recommendation_id=ctx.recommendation_id,
            collection_mode=ctx.collection_mode,
            organization_id=ctx.organization_id,
            routing_time_ms=ctx.routing_time_ms,
            user=user,
            request_id=request_id,
        )
    except Exception:
        logger.warning(
            "routing_decision_pipeline_failed_schedule_failed",
            exc_info=True,
            extra={"routing_id": str(routing_run.pk)},
        )


def schedule_routing_business_manual_override(
    *,
    order,
    routing_run: RoutingRun | None,
    before_branch_id: str,
    after_branch_id: str,
    before_lab_id: str | None = None,
    after_lab_id: str | None = None,
    ranked: list | None = None,
    all_evaluated: list | None = None,
    confidence: str | None = None,
    override_reason: str = "manual_assignment",
    user=None,
    request_id: str | None = None,
) -> None:
    """Emit routing.manual_override for AssignmentType.MANUAL / helpdesk selection."""
    try:
        if routing_run is None:
            decision_id = str(uuid.uuid4())
            routing_id = str(uuid.uuid4())
            attempt_number = 1
        else:
            decision_id, attempt_number = ensure_routing_decision_identity(routing_run, order=order)
            routing_id = str(routing_run.pk)
        override_version = RoutingAuditService._repository.next_override_version(decision_id)
        _apply_routing_workflow(routing_id)
        emit_after_commit(
            RoutingAuditService.emit_manual_override,
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=str(order.pk),
            attempt_number=attempt_number,
            override_version=override_version,
            before_branch_id=before_branch_id,
            after_branch_id=after_branch_id,
            before_lab_id=before_lab_id,
            after_lab_id=after_lab_id,
            ranked=ranked,
            all_evaluated=all_evaluated,
            confidence=confidence,
            engine_version=getattr(routing_run, "routing_engine_version", None)
            if routing_run
            else None,
            recommendation_id=_resolve_recommendation_id(order),
            organization_id=str(order.encounter.clinic_id) if order.encounter else None,
            override_reason=override_reason,
            user=user,
            request_id=request_id,
        )
    except Exception:
        logger.warning(
            "routing_business_manual_override_schedule_failed",
            exc_info=True,
            extra={"booking_id": str(order.pk)},
        )


def schedule_marketplace_routing_decision(
    *,
    recommendation_id: str,
    collection_mode: str,
    all_evaluated: list,
    ranked: list,
    confidence: str | None,
    assigned: bool,
    returned_count: int,
    filtered_count: int,
    evaluation_time_ms: int = 0,
    comparison_time_ms: int = 0,
    routing_time_ms: int = 0,
    discount_amount: Decimal | float | None = None,
    savings: Decimal | float | None = None,
    failure_reason: str | None = None,
    organization_id: str,
    request_id: str | None = None,
) -> None:
    """Emit full routing decision sequence for marketplace LabRecommendationService."""
    routing_id = str(uuid.uuid4())
    decision_id = str(uuid.uuid4())
    attempt_number = 1
    provider_response = ProviderResponse(
        marketplace="DoctorPro Marketplace",
        returned_count=returned_count,
        filtered_count=filtered_count,
        selected_count=1 if assigned else 0,
    )
    ctx = RoutingDecisionContext(
        decision_id=decision_id,
        routing_id=routing_id,
        booking_id=None,
        attempt_number=attempt_number,
        recommendation_id=recommendation_id,
        collection_mode=collection_mode,
        engine_version="marketplace_v1",
        organization_id=organization_id,
        confidence=confidence,
        evaluation_time_ms=evaluation_time_ms,
        comparison_time_ms=comparison_time_ms,
        routing_time_ms=routing_time_ms,
        all_evaluated=all_evaluated,
        ranked=ranked,
        provider_response=provider_response,
    )
    try:
        _apply_routing_workflow(routing_id)
        emit_after_commit(
            RoutingAuditService.emit_started,
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=None,
            attempt_number=attempt_number,
            recommendation_id=recommendation_id,
            collection_mode=collection_mode,
            engine_version="marketplace_v1",
            organization_id=organization_id,
            request_id=request_id,
        )
        schedule_routing_decision_evaluated(ctx=ctx, request_id=request_id)
        schedule_routing_decision_outcome(
            ctx=ctx,
            assigned=assigned,
            discount_amount=discount_amount,
            savings=savings,
            failure_reason=failure_reason,
            request_id=request_id,
        )
    except Exception:
        logger.warning(
            "marketplace_routing_decision_schedule_failed",
            exc_info=True,
            extra={"recommendation_id": recommendation_id},
        )
