"""Expand package order lines into DiagnosticOrderTestLine at CONFIRM."""

from django.core.exceptions import ValidationError
from django.db import connection, transaction

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


def _run_in_transaction(fn, *args, **kwargs):
    if connection.in_atomic_block:
        return fn(*args, **kwargs)
    with transaction.atomic():
        return fn(*args, **kwargs)


def expand_confirmed_order_packages(order: DiagnosticOrder, confirming_user) -> None:
    return _run_in_transaction(_expand_confirmed_order_packages_core, order, confirming_user)


def _expand_confirmed_order_packages_core(order: DiagnosticOrder, confirming_user) -> None:
    """
    For each PACKAGE line on this order, freeze composition_snapshot (if empty) and create test lines.
    Call only when transitioning to CONFIRMED (or immediately after), inside a transaction.
    """
    if order.status != OrderStatus.CONFIRMED:
        return

    DiagnosticOrder.objects.select_for_update().filter(pk=order.pk).first()

    pkg_item_ids = list(
        order.items.filter(line_type=OrderLineType.PACKAGE, deleted_at__isnull=True).values_list(
            "pk", flat=True
        )
    )
    for item_id in pkg_item_ids:
        item = DiagnosticOrderItem.objects.select_for_update(of=("self",)).get(pk=item_id)
        pkg = item.diagnostic_package_id and item.diagnostic_package
        if not pkg:
            raise ValidationError("Package order line is missing diagnostic_package.")

        if not item.composition_snapshot:
            item.composition_snapshot = build_composition_snapshot(pkg)
            item.package_version_snapshot = pkg.version
            item.save(update_fields=["composition_snapshot", "package_version_snapshot", "updated_at"])

        if item.test_lines.exists():
            continue

        for row in item.composition_snapshot or []:
            sid = row.get("service_id")
            if not sid:
                raise ValidationError("Invalid package composition_snapshot: missing service_id.")
            try:
                svc = DiagnosticServiceMaster.objects.get(pk=sid)
            except DiagnosticServiceMaster.DoesNotExist as exc:
                raise ValidationError(f"Unknown service in package composition: {sid}.") from exc
            if not svc.is_active or svc.deleted_at is not None:
                raise ValidationError(f"Service {svc.code} is not active for execution.")
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


def ensure_test_lines_for_test_items(order: DiagnosticOrder, confirming_user) -> None:
    return _run_in_transaction(_ensure_test_lines_for_test_items_core, order, confirming_user)


def _ensure_test_lines_for_test_items_core(order: DiagnosticOrder, confirming_user) -> None:
    """Single-test lines also get a DiagnosticOrderTestLine for consistent execution/reporting."""
    if order.status != OrderStatus.CONFIRMED:
        return

    DiagnosticOrder.objects.select_for_update().filter(pk=order.pk).first()

    test_ids = list(
        order.items.filter(line_type=OrderLineType.TEST, deleted_at__isnull=True).values_list("pk", flat=True)
    )
    for item_id in test_ids:
        item = DiagnosticOrderItem.objects.select_for_update(of=("self",)).get(pk=item_id)
        if item.test_lines.exists() or not item.service_id:
            continue
        svc = DiagnosticServiceMaster.objects.get(pk=item.service_id)
        DiagnosticOrderTestLine.objects.create(
            order=order,
            order_item=item,
            service=svc,
            status=OrderTestLineStatus.PENDING,
            execution_type=default_execution_type_for_service(svc),
            created_by=confirming_user,
        )
