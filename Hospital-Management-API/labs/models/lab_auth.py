# labs/models/lab_models.py

from django.db import models
from django.utils.translation import gettext_lazy as _

from account.models import User
from core.models import BaseModel
from labs.utils.upload_paths import lab_document_upload_path, lab_logo_upload_path

# =========================================================
# CHOICES
# =========================================================

class RegistrationStatus(models.TextChoices):
    PENDING = "PENDING", _("Pending")
    UNDER_REVIEW = "UNDER_REVIEW", _("Under Review")
    APPROVED = "APPROVED", _("Approved")
    REJECTED = "REJECTED", _("Rejected")
    SUSPENDED = "SUSPENDED", _("Suspended")
    BLOCKED = "BLOCKED", _("Blocked")
    INACTIVE = "INACTIVE", _("Inactive")


class LabType(models.TextChoices):
    DIAGNOSTIC_CENTER = "DIAGNOSTIC_CENTER", _("Diagnostic Center")
    PATHOLOGY_LAB = "PATHOLOGY_LAB", _("Pathology Lab")
    RADIOLOGY_CENTER = "RADIOLOGY_CENTER", _("Radiology Center")
    CLINIC_LAB = "CLINIC_LAB", _("Clinic Lab")
    HOSPITAL_LAB = "HOSPITAL_LAB", _("Hospital Lab")
    MULTISPECIALITY_DIAGNOSTICS = (
        "MULTISPECIALITY_DIAGNOSTICS",
        _("Multispeciality Diagnostics"),
    )

class ServiceCategory(models.TextChoices):
    PATHOLOGY = "PATHOLOGY", _("Pathology")
    RADIOLOGY = "RADIOLOGY", _("Radiology")
    CARDIOLOGY = "CARDIOLOGY", _("Cardiology")
    MICROBIOLOGY = "MICROBIOLOGY", _("Microbiology")
    MOLECULAR = "MOLECULAR", _("Molecular Diagnostics")
    GENETICS = "GENETICS", _("Genetics")
    HEALTH_PACKAGE = "HEALTH_PACKAGE", _("Health Package")
    HOME_COLLECTION = "HOME_COLLECTION", _("Home Collection")

class DocumentType(models.TextChoices):
    LAB_LICENSE = "LAB_LICENSE", _("Lab License")
    PAN_CARD = "PAN_CARD", _("PAN Card")
    GST_CERTIFICATE = "GST_CERTIFICATE", _("GST Certificate")
    ADDRESS_PROOF = "ADDRESS_PROOF", _("Address Proof")
    OWNER_ID_PROOF = "OWNER_ID_PROOF", _("Owner ID Proof")
    NABL_CERTIFICATE = "NABL_CERTIFICATE", _("NABL Certificate")
    FIRE_NOC = "FIRE_NOC", _("Fire NOC")
    AGREEMENT = "AGREEMENT", _("Agreement")
    OTHER = "OTHER", _("Other")

class WeekDay(models.TextChoices):
    MONDAY = "MONDAY", _("Monday")
    TUESDAY = "TUESDAY", _("Tuesday")
    WEDNESDAY = "WEDNESDAY", _("Wednesday")
    THURSDAY = "THURSDAY", _("Thursday")
    FRIDAY = "FRIDAY", _("Friday")
    SATURDAY = "SATURDAY", _("Saturday")
    SUNDAY = "SUNDAY", _("Sunday")

class LabUserRole(models.TextChoices):
    ADMIN = "ADMIN", _("Admin")
    MANAGER = "MANAGER", _("Manager")
    RECEPTIONIST = "RECEPTIONIST", _("Receptionist")
    TECHNICIAN = "TECHNICIAN", _("Technician")
    PATHOLOGIST = "PATHOLOGIST", _("Pathologist")
    RADIOLOGIST = "RADIOLOGIST", _("Radiologist")
    PHLEBOTOMIST = "PHLEBOTOMIST", _("Phlebotomist")
    ACCOUNTANT = "ACCOUNTANT", _("Accountant")


# =========================================================
# LAB ORGANIZATION
# =========================================================

