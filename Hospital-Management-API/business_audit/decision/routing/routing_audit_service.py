"""Facade for laboratory routing decision business audit events."""

from __future__ import annotations

import logging
from typing import Any

from business_audit.decision.routing.constants import (
    DECISION_STATE_ASSIGNED,
    DECISION_STATE_COMPARED,
    DECISION_STATE_DISCOUNTED,
    DECISION_STATE_FAILED,
    DECISION_STATE_MATCHED,
    DECISION_STATE_RULE_EVALUATED,
    DECISION_STATE_STARTED,
    DOMAIN_DIAGNOSTICS,
    OPERATION_APPLY_DISCOUNT,
    OPERATION_ASSIGN_LAB,
    OPERATION_COMPARE_PRICES,
    OPERATION_EVALUATE_RULES,
    OPERATION_MANUAL_OVERRIDE,
    OPERATION_MATCH_LABS,
    OPERATION_ROUTING_FAILED,
    OPERATION_START_ROUTING,
    SERVICE_ASSIGNMENT,
    SERVICE_ROUTING,
)
from business_audit.decision.routing.payload_builder import RoutingPayloadBuilder
from business_audit.decision.routing.repository import RoutingAuditRepository
from business_audit.decision.types import DecisionTimings, ProviderResponse
from business_audit.domain.context import apply_workflow_context
from business_audit.domain.types import BusinessAuditResult
from business_audit.enums import (
    ActorType,
    BusinessAuditAction,
    BusinessResourceType,
    EventCategory,
    ExternalProvider,
    WorkflowOutcome,
    WorkflowStatus,
    WorkflowType,
)
from business_audit.services import BusinessAuditService

logger = logging.getLogger(__name__)


