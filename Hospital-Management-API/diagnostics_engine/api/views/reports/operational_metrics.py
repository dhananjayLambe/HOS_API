"""Operational metrics for lab report turnaround and delivery (Phase 1C)."""

from __future__ import annotations

from datetime import timedelta

from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated

from diagnostics_engine.api.responses import success_response
from diagnostics_engine.api.views.reports.mixins import LabReportOperationalMixin
from diagnostics_engine.models.reports import DiagnosticTestReport
from labs.choices.tracking import DeliveryStatus
from labs.models.lab_tracking import LabReportDeliveryLog


# Default SLA thresholds (minutes) — override via env/config in Phase 2
_DEFAULT_SLA_MINUTES = {
    "routine": 120,
    "stat": 60,
}


class ReportOperationalMetricsView(LabReportOperationalMixin):
    """GET branch-scoped TAT, SLA breach rate, and delivery latency aggregates."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        lab_user, err = self.resolve_lab(request)
        if err:
            return err

        days = int(request.query_params.get("days", "7"))
        since = timezone.now() - timedelta(days=max(1, min(days, 90)))
        branch_id = lab_user.branch_id
        sla_minutes = int(request.query_params.get("sla_minutes", _DEFAULT_SLA_MINUTES["routine"]))

        reports = DiagnosticTestReport.objects.filter(
            order_test_line__order__branch_id=branch_id,
            ready_at__isnull=False,
            ready_at__gte=since,
            deleted_at__isnull=True,
        )

        tat_expr = ExpressionWrapper(
            F("ready_at") - F("created_at"),
            output_field=DurationField(),
        )
        annotated = reports.annotate(tat=tat_expr)
        tat_avg = annotated.aggregate(avg_tat=Avg("tat"))["avg_tat"]
        total_ready = annotated.count()
        breach_count = annotated.filter(tat__gt=timedelta(minutes=sla_minutes)).count()
        breach_rate = (breach_count / total_ready) if total_ready else 0.0

        delivery_logs = LabReportDeliveryLog.objects.filter(
            diagnostic_test_report__order_test_line__order__branch_id=branch_id,
            created_at__gte=since,
            is_deleted=False,
        )
        delivery_stats = delivery_logs.values("delivery_status").annotate(count=Count("id"))
        status_counts = {row["delivery_status"]: row["count"] for row in delivery_stats}
        failed = status_counts.get(DeliveryStatus.FAILED, 0)
        sent = status_counts.get(DeliveryStatus.SENT, 0) + status_counts.get(DeliveryStatus.DELIVERED, 0)

        payload = {
            "branch_id": str(branch_id),
            "window_days": days,
            "reports_ready_count": total_ready,
            "avg_turnaround_seconds": tat_avg.total_seconds() if tat_avg else None,
            "sla_minutes": sla_minutes,
            "sla_breach_count": breach_count,
            "sla_breach_rate": round(breach_rate, 4),
            "delivery_status_counts": status_counts,
            "delivery_failure_rate": round(failed / max(failed + sent, 1), 4),
        }
        return success_response(payload, request=request)
