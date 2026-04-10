"""Aggregate diagnostic order status from test lines and per-line reports."""

from diagnostics_engine.models.orders import DiagnosticOrder
from diagnostics_engine.models.choices import OrderStatus, OrderTestLineStatus, ReportLifecycleStatus


class OrderStatusAggregationService:
    """Drive order.status from execution + reports; do not scatter logic in model.save."""

    @classmethod
    def sync_from_test_reports(cls, order: DiagnosticOrder) -> None:
        """Call after a DiagnosticTestReport save when order uses test lines."""
        lines = list(order.test_lines.all())
        if not lines:
            return

        from diagnostics_engine.models.reports import DiagnosticTestReport

        n = len(lines)
        cancelled_lines = sum(1 for ln in lines if ln.status == OrderTestLineStatus.CANCELLED)

        delivered_reports = 0
        ready_only = 0
        no_report = 0

        for line in lines:
            if line.status == OrderTestLineStatus.CANCELLED:
                continue
            try:
                tr = line.test_report
            except DiagnosticTestReport.DoesNotExist:
                no_report += 1
                continue
            if tr.status == ReportLifecycleStatus.DELIVERED:
                delivered_reports += 1
            elif tr.status == ReportLifecycleStatus.READY:
                ready_only += 1

        active_lines = n - cancelled_lines

        if cancelled_lines == n:
            cls._transition(order, OrderStatus.CANCELLED)
            return

        if active_lines and delivered_reports == active_lines:
            cls._transition(order, OrderStatus.COMPLETED)
            return

        if cancelled_lines > 0 and (delivered_reports + cancelled_lines == n or delivered_reports + ready_only + cancelled_lines == n):
            cls._transition(order, OrderStatus.PARTIAL)
            return

        if active_lines and (ready_only + delivered_reports) == active_lines and delivered_reports < active_lines:
            cls._transition(order, OrderStatus.REPORT_READY)
            return

        if no_report > 0 or ready_only > 0 or delivered_reports < active_lines:
            cls._transition(order, OrderStatus.IN_PROCESSING)

    @classmethod
    def sync_from_legacy_report(cls, order: DiagnosticOrder, report_phase) -> None:
        """Single rollup report path (no test lines)."""
        if order.test_lines.exists():
            return

        if report_phase == ReportLifecycleStatus.READY:
            order.update_status(OrderStatus.REPORT_READY, source="system")
        elif report_phase == ReportLifecycleStatus.DELIVERED:
            order.update_status(OrderStatus.COMPLETED, source="system")

    @staticmethod
    def _transition(order: DiagnosticOrder, target: str) -> None:
        if order.status == target:
            return
        try:
            order.update_status(target, source="system")
        except Exception:
            pass
