"""GET routing outcome for a diagnostic order (selected branch + ranked alternatives)."""

from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from diagnostics_engine.models.orders import DiagnosticOrder
from diagnostics_engine.models.routing import EligibleLabSnapshot, RoutingLabOrderAssignment, RoutingRun


def _user_can_view_order_routing(user, order: DiagnosticOrder) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_superuser", False):
        return True
    if user.groups.filter(name__in=["helpdesk", "helpdesk_admin", "clinic_admin"]).exists():
        return True
    if user.groups.filter(name="doctor").exists():
        return bool(order.doctor_id and getattr(order.doctor, "user_id", None) == user.id)
    return False


class DiagnosticOrderRoutingSummaryView(APIView):
    """
    GET /api/diagnostics/orders/<uuid:order_id>/routing/

    Returns the auto-selected branch (after routing completes), ranked eligible
    branch snapshots, and optional `rejected_branch_samples` when the run ended
    with no eligible lab (explainability / support).
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        order = get_object_or_404(
            DiagnosticOrder.objects.select_related(
                "doctor",
                "doctor__user",
                "encounter",
            ),
            pk=order_id,
        )
        if not _user_can_view_order_routing(request.user, order):
            return Response({"detail": "Not permitted to view this order's routing."}, status=403)

        latest_run = (
            RoutingRun.objects.filter(diagnostic_order=order)
            .order_by("-created_at")
            .first()
        )

        assignment = (
            RoutingLabOrderAssignment.objects.filter(diagnostic_order=order)
            .select_related("branch", "lab", "selected_decision", "routing_run")
            .order_by("-created_at")
            .first()
        )

        selected = None
        if assignment:
            b = assignment.branch
            lab = assignment.lab
            selected = {
                "branch_id": str(b.id),
                "branch_name": b.branch_name,
                "branch_code": b.branch_code,
                "lab_id": str(lab.id),
                "lab_display_name": getattr(lab, "display_name", None) or lab.organization_name,
                "assignment_id": str(assignment.id),
                "assignment_status": assignment.assignment_status,
                "recommendation_labels": (
                    list(assignment.selected_decision.recommendation_labels)
                    if assignment.selected_decision_id
                    else []
                ),
            }

        alternatives: list[dict] = []
        rejected_samples: list[dict] = []
        if latest_run:
            eligible_qs = (
                EligibleLabSnapshot.objects.filter(routing_run=latest_run, is_eligible=True)
                .select_related("branch", "lab", "decision_snapshot")
                .order_by("ranking_position", "created_at")
            )
            for s in eligible_qs:
                labels = []
                ds = getattr(s, "decision_snapshot", None)
                if ds is not None:
                    labels = list(ds.recommendation_labels or [])
                alternatives.append(
                    {
                        "ranking_position": s.ranking_position,
                        "branch_id": str(s.branch_id),
                        "branch_name": s.branch.branch_name,
                        "branch_code": s.branch.branch_code,
                        "lab_id": str(s.lab_id),
                        "lab_display_name": getattr(s.lab, "display_name", None) or s.lab.organization_name,
                        "estimated_price": str(s.estimated_price) if s.estimated_price is not None else None,
                        "estimated_tat_hours": s.estimated_tat_hours,
                        "distance_km": str(s.distance_km) if s.distance_km is not None else None,
                        "recommendation_labels": labels,
                        "metadata": s.metadata or {},
                    }
                )

            reject_qs = (
                EligibleLabSnapshot.objects.filter(routing_run=latest_run, is_eligible=False)
                .select_related("branch", "lab")
                .order_by("created_at")
            )
            for s in reject_qs:
                rejected_samples.append(
                    {
                        "branch_id": str(s.branch_id),
                        "branch_name": s.branch.branch_name,
                        "branch_code": s.branch.branch_code,
                        "lab_id": str(s.lab_id),
                        "lab_display_name": getattr(s.lab, "display_name", None) or s.lab.organization_name,
                        "estimated_price": str(s.estimated_price) if s.estimated_price is not None else None,
                        "estimated_tat_hours": s.estimated_tat_hours,
                        "distance_km": str(s.distance_km) if s.distance_km is not None else None,
                        "metadata": s.metadata or {},
                    }
                )

        payload = {
            "diagnostic_order_id": str(order.id),
            "order_number": order.order_number,
            "order_routing_status": order.routing_status,
            "latest_run": None
            if not latest_run
            else {
                "id": str(latest_run.id),
                "routing_status": latest_run.routing_status,
                "routing_engine_version": latest_run.routing_engine_version,
                "resolved_pincode": latest_run.resolved_pincode,
                "resolved_location_source": latest_run.resolved_location_source,
                "no_match_summary": (latest_run.metadata or {}).get("no_match_summary"),
            },
            "selected_branch": selected,
            "eligible_branches": alternatives,
            "rejected_branch_samples": rejected_samples,
        }
        return Response(payload)
