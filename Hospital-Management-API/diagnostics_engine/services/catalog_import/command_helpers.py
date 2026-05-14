from __future__ import annotations

import logging
import sys
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from diagnostics_engine.services.catalog_import.exceptions import StrictImportError
from diagnostics_engine.services.catalog_import.import_stats import ImportRunResult
from diagnostics_engine.services.catalog_import.utils import default_data_dir, resolve_input_path


def configure_logging(*, verbose: bool) -> None:
    root = logging.getLogger()
    if verbose:
        root.setLevel(logging.DEBUG)
        if not root.handlers:
            h = logging.StreamHandler(sys.stderr)
            h.setFormatter(logging.Formatter("%(levelname)s %(name)s: %(message)s"))
            root.addHandler(h)


def resolve_data_dir_path(explicit: str | None) -> Path:
    if explicit:
        return Path(explicit).expanduser().resolve()
    return default_data_dir().resolve()


def print_entity_summary(cmd: BaseCommand, title: str, result: ImportRunResult, *, dry_run: bool) -> None:
    prefix = "[dry-run] " if dry_run else ""
    cmd.stdout.write(cmd.style.MIGRATE_HEADING(f"{prefix}{title}"))
    s = result.stats
    cmd.stdout.write(f"  Created: {s.created}")
    cmd.stdout.write(f"  Updated: {s.updated}")
    cmd.stdout.write(f"  Skipped: {s.skipped}")
    cmd.stdout.write(f"  Failed:  {s.failed}")
    for err in result.errors:
        cmd.stdout.write(cmd.style.ERROR(err))


def run_with_transaction(fn, *, dry_run: bool) -> ImportRunResult:
    try:
        if dry_run:
            return fn()
        with transaction.atomic():
            return fn()
    except StrictImportError as exc:
        raise CommandError(exc.args[0]) from exc


def collect_files_from_args(data_dir: Path, file_args: list[str] | None) -> list[Path] | None:
    """None means use importer default directory scan."""
    if not file_args:
        return None
    out: list[Path] = []
    for raw in file_args:
        out.append(resolve_input_path(raw, data_dir=data_dir))
    return out
