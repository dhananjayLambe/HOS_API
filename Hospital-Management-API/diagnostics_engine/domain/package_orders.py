"""Expand package order lines into DiagnosticOrderTestLine at CONFIRM."""

from django.db import transaction

from diagnostics_engine.models.catalog import DiagnosticPackage, DiagnosticServiceMaster
from diagnostics_engine.models.choices import ExecutionType, OrderLineType, OrderStatus, OrderTestLineStatus
from diagnostics_engine.models.orders import DiagnosticOrder, DiagnosticOrderItem, DiagnosticOrderTestLine


def build_composition_snapshot(package: DiagnosticPackage) -> list[dict]:
    snap = []
    for item in package.items.filter(deleted_at__isnull=True).order_by("display_order", "id"):
        snap.append(
            {
                "service_id": str(item.service_id),
                "quantity": item.quantity,
                "is_mandatory": item.is_mandatory,
                "display_order": item.display_order,
            }
        )
    return snap


def default_execution_type_for_service(service) -> str:
    if getattr(service, "home_collection_possible", False):
        return ExecutionType.HOME_COLLECTION
    return ExecutionType.BRANCH_VISIT


@transaction.atomic
def expand_confirmed_order_packages(order: DiagnosticOrder, confirming_user) -> None:
    """
    For each PACKAGE line on this order, freeze composition_snapshot (if empty) and create test lines.
    Call only when transitioning to CONFIRMED (or immediately after).
    """
    if order.status != OrderStatus.CONFIRMED:
        return

    for item in order.items.filter(
        line_type=OrderLineType.PACKAGE,
        deleted_at__isnull=True,
    ).select_related("diagnostic_package"):
        pkg = item.diagnostic_package
        if not pkg:
            continue

        if not item.composition_snapshot:
            item.composition_snapshot = build_composition_snapshot(pkg)
            item.package_version_snapshot = pkg.version
            item.save(update_fields=["composition_snapshot", "package_version_snapshot", "updated_at"])

        if item.test_lines.exists():
            continue

        for row in item.composition_snapshot or []:
            svc = DiagnosticServiceMaster.objects.get(pk=row["service_id"])
            qty = int(row.get("quantity", 1))
            for _ in range(qty):
                DiagnosticOrderTestLine.objects.create(
                    order=order,
                    order_item=item,
                    service=svc,
                    status=OrderTestLineStatus.PENDING,
                    execution_type=default_execution_type_for_service(svc),
                    created_by=confirming_user,
                )


@transaction.atomic
def ensure_test_lines_for_test_items(order: DiagnosticOrder, confirming_user) -> None:
    """Single-test lines also get a DiagnosticOrderTestLine for consistent execution/reporting."""
    if order.status != OrderStatus.CONFIRMED:
        return

    for item in order.items.filter(line_type=OrderLineType.TEST, deleted_at__isnull=True).select_related(
        "service"
    ):
        if item.test_lines.exists() or not item.service_id:
            continue
        DiagnosticOrderTestLine.objects.create(
            order=order,
            order_item=item,
            service=item.service,
            status=OrderTestLineStatus.PENDING,
            execution_type=default_execution_type_for_service(item.service),
            created_by=confirming_user,
        )