class LabOrganization(BaseModel):
    """
    Main legal/business entity.
    Future ready for multi-branch support.
    """

    organization_name = models.CharField(
        max_length=255,
        db_index=True,
    )

    display_name = models.CharField(
        max_length=255,
    )

    organization_code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
    )

    slug = models.SlugField(
        max_length=255,
        unique=True,
        db_index=True,
    )

    lab_type = models.CharField(
        max_length=50,
        choices=LabType.choices,
        db_index=True,
    )

    # =====================================================
    # LEGAL DETAILS
    # =====================================================

    registration_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    license_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    pan_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        db_index=True,
    )

    gst_number = models.CharField(
        max_length=30,
        blank=True,
        null=True,
        db_index=True,
    )

    # =====================================================
    # OWNER DETAILS
    # =====================================================

    owner_name = models.CharField(
        max_length=255,
    )

    owner_designation = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    # =====================================================
    # CONTACT DETAILS
    # =====================================================

    primary_contact_number = models.CharField(
        max_length=15,
    )

    alternate_contact_number = models.CharField(
        max_length=15,
        blank=True,
        null=True,
    )

    support_email = models.EmailField(
        blank=True,
        null=True,
    )

    website = models.URLField(
        blank=True,
        null=True,
    )

    # =====================================================
    # BRANDING
    # =====================================================

    logo = models.ImageField(
        upload_to=lab_logo_upload_path,
        blank=True,
        null=True,
    )

    # =====================================================
    # OPERATIONS
    # =====================================================

    home_collection_available = models.BooleanField(default=False)

    walk_in_collection_available = models.BooleanField(default=True)

    accepts_online_orders = models.BooleanField(default=True)

    # =====================================================
    # APPROVAL
    # =====================================================

    registration_status = models.CharField(
        max_length=30,
        choices=RegistrationStatus.choices,
        default=RegistrationStatus.PENDING,
        db_index=True,
    )

    is_verified = models.BooleanField(default=False)

    onboarding_completed = models.BooleanField(default=False)

    is_active_for_orders = models.BooleanField(default=False)

    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_lab_organizations",
    )

    approved_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    rejection_reason = models.TextField(
        blank=True,
        null=True,
    )

    # =====================================================
    # EXTRA
    # =====================================================

    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    class Meta:
        db_table = "lab_organizations"
        ordering = ["organization_name"]
        indexes = [
            models.Index(fields=["organization_name"]),
            models.Index(fields=["registration_status"]),
            models.Index(fields=["organization_code"]),
        ]

    def __str__(self):
        return self.organization_name


# =========================================================
# LAB BRANCH
# =========================================================

class LabBranch(BaseModel):
    """
    Operational branch of organization.

    For branch-level FileField/ImageField uploads, use ``labs.utils.upload_paths.lab_branch_file_upload_path``.
    """

    organization = models.ForeignKey(
        LabOrganization,
        on_delete=models.CASCADE,
        related_name="branches",
    )

    branch_name = models.CharField(
        max_length=255,
    )

    branch_code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
    )

    opening_time = models.TimeField(
        null=True,
        blank=True,
    )

    closing_time = models.TimeField(
        null=True,
        blank=True,
    )

    home_collection_available = models.BooleanField(default=False)

    walk_in_collection_available = models.BooleanField(default=True)

    emergency_collection_available = models.BooleanField(default=False)

    accepts_online_orders = models.BooleanField(default=True)

    report_delivery_hours = models.PositiveIntegerField(
        default=24,
    )

    home_collection_radius_km = models.PositiveIntegerField(
        default=10,
    )

    is_active_for_orders = models.BooleanField(default=True)

    is_primary_branch = models.BooleanField(default=False)

    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    class Meta:
        db_table = "lab_branches"
        ordering = ["branch_name"]
        indexes = [
            models.Index(fields=["branch_code"]),
            models.Index(fields=["is_primary_branch"]),
            models.Index(fields=["is_active_for_orders"]),
        ]

    def __str__(self):
        return (
            f"{self.organization.organization_name} - "
            f"{self.branch_name}"
        )


