"""WorkspacePermission — authenticated doctor + clinic membership."""

from __future__ import annotations

from rest_framework.permissions import BasePermission

from doctor.models import doctor as Doctor


class WorkspacePermission(BasePermission):
    """Allows authenticated doctors who belong to the requested clinic."""

    message = "Doctor access required."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if not user.groups.filter(name="doctor").exists():
            return False
        try:
            doc = Doctor.objects.get(user=user)
        except Doctor.DoesNotExist:
            return False

        clinic_id = request.query_params.get("clinic_id")
        if not clinic_id:
            # View returns 400 for missing clinic_id; allow permission check to pass
            # so the view can emit a clearer validation error.
            request.workspace_doctor = doc
            return True

        if not doc.clinics.filter(id=clinic_id).exists():
            self.message = "Doctor is not a member of the requested clinic."
            return False

        request.workspace_doctor = doc
        return True
