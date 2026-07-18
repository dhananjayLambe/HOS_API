"""ContextService — reserved workspace context assembly.

Later: assemble patient / encounter / reports / audit trail without
bloating WorkspaceService.
"""


class ContextService:
    """Assembles full workspace context for a patient or report."""

    def build_patient_context(self, *, patient_id, scope):
        raise NotImplementedError("Milestone 0 scaffold — not implemented yet.")

    def build_report_context(self, *, report_id, scope):
        raise NotImplementedError("Milestone 0 scaffold — not implemented yet.")
