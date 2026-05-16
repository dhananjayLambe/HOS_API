"""Persist routing snapshots, assignments, and append-only routing events."""

from __future__ import annotations

import logging
from collections import Counter
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from diagnostics_engine.choices.routing import (
    AssignmentStatus,
    AssignmentType,
    DiagnosticOrderRoutingStatus,
    RecommendationLabel,
    RoutingEventType,
    RoutingStatus,
)
from diagnostics_engine.models.orders import DiagnosticOrder
from diagnostics_engine.models.routing import (
    EligibleLabSnapshot,
    RoutingDecisionSnapshot,
    RoutingEvent,
    RoutingLabOrderAssignment,
    RoutingRun,
)
from diagnostics_engine.services.routing.eligibility_engine import ER_IN_SERVICE_AREA, EligibilityCandidate
from diagnostics_engine.services.routing.routing_helpers import (
    describe_diagnostic_order_tests,
    privacy_patient_label,
    routing_journey_human,
    routing_journey_info,
)

if TYPE_CHECKING:
    from account.models import User
    from diagnostics_engine.services.routing.ranking_engine import RankedLab
    from diagnostics_engine.services.routing.routing_helpers import ResolvedRoutingLocation

logger = logging.getLogger(__name__)


def _reject_snapshots_sort_key(c: EligibilityCandidate) -> tuple:
    """Prefer branches that matched service area but failed later (e.g. pricing)."""
    matched_area = ER_IN_SERVICE_AREA in c.eligibility_reasons
    return (-int(matched_area), len(c.ineligibility_reasons), str(c.branch.pk))


