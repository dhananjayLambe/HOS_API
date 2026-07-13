"""Support Investigation API permissions."""

from rest_framework.permissions import BasePermission

SUPPORT_INVESTIGATION_GROUPS = frozenset(
    {"superadmin", "admin", "helpdesk", "helpdesk_admin", "operations"}
)


class SupportInvestigationPermission(BasePermission):
    """JWT-authenticated support/admin/operations only — never patient auth."""

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return user.groups.filter(name__in=SUPPORT_INVESTIGATION_GROUPS).exists()
