"""
Business logic for lab self-registration (single transaction).
User: is_active=False, status=False until hospital admin approves (same gate as StaffSendOTPView / VerifyOTPStaffView).
Added to Django group "labadmin" (account staff APIs VALID_STAFF_ROLES).
LabOrganization.registration_status starts as PENDING.
"""

from __future__ import annotations

import base64
import binascii
import logging
import re
import uuid
from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.base import ContentFile
from django.db import IntegrityError, transaction
from django.utils.text import slugify

from labs.models import (
    DocumentType,
    LabAddress,
    LabBranch,
    LabDocument,
    LabOrganization,
    LabUser,
    LabUserRole,
    RegistrationStatus,
)

User = get_user_model()
logger = logging.getLogger(__name__)

# Must match account/api/views.py VALID_STAFF_ROLES ("labadmin")
LABADMIN_AUTH_GROUP = "labadmin"

_MAX_UPLOAD_BYTES = 12 * 1024 * 1024


def _decode_base64_upload(raw: str) -> tuple[bytes, str] | None:
    """Decode data-URL or raw base64; return (bytes, suggested_extension) or None."""
    s = (raw or "").strip()
    if not s:
        return None
    m = re.match(r"^data:([^;]+);base64,(.+)$", s, re.DOTALL | re.IGNORECASE)
    if m:
        mime = (m.group(1) or "").lower()
        b64_payload = (m.group(2) or "").strip()
        if "pdf" in mime:
            ext = ".pdf"
        elif "png" in mime:
            ext = ".png"
        elif "jpeg" in mime or "jpg" in mime:
            ext = ".jpg"
        else:
            ext = ".bin"
    else:
        b64_payload = s
        ext = ".bin"
    try:
        decoded = base64.b64decode(b64_payload, validate=False)
    except (binascii.Error, ValueError):
        return None
    if not decoded:
        return None
    if len(decoded) > _MAX_UPLOAD_BYTES:
        raise ValueError("Uploaded document exceeds the 12 MB size limit.")
    return decoded, ext


def _persist_onboarding_documents(
    *,
    organization: LabOrganization,
    compliance: dict[str, Any],
    license_number: str | None,
) -> None:
    """Create LabDocument rows when client sent base64 file payloads."""

    def one(
        document_type: str,
        b64: str | None,
        document_number: str | None,
    ) -> None:
        if not (b64 or "").strip():
            return
        tup = _decode_base64_upload(b64 or "")
        if tup is None:
            raise ValueError(
                "One of the uploaded documents could not be read. "
                "Please re-upload the lab license and NABL certificate."
            )
        content, ext = tup
        # Filename is extension-only for upload_to; lab_document_upload_path assigns UUID + path.
        LabDocument.objects.create(
            organization=organization,
            document_type=document_type,
            document_number=(document_number or "")[:100] or None,
            file=ContentFile(content, name=f"upload{ext}"),
        )

    one(
        DocumentType.LAB_LICENSE,
        compliance.get("lab_license_file_base64"),
        license_number,
    )
    one(
        DocumentType.NABL_CERTIFICATE,
        compliance.get("nabl_certificate_file_base64"),
        None,
    )

DESIGNATION_TO_ROLE = {
    "OWNER": LabUserRole.ADMIN,
    "Owner": LabUserRole.ADMIN,
    "LAB ADMIN": LabUserRole.ADMIN,
    "Lab Admin": LabUserRole.ADMIN,
    "MANAGER": LabUserRole.MANAGER,
    "Manager": LabUserRole.MANAGER,
    "PATHOLOGIST": LabUserRole.PATHOLOGIST,
    "Pathologist": LabUserRole.PATHOLOGIST,
    "RADIOLOGIST": LabUserRole.RADIOLOGIST,
    "Radiologist": LabUserRole.RADIOLOGIST,
    "RECEPTIONIST": LabUserRole.RECEPTIONIST,
    "Receptionist": LabUserRole.RECEPTIONIST,
    "OTHER": LabUserRole.ADMIN,
    "Other": LabUserRole.ADMIN,
}


def _unique_org_code() -> str:
    for _ in range(20):
        code = f"LAB{uuid.uuid4().hex[:10].upper()}"
        if not LabOrganization.objects.filter(organization_code=code).exists():
            return code
    return f"LAB{uuid.uuid4().hex.upper()}"


def _unique_slug(display_name: str) -> str:
    base = slugify(display_name or "lab")[:40] or "lab"
    return f"{base}-{uuid.uuid4().hex[:8]}"


def _unique_branch_code() -> str:
    for _ in range(20):
        code = f"BR{uuid.uuid4().hex[:10].upper()}"
        if not LabBranch.objects.filter(branch_code=code).exists():
            return code
    return f"BR{uuid.uuid4().hex.upper()}"


def _resolve_lab_user_role(designation: str) -> str:
    d = (designation or "").strip()
    return DESIGNATION_TO_ROLE.get(d, LabUserRole.ADMIN)


