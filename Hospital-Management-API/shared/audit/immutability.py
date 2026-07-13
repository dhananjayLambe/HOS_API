"""Immutability helpers for append-only audit models."""

from __future__ import annotations

from django.db import models

from shared.audit.exceptions import AuditImmutabilityError


class ImmutableAuditQuerySet(models.QuerySet):
    """QuerySet that blocks bulk mutation of permanent audit records."""

    def update(self, **kwargs):  # noqa: ANN003
        raise AuditImmutabilityError(
            "Audit records are immutable and cannot be updated."
        )

    def delete(self):
        raise AuditImmutabilityError(
            "Audit records are immutable and cannot be deleted."
        )


def enforce_immutable_save(instance: models.Model) -> None:
    """Raise if attempting to update an existing audit row."""
    if instance.pk is not None and not instance._state.adding:
        raise AuditImmutabilityError(
            "Audit records are immutable and cannot be modified."
        )


def enforce_immutable_delete(instance: models.Model) -> None:
    """Raise on delete attempts."""
    raise AuditImmutabilityError(
        "Audit records are immutable and cannot be deleted."
    )
