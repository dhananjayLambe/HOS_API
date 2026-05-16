"""Permissions for lab dashboard APIs."""

from rest_framework.permissions import BasePermission


class IsLabAdminUser(BasePermission):
    """Authenticated user must belong to the labadmin group."""

    message = "You do not have permission to access lab resources."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.groups.filter(name="labadmin").exists())
