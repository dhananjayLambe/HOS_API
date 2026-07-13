"""Business Audit domain model — permanent, immutable operational audit records."""

from __future__ import annotations

import uuid

from django.db import models

from business_audit.constants import (
    ACTION_LENGTH,
    ACTOR_TYPE_LENGTH,
    CATEGORY_LENGTH,
    CORRELATION_ID_LENGTH,
    DEPLOYMENT_LENGTH,
    DOMAIN_LENGTH,
    ENVIRONMENT_LENGTH,
    EVENT_LENGTH,
    INDEX_ACTION_CREATED,
    INDEX_CATEGORY_CREATED,
    INDEX_CORRELATION_CREATED,
    INDEX_CREATED,
    INDEX_DOMAIN_CREATED,
    INDEX_PARENT_CREATED,
    INDEX_PROVIDER_REFERENCE,
    INDEX_RESOURCE,
    INDEX_STATUS_CREATED,
    INDEX_WORKFLOW_CREATED,
    INDEX_WORKFLOW_SEQUENCE,
    INDEX_WORKFLOW_TYPE_CREATED,
    OPERATION_LENGTH,
    ORGANIZATION_ID_LENGTH,
    OUTCOME_LENGTH,
    PROVIDER_LENGTH,
    PROVIDER_REFERENCE_LENGTH,
    PROVIDER_RESPONSE_CODE_LENGTH,
    PROVIDER_RESPONSE_MESSAGE_LENGTH,
    REQUEST_ID_LENGTH,
    RESOURCE_ID_LENGTH,
    RESOURCE_TYPE_LENGTH,
    RETRY_REASON_LENGTH,
    SERVICE_LENGTH,
    STATE_LENGTH,
    STATUS_LENGTH,
    TENANT_LENGTH,
    USER_ID_LENGTH,
    WORKFLOW_INSTANCE_ID_LENGTH,
    WORKFLOW_TYPE_LENGTH,
)
from business_audit.enums import (
    ActorType,
    BusinessAuditAction,
    BusinessResourceType,
    EventCategory,
    ExternalProvider,
    WorkflowOutcome,
    WorkflowStatus,
    WorkflowType,
)
from business_audit.exceptions import BusinessAuditError, BusinessAuditImmutabilityError
from shared.audit.immutability import ImmutableAuditQuerySet


class BusinessAuditQuerySet(ImmutableAuditQuerySet):
    """QuerySet that blocks bulk mutation of permanent audit records."""

    def update(self, **kwargs):  # noqa: ANN003
        raise BusinessAuditImmutabilityError(
            "Audit records are immutable and cannot be updated."
        )

    def delete(self):
        raise BusinessAuditImmutabilityError(
            "Audit records are immutable and cannot be deleted."
        )


class BusinessAuditManager(models.Manager.from_queryset(BusinessAuditQuerySet)):
    """Default manager for BusinessAudit."""


