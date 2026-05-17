"""
Home collection logistics workflow for LabCollectionRequest.

Operational scope only: phlebotomist assignment, field visit lifecycle, collect/fail/retry.
Test processing, report upload, order acceptance, and routing are handled elsewhere
(LabOrderTestExecution, LabOrderAssignment, diagnostics_engine).

Enforces a strict transition graph via ALLOWED_TRANSITIONS. Views must never mutate
collection_status directly — call service methods only.

Naming convention (aligned with Visit / Execution workflows):
  - Status: IN_PROGRESS
  - Timestamp: in_progress_at

# Future (out of scope for this service):
# - SLA escalation
# - technician GPS
# - notifications
# - websocket updates
"""

from __future__ import annotations

from typing import Callable
from uuid import UUID

from django.db import transaction
from django.utils import timezone

from account.models import User
from labs.choices.workflow import CollectionStatus
from labs.models import LabCollectionRequest, LabUser

TERMINAL_STATUSES = frozenset(
    {
        CollectionStatus.COLLECTED,
        CollectionStatus.CANCELLED,
    },
)

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    CollectionStatus.PENDING: {CollectionStatus.ASSIGNED},
    CollectionStatus.ASSIGNED: {
        CollectionStatus.IN_PROGRESS,
        CollectionStatus.FAILED,
    },
    CollectionStatus.IN_PROGRESS: {
        CollectionStatus.COLLECTED,
        CollectionStatus.FAILED,
    },
    CollectionStatus.FAILED: {CollectionStatus.PENDING},
    CollectionStatus.COLLECTED: set(),
    CollectionStatus.CANCELLED: set(),
}


class CollectionWorkflowError(Exception):
    def __init__(
        self,
        message: str = "Invalid workflow transition for current collection status.",
    ):
        super().__init__(message)
        self.message = message


class CollectionNotFoundError(Exception):
    pass


class PhlebotomistNotFoundError(Exception):
    pass


def get_collection_for_lab_user(
    *,
    collection_id: UUID | str,
    lab_user: LabUser,
    select_for_update: bool = False,
) -> LabCollectionRequest:
    # Locked loads avoid nullable FK joins — PostgreSQL rejects FOR UPDATE on outer joins.
    if select_for_update:
        qs = LabCollectionRequest.objects.select_related(
            "diagnostic_order",
            "lab_branch",
        ).select_for_update()
    else:
        qs = LabCollectionRequest.objects.select_related(
            "diagnostic_order",
            "assigned_phlebotomist",
            "assigned_phlebotomist__user",
            "lab_branch",
        )
    try:
        return qs.get(
            pk=collection_id,
            lab_branch_id=lab_user.branch_id,
            is_deleted=False,
        )
    except LabCollectionRequest.DoesNotExist as exc:
        raise CollectionNotFoundError from exc


def resolve_phlebotomist(
    *,
    phlebotomist_id: UUID | str,
    lab_user: LabUser,
) -> LabUser:
    try:
        return LabUser.objects.get(
            pk=phlebotomist_id,
            branch_id=lab_user.branch_id,
            is_deleted=False,
            is_active=True,
        )
    except LabUser.DoesNotExist as exc:
        raise PhlebotomistNotFoundError from exc


def _validate_phlebotomist_for_branch(
    phlebotomist: LabUser,
    lab_user: LabUser,
) -> None:
    if (
        phlebotomist.branch_id != lab_user.branch_id
        or phlebotomist.is_deleted
        or not phlebotomist.is_active
    ):
        raise PhlebotomistNotFoundError


def validate_transition(*, current_status: str, target_status: str) -> None:
    allowed = ALLOWED_TRANSITIONS.get(current_status, set())
    if target_status not in allowed:
        raise CollectionWorkflowError(
            f"Cannot transition from {current_status} to {target_status}.",
        )


def _ensure_not_terminal(collection: LabCollectionRequest) -> None:
    if collection.collection_status in TERMINAL_STATUSES:
        raise CollectionWorkflowError(
            f"Cannot transition collection in terminal status {collection.collection_status}.",
        )


