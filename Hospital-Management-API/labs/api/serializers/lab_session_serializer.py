"""
Read-only lab session payload for GET /api/labs/me/.

Maps labs.models.lab_auth (LabUser, LabOrganization, LabBranch, LabAddress) + account.User.
No create/update serializers — display only.
"""

from __future__ import annotations

from typing import Any

from rest_framework import serializers

from labs.api.services.lab_session_resolver import can_operate
from labs.choices.auth import LabUserRole, RegistrationStatus
from labs.models import LabUser


def _permissions_for_role(role: str, *, operational: bool) -> dict[str, bool]:
    """Phase-1 operational flags; refine when RBAC lands. AND'd with operational_access."""
    if not operational:
        return {
            "can_access_dashboard": False,
            "can_upload_reports": False,
            "can_manage_orders": False,
            "can_assign_collections": False,
        }
    admin_like = role in (LabUserRole.ADMIN, LabUserRole.MANAGER)
    clinical = role in (LabUserRole.PATHOLOGIST, LabUserRole.RADIOLOGIST)
    return {
        "can_access_dashboard": True,
        "can_upload_reports": admin_like or clinical or role == LabUserRole.TECHNICIAN,
        "can_manage_orders": admin_like,
        "can_assign_collections": admin_like
        or role
        in (
            LabUserRole.PHLEBOTOMIST,
            LabUserRole.RECEPTIONIST,
        ),
    }


class LabSessionSerializer(serializers.Serializer):
    """
    Instance must be a LabUser with select_related(
        user, organization, branch, branch__address
    ).
    """

    profile_complete = serializers.SerializerMethodField()
    onboarding_complete = serializers.SerializerMethodField()
    registration_status = serializers.SerializerMethodField()
    operational_access = serializers.SerializerMethodField()
    approval_required = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    lab_user = serializers.SerializerMethodField()
    organization = serializers.SerializerMethodField()
    branch = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    def get_profile_complete(self, obj: LabUser) -> bool:
        return True

    def get_onboarding_complete(self, obj: LabUser) -> bool:
        return bool(obj.organization.onboarding_completed)

    def get_registration_status(self, obj: LabUser) -> str:
        return obj.organization.registration_status

    def get_operational_access(self, obj: LabUser) -> bool:
        return can_operate(obj)

    def get_approval_required(self, obj: LabUser) -> bool:
        return obj.organization.registration_status != RegistrationStatus.APPROVED

    def get_permissions(self, obj: LabUser) -> dict[str, bool]:
        return _permissions_for_role(obj.role, operational=can_operate(obj))

    def get_user(self, obj: LabUser) -> dict[str, Any]:
        u = obj.user
        return {
            "id": str(u.id),
            "username": getattr(u, "username", "") or "",
            "first_name": u.first_name or "",
            "last_name": u.last_name or "",
            "email": u.email or "",
            "phone_number": "",
            "profile_picture": "",
        }

    def get_lab_user(self, obj: LabUser) -> dict[str, Any]:
        return {
            "id": str(obj.id),
            "role": obj.role,
            "employee_code": obj.employee_code or "",
            "is_primary_admin": obj.is_primary_admin,
            "is_active": obj.is_active,
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
            "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
        }

    def _logo_url(self, org) -> str:
        request = self.context.get("request")
        if not org.logo or not request:
            return ""
        try:
            return request.build_absolute_uri(org.logo.url)
        except Exception:
            return ""

    def get_organization(self, obj: LabUser) -> dict[str, Any]:
        o = obj.organization
        return {
            "id": str(o.id),
            "organization_name": o.organization_name,
            "display_name": o.display_name,
            "organization_code": o.organization_code,
            "slug": o.slug,
            "lab_type": o.lab_type,
            "logo": self._logo_url(o),
            "registration_number": o.registration_number or "",
            "license_number": o.license_number or "",
            "pan_number": o.pan_number or "",
            "gst_number": o.gst_number or "",
            "owner_name": o.owner_name or "",
            "owner_designation": o.owner_designation or "",
            "primary_contact_number": o.primary_contact_number or "",
            "alternate_contact_number": o.alternate_contact_number or "",
            "support_email": o.support_email or "",
            "website": o.website or "",
            "registration_status": o.registration_status,
            "is_verified": o.is_verified,
            "rejection_reason": o.rejection_reason or "",
            "approved_at": o.approved_at.isoformat() if o.approved_at else None,
            "home_collection_available": o.home_collection_available,
            "walk_in_collection_available": o.walk_in_collection_available,
            "accepts_online_orders": o.accepts_online_orders,
            "is_active_for_orders": o.is_active_for_orders,
            "onboarding_completed": o.onboarding_completed,
            "is_active": o.is_active,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "updated_at": o.updated_at.isoformat() if o.updated_at else None,
        }

    def _fmt_time(self, t) -> str:
        if not t:
            return ""
        if hasattr(t, "strftime"):
            return t.strftime("%H:%M")
        return str(t)

    def get_branch(self, obj: LabUser) -> dict[str, Any]:
        b = obj.branch
        addr = getattr(b, "address", None)
        city = state = pincode = country = ""
        address_line_1 = address_line_2 = landmark = ""
        latitude = longitude = ""
        if addr is not None:
            address_line_1 = addr.address_line_1 or ""
            address_line_2 = addr.address_line_2 or ""
            landmark = addr.landmark or ""
            city = addr.city or ""
            state = addr.state or ""
            country = addr.country or ""
            pincode = addr.pincode or ""
            if addr.latitude is not None:
                latitude = str(addr.latitude)
            if addr.longitude is not None:
                longitude = str(addr.longitude)
        return {
            "id": str(b.id),
            "branch_name": b.branch_name,
            "branch_code": b.branch_code,
            "address_line_1": address_line_1,
            "address_line_2": address_line_2,
            "landmark": landmark,
            "city": city,
            "state": state,
            "country": country,
            "pincode": pincode,
            "latitude": latitude,
            "longitude": longitude,
            "opening_time": self._fmt_time(b.opening_time),
            "closing_time": self._fmt_time(b.closing_time),
            "home_collection_radius_km": b.home_collection_radius_km,
            "home_collection_available": b.home_collection_available,
            "walk_in_collection_available": b.walk_in_collection_available,
            "accepts_online_orders": b.accepts_online_orders,
            "emergency_collection_available": b.emergency_collection_available,
            "report_delivery_hours": b.report_delivery_hours,
            "is_active_for_orders": b.is_active_for_orders,
            "is_primary_branch": b.is_primary_branch,
            "is_active": b.is_active,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "updated_at": b.updated_at.isoformat() if b.updated_at else None,
        }