class RoutingAuditService:
    """Translate routing decision lifecycle events into BusinessAuditService.record()."""

    _repository = RoutingAuditRepository()

    @classmethod
    def emit_started(
        cls,
        *,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        attempt_number: int,
        recommendation_id: str | None = None,
        collection_mode: str | None = None,
        engine_version: str | None = None,
        organization_id: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        if cls._repository.has_action_for_decision(
            decision_id=decision_id,
            action=BusinessAuditAction.ROUTING_STARTED,
        ):
            return None
        payload = RoutingPayloadBuilder.build_started(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            recommendation_id=recommendation_id,
            collection_mode=collection_mode,
            engine_version=engine_version,
        )
        return cls._record(
            action=BusinessAuditAction.ROUTING_STARTED,
            event="Routing started",
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            recommendation_id=recommendation_id,
            user=user,
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.RUNNING,
            outcome=WorkflowOutcome.UNKNOWN,
            state_before=None,
            state_after=DECISION_STATE_STARTED,
            service=SERVICE_ROUTING,
            operation=OPERATION_START_ROUTING,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            organization_id=organization_id,
        )

    @classmethod
    def emit_rule_evaluated(
        cls,
        *,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        attempt_number: int,
        all_evaluated: list | None,
        evaluation_time_ms: int,
        recommendation_id: str | None = None,
        collection_mode: str | None = None,
        organization_id: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        if cls._repository.has_action_for_decision(
            decision_id=decision_id,
            action=BusinessAuditAction.ROUTING_RULE_EVALUATED,
        ):
            return None
        state_before = cls._repository.current_macro_state(decision_id) or DECISION_STATE_STARTED
        payload = RoutingPayloadBuilder.build_rule_evaluated(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            all_evaluated=all_evaluated,
            evaluation_time_ms=evaluation_time_ms,
            recommendation_id=recommendation_id,
            collection_mode=collection_mode,
        )
        return cls._record(
            action=BusinessAuditAction.ROUTING_RULE_EVALUATED,
            event="Routing rules evaluated",
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            recommendation_id=recommendation_id,
            user=user,
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.RUNNING,
            outcome=WorkflowOutcome.UNKNOWN,
            state_before=state_before,
            state_after=DECISION_STATE_RULE_EVALUATED,
            service=SERVICE_ROUTING,
            operation=OPERATION_EVALUATE_RULES,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            execution_time_ms=evaluation_time_ms,
            organization_id=organization_id,
        )

    @classmethod
    def emit_lab_matched(
        cls,
        *,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        attempt_number: int,
        eligible_count: int,
        evaluated_count: int,
        recommendation_id: str | None = None,
        collection_mode: str | None = None,
        organization_id: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        if cls._repository.has_action_for_decision(
            decision_id=decision_id,
            action=BusinessAuditAction.ROUTING_LAB_MATCHED,
        ):
            return None
        state_before = cls._repository.current_macro_state(decision_id) or DECISION_STATE_RULE_EVALUATED
        payload = RoutingPayloadBuilder.build_lab_matched(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            eligible_count=eligible_count,
            evaluated_count=evaluated_count,
            recommendation_id=recommendation_id,
            collection_mode=collection_mode,
        )
        return cls._record(
            action=BusinessAuditAction.ROUTING_LAB_MATCHED,
            event="Routing lab matched",
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            recommendation_id=recommendation_id,
            user=user,
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.RUNNING,
            outcome=WorkflowOutcome.UNKNOWN,
            state_before=state_before,
            state_after=DECISION_STATE_MATCHED,
            service=SERVICE_ROUTING,
            operation=OPERATION_MATCH_LABS,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            organization_id=organization_id,
        )

    @classmethod
    def emit_price_compared(
        cls,
        *,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        attempt_number: int,
        ranked: list | None,
        comparison_time_ms: int,
        recommendation_id: str | None = None,
        collection_mode: str | None = None,
        organization_id: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        if cls._repository.has_action_for_decision(
            decision_id=decision_id,
            action=BusinessAuditAction.ROUTING_PRICE_COMPARED,
        ):
            return None
        state_before = cls._repository.current_macro_state(decision_id) or DECISION_STATE_MATCHED
        payload = RoutingPayloadBuilder.build_price_compared(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            ranked=ranked,
            comparison_time_ms=comparison_time_ms,
            recommendation_id=recommendation_id,
            collection_mode=collection_mode,
        )
        return cls._record(
            action=BusinessAuditAction.ROUTING_PRICE_COMPARED,
            event="Routing price compared",
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            recommendation_id=recommendation_id,
            user=user,
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.RUNNING,
            outcome=WorkflowOutcome.UNKNOWN,
            state_before=state_before,
            state_after=DECISION_STATE_COMPARED,
            service=SERVICE_ROUTING,
            operation=OPERATION_COMPARE_PRICES,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            execution_time_ms=comparison_time_ms,
            organization_id=organization_id,
        )

    @classmethod
    def emit_discount_applied(
        cls,
        *,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        attempt_number: int,
        discount_amount,
        savings=None,
        discount_time_ms: int = 0,
        recommendation_id: str | None = None,
        organization_id: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        if cls._repository.has_action_for_decision(
            decision_id=decision_id,
            action=BusinessAuditAction.ROUTING_DISCOUNT_APPLIED,
        ):
            return None
        state_before = cls._repository.current_macro_state(decision_id) or DECISION_STATE_COMPARED
        payload = RoutingPayloadBuilder.build_discount_applied(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            discount_amount=discount_amount,
            savings=savings,
            discount_time_ms=discount_time_ms,
            recommendation_id=recommendation_id,
        )
        return cls._record(
            action=BusinessAuditAction.ROUTING_DISCOUNT_APPLIED,
            event="Routing discount applied",
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            recommendation_id=recommendation_id,
            user=user,
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.RUNNING,
            outcome=WorkflowOutcome.UNKNOWN,
            state_before=state_before,
            state_after=DECISION_STATE_DISCOUNTED,
            service=SERVICE_ASSIGNMENT,
            operation=OPERATION_APPLY_DISCOUNT,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            execution_time_ms=discount_time_ms,
            organization_id=organization_id,
        )

    @classmethod
    def emit_lab_assigned(
        cls,
        *,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        attempt_number: int,
        ranked: list,
        all_evaluated: list | None,
        confidence: str | None,
        engine_version: str | None,
        discount_amount=None,
        timings: DecisionTimings | None = None,
        decision_path: list[str],
        recommendation_id: str | None = None,
        collection_mode: str | None = None,
        provider_response: ProviderResponse | None = None,
        routing_time_ms: int | None = None,
        organization_id: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        if cls._repository.has_action_for_decision(
            decision_id=decision_id,
            action=BusinessAuditAction.ROUTING_LAB_ASSIGNED,
        ):
            return None
        state_before = cls._repository.current_macro_state(decision_id) or DECISION_STATE_COMPARED
        payload = RoutingPayloadBuilder.build_lab_assigned(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            ranked=ranked,
            all_evaluated=all_evaluated,
            confidence=confidence,
            engine_version=engine_version,
            discount_amount=discount_amount,
            timings=timings or DecisionTimings(),
            decision_path=decision_path,
            recommendation_id=recommendation_id,
            collection_mode=collection_mode,
            provider_response=provider_response,
            routing_time_ms=routing_time_ms,
        )
        return cls._record(
            action=BusinessAuditAction.ROUTING_LAB_ASSIGNED,
            event="Routing lab assigned",
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            recommendation_id=recommendation_id,
            user=user,
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.COMPLETED,
            outcome=WorkflowOutcome.SUCCESS,
            state_before=state_before,
            state_after=DECISION_STATE_ASSIGNED,
            service=SERVICE_ASSIGNMENT,
            operation=OPERATION_ASSIGN_LAB,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            execution_time_ms=routing_time_ms,
            organization_id=organization_id,
        )

    @classmethod
    def emit_failed(
        cls,
        *,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        attempt_number: int,
        reason: str,
        all_evaluated: list | None = None,
        ranked: list | None = None,
        confidence: str | None = None,
        engine_version: str | None = None,
        timings: DecisionTimings | None = None,
        decision_path: list[str],
        recommendation_id: str | None = None,
        collection_mode: str | None = None,
        provider_response: ProviderResponse | None = None,
        routing_time_ms: int | None = None,
        organization_id: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        if cls._repository.has_action_for_decision(
            decision_id=decision_id,
            action=BusinessAuditAction.ROUTING_FAILED,
        ):
            return None
        state_before = cls._repository.current_macro_state(decision_id) or DECISION_STATE_STARTED
        payload = RoutingPayloadBuilder.build_failed(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            reason=reason,
            all_evaluated=all_evaluated,
            ranked=ranked,
            confidence=confidence,
            engine_version=engine_version,
            timings=timings,
            decision_path=decision_path,
            recommendation_id=recommendation_id,
            collection_mode=collection_mode,
            provider_response=provider_response,
            routing_time_ms=routing_time_ms,
        )
        return cls._record(
            action=BusinessAuditAction.ROUTING_FAILED,
            event="Routing failed",
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            recommendation_id=recommendation_id,
            user=user,
            actor_type=ActorType.SYSTEM,
            status=WorkflowStatus.COMPLETED,
            outcome=WorkflowOutcome.FAILURE,
            state_before=state_before,
            state_after=DECISION_STATE_FAILED,
            service=SERVICE_ROUTING,
            operation=OPERATION_ROUTING_FAILED,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            execution_time_ms=routing_time_ms,
            organization_id=organization_id,
        )

    @classmethod
    def emit_manual_override(
        cls,
        *,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        attempt_number: int,
        override_version: int,
        before_branch_id: str,
        after_branch_id: str,
        before_lab_id: str | None,
        after_lab_id: str | None,
        ranked: list | None = None,
        all_evaluated: list | None = None,
        confidence: str | None = None,
        engine_version: str | None = None,
        timings: DecisionTimings | None = None,
        recommendation_id: str | None = None,
        override_reason: str = "manual_assignment",
        organization_id: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
    ) -> BusinessAuditResult | None:
        if cls._repository.has_manual_override_version(
            decision_id=decision_id,
            version=override_version,
        ):
            return None
        state_before = cls._repository.current_macro_state(decision_id) or DECISION_STATE_ASSIGNED
        payload = RoutingPayloadBuilder.build_manual_override(
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            attempt_number=attempt_number,
            override_version=override_version,
            before_branch_id=before_branch_id,
            after_branch_id=after_branch_id,
            before_lab_id=before_lab_id,
            after_lab_id=after_lab_id,
            ranked=ranked,
            all_evaluated=all_evaluated,
            confidence=confidence,
            engine_version=engine_version,
            timings=timings,
            recommendation_id=recommendation_id,
            override_reason=override_reason,
        )
        return cls._record(
            action=BusinessAuditAction.ROUTING_MANUAL_OVERRIDE,
            event="Routing manual override",
            decision_id=decision_id,
            routing_id=routing_id,
            booking_id=booking_id,
            recommendation_id=recommendation_id,
            user=user,
            actor_type=ActorType.ADMIN if user else ActorType.SYSTEM,
            status=WorkflowStatus.COMPLETED,
            outcome=WorkflowOutcome.SUCCESS,
            state_before=state_before,
            state_after=DECISION_STATE_ASSIGNED,
            service=SERVICE_ASSIGNMENT,
            operation=OPERATION_MANUAL_OVERRIDE,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            organization_id=organization_id,
        )

    @classmethod
    def _record(
        cls,
        *,
        action: BusinessAuditAction,
        event: str,
        decision_id: str,
        routing_id: str,
        booking_id: str | None,
        recommendation_id: str | None,
        actor_type: ActorType,
        status: WorkflowStatus,
        outcome: WorkflowOutcome,
        domain: str = DOMAIN_DIAGNOSTICS,
        service: str,
        operation: str,
        payload: dict[str, Any],
        state_before: str | None = None,
        state_after: str | None = None,
        organization_id: str | None = None,
        user=None,
        correlation_id: str | None = None,
        request_id: str | None = None,
        execution_time_ms: int | None = None,
    ) -> BusinessAuditResult:
        user_id = None
        if user is not None and getattr(user, "is_authenticated", False):
            user_id = str(getattr(user, "pk", ""))

        parent_workflow_instance_id = booking_id or recommendation_id
        apply_workflow_context(workflow_instance_id=routing_id)

        resolved_org_id = organization_id or payload.get("organization_id")
        if not resolved_org_id:
            raise ValueError("organization_id is required for routing decision audit")

        return BusinessAuditService.record(
            action=action,
            event=event,
            workflow_type=WorkflowType.ROUTING,
            workflow_instance_id=routing_id,
            parent_workflow_instance_id=str(parent_workflow_instance_id)
            if parent_workflow_instance_id
            else None,
            category=EventCategory.ROUTING,
            domain=domain,
            service=service,
            operation=operation,
            resource_type=BusinessResourceType.DECISION,
            resource_id=decision_id,
            organization_id=str(resolved_org_id),
            status=status,
            outcome=outcome,
            actor_type=actor_type,
            state_before=state_before,
            state_after=state_after,
            user_id=user_id,
            payload=payload,
            correlation_id=correlation_id,
            request_id=request_id,
            execution_time_ms=execution_time_ms,
            external_provider=ExternalProvider.INTERNAL,
        )