def _assert_transition(collection: LabCollectionRequest, target_status: str) -> None:
    validate_transition(
        current_status=collection.collection_status,
        target_status=target_status,
    )


def _append_workflow_event(
    collection: LabCollectionRequest,
    *,
    from_status: str,
    to_status: str,
    lab_user: LabUser,
) -> None:
    metadata = dict(collection.metadata or {})
    events = list(metadata.get("workflow_events") or [])
    events.append(
        {
            "from": from_status,
            "to": to_status,
            "at": timezone.now().isoformat(),
            "actor_id": str(lab_user.id),
        },
    )
    metadata["workflow_events"] = events
    collection.metadata = metadata


def _transition(
    *,
    collection: LabCollectionRequest,
    target_status: str,
    lab_user: LabUser,
    update_fields: list[str],
) -> None:
    """Apply status change, audit event, and save with explicit update_fields."""
    _ensure_not_terminal(collection)
    _assert_transition(collection, target_status)
    from_status = collection.collection_status
    collection.collection_status = target_status
    _append_workflow_event(
        collection,
        from_status=from_status,
        to_status=target_status,
        lab_user=lab_user,
    )
    fields = list(dict.fromkeys([*update_fields, "collection_status", "metadata", "updated_at"]))
    collection.save(update_fields=fields)


def _run_transition(
    *,
    collection_id: UUID | str,
    lab_user: LabUser,
    target_status: str,
    apply: Callable[[LabCollectionRequest], list[str]],
) -> LabCollectionRequest:
    with transaction.atomic():
        collection = get_collection_for_lab_user(
            collection_id=collection_id,
            lab_user=lab_user,
            select_for_update=True,
        )
        update_fields = apply(collection)
        _transition(
            collection=collection,
            target_status=target_status,
            lab_user=lab_user,
            update_fields=update_fields,
        )
    collection.refresh_from_db()
    return collection


def workflow_hint_for_status(status: str) -> str:
    return {
        CollectionStatus.PENDING: "Awaiting assignment",
        CollectionStatus.ASSIGNED: "Waiting for collection start",
        CollectionStatus.IN_PROGRESS: "Collection in progress",
        CollectionStatus.COLLECTED: "Sample handed to lab",
        CollectionStatus.FAILED: "Collection unsuccessful",
        CollectionStatus.CANCELLED: "Cancelled",
    }.get(status, "")


def allowed_actions_for_status(status: str) -> list[str]:
    mapping = {
        CollectionStatus.PENDING: ["assign"],
        CollectionStatus.ASSIGNED: ["start", "fail"],
        CollectionStatus.IN_PROGRESS: ["collect", "fail"],
        CollectionStatus.FAILED: ["retry"],
        CollectionStatus.COLLECTED: ["view_execution"],
        CollectionStatus.CANCELLED: [],
    }
    return mapping.get(status, [])


def assign_collection(
    *,
    collection_id: UUID | str,
    lab_user: LabUser,
    assigned_by_user: User | None = None,
    assignment_note: str = "",
    phlebotomist: LabUser | None = None,
) -> LabCollectionRequest:
    if phlebotomist is not None:
        _validate_phlebotomist_for_branch(phlebotomist, lab_user)
    now = timezone.now()
    note = (assignment_note or "").strip()

    def apply(collection: LabCollectionRequest) -> list[str]:
        collection.assigned_at = now
        collection.assigned_by = assigned_by_user
        collection.assignment_note = note
        fields = ["assigned_at", "assigned_by", "assignment_note"]
        if phlebotomist is not None:
            collection.assigned_phlebotomist = phlebotomist
            fields.append("assigned_phlebotomist")
        return fields

    return _run_transition(
        collection_id=collection_id,
        lab_user=lab_user,
        target_status=CollectionStatus.ASSIGNED,
        apply=apply,
    )


