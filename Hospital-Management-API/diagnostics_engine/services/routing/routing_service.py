"""Orchestrates diagnostics routing after a diagnostic order exists (never raises to callers)."""

from __future__ import annotations

import logging
import os
import time
from collections import Counter
from typing import Any

from django.db import transaction
from django.utils import timezone

from diagnostics_engine.choices.routing import (
    DiagnosticOrderRoutingStatus,
    RoutingEventType,
    RoutingStatus,
)
from diagnostics_engine.models.routing import RoutingEvent, RoutingLabOrderAssignment, RoutingRun

logger = logging.getLogger(__name__)


class RoutingService:
    """Main entrypoint: idempotent, safe for on_commit, logs stack traces on failure."""

    @classmethod
    def start_routing_for_order(
        cls,
        order_id: Any,
        *,
        triggered_by_id: int | None = None,
        engine_version: str = "v1",
    ) -> None:
        from account.models import User
        from diagnostics_engine.models.orders import DiagnosticOrder, DiagnosticOrderTestLine
        from diagnostics_engine.services.routing.assignment_service import AssignmentService
        from diagnostics_engine.services.routing.eligibility_engine import EligibilityEngine
        from diagnostics_engine.services.routing.ranking_engine import RankingEngine
        from diagnostics_engine.services.routing.routing_helpers import (
            describe_diagnostic_order_tests,
            privacy_patient_label,
            resolve_routing_location,
            resolve_patient_legacy_row,
            routing_journey_human,
            routing_journey_info,
        )

        try:
            order = (
                DiagnosticOrder.objects.select_related(
                    "encounter",
                    "encounter__clinic",
                    "encounter__clinic__address",
                    "consultation",
                    "patient_profile",
                    "patient_profile__account",
                    "patient_profile__account__user",
                    "doctor",
                    "doctor__user",
                ).get(pk=order_id)
            )
        except DiagnosticOrder.DoesNotExist:
            logger.exception("routing aborted: diagnostic order not found order_id=%s", order_id)
            return

        n_lines = DiagnosticOrderTestLine.objects.filter(order_id=order.pk).count()
        routing_journey_info(
            "[routing journey] Order %s (%s): routing pipeline started — %d test line(s), "
            "routing_status=%s, sample_collection_mode=%s, initial_branch_id=%s (catalog/pricing anchor from "
            "doctor flow; marketplace may assign a different winning branch).",
            order.pk,
            order.order_number,
            n_lines,
            order.routing_status,
            order.sample_collection_mode or "lab",
            order.branch_id,
        )
        triggered_by = None
        if triggered_by_id:
            triggered_by = User.objects.filter(pk=triggered_by_id).first()

        if order.routing_status == DiagnosticOrderRoutingStatus.ASSIGNED:
            if RoutingLabOrderAssignment.objects.filter(diagnostic_order=order).exists():
                routing_journey_info(
                    "[routing journey] Order %s (%s): no work — already ASSIGNED with a RoutingLabOrderAssignment "
                    "(idempotent skip).",
                    order.pk,
                    order.order_number,
                )
                return

        encounter = order.encounter
        profile = order.patient_profile
        doc = order.doctor

        encounter_display = getattr(encounter, "visit_pnr", None) or (str(encounter.pk) if encounter else "")
        patient_name = profile.get_full_name() if profile else ""
        patient_phone = ""
        if profile and profile.account and profile.account.user:
            patient_phone = getattr(profile.account.user, "username", "") or ""

        clinic_name = encounter.clinic.name if encounter and encounter.clinic else ""
        doctor_name = doc.get_name if doc else ""

        patient_row = resolve_patient_legacy_row(profile)

        tests_summary = describe_diagnostic_order_tests(order)
        patient_short = privacy_patient_label(patient_name)
        coll_human = (
            "home sample collection" if (order.sample_collection_mode or "lab") == "home" else "lab visit"
        )
        routing_journey_human(
            "Diagnostics · Matching a lab for %s — order %s (%s). Selected tests: %s.",
            patient_short,
            order.order_number,
            coll_human,
            tests_summary,
        )

        try:
            with transaction.atomic():
                locked = DiagnosticOrder.objects.select_for_update().get(pk=order.pk)
                if locked.routing_status == DiagnosticOrderRoutingStatus.ASSIGNED:
                    routing_journey_info(
                        "[routing journey] Order %s: stopped before new RoutingRun — another worker already set "
                        "this order to ASSIGNED (race-safe exit).",
                        order.pk,
                    )
                    return
                if RoutingRun.objects.filter(
                    diagnostic_order=locked,
                    routing_status=RoutingStatus.RUNNING,
                ).exists():
                    routing_journey_info(
                        "[routing journey] Order %s: stopped — a RoutingRun is already RUNNING for this order "
                        "(no duplicate orchestration).",
                        order.pk,
                    )
                    return
                run = RoutingRun.objects.create(
                    diagnostic_order=order,
                    encounter=encounter,
                    consultation=order.consultation,
                    patient=patient_row,
                    clinic=encounter.clinic if encounter else None,
                    doctor=doc.user if doc else None,
                    encounter_display_id=encounter_display,
                    patient_name_snapshot=patient_name,
                    patient_phone_snapshot=patient_phone,
                    clinic_name_snapshot=clinic_name,
                    doctor_name_snapshot=doctor_name,
                    routing_status=RoutingStatus.RUNNING,
                    routing_engine_version=engine_version,
                    triggered_by=triggered_by,
                    requested_collection_mode=order.sample_collection_mode,
                )
                RoutingEvent.objects.create(
                    routing_run=run,
                    diagnostic_order=order,
                    encounter=encounter,
                    consultation=order.consultation,
                    event_type=RoutingEventType.ROUTING_STARTED,
                    actor=triggered_by,
                    source="routing_service",
                    metadata={"engine_version": engine_version},
                )
                DiagnosticOrder.objects.filter(pk=order.pk).update(
                    routing_status=DiagnosticOrderRoutingStatus.ROUTING_IN_PROGRESS,
                    updated_at=timezone.now(),
                )
                run_id = run.pk

            from business_audit.decision.routing.hooks import schedule_routing_decision_started

            pipeline_started = time.monotonic()
            decision_ctx = schedule_routing_decision_started(
                routing_run=run,
                order=order,
                user=triggered_by,
            )

            routing_journey_info(
                "[routing journey] Order %s: step 1/5 — RoutingRun %s started (event ROUTING_STARTED); "
                "order.routing_status → ROUTING_IN_PROGRESS. Context: encounter=%s clinic=%s doctor=%s patient=%s.",
                order.pk,
                run_id,
                encounter_display,
                clinic_name,
                doctor_name,
                patient_name,
            )

            resolved = resolve_routing_location(order)
            run = RoutingRun.objects.get(pk=run_id)

            routing_journey_info(
                "[routing journey] Order %s: step 2/5 — resolved routing location: source=%s pincode=%s city=%s "
                "lat=%s lon=%s confidence=%s (used for service-area match and distance scoring).",
                order.pk,
                resolved.source,
                resolved.pincode,
                resolved.city,
                resolved.latitude,
                resolved.longitude,
                resolved.confidence,
            )
            if resolved.pincode:
                loc_human = f"pincode {resolved.pincode}"
            elif resolved.city:
                loc_human = f"city {resolved.city}"
            elif resolved.latitude is not None and resolved.longitude is not None:
                loc_human = "clinic map coordinates"
            else:
                loc_human = "limited location detail"
            routing_journey_human(
                "Diagnostics · Location used for %s on order %s: %s.",
                patient_short,
                order.order_number,
                loc_human,
            )

            eval_started = time.monotonic()
            all_evaluated = EligibilityEngine.evaluate_all(order, resolved)
            decision_ctx.evaluation_time_ms = int((time.monotonic() - eval_started) * 1000)
            eligible = [c for c in all_evaluated if not c.ineligibility_reasons]
            rank_started = time.monotonic()
            ranked = RankingEngine.rank(eligible)
            decision_ctx.comparison_time_ms = int((time.monotonic() - rank_started) * 1000)
            decision_ctx.all_evaluated = all_evaluated
            decision_ctx.ranked = ranked
            decision_ctx.confidence = resolved.confidence
            decision_ctx.routing_time_ms = int((time.monotonic() - pipeline_started) * 1000)

            from business_audit.decision.routing.hooks import schedule_routing_decision_evaluated

            schedule_routing_decision_evaluated(
                ctx=decision_ctx,
                user=triggered_by,
            )

            if not all_evaluated:
                from diagnostics_engine.services.routing.routing_helpers import (
                    routable_lab_branches_queryset,
                )

                routable_n = routable_lab_branches_queryset().count()
                if routable_n == 0:
                    logger.warning(
                        "Routing order %s: zero marketplace branches (routable pool empty). "
                        "Lab org must be registration_status=APPROVED, is_verified=True, "
                        "onboarding_completed=True, is_active_for_orders=True — branch-only "
                        "enablement is not enough.",
                        order.order_number,
                    )
                else:
                    logger.warning(
                        "Routing order %s: routable pool has %s branch(es) but none were evaluated "
                        "(check test lines on order).",
                        order.order_number,
                        routable_n,
                    )

            if os.environ.get("DIAGNOSTIC_ROUTING_REJECT_DEBUG", "").strip().lower() in (
                "1",
                "true",
                "yes",
                "on",
            ):
                logger.info(
                    "Routing eligible | order=%s | count=%s | branches=%s",
                    order.order_number,
                    len(eligible),
                    [(c.branch.pk, getattr(c.branch, "branch_code", "") or "") for c in eligible],
                )

            reject_hist: Counter[str] = Counter()
            for cand in all_evaluated:
                for code in cand.ineligibility_reasons:
                    reject_hist[code] += 1
            routing_journey_info(
                "[routing journey] Order %s: step 3/5 — eligibility: evaluated %d marketplace branch(es), "
                "%d eligible, %d ineligible. Most common rejection codes: %s",
                order.pk,
                len(all_evaluated),
                len(eligible),
                len(all_evaluated) - len(eligible),
                dict(reject_hist.most_common(8)),
            )

            if ranked:
                routing_journey_info(
                    "[routing journey] Order %s: step 4/5 — hybrid ranking: %d eligible branch(es); "
                    "showing top 5 by final_score.",
                    order.pk,
                    len(ranked),
                )
                for pos, rl in enumerate(ranked[:5], start=1):
                    br = rl.candidate.branch
                    org = rl.candidate.lab
                    routing_journey_info(
                        "[routing journey] Order %s:   rank #%d branch_id=%s branch_code=%s org_code=%s "
                        "price=%s tat_h=%s dist_km=%s final_score=%s labels=%s",
                        order.pk,
                        pos,
                        br.pk,
                        getattr(br, "branch_code", "") or "",
                        getattr(org, "organization_code", "") or "",
                        rl.candidate.estimated_price,
                        rl.candidate.estimated_tat_hours,
                        rl.candidate.distance_km,
                        rl.final_score,
                        rl.recommendation_labels,
                    )
            else:
                routing_journey_info(
                    "[routing journey] Order %s: step 4/5 — no eligible branches to rank; "
                    "persist step will record NO_MATCH samples.",
                    order.pk,
                )
            routing_journey_human(
                "Diagnostics · Checked the lab network for %s (%s). %s",
                patient_short,
                order.order_number,
                (
                    f"{len(eligible)} lab option(s) can run these tests from your location."
                    if eligible
                    else "No lab met every rule at this time (see technical routing logs for codes)."
                ),
            )

            AssignmentService.persist_routing_result(
                routing_run=run,
                order=order,
                resolved=resolved,
                ranked=ranked,
                triggered_by=triggered_by,
                recommendation_confidence=resolved.confidence,
                all_evaluated=all_evaluated,
                decision_ctx=decision_ctx,
            )
        except Exception:
            logger.exception("diagnostic routing failed order_id=%s", order_id)
            from business_audit.decision.routing.hooks import schedule_routing_decision_pipeline_failed

            routing_journey_info(
                "[routing journey] Order %s: pipeline aborted with exception — see diagnostics_engine routing "
                "logger at ERROR for stack trace; order will be marked ROUTING_FAILED where cleanup succeeds.",
                order.pk,
            )
            try:
                with transaction.atomic():
                    run = RoutingRun.objects.filter(diagnostic_order_id=order_id).order_by("-created_at").first()
                    if run:
                        run.routing_status = RoutingStatus.FAILED
                        run.failed_at = timezone.now()
                        run.error_message = "routing_failed"
                        run.save(update_fields=["routing_status", "failed_at", "error_message", "updated_at"])
                        RoutingEvent.objects.create(
                            routing_run=run,
                            diagnostic_order=order,
                            encounter=encounter,
                            consultation=order.consultation,
                            event_type=RoutingEventType.ROUTING_FAILED,
                            actor=triggered_by,
                            source="routing_service",
                            metadata={},
                        )
                    DiagnosticOrder.objects.filter(pk=order.pk).update(
                        routing_status=DiagnosticOrderRoutingStatus.ROUTING_FAILED,
                        updated_at=timezone.now(),
                    )
                schedule_routing_decision_pipeline_failed(
                    routing_run=run,
                    order=order,
                    reason="routing_failed",
                    user=triggered_by,
                )
            except Exception:
                logger.exception("diagnostic routing failure cleanup also failed order_id=%s", order_id)
