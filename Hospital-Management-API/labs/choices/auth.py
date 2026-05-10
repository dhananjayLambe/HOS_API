from django.db import models
from django.utils.translation import gettext_lazy as _


class RegistrationStatus(models.TextChoices):
    PENDING = "PENDING", _("Pending")
    UNDER_REVIEW = "UNDER_REVIEW", _("Under Review")
    APPROVED = "APPROVED", _("Approved")
    REJECTED = "REJECTED", _("Rejected")
    SUSPENDED = "SUSPENDED", _("Suspended")
    BLOCKED = "BLOCKED", _("Blocked")
    INACTIVE = "INACTIVE", _("Inactive")


class LabType(models.TextChoices):
    DIAGNOSTIC_CENTER = (
        "DIAGNOSTIC_CENTER",
        _("Diagnostic Center"),
    )
    PATHOLOGY_LAB = (
        "PATHOLOGY_LAB",
        _("Pathology Lab"),
    )
    RADIOLOGY_CENTER = (
        "RADIOLOGY_CENTER",
        _("Radiology Center"),
    )
    CLINIC_LAB = (
        "CLINIC_LAB",
        _("Clinic Lab"),
    )
    HOSPITAL_LAB = (
        "HOSPITAL_LAB",
        _("Hospital Lab"),
    )
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
    HOME_COLLECTION = (
        "HOME_COLLECTION",
        _("Home Collection"),
    )


class DocumentType(models.TextChoices):
    LAB_LICENSE = "LAB_LICENSE", _("Lab License")
    PAN_CARD = "PAN_CARD", _("PAN Card")
    GST_CERTIFICATE = (
        "GST_CERTIFICATE",
        _("GST Certificate"),
    )
    ADDRESS_PROOF = (
        "ADDRESS_PROOF",
        _("Address Proof"),
    )
    OWNER_ID_PROOF = (
        "OWNER_ID_PROOF",
        _("Owner ID Proof"),
    )
    NABL_CERTIFICATE = (
        "NABL_CERTIFICATE",
        _("NABL Certificate"),
    )
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