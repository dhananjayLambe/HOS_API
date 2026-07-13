"""Order and test-line cancellation rules."""

from django.utils import timezone

from business_audit.booking.hooks import schedule_booking_business_cancelled
from diagnostics_engine.models.choices import OrderStatus, OrderTestLineStatus
from diagnostics_engine.models.orders import DiagnosticOrder, DiagnosticOrderItem, DiagnosticOrderTestLine


class CancellationService:
    @staticmethod
    def cancel_order(order: DiagnosticOrder, user, reason: str = "") -> None:
        prior_status = order.status
        order.cancelled_at = timezone.now()
        order.cancelled_by = user
        order.cancelled_reason = reason
        order.save(update_fields=["cancelled_at", "cancelled_by", "cancelled_reason", "updated_at"])
        order.update_status(OrderStatus.CANCELLED, user=user, reason=reason)
        DiagnosticOrderTestLine.objects.filter(order=order).exclude(
            status=OrderTestLineStatus.COMPLETED
        ).update(status=OrderTestLineStatus.CANCELLED)
        schedule_booking_business_cancelled(
            order=order,
            user=user,
            cancellation_reason=reason,
            prior_status=prior_status,
        )

    @staticmethod
    def cancel_package_line_item(item: DiagnosticOrderItem, user, reason: str = "") -> None:
        """Cancel all execution lines under a package order item (if still cancellable)."""
        for line in item.test_lines.all():
            if line.status not in (
                OrderTestLineStatus.COMPLETED,
                OrderTestLineStatus.CANCELLED,
            ):
                line.status = OrderTestLineStatus.CANCELLED
                line.updated_by = user
                line.save(update_fields=["status", "updated_by", "updated_at"])
