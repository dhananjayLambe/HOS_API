"""
Consultation Investigations Models (Production Ready)

Supports:
- Catalog investigations
- Custom investigations (separate model)
- Diagnostic engine integration
- Clean UI mapping
"""

import uuid
from django.db import models, transaction
from django.core.exceptions import ValidationError
from consultations_core.domain.locks import EncounterLockValidator


# =====================================================
# Choices
# =====================================================

class InvestigationSource(models.TextChoices):
    CATALOG = "catalog", "Catalog"
    CUSTOM = "custom", "Custom"


class InvestigationType(models.TextChoices):
    LAB = "lab", "Lab Test"
    RADIOLOGY = "radiology", "Radiology"
    SCAN = "scan", "Scan"
    PACKAGE = "package", "Package"
    OTHER = "other", "Other"


class InvestigationUrgency(models.TextChoices):
    ROUTINE = "routine", "Routine"
    URGENT = "urgent", "Urgent"
    STAT = "stat", "STAT"


class InvestigationStatus(models.TextChoices):
    SUGGESTED = "suggested", "Suggested"
    ORDERED = "ordered", "Ordered"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class InvestigationItemQuerySet(models.QuerySet):
    def ui_ready(self):
        return self.select_related("catalog_item", "diagnostic_order_item", "custom_investigation")

    def active_for_container(self, investigations):
        return self.filter(investigations=investigations, is_deleted=False).order_by("position", "-created_at")


# =====================================================
# Parent Model
# =====================================================

