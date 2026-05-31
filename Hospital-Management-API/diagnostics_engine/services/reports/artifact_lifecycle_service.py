"""Lifecycle transitions for diagnostic artifacts."""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction

from diagnostics_engine.models.reports import ArtifactLifecycleState, DiagnosticReportArtifact


class ArtifactLifecycleService:
    _ALLOWED_TRANSITIONS = {
        ArtifactLifecycleState.ACTIVE: {
            ArtifactLifecycleState.ARCHIVED,
            ArtifactLifecycleState.QUARANTINE,
            ArtifactLifecycleState.DELETED,
        },
        ArtifactLifecycleState.ARCHIVED: {
            ArtifactLifecycleState.ACTIVE,
            ArtifactLifecycleState.DELETED,
        },
        ArtifactLifecycleState.QUARANTINE: {ArtifactLifecycleState.ACTIVE},
        ArtifactLifecycleState.DELETED: set(),
    }

    @classmethod
    @transaction.atomic
    def transition(cls, *, artifact: DiagnosticReportArtifact, to_state: str) -> DiagnosticReportArtifact:
        current = artifact.artifact_state
        if current == to_state:
            return artifact
        allowed = cls._ALLOWED_TRANSITIONS.get(current, set())
        if to_state not in allowed:
            raise ValidationError(f"Invalid lifecycle transition: {current} -> {to_state}")

        artifact.artifact_state = to_state
        artifact.is_active = to_state == ArtifactLifecycleState.ACTIVE
        artifact.is_archived = to_state == ArtifactLifecycleState.ARCHIVED
        artifact.is_deleted = to_state == ArtifactLifecycleState.DELETED
        artifact.save(update_fields=["artifact_state", "is_active", "is_archived", "is_deleted"])
        return artifact