class AssignmentService:
    """Transactional persistence for one routing run (order-level assignment only)."""

    @staticmethod
    @transaction.atomic
    def persist_routing_result(
        *,
        routing_run: RoutingRun,
        order: DiagnosticOrder,
        resolved: ResolvedRoutingLocation,
        ranked: list[RankedLab],
        triggered_by: User | None,
        recommendation_confidence: str,
        all_evaluated: list[EligibilityCandidate] | None = None,
    ) -> RoutingLabOrderAssignment | None:
        run = RoutingRun.objects.select_for_update().get(pk=routing_run.pk)
        encounter = order.encounter
        consultation = order.consultation
        profile = order.patient_profile
        doc = order.doctor

        from diagnostics_engine.services.routing.routing_helpers import resolve_patient_legacy_row

        patient_row = resolve_patient_legacy_row(profile)

        encounter_display = getattr(encounter, "visit_pnr", None) or (str(encounter.pk) if encounter else "")
        patient_name = profile.get_full_name() if profile else ""
        patient_phone = ""
        if profile and profile.account and profile.account.user:
            patient_phone = getattr(profile.account.user, "username", "") or ""

        clinic_name = encounter.clinic.name if encounter and encounter.clinic else ""
        doctor_name = doc.get_name if doc else ""

        def _event(event_type: str, *, assignment=None, metadata: dict[str, Any] | None = None) -> None:
            RoutingEvent.objects.create(
                routing_run=run,
                assignment=assignment,
                diagnostic_order=order,
                encounter=encounter,
                consultation=consultation,
                event_type=event_type,
                actor=triggered_by,
                source="routing_service",
                metadata=metadata or {},
            )

        if not ranked:
            cap = max(0, int(getattr(settings, "DIAGNOSTIC_ROUTING_MAX_REJECT_SNAPSHOTS", 50)))
            evaluated = list(all_evaluated or [])
            rejected = [c for c in evaluated if c.ineligibility_reasons]
            rejected_sorted = sorted(rejected, key=_reject_snapshots_sort_key)[:cap]
            for c in rejected_sorted:
                meta = {
                    "eligibility_reasons": c.eligibility_reasons,
                    "ineligibility_reasons": c.ineligibility_reasons,
                    "missing_tests": c.missing_tests,
                    "reject_sample": True,
                }
                EligibleLabSnapshot.objects.create(
                    routing_run=run,
                    diagnostic_order=order,
                    encounter=encounter,
                    consultation=consultation,
                    patient=patient_row,
                    lab=c.lab,
                    branch=c.branch,
                    is_eligible=False,
                    supports_home_collection=c.supports_home_collection,
                    supports_all_tests=c.supports_all_tests,
                    distance_km=Decimal(str(round(c.distance_km, 2))) if c.distance_km is not None else None,
                    estimated_tat_hours=c.estimated_tat_hours,
                    estimated_price=c.estimated_price,
                    ranking_position=None,
                    distance_source=resolved.source,
                    missing_tests_snapshot=c.missing_tests,
                    metadata=meta,
                )

            reason_hist: Counter[str] = Counter()
            for c in rejected:
                for ir in c.ineligibility_reasons:
                    reason_hist[ir] += 1
            no_match_summary = {
                "evaluated_branch_count": len(evaluated),
                "rejected_branch_count": len(rejected),
                "reject_snapshots_persisted": len(rejected_sorted),
                "ineligibility_reason_histogram": dict(reason_hist),
            }

            DiagnosticOrder.objects.filter(pk=order.pk).update(
                routing_status=DiagnosticOrderRoutingStatus.NO_MATCH_FOUND,
                updated_at=timezone.now(),
            )
            run.routing_status = RoutingStatus.NO_MATCH_FOUND
            run.completed_at = timezone.now()
            run.resolved_location_source = resolved.source
            run.resolved_pincode = resolved.pincode
            if resolved.latitude is not None:
                run.resolved_latitude = Decimal(str(resolved.latitude))
            if resolved.longitude is not None:
                run.resolved_longitude = Decimal(str(resolved.longitude))
            merged_meta = dict(run.metadata or {})
            merged_meta["no_match_summary"] = no_match_summary
            run.metadata = merged_meta
            run.save(
                update_fields=[
                    "routing_status",
                    "completed_at",
                    "resolved_location_source",
                    "resolved_pincode",
                    "resolved_latitude",
                    "resolved_longitude",
                    "metadata",
                    "updated_at",
                ]
            )
            _event(
                RoutingEventType.NO_ELIGIBLE_LABS,
                metadata={"reason": "no_eligible_branches", **no_match_summary},
            )
            _event(RoutingEventType.ROUTING_COMPLETED, metadata={"outcome": "no_match"})
            routing_journey_info(
                "[routing journey] Order %s: step 5/5 — outcome NO_MATCH: no eligible lab; stored up to %d "
                "reject snapshot(s) for support. order.routing_status → NO_MATCH_FOUND. Rejection histogram: %s",
                order.pk,
                len(rejected_sorted),
                dict(reason_hist.most_common(10)),
            )
            routing_journey_human(
                "Diagnostics · No lab could be auto-assigned for %s — order %s. Tests: %s. "
                "Common causes: that area is not in a lab's service list yet, prices are not on file for every "
                "test, or home-collection is not offered for this pincode.",
                privacy_patient_label(patient_name),
                order.order_number,
                describe_diagnostic_order_tests(order),
            )
            return None

        snap_rows: list[EligibleLabSnapshot] = []
        pos = 1
        for r in ranked:
            c = r.candidate
            meta = {
                "eligibility_reasons": c.eligibility_reasons,
                "ineligibility_reasons": c.ineligibility_reasons,
            }
            els = EligibleLabSnapshot.objects.create(
                routing_run=run,
                diagnostic_order=order,
                encounter=encounter,
                consultation=consultation,
                patient=patient_row,
                lab=c.lab,
                branch=c.branch,
                is_eligible=True,
                supports_home_collection=c.supports_home_collection,
                supports_all_tests=c.supports_all_tests,
                distance_km=Decimal(str(round(c.distance_km, 2))) if c.distance_km is not None else None,
                estimated_tat_hours=c.estimated_tat_hours,
                estimated_price=c.estimated_price,
                ranking_position=pos,
                distance_source=resolved.source,
                missing_tests_snapshot=c.missing_tests,
                metadata=meta,
            )
            snap_rows.append(els)
            pos += 1

        decision_rows: list[RoutingDecisionSnapshot] = []
        for r, els in zip(ranked, snap_rows):
            primary = (
                RecommendationLabel.RECOMMENDED
                if RecommendationLabel.RECOMMENDED in r.recommendation_labels
                else (r.recommendation_labels[0] if r.recommendation_labels else RecommendationLabel.RECOMMENDED)
            )
            decision_rows.append(
                RoutingDecisionSnapshot.objects.create(
                    routing_run=run,
                    eligible_lab_snapshot=els,
                    encounter=encounter,
                    consultation=consultation,
                    recommendation_label=primary,
                    recommendation_labels=list(r.recommendation_labels),
                    recommendation_confidence=recommendation_confidence,
                    distance_score=r.distance_score,
                    price_score=r.price_score,
                    tat_score=r.tat_score,
                    quality_score=r.quality_score,
                    partner_score=r.partner_score,
                    final_score=r.final_score,
                    decision_reason="hybrid_scoring_v1",
                )
            )

        top_snap = snap_rows[0]
        top_decision = decision_rows[0]

        assignment = RoutingLabOrderAssignment.objects.create(
            diagnostic_order=order,
            encounter=encounter,
            consultation=consultation,
            patient=patient_row,
            clinic=encounter.clinic if encounter else None,
            doctor=doc.user if doc else None,
            encounter_display_id=encounter_display,
            patient_name_snapshot=patient_name,
            patient_phone_snapshot=patient_phone,
            clinic_name_snapshot=clinic_name,
            doctor_name_snapshot=doctor_name,
            routing_run=run,
            selected_snapshot=top_snap,
            selected_decision=top_decision,
            lab=top_snap.lab,
            branch=top_snap.branch,
            assignment_status=AssignmentStatus.ASSIGNED,
            assignment_type=AssignmentType.AUTO,
            assignment_reason="auto_top_ranked_provider",
            assigned_by=triggered_by,
        )

        DiagnosticOrder.objects.filter(pk=order.pk).update(
            branch_id=top_snap.branch_id,
            routing_status=DiagnosticOrderRoutingStatus.ASSIGNED,
            updated_at=timezone.now(),
        )

        from labs.api.services.lab_assignment_provisioning import ensure_lab_order_assignment

        ensure_lab_order_assignment(
            diagnostic_order=order,
            lab_branch=top_snap.branch,
            assigned_by=triggered_by,
        )

        run.routing_status = RoutingStatus.COMPLETED
        run.completed_at = timezone.now()
        run.resolved_location_source = resolved.source
        run.resolved_pincode = resolved.pincode
        if resolved.latitude is not None:
            run.resolved_latitude = Decimal(str(resolved.latitude))
        if resolved.longitude is not None:
            run.resolved_longitude = Decimal(str(resolved.longitude))
        run.save(
            update_fields=[
                "routing_status",
                "completed_at",
                "resolved_location_source",
                "resolved_pincode",
                "resolved_latitude",
                "resolved_longitude",
                "updated_at",
            ]
        )

        _event(
            RoutingEventType.LAB_SUGGESTED,
            assignment=assignment,
            metadata={
                "lab_id": str(top_snap.lab_id),
                "branch_id": str(top_snap.branch_id),
                "recommendation_labels": top_decision.recommendation_labels,
            },
        )
        _event(RoutingEventType.ASSIGNMENT_CREATED, assignment=assignment, metadata={})
        _event(RoutingEventType.ROUTING_COMPLETED, assignment=assignment, metadata={"outcome": "assigned"})
        routing_journey_info(
            "[routing journey] Order %s: step 5/5 — outcome ASSIGNED: winning branch_id=%s (%s) org=%s; "
            "RoutingLabOrderAssignment %s created; order.branch_id updated; routing_status → ASSIGNED. "
            "Labels on winner: %s confidence=%s",
            order.pk,
            top_snap.branch_id,
            getattr(top_snap.branch, "branch_code", "") or "",
            getattr(top_snap.lab, "organization_code", "") or "",
            assignment.pk,
            top_decision.recommendation_labels,
            top_decision.recommendation_confidence,
        )
        lab_human = (
            getattr(top_snap.lab, "display_name", None)
            or getattr(top_snap.lab, "organization_name", None)
            or getattr(top_snap.lab, "organization_code", "")
            or "the selected lab"
        )
        br_human = getattr(top_snap.branch, "branch_name", None) or getattr(
            top_snap.branch, "branch_code", ""
        ) or ""
        place = f"{lab_human} — {br_human}" if br_human else lab_human
        price = top_snap.estimated_price
        if price is not None:
            price_human = f"Estimated price about Rs. {price}."
        else:
            price_human = "Price will be confirmed from the lab quote."
        routing_journey_human(
            "Diagnostics · Lab assigned for %s — order %s. %s will run: %s. %s",
            privacy_patient_label(patient_name),
            order.order_number,
            place,
            describe_diagnostic_order_tests(order),
            price_human,
        )
        return assignment
