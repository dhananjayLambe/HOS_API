from __future__ import annotations

import logging
from pathlib import Path

from django.db import IntegrityError

from diagnostics_engine.models.catalog import DiagnosticCategory, DiagnosticPackage
from diagnostics_engine.services.catalog_import.exceptions import StrictImportError
from diagnostics_engine.services.catalog_import.import_stats import ImportRunResult
from diagnostics_engine.services.catalog_import.utils import (
    CsvRow,
    read_csv_rows,
    sort_rows_by_csv_ordering,
    parse_bool,
    parse_positive_int,
)
from diagnostics_engine.services.catalog_import.validators import (
    duplicate_natural_keys,
    require_columns,
    validate_collection_type,
    validate_package_type,
)

logger = logging.getLogger(__name__)

PACKAGE_REQUIRED = (
    "ordering",
    "lineage_code",
    "version",
    "name",
    "category_code",
    "package_type",
    "collection_type",
    "is_active",
    "is_latest",
)


def _row_err(result: ImportRunResult, msg: str, *, strict: bool) -> None:
    result.errors.append(msg)
    result.stats.failed += 1
    logger.warning(msg)
    if strict:
        raise StrictImportError(msg)


def _demote_other_latest(lineage_code: str, keep_pk) -> None:
    DiagnosticPackage.objects.filter(
        lineage_code=lineage_code,
        deleted_at__isnull=True,
    ).exclude(pk=keep_pk).update(is_latest=False)


def _package_snapshot(pkg: DiagnosticPackage) -> tuple:
    return (
        pkg.name,
        pkg.category.code,
        pkg.package_type,
        pkg.collection_type,
        pkg.is_active,
        pkg.is_latest,
    )


def _validate_latest_uniqueness_in_file(rows: list[CsvRow]) -> list[str]:
    """At most one is_latest=true row per lineage_code in this file (after sort)."""
    errors: list[str] = []
    seen_latest: dict[str, str] = {}
    for row in rows:
        lc = row.get("lineage_code")
        if not lc:
            continue
        try:
            is_latest = parse_bool(row.get("is_latest"), row_ref=row.ref(), field="is_latest")
        except ValueError:
            continue
        if not is_latest:
            continue
        if lc in seen_latest:
            errors.append(
                f"{row.ref()}: duplicate is_latest=true for lineage_code={lc!r} "
                f"(first at {seen_latest[lc]})"
            )
        else:
            seen_latest[lc] = row.ref()
    return errors


def sync_packages_from_file(
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
        require_columns(rows[0].cells.keys(), PACKAGE_REQUIRED, row_ref=rows[0].ref())
    except ValueError as exc:
        msg = str(exc)
        result.errors.append(msg)
        result.stats.failed += 1
        if strict:
            raise StrictImportError(msg) from exc
        return result

    dup_keys = [
        (r.ref(), f"{r.get('lineage_code')}@{r.get('version')}")
        for r in rows
        if r.get("lineage_code") and r.get("version", "") != ""
    ]
    dup_msgs = duplicate_natural_keys(dup_keys)
    for msg in dup_msgs:
        _row_err(result, msg, strict=strict)
    if dup_msgs:
        return result

    rows = sort_rows_by_csv_ordering(rows)
    pre_latest_errs = _validate_latest_uniqueness_in_file(rows)
    for msg in pre_latest_errs:
        _row_err(result, msg, strict=strict)
    if pre_latest_errs:
        return result

    for row in rows:
        lineage = row.get("lineage_code")
        name = row.get("name")
        cat_code = row.get("category_code")
        if not lineage:
            _row_err(result, f"{row.ref()}: missing lineage_code", strict=strict)
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
            version = parse_positive_int(
                row.get("version"),
                row_ref=row.ref(),
                field="version",
                default=1,
            )
            if version < 1:
                raise ValueError("version must be >= 1")
        except ValueError as exc:
            _row_err(result, f"{row.ref()}: {exc}", strict=strict)
            continue

        try:
            is_active = parse_bool(row.get("is_active"), row_ref=row.ref(), field="is_active")
            is_latest = parse_bool(row.get("is_latest"), row_ref=row.ref(), field="is_latest")
            ptype = validate_package_type(row.get("package_type"))
            ctype = validate_collection_type(row.get("collection_type"))
        except ValueError as exc:
            _row_err(result, f"{row.ref()}: {exc}", strict=strict)
            continue

        snap = (name, cat_code, ptype, ctype, is_active, is_latest)
        existing = (
            DiagnosticPackage.objects.filter(
                lineage_code=lineage,
                version=version,
            )
            .select_related("category")
            .first()
        )

        if dry_run:
            if not existing:
                result.stats.created += 1
            elif existing.deleted_at or _package_snapshot(existing) != snap:
                result.stats.updated += 1
            else:
                result.stats.skipped += 1
            continue

        if existing:
            was_deleted = bool(existing.deleted_at)
            if was_deleted:
                existing.deleted_at = None
                existing.deleted_by = None

            if _package_snapshot(existing) == snap and not was_deleted:
                result.stats.skipped += 1
                if is_latest:
                    _demote_other_latest(lineage, existing.pk)
                continue

            existing.name = name
            existing.category = category
            existing.package_type = ptype
            existing.collection_type = ctype
            existing.is_active = is_active
            existing.is_latest = is_latest
            try:
                existing.save()
            except IntegrityError as exc:
                _row_err(result, f"{row.ref()}: {exc}", strict=strict)
                continue
            if is_latest:
                _demote_other_latest(lineage, existing.pk)
            result.stats.updated += 1
            logger.info("Updated package %s v%s", lineage, version)
            continue

        pkg = DiagnosticPackage(
            lineage_code=lineage,
            version=version,
            name=name,
            category=category,
            package_type=ptype,
            collection_type=ctype,
            is_active=is_active,
            is_latest=is_latest,
        )
        try:
            pkg.save()
        except IntegrityError as exc:
            _row_err(result, f"{row.ref()}: {exc}", strict=strict)
            continue
        if is_latest:
            _demote_other_latest(lineage, pkg.pk)
        result.stats.created += 1
        logger.info("Created package %s v%s", lineage, version)

    return result


def sync_packages(
    *,
    data_dir: Path,
    files: list[Path] | None = None,
    dry_run: bool = False,
    strict: bool = False,
) -> ImportRunResult:
    from diagnostics_engine.services.catalog_import.utils import discover_csv_files

    out = ImportRunResult()
    if files is None:
        pkg_dir = data_dir / "packages"
        files = discover_csv_files(pkg_dir)
        if not files:
            out.errors.append(f"No package CSV files found under {pkg_dir}")
            return out

    category_by_code = {c.code: c for c in DiagnosticCategory.objects.filter(deleted_at__isnull=True)}
    for path in files:
        logger.info("Importing packages from %s", path)
        part = sync_packages_from_file(
            path,
            category_by_code=category_by_code,
            dry_run=dry_run,
            strict=strict,
        )
        out.merge(part)
        if strict and part.stats.failed:
            break
    return out
