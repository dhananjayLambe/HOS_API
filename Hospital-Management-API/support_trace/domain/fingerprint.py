"""Deterministic workflow fingerprint for Support Trace."""

from __future__ import annotations

import hashlib


def compute_workflow_fingerprint(
    *,
    workflow_instance_id: str,
    workflow_type: str,
    resource_id: str,
    organization_id: str,
) -> str:
    """SHA256 fingerprint independent of database PK."""
    raw = "|".join(
        [
            str(workflow_instance_id).strip(),
            str(workflow_type).strip(),
            str(resource_id).strip(),
            str(organization_id).strip(),
        ]
    )
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return f"sha256:{digest}"
