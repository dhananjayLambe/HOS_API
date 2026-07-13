"""Support Investigation API context."""

from __future__ import annotations

import uuid

from django.conf import settings

from support_trace.api.permissions import SUPPORT_INVESTIGATION_GROUPS
from support_trace.lookup.investigation_policy import InvestigationPolicy


class SupportInvestigationContext:
    __slots__ = (
        "user_id",
        "role",
        "organization_id",
        "permissions",
        "timezone",
        "masking_policy",
        "request_id",
        "client_ip",
        "client",
        "investigation_id",
    )

    def __init__(
        self,
        *,
        user_id: str | None,
        role: str,
        organization_id: str | None,
        permissions: frozenset[str],
        timezone: str,
        masking_policy: InvestigationPolicy,
        request_id: str,
        client_ip: str | None,
        client: str | None,
        investigation_id: str,
    ) -> None:
        self.user_id = user_id
        self.role = role
        self.organization_id = organization_id
        self.permissions = permissions
        self.timezone = timezone
        self.masking_policy = masking_policy
        self.request_id = request_id
        self.client_ip = client_ip
        self.client = client
        self.investigation_id = investigation_id

    @classmethod
    def from_request(cls, request) -> SupportInvestigationContext:
        from support_trace.api.response_builder import get_request_id

        user = getattr(request, "user", None)
        user_id = str(user.pk) if user and user.is_authenticated else None
        role = cls._derive_role(user)
        org_id = cls._derive_organization(user)
        permissions = frozenset({role}) if role else frozenset()
        masking_policy = cls._policy_for_role(user, role)
        return cls(
            user_id=user_id,
            role=role,
            organization_id=org_id,
            permissions=permissions,
            timezone=getattr(settings, "TIME_ZONE", "UTC"),
            masking_policy=masking_policy,
            request_id=get_request_id(request),
            client_ip=cls._client_ip(request),
            client=(request.META.get("HTTP_X_CLIENT") or request.META.get("HTTP_USER_AGENT") or "")[:256]
            or None,
            investigation_id=str(uuid.uuid4()),
        )

    @staticmethod
    def _derive_role(user) -> str:
        if not user or not user.is_authenticated:
            return "anonymous"
        if user.is_superuser:
            return "superadmin"
        group_names = set(user.groups.values_list("name", flat=True))
        for name in ("superadmin", "admin", "helpdesk_admin", "helpdesk", "operations"):
            if name in group_names:
                return name
        return "authenticated"

    @staticmethod
    def _derive_organization(user) -> str | None:
        if not user or not user.is_authenticated:
            return None
        profile = getattr(user, "profile", None)
        clinic = getattr(profile, "clinic", None) if profile else None
        if clinic is not None:
            return str(clinic.id)
        return None

    @staticmethod
    def _policy_for_role(user, role: str) -> InvestigationPolicy:
        if user and user.is_superuser:
            return InvestigationPolicy.for_admin()
        if role in ("admin", "superadmin"):
            return InvestigationPolicy.for_admin()
        if role in SUPPORT_INVESTIGATION_GROUPS:
            return InvestigationPolicy.for_patient_investigation()
        return InvestigationPolicy.default()

    @staticmethod
    def _client_ip(request) -> str | None:
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")