class ConsultationInvestigations(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    consultation = models.OneToOneField(
        "consultations_core.Consultation",
        on_delete=models.CASCADE,
        related_name="investigations",
    )

    notes = models.TextField(blank=True, null=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "consultation_investigations"

    def __str__(self):
        return f"Investigations - {self.consultation_id}"


# =====================================================
# Custom Investigation Model (🔥 NEW)
# =====================================================

class CustomInvestigation(models.Model):
    """
    Stores doctor-created investigations separately.
    Helps in:
    - Reuse suggestions
    - Analytics
    - Auto-complete
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=255)

    investigation_type = models.CharField(
        max_length=20,
        choices=InvestigationType.choices,
        default=InvestigationType.OTHER,
    )

    created_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="custom_investigations_created",
    )

    clinic = models.ForeignKey(
        "clinic.Clinic",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="custom_investigations",
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "custom_investigations"
        indexes = [
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return self.name


# =====================================================
# Core Item Model
# =====================================================

class InvestigationItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    investigations = models.ForeignKey(
        ConsultationInvestigations,
        on_delete=models.CASCADE,
        related_name="items",
    )

    # -------------------------------------------------
    # Source
    # -------------------------------------------------
    source = models.CharField(
        max_length=20,
        choices=InvestigationSource.choices,
    )

    # -------------------------------------------------
    # Catalog / Custom Linking
    # -------------------------------------------------
    catalog_item = models.ForeignKey(
        "diagnostics_engine.DiagnosticServiceMaster",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultation_investigation_items",
    )

    custom_investigation = models.ForeignKey(
        CustomInvestigation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultation_items",
    )

    # -------------------------------------------------
    # Name (denormalized for performance)
    # -------------------------------------------------
    name = models.CharField(max_length=255)

    investigation_type = models.CharField(
        max_length=20,
        choices=InvestigationType.choices,
        default=InvestigationType.LAB,
    )

    # -------------------------------------------------
    # Clinical Data
    # -------------------------------------------------
    instructions = models.TextField(blank=True, null=True)

    notes = models.TextField(blank=True, null=True)

    urgency = models.CharField(
        max_length=20,
        choices=InvestigationUrgency.choices,
        default=InvestigationUrgency.ROUTINE,
    )

    status = models.CharField(
        max_length=20,
        choices=InvestigationStatus.choices,
        default=InvestigationStatus.SUGGESTED,
    )

    # -------------------------------------------------
    # Diagnostics Link
    # -------------------------------------------------
    diagnostic_order_item = models.ForeignKey(
        "diagnostics_engine.DiagnosticOrderItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultation_investigation_items",
    )

    # -------------------------------------------------
    # Metadata
    # -------------------------------------------------
    is_deleted = models.BooleanField(default=False)
    is_custom = models.BooleanField(default=False, db_index=True)

    position = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="investigation_items_updated",
    )
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="investigation_items_deleted",
    )

    objects = InvestigationItemQuerySet.as_manager()

    # =====================================================
    # Validation
    # =====================================================
    def clean(self):
        super().clean()
        if self.investigations_id:
            EncounterLockValidator.validate(self.investigations.consultation)

        has_catalog = bool(self.catalog_item)
        has_custom = bool(self.custom_investigation or (self.source == InvestigationSource.CUSTOM and self.name))

        # Strict XOR between catalog and custom source paths.
        if has_catalog == has_custom:
            raise ValidationError("Exactly one source must be set (catalog XOR custom).")

        if self.source == InvestigationSource.CATALOG:
            if not self.catalog_item:
                raise ValidationError("Catalog item required for catalog source")
            if self.custom_investigation:
                raise ValidationError("Custom investigation is not allowed for catalog source")

        if self.source == InvestigationSource.CUSTOM:
            if not (self.custom_investigation or self.name):
                raise ValidationError("Custom investigation requires name")
            if self.catalog_item:
                raise ValidationError("Catalog item is not allowed for custom source")

        if not self.name:
            raise ValidationError("Name is required")

    # =====================================================
    # Save Logic
    # =====================================================
    def save(self, *args, **kwargs):
        with transaction.atomic():
            if self.catalog_item:
                self.name = self.catalog_item.name
                category_name = ""
                if getattr(self.catalog_item, "category_id", None) and getattr(self.catalog_item, "category", None):
                    category_name = (self.catalog_item.category.name or "").lower()
                if hasattr(self.catalog_item, "service_type") and self.catalog_item.service_type:
                    self.investigation_type = self.catalog_item.service_type
                elif "radio" in category_name:
                    self.investigation_type = InvestigationType.RADIOLOGY
                elif "scan" in category_name:
                    self.investigation_type = InvestigationType.SCAN
                elif "package" in category_name or "panel" in category_name:
                    self.investigation_type = InvestigationType.PACKAGE
                else:
                    self.investigation_type = InvestigationType.LAB
                self.is_custom = False
            elif self.custom_investigation:
                self.name = self.custom_investigation.name
                self.investigation_type = self.custom_investigation.investigation_type
                self.is_custom = True
            elif self.source == InvestigationSource.CUSTOM:
                self.is_custom = True
            else:
                self.is_custom = False

            if self.pk and not self._state.adding:
                old = type(self).objects.only("investigations_id").get(pk=self.pk)
                if old.investigations_id != self.investigations_id:
                    raise ValidationError("Investigation item cannot be reassigned.")

            self.full_clean()
            super().save(*args, **kwargs)

    class Meta:
        db_table = "consultation_investigation_items"
        ordering = ["position", "-created_at"]
        indexes = [
            models.Index(fields=["investigations"]),
            models.Index(fields=["status"]),
            models.Index(fields=["diagnostic_order_item"]),
            models.Index(fields=["investigations", "is_deleted", "position"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(source=InvestigationSource.CATALOG, catalog_item__isnull=False, custom_investigation__isnull=True)
                    | models.Q(source=InvestigationSource.CUSTOM, catalog_item__isnull=True)
                ),
                name="investigation_item_source_mapping_valid",
            ),
            models.CheckConstraint(
                check=~models.Q(source=InvestigationSource.CUSTOM, custom_investigation__isnull=True, name=""),
                name="investigation_item_custom_requires_name_or_custom",
            ),
            models.UniqueConstraint(
                fields=["investigations", "position"],
                condition=models.Q(is_deleted=False),
                name="uniq_active_investigation_position_per_consultation",
            ),
        ]

    def __str__(self):
        return self.name