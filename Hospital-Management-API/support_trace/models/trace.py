"""Support Trace projection model — mutable workflow index."""

from __future__ import annotations

import uuid

from django.db import models

from business_audit.enums import BusinessResourceType, WorkflowType
from support_trace.constants import (
    CORRELATION_ID_LENGTH,
    EVENT_LENGTH,
    FINGERPRINT_LENGTH,
    IDENTIFIER_LENGTH,
    INDEX_BOOKING,
    INDEX_CONSULTATION,
    INDEX_CORRELATION,
    INDEX_CORRELATION_UPDATED,
    INDEX_FINGERPRINT,
    INDEX_LAST_SOURCE,
    INDEX_ORGANIZATION,
    INDEX_PARENT,
    INDEX_PATIENT_ACCOUNT,
    INDEX_PATIENT_UPDATED,
    INDEX_PHONE,
    INDEX_PROVIDER_REF,
    INDEX_RECOMMENDATION,
    INDEX_REPORT,
    INDEX_RESOURCE,
    INDEX_STATUS,
    INDEX_SYNC_STATUS,
    INDEX_SYNC_UPDATED,
    INDEX_WHATSAPP,
    INDEX_WORKFLOW_HEALTH,
    INDEX_WORKFLOW_UNIQUE,
    INDEX_WORKFLOW_UPDATED,
    ORGANIZATION_ID_LENGTH,
    PHONE_LENGTH,
    PROVIDER_REFERENCE_LENGTH,
    REQUEST_ID_LENGTH,
    RESOURCE_ID_LENGTH,
    STATE_LENGTH,
    STATUS_LENGTH,
    SYNC_STATUS_LENGTH,
    TRACE_SOURCE_LENGTH,
    WHATSAPP_MESSAGE_ID_LENGTH,
    WORKFLOW_INSTANCE_ID_LENGTH,
    WORKFLOW_STEP_LENGTH,
    WORKFLOW_TYPE_LENGTH,
)
from support_trace.enums import SyncStatus, TraceSource, TraceStatus, WorkflowHealth


