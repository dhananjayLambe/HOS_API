"""Resolve parent workflow and depth for Support Trace hierarchy."""

from __future__ import annotations

from typing import Any

from support_trace.domain.workflow_relationships import (
    resolve_workflow_depth,
    validate_parent_workflow,
)
from support_trace.workflow.constants import CONSULTATION_WORKFLOW_PREFIX


class ParentResolver:
    """Derives parent_workflow_instance_id and workflow_depth."""

    @classmethod
    def resolve(
        cls,
        *,
        workflow_instance_id: str,
        workflow_type: str,
        parent_workflow_instance_id: str | None = None,
        consultation_id: str | None = None,
        explicit_depth: int | None = None,
    ) -> tuple[str | None, int]:
        parent = parent_workflow_instance_id
        if not parent and consultation_id:
            parent = f"{CONSULTATION_WORKFLOW_PREFIX}{consultation_id}"
            if parent == workflow_instance_id:
                parent = None

        validate_parent_workflow(
            workflow_instance_id=workflow_instance_id,
            parent_workflow_instance_id=parent,
        )
        depth = resolve_workflow_depth(workflow_type, explicit_depth=explicit_depth)
        return parent, depth

    @classmethod
    def from_business_audit(cls, audit: Any) -> tuple[str | None, int]:
        return cls.resolve(
            workflow_instance_id=str(audit.workflow_instance_id),
            workflow_type=str(audit.workflow_type),
            parent_workflow_instance_id=getattr(
                audit, "parent_workflow_instance_id", None
            ),
        )

    @classmethod
    def from_clinical_audit(
        cls,
        *,
        workflow_instance_id: str,
        workflow_type: str,
        consultation_id: str | None,
    ) -> tuple[str | None, int]:
        return cls.resolve(
            workflow_instance_id=workflow_instance_id,
            workflow_type=workflow_type,
            consultation_id=consultation_id,
        )
