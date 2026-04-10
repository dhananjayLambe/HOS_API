import uuid

from django.core.exceptions import ValidationError
from django.db import models

from .choices import CollectionType, GenderApplicability, PackageType


class DiagnosticCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=150, unique=True)
    code = models.CharField(max_length=50, unique=True)

    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subcategories",
    )

    ordering = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_categories_created",
    )
    updated_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_categories_updated",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_categories_deleted",
    )

    class Meta:
        ordering = ["ordering", "name"]
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.name


class DiagnosticServiceMaster(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    code = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)

    category = models.ForeignKey(
        DiagnosticCategory,
        on_delete=models.PROTECT,
        related_name="services",
    )

    sample_type = models.CharField(max_length=100, blank=True, null=True)
    home_collection_possible = models.BooleanField(default=False)
    appointment_required = models.BooleanField(default=False)

    tat_hours_default = models.PositiveIntegerField(default=24)

    preparation_notes = models.TextField(blank=True, null=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_services_deleted",
    )

    class Meta:
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["category"]),
            models.Index(fields=["is_active"]),
        ]
        ordering = ["name"]

    def __str__(self):
        return self.name


class DiagnosticPackage(models.Model):
    """
    Versioned sellable package definition (composition lives in DiagnosticPackageItem).
    Authoritative price is on BranchPackagePricing, not here.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    lineage_code = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Stable id across versions (e.g. HEALTH-PLUS).",
    )
    version = models.PositiveIntegerField(default=1)
    is_latest = models.BooleanField(default=True, db_index=True)

    parent_package = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="child_versions",
    )

    category = models.ForeignKey(
        DiagnosticCategory,
        on_delete=models.PROTECT,
        related_name="packages",
    )

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_promoted = models.BooleanField(default=False)
    priority_score = models.PositiveIntegerField(default=0)

    package_type = models.CharField(
        max_length=20,
        choices=PackageType.choices,
        default=PackageType.SYSTEM,
    )

    collection_type = models.CharField(
        max_length=10,
        choices=CollectionType.choices,
        default=CollectionType.LAB,
    )

    min_tat_hours = models.PositiveIntegerField(null=True, blank=True)
    max_tat_hours = models.PositiveIntegerField(null=True, blank=True)
    fasting_required = models.BooleanField(default=False)

    gender_applicability = models.CharField(
        max_length=20,
        choices=GenderApplicability.choices,
        default=GenderApplicability.ALL,
    )
    age_min = models.PositiveSmallIntegerField(null=True, blank=True)
    age_max = models.PositiveSmallIntegerField(null=True, blank=True)

    tags = models.JSONField(blank=True, null=True)
    conditions_supported = models.JSONField(blank=True, null=True)
    package_popularity_score = models.DecimalField(
        max_digits=10, decimal_places=4, default=0, blank=True
    )

    created_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_packages_created",
    )
    updated_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_packages_updated",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_packages_deleted",
    )

    class Meta:
        ordering = ["lineage_code", "-version"]
        constraints = [
            models.UniqueConstraint(
                fields=["lineage_code", "version"],
                name="uniq_diagnostic_package_lineage_version",
            ),
        ]
        indexes = [
            models.Index(fields=["lineage_code"]),
            models.Index(fields=["is_active", "is_latest"]),
        ]

    def clean(self):
        if self.age_min is not None and self.age_max is not None and self.age_min > self.age_max:
            raise ValidationError("age_min cannot exceed age_max.")

    def __str__(self):
        return f"{self.name} ({self.lineage_code} v{self.version})"


class DiagnosticPackageItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    package = models.ForeignKey(
        DiagnosticPackage,
        on_delete=models.CASCADE,
        related_name="items",
    )
    service = models.ForeignKey(
        DiagnosticServiceMaster,
        on_delete=models.PROTECT,
        related_name="package_items",
    )

    quantity = models.PositiveIntegerField(default=1)
    is_mandatory = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_package_items_created",
    )
    updated_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_package_items_updated",
    )
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_package_items_deleted",
    )

    class Meta:
        ordering = ["display_order", "service__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["package", "service"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_active_package_service",
            ),
        ]
        indexes = [
            models.Index(fields=["package"]),
            models.Index(fields=["service"]),
        ]

    def __str__(self):
        return f"{self.package_id} → {self.service_id}"


__all__ = [
    "DiagnosticCategory",
    "DiagnosticPackage",
    "DiagnosticPackageItem",
    "DiagnosticServiceMaster",
]
