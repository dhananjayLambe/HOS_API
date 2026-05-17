"""
Future: provision LabVisitAppointment for branch-visit logistics (order-level).

Phase 1 uses minimal get_or_create in workflow_transitions.accept_assignment.
When implemented, mirror collection_request_provisioning:

    ensure_lab_visit_appointment(*, assignment: LabOrderAssignment) -> tuple[LabVisitAppointment, bool]

Do not create LabOrderTestExecution here — use test_execution_provisioning after CHECKED_IN
or IN_PROGRESS on the visit workflow.
"""
