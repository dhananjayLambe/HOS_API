"""Per-workflow-type FSM graphs for Support Trace projection."""

from __future__ import annotations

from business_audit.enums import WorkflowType

# Allowed transitions: from_state -> frozenset of to_states
# Empty from_state "" means create (first event)

_RECOMMENDATION: dict[str, frozenset[str]] = {
    "": frozenset({"Generated", "Failed"}),
    "Generated": frozenset({"Queued", "Failed", "Sent", "Expired"}),
    "Queued": frozenset({"Sent", "Failed", "Expired"}),
    "Sent": frozenset({"Delivered", "Failed", "Read"}),
    "Delivered": frozenset({"Read", "Failed", "Completed"}),
    "Read": frozenset({"Completed"}),
    "Failed": frozenset({"Retry", "Failed"}),
    "Retry": frozenset({"Sent", "Delivered", "Failed", "Queued"}),
    "Expired": frozenset(),
    "Completed": frozenset(),
}

_BOOKING: dict[str, frozenset[str]] = {
    "": frozenset({"Created"}),
    "Created": frozenset({"Confirmed", "Cancelled", "Expired", "Modified", "Closed"}),
    "Confirmed": frozenset({"Modified", "Closed", "Cancelled"}),
    "Modified": frozenset({"Confirmed", "Closed", "Cancelled", "Modified"}),
    "Closed": frozenset(),
    "Cancelled": frozenset(),
    "Expired": frozenset(),
}

_ROUTING: dict[str, frozenset[str]] = {
    "": frozenset({"Started"}),
    "Started": frozenset({"Matched", "Failed", "Assigned"}),
    "Matched": frozenset({"Compared", "Failed", "Assigned"}),
    "Compared": frozenset({"Discounted", "Assigned", "Failed"}),
    "Discounted": frozenset({"Assigned", "Failed"}),
    "Assigned": frozenset({"Manual Override", "Assigned"}),
    "Manual Override": frozenset({"Assigned"}),
    "Failed": frozenset(),
}

_REPORT_DELIVERY: dict[str, frozenset[str]] = {
    "": frozenset({"Ready"}),
    "Ready": frozenset({"Requested", "Failed"}),
    "Requested": frozenset({"Sending", "Delivered", "Failed"}),
    "Sending": frozenset({"Delivered", "Failed"}),
    "Delivered": frozenset(),
    "Failed": frozenset({"Retry", "Failed"}),
    "Retry": frozenset({"Sending", "Requested", "Delivered", "Failed"}),
}

_CONSULTATION: dict[str, frozenset[str]] = {
    "": frozenset({"Started"}),
    "Started": frozenset({"Documentation", "Prescription", "Completed", "Cancelled"}),
    "Documentation": frozenset(
        {"Documentation", "Prescription", "Completed", "Cancelled"}
    ),
    "Prescription": frozenset({"Completed", "Cancelled", "Prescription"}),
    "Completed": frozenset(),
    "Cancelled": frozenset(),
}

_PRESCRIPTION: dict[str, frozenset[str]] = {
    "": frozenset({"Created"}),
    "Created": frozenset({"Signed", "Delivered"}),
    "Signed": frozenset({"Delivered"}),
    "Delivered": frozenset(),
}

_DIAGNOSTIC_REPORT: dict[str, frozenset[str]] = {
    "": frozenset({"Uploaded"}),
    "Uploaded": frozenset({"Verified", "Viewed"}),
    "Verified": frozenset({"Viewed", "Downloaded", "Shared"}),
    "Viewed": frozenset({"Downloaded", "Shared", "Viewed"}),
    "Downloaded": frozenset({"Shared", "Downloaded"}),
    "Shared": frozenset(),
}

_MACHINES: dict[str, dict[str, frozenset[str]]] = {
    WorkflowType.RECOMMENDATION: _RECOMMENDATION,
    WorkflowType.BOOKING: _BOOKING,
    WorkflowType.ROUTING: _ROUTING,
    WorkflowType.REPORT_DELIVERY: _REPORT_DELIVERY,
    WorkflowType.CONSULTATION: _CONSULTATION,
    WorkflowType.PRESCRIPTION: _PRESCRIPTION,
    WorkflowType.DIAGNOSTIC_REPORT: _DIAGNOSTIC_REPORT,
}


def get_state_machine(workflow_type: str) -> dict[str, frozenset[str]] | None:
    return _MACHINES.get(str(workflow_type))


def is_transition_allowed(
    workflow_type: str,
    from_state: str | None,
    to_state: str,
) -> bool:
    machine = get_state_machine(workflow_type)
    if machine is None:
        return True  # unknown workflow types: allow (fail-open for projection)
    current = from_state or ""
    allowed = machine.get(current)
    if allowed is None:
        # Unknown current state — allow first sync after rebuild ambiguity
        return True
    return to_state in allowed
