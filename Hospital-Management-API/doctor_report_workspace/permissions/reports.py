"""ReportPermission — object-level access to a diagnostic report.

Milestone 0 placeholder. Later: doctor owns order/encounter + clinic scope.
"""

from rest_framework.permissions import BasePermission


class ReportPermission(BasePermission):
    """Object-level permission for a single report."""

    def has_object_permission(self, request, view, obj):
        raise NotImplementedError("Milestone 0 scaffold — not implemented yet.")