# =========================================================
# LAB ADDRESS
# =========================================================

class LabAddress(BaseModel):
    """
    Branch level address.
    """

    branch = models.OneToOneField(
        LabBranch,
        on_delete=models.CASCADE,
        related_name="address",
    )

    address_line_1 = models.CharField(max_length=255)

    address_line_2 = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    landmark = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    city = models.CharField(
        max_length=100,
        db_index=True,
    )

    state = models.CharField(
        max_length=100,
        db_index=True,
    )

    country = models.CharField(
        max_length=100,
        default="India",
    )

    pincode = models.CharField(
        max_length=10,
        db_index=True,
    )

    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
    )

    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "lab_addresses"
        indexes = [
            models.Index(fields=["city"]),
            models.Index(fields=["state"]),
            models.Index(fields=["pincode"]),
        ]

    def __str__(self):
        return f"{self.city} - {self.state}"


# =========================================================
# LAB SCHEDULE
# =========================================================

class LabSchedule(BaseModel):
    """
    Weekly operational schedule.
    """

    branch = models.ForeignKey(
        LabBranch,
        on_delete=models.CASCADE,
        related_name="schedules",
    )

    day_of_week = models.CharField(
        max_length=10,
        choices=WeekDay.choices,
        db_index=True,
    )

    is_closed = models.BooleanField(default=False)

    open_time = models.TimeField(
        null=True,
        blank=True,
    )

    close_time = models.TimeField(
        null=True,
        blank=True,
    )

    home_collection_available = models.BooleanField(default=False)

    emergency_collection_available = models.BooleanField(default=False)

    class Meta:
        db_table = "lab_schedules"
        ordering = ["branch", "day_of_week"]

        constraints = [
            models.UniqueConstraint(
                fields=["branch", "day_of_week"],
                name="unique_branch_schedule",
            )
        ]

        indexes = [
            models.Index(fields=["branch", "day_of_week"]),
        ]

    def __str__(self):
        return (
            f"{self.branch.branch_name} - "
            f"{self.day_of_week}"
        )


# =========================================================
# LAB USERS
# =========================================================

class LabUser(BaseModel):
    """
    Operational user mapping.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="lab_users",
    )

    organization = models.ForeignKey(
        LabOrganization,
        on_delete=models.CASCADE,
        related_name="lab_users",
    )

    branch = models.ForeignKey(
        LabBranch,
        on_delete=models.CASCADE,
        related_name="lab_users",
    )

    role = models.CharField(
        max_length=30,
        choices=LabUserRole.choices,
        db_index=True,
    )

    employee_code = models.CharField(
        max_length=50,
        blank=True,
        null=True,
    )

    is_primary_admin = models.BooleanField(default=False)

    class Meta:
        db_table = "lab_users"

        constraints = [
            models.UniqueConstraint(
                fields=["user", "branch"],
                name="unique_user_branch",
            )
        ]

        indexes = [
            models.Index(fields=["role"]),
            models.Index(fields=["is_primary_admin"]),
        ]

    def __str__(self):
        return (
            f"{self.user} - "
            f"{self.branch.branch_name}"
        )


# =========================================================
# LAB DOCUMENTS
# =========================================================

class LabDocument(BaseModel):
    """
    Dynamic document management.
    """

    organization = models.ForeignKey(
        LabOrganization,
        on_delete=models.CASCADE,
        related_name="documents",
    )

    document_type = models.CharField(
        max_length=50,
        choices=DocumentType.choices,
        db_index=True,
    )

    document_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    file = models.FileField(
        upload_to=lab_document_upload_path,
    )

    expiry_date = models.DateField(
        blank=True,
        null=True,
    )

    is_verified = models.BooleanField(default=False)

    verification_notes = models.TextField(
        blank=True,
        null=True,
    )

    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_lab_documents",
    )

    verified_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "lab_documents"

        indexes = [
            models.Index(fields=["document_type"]),
            models.Index(fields=["is_verified"]),
            models.Index(fields=["expiry_date"]),
        ]

    def __str__(self):
        return (
            f"{self.organization.organization_name} - "
            f"{self.document_type}"
        )