def assign_collection_by_id(
    *,
    collection_id: UUID | str,
    lab_user: LabUser,
    assigned_by_user: User | None = None,
    assignment_note: str = "",
    phlebotomist_id: UUID | str | None = None,
) -> LabCollectionRequest:
    """Convenience wrapper for views; phlebotomist_id is optional (legacy compat)."""
    phlebotomist = None
    if phlebotomist_id is not None:
        phlebotomist = resolve_phlebotomist(phlebotomist_id=phlebotomist_id, lab_user=lab_user)
    return assign_collection(
        collection_id=collection_id,
        lab_user=lab_user,
        assigned_by_user=assigned_by_user,
        assignment_note=assignment_note,
        phlebotomist=phlebotomist,
    )


def start_collection(
    *,
    collection_id: UUID | str,
    lab_user: LabUser,
) -> LabCollectionRequest:
    now = timezone.now()

    def apply(collection: LabCollectionRequest) -> list[str]:
        collection.in_progress_at = now
        return ["in_progress_at"]

    return _run_transition(
        collection_id=collection_id,
        lab_user=lab_user,
        target_status=CollectionStatus.IN_PROGRESS,
        apply=apply,
    )


def mark_collected(
    *,
    collection_id: UUID | str,
    lab_user: LabUser,
) -> LabCollectionRequest:
    """
    Home collection logistics: transition to COLLECTED, then provision per-test executions.

    Execution rows are created via test_execution_provisioning (not in this module's core logic).
    """
    now = timezone.now()

    def apply(collection: LabCollectionRequest) -> list[str]:
        collection.collected_at = now
        return ["collected_at"]

    collection = _run_transition(
        collection_id=collection_id,
        lab_user=lab_user,
        target_status=CollectionStatus.COLLECTED,
        apply=apply,
    )

    assignment = getattr(collection.diagnostic_order, "lab_assignment", None)
    if assignment is not None:
        from labs.services.test_execution_provisioning import ensure_test_executions

        ensure_test_executions(
            assignment=assignment,
            collection_request=collection,
        )

    return collection


def mark_failed(
    *,
    collection_id: UUID | str,
    lab_user: LabUser,
    failure_reason: str = "",
    reason: str | None = None,
) -> LabCollectionRequest:
    now = timezone.now()
    note = (failure_reason or reason or "").strip()

    def apply(collection: LabCollectionRequest) -> list[str]:
        collection.failed_at = now
        fields = ["failed_at"]
        if note:
            collection.internal_notes = (
                f"{(collection.internal_notes or '').strip()}\n{note}".strip()
                if collection.internal_notes
                else note
            )
            fields.append("internal_notes")
            metadata = dict(collection.metadata or {})
            metadata["failure_reason"] = note
            collection.metadata = metadata
            fields.append("metadata")
        return fields

    return _run_transition(
        collection_id=collection_id,
        lab_user=lab_user,
        target_status=CollectionStatus.FAILED,
        apply=apply,
    )


def retry_collection(
    *,
    collection_id: UUID | str,
    lab_user: LabUser,
) -> LabCollectionRequest:
    now = timezone.now()

    def apply(collection: LabCollectionRequest) -> list[str]:
        metadata = dict(collection.metadata or {})
        retries = list(metadata.get("retries") or [])
        retries.append(
            {
                "retried_at": now.isoformat(),
                "retried_by": str(lab_user.id),
                "previous_failed_at": (
                    collection.failed_at.isoformat() if collection.failed_at else None
                ),
                "retry_count_before": collection.retry_count,
            },
        )
        metadata["retries"] = retries
        collection.metadata = metadata
        collection.retry_count = (collection.retry_count or 0) + 1
        collection.assigned_phlebotomist = None
        collection.assigned_at = None
        collection.assigned_by = None
        collection.assignment_note = ""
        collection.in_progress_at = None
        collection.failed_at = None
        return [
            "assigned_phlebotomist",
            "assigned_at",
            "assigned_by",
            "assignment_note",
            "in_progress_at",
            "failed_at",
            "retry_count",
            "metadata",
        ]

    return _run_transition(
        collection_id=collection_id,
        lab_user=lab_user,
        target_status=CollectionStatus.PENDING,
        apply=apply,
    )
