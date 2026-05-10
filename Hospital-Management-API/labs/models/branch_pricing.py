"""Branch-level catalog pricing and service areas (provider network; FK to LabBranch)."""

import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from labs.models.lab_auth import LabBranch

# Diagnostics catalog + commission enums (labs → diagnostics dependency is intentional).
from diagnostics_engine.models.catalog import DiagnosticPackage, DiagnosticServiceMaster
from diagnostics_engine.models.choices import CommissionSource, CommissionType, FulfillmentMode


class BranchServiceArea(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    branch = models.ForeignKey(
        LabBranch,
        on_delete=models.CASCADE,
        related_name="service_areas",
    )

    pincode = models.CharField(max_length=10)

    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_branch_service_areas_deleted",
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
        ]

    def __str__(self):
        return f"{self.branch_id} — {self.pincode}"


class BranchServicePricing(models.Model):
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

    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    platform_margin_snapshot = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    doctor_margin_snapshot = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    lab_payout_snapshot = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    platform_margin_type = models.CharField(
        max_length=10,
        choices=CommissionType.choices,
        default=CommissionType.FLAT,
    )
    platform_margin_value = models.DecimalField(max_digits=10, decimal_places=2)

    doctor_commission_type = models.CharField(
        max_length=10,
        choices=CommissionType.choices,
        default=CommissionType.FLAT,
    )
    doctor_commission_value = models.DecimalField(max_digits=10, decimal_places=2)

    valid_from = models.DateField(default=timezone.now)
    valid_to = models.DateField(blank=True, null=True)

    is_active = models.BooleanField(default=True)
    is_available = models.BooleanField(
        default=True,
        help_text="Temporarily hide SKU without deleting pricing history.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_branch_service_pricing_deleted",
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
        ]

    def clean(self):
        if self.selling_price <= 0:
            raise ValidationError("Selling price must be positive.")

        if self.valid_to and self.valid_to < self.valid_from:
            raise ValidationError("valid_to cannot be before valid_from.")

    def __str__(self):
        return f"{self.branch} - {self.service}"


class BranchPackagePricing(models.Model):
    """Sell-side price for a specific package version at a branch (version-linked)."""

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

    mrp = models.DecimalField(max_digits=10, decimal_places=2)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)

    platform_margin_type = models.CharField(
        max_length=10,
        choices=CommissionType.choices,
        default=CommissionType.FLAT,
    )
    platform_margin_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    doctor_commission_type = models.CharField(
        max_length=10,
        choices=CommissionType.choices,
        default=CommissionType.FLAT,
    )
    doctor_commission_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)

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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
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
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_branch_package_pricing_deleted",
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
        ]

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
