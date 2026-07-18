"""ReportQueryService — optimized read-side queries.

Later: reuse diagnostics_engine report query helpers.
Never place business orchestration here.
"""


class ReportQueryService:
    """Read-side queries for doctor workspace report lists and lookups."""

    def list_for_workspace(self, *, filters, scope, page):
        raise NotImplementedError("Milestone 0 scaffold — not implemented yet.")

    def get_by_id(self, *, report_id, scope):
        raise NotImplementedError("Milestone 0 scaffold — not implemented yet.")

    def count_queues(self, *, filters, scope):
        raise NotImplementedError("Milestone 0 scaffold — not implemented yet.")
