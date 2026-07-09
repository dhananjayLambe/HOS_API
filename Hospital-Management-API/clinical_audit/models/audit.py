"""Clinical Audit domain model — permanent, immutable EMR audit records."""

from __future__ import annotations

import uuid

from django.db import models

from clinical_audit.constants import (
    ACTION_LENGTH,
    CORRELATION_ID_LENGTH,
    DEVICE_INFORMATION_LENGTH,
    ENTITY_ID_LENGTH,
    EVENT_LENGTH,
    INDEX_ACTION_TIMESTAMP,
    INDEX_CONSULTATION_TIMESTAMP,
    INDEX_CORRELATION_TIMESTAMP,
    INDEX_ENCOUNTER_TIMESTAMP,
    INDEX_PATIENT_ACCOUNT_TIMESTAMP,
    INDEX_RESOURCE,
    INDEX_TIMESTAMP,
    INDEX_USER_TIMESTAMP,
    MODULE_LENGTH,
    OUTCOME_LENGTH,
    RESOURCE_TYPE_LENGTH,
    SOURCE_LENGTH,
    USER_ID_LENGTH,
    USER_ROLE_LENGTH,
)
from clinical_audit.enums import AuditAction, AuditOutcome, AuditSource, ClinicalEntity
from clinical_audit.exceptions import (
    ClinicalAuditError,
    ClinicalAuditImmutabilityError,
)


class ClinicalAuditQuerySet(models.QuerySet):
    """QuerySet that blocks bulk mutation of permanent audit records."""

    def update(self, **kwargs):  # noqa: ANN003
        raise ClinicalAuditImmutabilityError(
            "Clinical audit records are immutable and cannot be updated."
        )

    def delete(self):
        raise ClinicalAuditImmutabilityError(
            "Clinical audit records are immutable and cannot be deleted."
        )


class ClinicalAuditManager(models.Manager.from_queryset(ClinicalAuditQuerySet)):
    """Default manager for ClinicalAudit."""


class ClinicalAudit(models.Model):
    """Permanent clinical audit record for a single patient-care action.

    Records are insert-only. Updates and deletes are blocked at the model and
    queryset level. Identifiers are stored as strings (no clinical FKs) so
    audit history survives entity deletion and cannot be cascade-removed.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    correlation_id = models.CharField(max_length=CORRELATION_ID_LENGTH)

    user_id = models.CharField(max_length=USER_ID_LENGTH, null=True, blank=True)
    user_role = models.CharField(max_length=USER_ROLE_LENGTH, null=True, blank=True)

    patient_account_id = models.CharField(
        max_length=ENTITY_ID_LENGTH, null=True, blank=True
    )
    patient_profile_id = models.CharField(
        max_length=ENTITY_ID_LENGTH, null=True, blank=True
    )
    consultation_id = models.CharField(
        max_length=ENTITY_ID_LENGTH, null=True, blank=True
    )
    encounter_id = models.CharField(
        max_length=ENTITY_ID_LENGTH, null=True, blank=True
    )

    module = models.CharField(max_length=MODULE_LENGTH)
    event = models.CharField(max_length=EVENT_LENGTH)
    action = models.CharField(max_length=ACTION_LENGTH, choices=AuditAction.choices)
    outcome = models.CharField(
        max_length=OUTCOME_LENGTH,
        choices=AuditOutcome.choices,
        default=AuditOutcome.SUCCESS,
    )

    resource_type = models.CharField(
        max_length=RESOURCE_TYPE_LENGTH,
        choices=ClinicalEntity.choices,
        null=True,
        blank=True,
    )
    resource_id = models.CharField(
        max_length=ENTITY_ID_LENGTH, null=True, blank=True
    )

    previous_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)

    source = models.CharField(
        max_length=SOURCE_LENGTH,
        choices=AuditSource.choices,
        default=AuditSource.SYSTEM,
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_information = models.CharField(
        max_length=DEVICE_INFORMATION_LENGTH, null=True, blank=True
    )
    remarks = models.TextField(null=True, blank=True)

    objects = ClinicalAuditManager()

    class Meta:
        db_table = "clinical_audit"
        ordering = ["-timestamp"]
        verbose_name = "Clinical Audit"
        verbose_name_plural = "Clinical Audits"
        indexes = [
            models.Index(
                fields=["correlation_id", "timestamp"],
                name=INDEX_CORRELATION_TIMESTAMP,
            ),
            models.Index(
                fields=["patient_account_id", "timestamp"],
                name=INDEX_PATIENT_ACCOUNT_TIMESTAMP,
            ),
            models.Index(
                fields=["consultation_id", "timestamp"],
                name=INDEX_CONSULTATION_TIMESTAMP,
            ),
            models.Index(
                fields=["encounter_id", "timestamp"],
                name=INDEX_ENCOUNTER_TIMESTAMP,
            ),
            models.Index(
                fields=["user_id", "timestamp"],
                name=INDEX_USER_TIMESTAMP,
            ),
            models.Index(
                fields=["resource_type", "resource_id"],
                name=INDEX_RESOURCE,
            ),
            models.Index(
                fields=["action", "timestamp"],
                name=INDEX_ACTION_TIMESTAMP,
            ),
            models.Index(
                fields=["timestamp"],
                name=INDEX_TIMESTAMP,
            ),
        ]

    def __str__(self) -> str:
        return f"{self.action} ({self.correlation_id})"

    def save(self, *args, **kwargs) -> None:
        if self.pk is not None and not self._state.adding:
            raise ClinicalAuditImmutabilityError(
                "Clinical audit records are immutable and cannot be modified."
            )
        if not (self.correlation_id or "").strip():
            raise ClinicalAuditError(
                "correlation_id is required for clinical audit records."
            )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs) -> None:
        raise ClinicalAuditImmutabilityError(
            "Clinical audit records are immutable and cannot be deleted."
        )
