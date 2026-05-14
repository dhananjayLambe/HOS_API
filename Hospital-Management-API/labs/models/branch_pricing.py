"""
Branch-level catalog pricing, package pricing,
and geographic serviceability models.

These models represent the fulfillment-side
commercial layer for diagnostics execution.
"""

import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel

from labs.models.lab_auth import LabBranch

# Diagnostics catalog + commission enums (labs → diagnostics dependency is intentional).
from diagnostics_engine.models.catalog import (
    DiagnosticPackage,
    DiagnosticServiceMaster,
)
from diagnostics_engine.models.choices import (
    CommissionSource,
    CommissionType,
    FulfillmentMode,
)


class BranchServiceArea(BaseModel):
    """
    Represents a postal code (pincode), city, or state that a lab branch can service.
    This model allows for managing geographic serviceability, including home collection
    availability and additional metadata for operational or business logic.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    branch = models.ForeignKey(
        LabBranch,
        on_delete=models.CASCADE,
        related_name="service_areas",
    )
    pincode = models.CharField(max_length=10)

    city = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        db_index=True,
    )
    state = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        db_index=True,
    )
    is_home_collection_available = models.BooleanField(
        default=True,
    )
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    class Meta:
        db_table = "labs_branchservicearea"
        constraints = [
            models.UniqueConstraint(
                fields=["branch", "pincode"],
                name="labs_unique_branch_pincode",
            )
        ]
        indexes = [
            models.Index(fields=["branch"]),
            models.Index(fields=["pincode"]),
            models.Index(fields=["city"]),
            models.Index(fields=["state"]),
        ]
        ordering = ["pincode"]

    def __str__(self):
        return f"{self.branch_id} — {self.pincode}"


class BranchServicePricing(BaseModel):
    """
    Stores the pricing and commission structure for a specific diagnostic service at a lab branch.
    Includes validity windows, margin/commission breakdowns, and operational metadata.
    Designed for robust pricing history and compliance with business rules.

    ``service`` must be the same ``DiagnosticServiceMaster`` row referenced on order test lines
    (UUID equality). Routing never matches by human-readable name; mismatched FKs look correct in
    admin when labels coincide but yield ``missing_test_pricing`` at runtime.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    branch = models.ForeignKey(
        LabBranch,
        on_delete=models.CASCADE,
        related_name="service_pricing",
    )
    service = models.ForeignKey(
        DiagnosticServiceMaster,
        on_delete=models.CASCADE,
        related_name="branch_pricing",
    )

    selling_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text=_("Net price offered to the customer for this service."),
    )
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    platform_margin_snapshot = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    doctor_margin_snapshot = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    lab_payout_snapshot = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    platform_margin_type = models.CharField(
        max_length=10,
        choices=CommissionType.choices,
        default=CommissionType.FLAT,
    )
    platform_margin_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text=_("Margin retained by platform per service (flat or percent)."),
    )

    doctor_commission_type = models.CharField(
        max_length=10,
        choices=CommissionType.choices,
        default=CommissionType.FLAT,
    )
    doctor_commission_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text=_("Commission paid to doctor (flat or percent)."),
    )

    valid_from = models.DateField(default=timezone.now)
    valid_to = models.DateField(blank=True, null=True)

    is_active = models.BooleanField(default=True)
    is_available = models.BooleanField(
        default=True,
        help_text=_("Temporarily hide SKU without deleting pricing history."),
    )

    currency = models.CharField(
        max_length=10,
        default="INR",
    )
    home_collection_supported = models.BooleanField(
        default=False,
    )
    report_delivery_hours = models.PositiveIntegerField(
        default=24,
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    class Meta:
        db_table = "labs_branchservicepricing"
        constraints = [
            models.UniqueConstraint(
                fields=["branch", "service"],
                condition=models.Q(is_active=True),
                name="labs_unique_active_branch_service",
            )
        ]
        indexes = [
            models.Index(fields=["branch"]),
            models.Index(fields=["service"]),
            models.Index(fields=["is_active", "is_available"]),
            models.Index(fields=["valid_from", "valid_to"]),
        ]
        ordering = ["service__name"]

    def clean(self):
        if self.selling_price <= 0:
            raise ValidationError("Selling price must be positive.")
        if self.valid_to and self.valid_to < self.valid_from:
            raise ValidationError("valid_to cannot be before valid_from.")

    def __str__(self):
        return f"{self.branch} - {self.service}"


class BranchPackagePricing(BaseModel):
    """
    Defines the sell-side price and commission structure for a specific diagnostic package version
    at a branch. Tracks MRP, pricing, commission splits, fulfillment mode, and operational metadata.
    Enables versioned, branch-specific pricing and robust auditability.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    branch = models.ForeignKey(
        LabBranch,
        on_delete=models.CASCADE,
        related_name="package_pricing",
    )
    package = models.ForeignKey(
        DiagnosticPackage,
        on_delete=models.CASCADE,
        related_name="branch_pricing",
    )

    mrp = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text=_("Maximum Retail Price for the package."),
    )
    selling_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text=_("Net price offered to the customer for this package."),
    )

    platform_margin_type = models.CharField(
        max_length=10,
        choices=CommissionType.choices,
        default=CommissionType.FLAT,
    )
    platform_margin_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text=_("Margin retained by platform per package (flat or percent)."),
    )

    doctor_commission_type = models.CharField(
        max_length=10,
        choices=CommissionType.choices,
        default=CommissionType.FLAT,
    )
    doctor_commission_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text=_("Commission paid to doctor (flat or percent)."),
    )

    lab_payout_snapshot = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    commission_source = models.CharField(
        max_length=20,
        choices=CommissionSource.choices,
        default=CommissionSource.DEFAULT,
    )

    settlement_cycle = models.CharField(max_length=50, blank=True, null=True)

    fulfillment_mode = models.CharField(
        max_length=20,
        choices=FulfillmentMode.choices,
        default=FulfillmentMode.STRICT,
    )

    valid_from = models.DateField(default=timezone.now)
    valid_to = models.DateField(blank=True, null=True)

    is_active = models.BooleanField(default=True)
    is_available = models.BooleanField(default=True)

    created_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_branch_package_pricing_created",
    )
    updated_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_branch_package_pricing_updated",
    )

    currency = models.CharField(
        max_length=10,
        default="INR",
    )
    home_collection_supported = models.BooleanField(
        default=False,
    )
    report_delivery_hours = models.PositiveIntegerField(
        default=24,
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    class Meta:
        db_table = "labs_branchpackagepricing"
        constraints = [
            models.UniqueConstraint(
                fields=["branch", "package"],
                condition=models.Q(is_active=True),
                name="labs_unique_active_branch_package_pricing",
            ),
        ]
        indexes = [
            models.Index(fields=["branch"]),
            models.Index(fields=["package"]),
            models.Index(fields=["is_active", "is_available"]),
            models.Index(fields=["valid_from", "valid_to"]),
        ]
        ordering = ["package__name"]

    def clean(self):
        if self.selling_price <= 0:
            raise ValidationError("Selling price must be positive.")
        if self.mrp <= 0:
            raise ValidationError("MRP must be positive.")
        if self.valid_to and self.valid_to < self.valid_from:
            raise ValidationError("valid_to cannot be before valid_from.")

    def __str__(self):
        return f"{self.branch} — {self.package}"


__all__ = [
    "BranchPackagePricing",
    "BranchServiceArea",
    "BranchServicePricing",
]
