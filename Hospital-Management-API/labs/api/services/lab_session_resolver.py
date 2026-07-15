"""Resolve authenticated labadmin user → LabUser for dashboard APIs.

Identity (resolve_lab_user) is separate from operational readiness
(require_lab_operational_access / can_operate).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from rest_framework.response import Response

from labs.choices.auth import RegistrationStatus
from labs.models import LabUser

if TYPE_CHECKING:
    from account.models import User

LAB_PROFILE_MISSING = "lab_profile_missing"
LAB_NOT_APPROVED = "lab_not_approved"
LAB_USER_INACTIVE = "lab_user_inactive"


@dataclass(frozen=True)
class LabSessionDenied:
    response: Response


@dataclass(frozen=True)
class LabSessionResolved:
    lab_user: LabUser


def can_operate(lab_user: LabUser) -> bool:
    """Single gate for whether the lab may run operational work."""
    if not lab_user.is_active:
        return False
    org = getattr(lab_user, "organization", None)
    if org is None:
        return False
    return org.registration_status == RegistrationStatus.APPROVED


def resolve_lab_user(request) -> LabSessionResolved | LabSessionDenied:
    """Identity / profile only — no approval checks."""
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
    if lab_user is None or getattr(lab_user, "organization", None) is None:
        return LabSessionDenied(
            response=Response(
                {
                    "code": LAB_PROFILE_MISSING,
                    "detail": "No lab user profile is linked to this account.",
                },
                status=404,
            )
        )

    return LabSessionResolved(lab_user=lab_user)


def check_lab_operational_access(lab_user: LabUser) -> LabSessionDenied | None:
    """Return a denial Response wrapper if the lab cannot operate; else None."""
    if not lab_user.is_active:
        return LabSessionDenied(
            response=Response(
                {
                    "code": LAB_USER_INACTIVE,
                    "detail": "This lab user account is inactive. Please contact support.",
                    "registration_status": getattr(
                        getattr(lab_user, "organization", None),
                        "registration_status",
                        None,
                    ),
                },
                status=403,
            )
        )

    org = lab_user.organization
    rs = org.registration_status
    if rs == RegistrationStatus.APPROVED:
        return None

    return LabSessionDenied(
        response=Response(
            {
                "code": LAB_NOT_APPROVED,
                "detail": (
                    "Your lab registration is not approved for operational access yet."
                ),
                "registration_status": rs,
            },
            status=403,
        )
    )


def require_lab_operational_access(request) -> LabSessionResolved | LabSessionDenied:
    """Resolve profile, then enforce operational readiness. One-liner for ops views."""
    resolved = resolve_lab_user(request)
    if isinstance(resolved, LabSessionDenied):
        return resolved

    denial = check_lab_operational_access(resolved.lab_user)
    if denial is not None:
        return denial

    return resolved
