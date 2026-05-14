from __future__ import annotations

import logging
from pathlib import Path

from django.db import IntegrityError

from diagnostics_engine.models.catalog import DiagnosticCategory, DiagnosticServiceMaster
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

SERVICE_REQUIRED = (
    "ordering",
    "code",
    "name",
    "category_code",
    "short_name",
    "sample_type",
    "home_collection_possible",
    "tat_hours_default",
    "is_active",
)


def _row_err(result: ImportRunResult, msg: str, *, strict: bool) -> None:
    result.errors.append(msg)
    result.stats.failed += 1
    logger.warning(msg)
    if strict:
        raise StrictImportError(msg)


def _service_snapshot(svc: DiagnosticServiceMaster) -> tuple:
    return (
        svc.name,
        svc.category.code,
        (svc.short_name or ""),
        (svc.sample_type or ""),
        svc.home_collection_possible,
        svc.tat_hours_default,
        svc.is_active,
    )


def sync_services_from_file(
    path: Path,
    *,
    category_by_code: dict[str, DiagnosticCategory],
    dry_run: bool = False,
    strict: bool = False,
) -> ImportRunResult:
    result = ImportRunResult()
    rows = read_csv_rows(path)
    if not rows:
        return result
    try:
        require_columns(rows[0].cells.keys(), SERVICE_REQUIRED, row_ref=rows[0].ref())
    except ValueError as exc:
        msg = str(exc)
        result.errors.append(msg)
        result.stats.failed += 1
        if strict:
            raise StrictImportError(msg) from exc
        return result

    dup_msgs = duplicate_natural_keys([(r.ref(), r.get("code")) for r in rows if r.get("code")])
    for msg in dup_msgs:
        _row_err(result, msg, strict=strict)
    if dup_msgs:
        return result

    rows = sort_rows_by_csv_ordering(rows)

    for row in rows:
        code = row.get("code")
        name = row.get("name")
        cat_code = row.get("category_code")
        if not code:
            _row_err(result, f"{row.ref()}: missing code", strict=strict)
            continue
        if not name:
            _row_err(result, f"{row.ref()}: missing name", strict=strict)
            continue
        if not cat_code:
            _row_err(result, f"{row.ref()}: missing category_code", strict=strict)
            continue
        category = category_by_code.get(cat_code)
        if not category:
            _row_err(
                result,
                f"{row.ref()}: category not found for category_code={cat_code!r}",
                strict=strict,
            )
            continue

        try:
            is_active = parse_bool(row.get("is_active"), row_ref=row.ref(), field="is_active")
            home_ok = parse_bool(
                row.get("home_collection_possible"),
                row_ref=row.ref(),
                field="home_collection_possible",
            )
            tat = parse_positive_int(
                row.get("tat_hours_default"),
                row_ref=row.ref(),
                field="tat_hours_default",
                default=24,
            )
        except ValueError as exc:
            _row_err(result, f"{row.ref()}: {exc}", strict=strict)
            continue

        short_name = row.get("short_name")
        sample_type = row.get("sample_type") or ""

        snap = (name, cat_code, short_name, sample_type, home_ok, tat, is_active)
        existing = DiagnosticServiceMaster.objects.filter(code=code).select_related("category").first()

        if dry_run:
            if not existing:
                result.stats.created += 1
            elif existing.deleted_at or _service_snapshot(existing) != snap:
                result.stats.updated += 1
            else:
                result.stats.skipped += 1
            continue

        if existing:
            was_deleted = bool(existing.deleted_at)
            if was_deleted:
                existing.deleted_at = None
                existing.deleted_by = None

            if _service_snapshot(existing) == snap and not was_deleted:
                result.stats.skipped += 1
                continue

            existing.name = name
            existing.category = category
            existing.short_name = short_name
            existing.sample_type = sample_type or None
            existing.home_collection_possible = home_ok
            existing.tat_hours_default = tat
            existing.is_active = is_active
            try:
                existing.save()
            except IntegrityError as exc:
                _row_err(result, f"{row.ref()}: {exc}", strict=strict)
                continue
            result.stats.updated += 1
            logger.info("Updated service %s", code)
            continue

        svc = DiagnosticServiceMaster(
            code=code,
            name=name,
            category=category,
            short_name=short_name,
            sample_type=sample_type or None,
            home_collection_possible=home_ok,
            tat_hours_default=tat,
            is_active=is_active,
        )
        try:
            svc.save()
        except IntegrityError as exc:
            _row_err(result, f"{row.ref()}: {exc}", strict=strict)
            continue
        result.stats.created += 1
        logger.info("Created service %s", code)

    return result


def sync_services(
    *,
    data_dir: Path,
    files: list[Path] | None = None,
    dry_run: bool = False,
    strict: bool = False,
) -> ImportRunResult:
    """
    Import services from one or many CSV files under data/services/.
    """
    out = ImportRunResult()
    if files is None:
        from diagnostics_engine.services.catalog_import.utils import discover_csv_files

        svc_dir = data_dir / "services"
        files = discover_csv_files(svc_dir)
        if not files:
            out.errors.append(f"No service CSV files found under {svc_dir}")
            return out

    category_by_code = {c.code: c for c in DiagnosticCategory.objects.filter(deleted_at__isnull=True)}
    for path in files:
        logger.info("Importing services from %s", path)
        part = sync_services_from_file(
            path,
            category_by_code=category_by_code,
            dry_run=dry_run,
            strict=strict,
        )
        out.merge(part)
        if strict and part.stats.failed:
            break
        # Refresh map if we created categories elsewhere (not here); services don't create categories.

    return out
