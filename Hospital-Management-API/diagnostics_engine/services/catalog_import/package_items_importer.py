from __future__ import annotations

import logging
from pathlib import Path

from django.db import IntegrityError

from diagnostics_engine.models.catalog import (
    DiagnosticPackage,
    DiagnosticPackageItem,
    DiagnosticServiceMaster,
)
from diagnostics_engine.services.catalog_import.exceptions import StrictImportError
from diagnostics_engine.services.catalog_import.import_stats import ImportRunResult
from diagnostics_engine.services.catalog_import.utils import (
    CsvRow,
    read_csv_rows,
    sort_rows_by_csv_ordering,
    parse_bool,
    parse_positive_int,
)
from diagnostics_engine.services.catalog_import.validators import duplicate_natural_keys, require_columns

logger = logging.getLogger(__name__)

ITEM_REQUIRED = ("package_code", "service_code", "quantity", "is_mandatory", "display_order")


def _row_err(result: ImportRunResult, msg: str, *, strict: bool) -> None:
    result.errors.append(msg)
    result.stats.failed += 1
    logger.warning(msg)
    if strict:
        raise StrictImportError(msg)


def _item_snapshot(item: DiagnosticPackageItem) -> tuple:
    return (item.quantity, item.is_mandatory, item.display_order)


def _resolve_latest_package(lineage_code: str) -> DiagnosticPackage | None:
    qs = DiagnosticPackage.objects.filter(
        lineage_code=lineage_code,
        is_latest=True,
        deleted_at__isnull=True,
    )
    n = qs.count()
    if n == 0:
        return None
    if n > 1:
        raise ValueError(
            f"data integrity: multiple is_latest packages for lineage_code={lineage_code!r} "
            f"(count={n}); fix DB before import"
        )
    return qs.first()


def sync_package_items_from_file(
    path: Path,
    *,
    dry_run: bool = False,
    strict: bool = False,
) -> ImportRunResult:
    result = ImportRunResult()
    touched_packages: set[str] = set()
    rows = read_csv_rows(path)
    if not rows:
        return result
    try:
        require_columns(rows[0].cells.keys(), ITEM_REQUIRED, row_ref=rows[0].ref())
    except ValueError as exc:
        msg = str(exc)
        result.errors.append(msg)
        result.stats.failed += 1
        if strict:
            raise StrictImportError(msg) from exc
        return result

    dup_keys = [
        (r.ref(), f"{r.get('package_code')}::{r.get('service_code')}")
        for r in rows
        if r.get("package_code") and r.get("service_code")
    ]
    dup_msgs = duplicate_natural_keys(dup_keys)
    for msg in dup_msgs:
        _row_err(result, msg, strict=strict)
    if dup_msgs:
        return result

    rows = sort_rows_by_csv_ordering(rows)

    for row in rows:
        pkg_code = row.get("package_code")
        svc_code = row.get("service_code")
        if not pkg_code:
            _row_err(result, f"{row.ref()}: missing package_code", strict=strict)
            continue
        if not svc_code:
            _row_err(result, f"{row.ref()}: missing service_code", strict=strict)
            continue

        try:
            pkg = _resolve_latest_package(pkg_code)
        except ValueError as exc:
            _row_err(result, f"{row.ref()}: {exc}", strict=strict)
            continue
        if not pkg:
            _row_err(
                result,
                f"{row.ref()}: no active latest package for lineage_code={pkg_code!r}",
                strict=strict,
            )
            continue

        service = DiagnosticServiceMaster.objects.filter(code=svc_code, deleted_at__isnull=True).first()
        if not service:
            _row_err(
                result,
                f"{row.ref()}: service not found for service_code={svc_code!r}",
                strict=strict,
            )
            continue

        try:
            qty = parse_positive_int(
                row.get("quantity"),
                row_ref=row.ref(),
                field="quantity",
                default=1,
            )
            if qty < 1:
                raise ValueError("quantity must be >= 1")
            mandatory = parse_bool(row.get("is_mandatory"), row_ref=row.ref(), field="is_mandatory")
            disp = parse_positive_int(
                row.get("display_order"),
                row_ref=row.ref(),
                field="display_order",
                default=0,
            )
        except ValueError as exc:
            _row_err(result, f"{row.ref()}: {exc}", strict=strict)
            continue

        snap = (qty, mandatory, disp)
        item = (
            DiagnosticPackageItem.objects.filter(package=pkg, service=service)
            .order_by("-updated_at")
            .first()
        )

        if dry_run:
            if not item:
                result.stats.created += 1
            elif item.deleted_at:
                result.stats.updated += 1
            elif _item_snapshot(item) == snap:
                result.stats.skipped += 1
            else:
                result.stats.updated += 1
            continue

        if item:
            if item.deleted_at:
                item.deleted_at = None
                item.deleted_by = None
                item.quantity = qty
                item.is_mandatory = mandatory
                item.display_order = disp
                try:
                    item.save()
                except IntegrityError as exc:
                    _row_err(result, f"{row.ref()}: {exc}", strict=strict)
                    continue
                touched_packages.add(str(pkg.pk))
                result.stats.updated += 1
                logger.info("Revived package item %s / %s", pkg_code, svc_code)
                continue
            if _item_snapshot(item) == snap:
                result.stats.skipped += 1
                continue
            item.quantity = qty
            item.is_mandatory = mandatory
            item.display_order = disp
            try:
                item.save()
            except IntegrityError as exc:
                _row_err(result, f"{row.ref()}: {exc}", strict=strict)
                continue
            touched_packages.add(str(pkg.pk))
            result.stats.updated += 1
            logger.info("Updated package item %s / %s", pkg_code, svc_code)
            continue

        new_item = DiagnosticPackageItem(
            package=pkg,
            service=service,
            quantity=qty,
            is_mandatory=mandatory,
            display_order=disp,
        )
        try:
            new_item.save()
        except IntegrityError as exc:
            _row_err(result, f"{row.ref()}: {exc}", strict=strict)
            continue
        touched_packages.add(str(pkg.pk))
        result.stats.created += 1
        logger.info("Created package item %s / %s", pkg_code, svc_code)

    if not dry_run and touched_packages:
        for pk in touched_packages:
            p = DiagnosticPackage.objects.filter(pk=pk).first()
            if p:
                p.refresh_search_text()

    return result


def sync_package_items(
    *,
    data_dir: Path,
    files: list[Path] | None = None,
    dry_run: bool = False,
    strict: bool = False,
) -> ImportRunResult:
    from diagnostics_engine.services.catalog_import.utils import discover_csv_files

    out = ImportRunResult()
    if files is None:
        d = data_dir / "package_items"
        files = discover_csv_files(d)
        if not files:
            out.errors.append(f"No package_items CSV files found under {d}")
            return out

    for path in files:
        logger.info("Importing package items from %s", path)
        part = sync_package_items_from_file(path, dry_run=dry_run, strict=strict)
        out.merge(part)
        if strict and part.stats.failed:
            break
    return out