@transaction.atomic
def register_lab(*, validated_data: dict[str, Any]) -> dict[str, Any]:
    admin = validated_data["admin_details"]
    lab = validated_data["lab_details"]
    addr = validated_data["address_details"]
    compliance = validated_data.get("compliance_details") or {}

    mobile = admin["username"]
    first_name = admin["first_name"].strip()
    last_name = admin["last_name"].strip()
    email = (admin.get("email") or "").strip()
    designation = (admin.get("designation") or "").strip()

    org_name = lab["organization_name"].strip()
    display_name = lab["display_name"].strip()
    lab_type = lab["lab_type_resolved"]
    license_number = (lab.get("license_number") or "").strip() or None
    registration_number = (lab.get("registration_number") or "").strip() or None

    line1 = addr["address_line_1"].strip()
    line2 = (addr.get("address_line_2") or "").strip()
    landmark = (addr.get("landmark") or "").strip()
    city = addr["city"].strip()
    state = addr["state"].strip()
    pincode = addr["pincode"].strip()

    pan = (compliance.get("pan_number") or "").strip() or None
    gst = (compliance.get("gst_number") or "").strip() or None

    owner_name = f"{first_name} {last_name}".strip() or first_name
    role = _resolve_lab_user_role(designation)

    lab_extras: dict[str, Any] = {}
    ln_sub = (lab.get("lab_name") or "").strip()
    if ln_sub:
        lab_extras["lab_name_submitted"] = ln_sub[:500]
    lvt = (lab.get("license_valid_till") or "").strip()
    if lvt:
        lab_extras["license_valid_till"] = lvt[:64]
    cert = (lab.get("certifications") or "").strip()
    if cert:
        lab_extras["certifications"] = cert[:2000]
    sc = lab.get("service_categories") or []
    if isinstance(sc, list) and sc:
        lab_extras["service_categories"] = [str(x)[:120] for x in sc[:50]]
    pt = (lab.get("pricing_tier") or "").strip()
    if pt:
        lab_extras["pricing_tier"] = pt[:32]
    tth = lab.get("turnaround_time_hours")
    if tth is not None:
        lab_extras["turnaround_time_hours"] = tth

    lat = addr.get("latitude")
    lon = addr.get("longitude")

    try:
        user = User(
            username=mobile,
            email=email or "",
            first_name=first_name[:150],
            last_name=last_name[:150],
            is_active=False,
            status=False,
        )
        user.set_unusable_password()
        user.save()

        group, _ = Group.objects.get_or_create(name=LABADMIN_AUTH_GROUP)
        user.groups.add(group)

        organization = LabOrganization(
            organization_name=org_name[:255],
            display_name=display_name[:255],
            organization_code=_unique_org_code(),
            slug=_unique_slug(display_name),
            lab_type=lab_type,
            registration_number=registration_number,
            license_number=license_number,
            pan_number=pan,
            gst_number=gst,
            owner_name=owner_name[:255],
            owner_designation=designation[:255] if designation else None,
            primary_contact_number=mobile[:15],
            alternate_contact_number=None,
            support_email=email or None,
            home_collection_available=bool(lab.get("home_sample_collection")),
            walk_in_collection_available=bool(lab.get("walk_in_collection", True)),
            accepts_online_orders=True,
            registration_status=RegistrationStatus.PENDING,
            is_verified=False,
            onboarding_completed=False,
            is_active_for_orders=False,
            metadata={
                "designation": designation,
                "whatsapp_same_as_mobile": bool(admin.get("whatsapp_same_as_mobile", True)),
                "kyc_document_type": compliance.get("kyc_document_type"),
                "kyc_document_number": compliance.get("kyc_document_number"),
                "lab_license_file_name": compliance.get("lab_license_file_name"),
                "nabl_certificate_file_name": compliance.get("nabl_certificate_file_name"),
                **({"submitted_lab_extras": lab_extras} if lab_extras else {}),
            },
        )
        organization.save()

        _persist_onboarding_documents(
            organization=organization,
            compliance=compliance,
            license_number=license_number,
        )

        branch_title = f"{org_name} Main Branch"
        branch = LabBranch(
            organization=organization,
            branch_name=branch_title[:255],
            branch_code=_unique_branch_code(),
            home_collection_available=organization.home_collection_available,
            walk_in_collection_available=organization.walk_in_collection_available,
            accepts_online_orders=organization.accepts_online_orders,
            is_primary_branch=True,
            is_active_for_orders=False,
        )
        branch.save()

        LabAddress.objects.create(
            branch=branch,
            address_line_1=line1[:255],
            address_line_2=line2[:255] or None,
            landmark=landmark[:255] or None,
            city=city[:100],
            state=state[:100],
            country="India",
            pincode=pincode[:10],
            latitude=lat,
            longitude=lon,
        )

        LabUser.objects.create(
            user=user,
            organization=organization,
            branch=branch,
            role=role,
            is_primary_admin=True,
        )

    except IntegrityError as exc:
        logger.exception("Lab onboarding integrity error: %s", exc)
        raise ValueError("Could not complete registration (duplicate data). Please check your details.") from exc

    documents_uploaded = LabDocument.objects.filter(organization=organization).count()

    return {
        "organization_id": str(organization.id),
        "branch_id": str(branch.id),
        "user_id": str(user.id),
        "registration_status": RegistrationStatus.PENDING,
        "documents_uploaded": documents_uploaded,
    }