class SupportTrace(models.Model):
    """Mutable workflow projection index for production support investigations.

    Not a source of truth — rebuildable from immutable Clinical and Business Audit.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    trace_version = models.PositiveIntegerField(default=1)
    projection_version = models.PositiveIntegerField(default=1)
    workflow_fingerprint = models.CharField(max_length=FINGERPRINT_LENGTH)

    correlation_id = models.CharField(max_length=CORRELATION_ID_LENGTH, db_index=True)
    request_id = models.CharField(
        max_length=REQUEST_ID_LENGTH, null=True, blank=True
    )

    workflow_instance_id = models.CharField(
        max_length=WORKFLOW_INSTANCE_ID_LENGTH, unique=True
    )
    parent_workflow_instance_id = models.CharField(
        max_length=WORKFLOW_INSTANCE_ID_LENGTH, null=True, blank=True
    )
    workflow_depth = models.PositiveSmallIntegerField(default=0)

    workflow_type = models.CharField(
        max_length=WORKFLOW_TYPE_LENGTH, choices=WorkflowType.choices
    )
    resource_type = models.CharField(
        max_length=32, choices=BusinessResourceType.choices
    )
    resource_id = models.CharField(max_length=RESOURCE_ID_LENGTH)
    organization_id = models.CharField(max_length=ORGANIZATION_ID_LENGTH)

    status = models.CharField(
        max_length=STATUS_LENGTH, choices=TraceStatus.choices
    )
    current_state = models.CharField(max_length=STATE_LENGTH, blank=True, default="")
    workflow_step = models.CharField(
        max_length=WORKFLOW_STEP_LENGTH, null=True, blank=True
    )
    last_event = models.CharField(max_length=EVENT_LENGTH)
    last_sequence_no = models.PositiveIntegerField(null=True, blank=True)

    last_source = models.CharField(
        max_length=TRACE_SOURCE_LENGTH,
        choices=TraceSource.choices,
        default=TraceSource.SYSTEM,
    )
    sync_status = models.CharField(
        max_length=SYNC_STATUS_LENGTH,
        choices=SyncStatus.choices,
        default=SyncStatus.PENDING,
    )
    workflow_health = models.CharField(
        max_length=16,
        choices=WorkflowHealth.choices,
        default=WorkflowHealth.HEALTHY,
    )

    first_event_at = models.DateTimeField(null=True, blank=True)
    last_event_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    retry_count = models.PositiveIntegerField(default=0)

    last_clinical_audit_id = models.UUIDField(null=True, blank=True)
    last_business_audit_id = models.UUIDField(null=True, blank=True)

    search_vector = models.JSONField(default=dict, blank=True)
    current_snapshot = models.JSONField(default=dict, blank=True)
    runtime_metadata = models.JSONField(default=dict, blank=True)

    # Extended identifier index
    patient_account_id = models.CharField(
        max_length=IDENTIFIER_LENGTH, null=True, blank=True, db_index=True
    )
    patient_profile_id = models.CharField(
        max_length=IDENTIFIER_LENGTH, null=True, blank=True, db_index=True
    )
    consultation_id = models.CharField(
        max_length=IDENTIFIER_LENGTH, null=True, blank=True, db_index=True
    )
    encounter_id = models.CharField(
        max_length=IDENTIFIER_LENGTH, null=True, blank=True, db_index=True
    )
    recommendation_id = models.CharField(
        max_length=IDENTIFIER_LENGTH, null=True, blank=True, db_index=True
    )
    booking_id = models.CharField(
        max_length=IDENTIFIER_LENGTH, null=True, blank=True, db_index=True
    )
    routing_id = models.CharField(
        max_length=IDENTIFIER_LENGTH, null=True, blank=True, db_index=True
    )
    report_id = models.CharField(
        max_length=IDENTIFIER_LENGTH, null=True, blank=True, db_index=True
    )
    prescription_id = models.CharField(
        max_length=IDENTIFIER_LENGTH, null=True, blank=True, db_index=True
    )
    order_id = models.CharField(
        max_length=IDENTIFIER_LENGTH, null=True, blank=True, db_index=True
    )
    payment_id = models.CharField(
        max_length=IDENTIFIER_LENGTH, null=True, blank=True, db_index=True
    )
    invoice_id = models.CharField(
        max_length=IDENTIFIER_LENGTH, null=True, blank=True, db_index=True
    )
    laboratory_id = models.CharField(
        max_length=IDENTIFIER_LENGTH, null=True, blank=True, db_index=True
    )
    branch_id = models.CharField(
        max_length=IDENTIFIER_LENGTH, null=True, blank=True, db_index=True
    )
    provider_reference = models.CharField(
        max_length=PROVIDER_REFERENCE_LENGTH, null=True, blank=True, db_index=True
    )
    whatsapp_message_id = models.CharField(
        max_length=WHATSAPP_MESSAGE_ID_LENGTH, null=True, blank=True, db_index=True
    )
    phone_number = models.CharField(
        max_length=PHONE_LENGTH, null=True, blank=True, db_index=True
    )

    first_seen_at = models.DateTimeField(null=True, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    identifier_count = models.PositiveSmallIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "support_trace"
        indexes = [
            models.Index(fields=["workflow_fingerprint"], name=INDEX_FINGERPRINT),
            models.Index(
                fields=["parent_workflow_instance_id"], name=INDEX_PARENT
            ),
            models.Index(
                fields=["correlation_id", "updated_at"],
                name=INDEX_CORRELATION_UPDATED,
            ),
            models.Index(
                fields=["workflow_instance_id", "updated_at"],
                name=INDEX_WORKFLOW_UPDATED,
            ),
            models.Index(
                fields=["resource_type", "resource_id"], name=INDEX_RESOURCE
            ),
            models.Index(
                fields=["patient_account_id", "updated_at"],
                name=INDEX_PATIENT_UPDATED,
            ),
            models.Index(
                fields=["sync_status", "updated_at"], name=INDEX_SYNC_UPDATED
            ),
            models.Index(fields=["organization_id"], name=INDEX_ORGANIZATION),
            models.Index(fields=["status"], name=INDEX_STATUS),
            models.Index(fields=["sync_status"], name=INDEX_SYNC_STATUS),
            models.Index(fields=["workflow_health"], name=INDEX_WORKFLOW_HEALTH),
            models.Index(fields=["last_source"], name=INDEX_LAST_SOURCE),
        ]

    def __str__(self) -> str:
        return f"SupportTrace({self.workflow_instance_id}, {self.status})"
