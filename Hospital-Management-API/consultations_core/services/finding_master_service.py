"""Resolve FindingMaster rows from template JSON when DB catalog is empty."""

from __future__ import annotations

import json
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError

from shared.logging import LogModule, logger

from consultations_core.models.findings import FindingMaster


def _master_json_path() -> Path:
    return (
        Path(settings.BASE_DIR)
        / "consultations_core"
        / "templates_metadata"
        / "consultation"
        / "findings"
        / "findings_master.json"
    )


def get_or_create_finding_master_for_code(code: str, *, user=None) -> FindingMaster:
    """
    Lookup by FindingMaster.code (same as schema item key, e.g. pallor).
    If missing, create from findings_master.json so OPD works without a separate seed step.
    """
    c = (code or "").strip()
    if not c:
        raise ValidationError("finding_code is required.")

    existing = FindingMaster.objects.filter(code=c).first()
    if existing:
        return existing

    path = _master_json_path()
    if not path.is_file():
        logger.error(
            f"findings_master.json missing at {path}",
            module=LogModule.CONSULTATION,
            action="consultation.findings.catalog_missing",
            metadata={"path": str(path)},
        )
        raise ValidationError("Finding catalog not available on server.")

    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    item = data.get("items", {}).get(c)
    if not item:
        raise ValidationError(f"Unknown finding code: {c}")

    master = FindingMaster.objects.create(
        code=c,
        label=item.get("label") or c,
        category=item.get("category") or "general_examination",
        severity_supported=bool(item.get("severity_supported")),
        is_active=bool(item.get("is_active", True)),
        created_by=user,
    )
    logger.info(
        f"Created FindingMaster from template: {c}",
        module=LogModule.CONSULTATION,
        action="consultation.findings.master_created",
        metadata={"finding_code": c},
    )
    return master
