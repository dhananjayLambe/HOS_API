from celery import shared_task

from labs.services.workflow_transitions import reject_stale_pending_assignments


@shared_task(name="labs.auto_reject_stale_lab_assignments")
def auto_reject_stale_lab_assignments() -> int:
    """Reject PENDING assignments past the SLA window. Returns count rejected."""
    return reject_stale_pending_assignments()
