"""Resolve authenticated labadmin user → LabUser for dashboard APIs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from rest_framework.response import Response

from labs.models import LabUser

if TYPE_CHECKING:
    from account.models import User


@dataclass(frozen=True)
class LabSessionDenied:
    response: Response


@dataclass(frozen=True)
class LabSessionResolved:
    lab_user: LabUser


def resolve_lab_user(request) -> LabSessionResolved | LabSessionDenied:
    user: User = request.user
    if not user.groups.filter(name="labadmin").exists():
        return LabSessionDenied(
            response=Response(
                {"detail": "You do not have permission to access the lab session."},
                status=403,
            )
        )

    lab_user = (
        LabUser.objects.filter(user=user)
        .select_related("user", "organization", "branch", "branch__address")
        .order_by("-is_primary_admin", "created_at")
        .first()
    )
    if lab_user is None:
        return LabSessionDenied(
            response=Response(
                {
                    "code": "lab_profile_missing",
                    "detail": "No lab user profile is linked to this account.",
                },
                status=404,
            )
        )

    return LabSessionResolved(lab_user=lab_user)