class BusinessAudit(models.Model):
    """Permanent business audit record for a single workflow execution step.

    Records are insert-only. Updates and deletes are blocked at the model and
    queryset level. Identifiers are stored as strings (no FKs) so audit history
    survives entity deletion.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    correlation_id = models.CharField(max_length=CORRELATION_ID_LENGTH)
    request_id = models.CharField(
        max_length=REQUEST_ID_LENGTH, null=True, blank=True
    )

    workflow_type = models.CharField(
        max_length=WORKFLOW_TYPE_LENGTH, choices=WorkflowType.choices
    )
    workflow_instance_id = models.CharField(max_length=WORKFLOW_INSTANCE_ID_LENGTH)
    parent_workflow_instance_id = models.CharField(
        max_length=WORKFLOW_INSTANCE_ID_LENGTH, null=True, blank=True
    )
    sequence_no = models.PositiveIntegerField()

    category = models.CharField(max_length=CATEGORY_LENGTH, choices=EventCategory.choices)
    action = models.CharField(
        max_length=ACTION_LENGTH, choices=BusinessAuditAction.choices
    )
    event = models.CharField(max_length=EVENT_LENGTH)
    domain = models.CharField(max_length=DOMAIN_LENGTH)
    service = models.CharField(max_length=SERVICE_LENGTH)
    operation = models.CharField(max_length=OPERATION_LENGTH)

    resource_type = models.CharField(
        max_length=RESOURCE_TYPE_LENGTH, choices=BusinessResourceType.choices
    )
    resource_id = models.CharField(max_length=RESOURCE_ID_LENGTH)

    actor_type = models.CharField(max_length=ACTOR_TYPE_LENGTH, choices=ActorType.choices)
    user_id = models.CharField(max_length=USER_ID_LENGTH, null=True, blank=True)
    organization_id = models.CharField(max_length=ORGANIZATION_ID_LENGTH)
    tenant = models.CharField(max_length=TENANT_LENGTH, null=True, blank=True)
    environment = models.CharField(max_length=ENVIRONMENT_LENGTH, null=True, blank=True)
    deployment = models.CharField(max_length=DEPLOYMENT_LENGTH, null=True, blank=True)

    status = models.CharField(max_length=STATUS_LENGTH, choices=WorkflowStatus.choices)
    outcome = models.CharField(
        max_length=OUTCOME_LENGTH,
        choices=WorkflowOutcome.choices,
        default=WorkflowOutcome.UNKNOWN,
    )
    state_before = models.CharField(max_length=STATE_LENGTH, null=True, blank=True)
    state_after = models.CharField(max_length=STATE_LENGTH, null=True, blank=True)

    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    execution_time_ms = models.PositiveIntegerField(null=True, blank=True)

    retry_count = models.PositiveSmallIntegerField(default=0)
    max_retry = models.PositiveSmallIntegerField(null=True, blank=True)
    retry_reason = models.CharField(
        max_length=RETRY_REASON_LENGTH, null=True, blank=True
    )

    external_provider = models.CharField(
        max_length=PROVIDER_LENGTH,
        choices=ExternalProvider.choices,
        null=True,
        blank=True,
    )
    provider_reference = models.CharField(
        max_length=PROVIDER_REFERENCE_LENGTH, null=True, blank=True
    )
    provider_response_code = models.CharField(
        max_length=PROVIDER_RESPONSE_CODE_LENGTH, null=True, blank=True
    )
    provider_response_message = models.CharField(
        max_length=PROVIDER_RESPONSE_MESSAGE_LENGTH, null=True, blank=True
    )

    new_value = models.JSONField(null=True, blank=True)
    remarks = models.TextField(null=True, blank=True)

    objects = BusinessAuditManager()

    class Meta:
        db_table = "business_audit"
        ordering = ["-created_at"]
        verbose_name = "Business Audit"
        verbose_name_plural = "Business Audits"
        indexes = [
            models.Index(
                fields=["workflow_instance_id", "sequence_no"],
                name=INDEX_WORKFLOW_SEQUENCE,
            ),
            models.Index(
                fields=["workflow_instance_id", "created_at"],
                name=INDEX_WORKFLOW_CREATED,
            ),
            models.Index(
                fields=["parent_workflow_instance_id", "created_at"],
                name=INDEX_PARENT_CREATED,
            ),
            models.Index(
                fields=["correlation_id", "created_at"],
                name=INDEX_CORRELATION_CREATED,
            ),
            models.Index(
                fields=["workflow_type", "created_at"],
                name=INDEX_WORKFLOW_TYPE_CREATED,
            ),
            models.Index(
                fields=["provider_reference"],
                name=INDEX_PROVIDER_REFERENCE,
            ),
            models.Index(
                fields=["domain", "created_at"],
                name=INDEX_DOMAIN_CREATED,
            ),
            models.Index(
                fields=["category", "created_at"],
                name=INDEX_CATEGORY_CREATED,
            ),
            models.Index(
                fields=["status", "created_at"],
                name=INDEX_STATUS_CREATED,
            ),
            models.Index(
                fields=["resource_type", "resource_id"],
                name=INDEX_RESOURCE,
            ),
            models.Index(
                fields=["action", "created_at"],
                name=INDEX_ACTION_CREATED,
            ),
            models.Index(
                fields=["created_at"],
                name=INDEX_CREATED,
            ),
        ]

    def __str__(self) -> str:
        return f"{self.action} ({self.workflow_instance_id}#{self.sequence_no})"

    def save(self, *args, **kwargs) -> None:
        if self.pk is not None and not self._state.adding:
            raise BusinessAuditImmutabilityError(
                "Audit records are immutable and cannot be modified."
            )
        if not (self.correlation_id or "").strip():
            raise BusinessAuditError(
                "correlation_id is required for business audit records."
            )
        if not (self.workflow_instance_id or "").strip():
            raise BusinessAuditError(
                "workflow_instance_id is required for business audit records."
            )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs) -> None:
        raise BusinessAuditImmutabilityError(
            "Audit records are immutable and cannot be deleted."
        )
