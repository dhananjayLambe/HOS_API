from django.db import models
from django.core.exceptions import ValidationError
import uuid
from account.models import User
from consultations_core.domain.locks import EncounterLockValidator
from django.db import transaction
from django.contrib.postgres.indexes import GinIndex



# 1. CustomFinding → temp (consultation scoped)
# 2. FindingMaster → global (admin curated)
# 3. ConsultationFinding → structured entry
class CustomFinding(models.Model):
    """
    Temporary custom finding created during consultation.
    Phase-1: Scoped to consultation.
    Later can be promoted to FindingMaster via admin.
    """

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, db_index=True)
    consultation = models.ForeignKey(
        "consultations_core.Consultation",
        on_delete=models.CASCADE,
        related_name="custom_findings"
    )
    created_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending Review"),
            ("reviewed", "Reviewed")
        ],
        default="pending"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["name"]),
        ]
        ordering = ["name"]

    def __str__(self):
        return self.name


class FindingMaster(models.Model):
    """
    Immutable master dictionary of clinical findings.

    Seeded from metadata JSON.
    Should NEVER be edited manually in production.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(
        max_length=100,
        unique=True,
        db_index=True
    )
    label = models.CharField(
        max_length=255
    )
    category = models.CharField(
        max_length=100,
        db_index=True
    )
    severity_supported = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="finding_masters_created")
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="finding_masters_updated")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Finding Master"
        verbose_name_plural = "Finding Master"
        ordering = ["category", "label"]

        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["is_active"]),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["code"],
                name="unique_finding_master_code"
            )
        ]

        db_table = "finding_master"

    def __str__(self):
        return f"{self.code} | {self.label}"

    def save(self, *args, **kwargs):
        # Enforce immutability after creation (except system fields)
        if self.pk:
            old = type(self).objects.filter(pk=self.pk).first()
            if old and (
                old.code != self.code or
                old.label != self.label or
                old.category != self.category or
                old.severity_supported != self.severity_supported or
                old.is_active != self.is_active
            ):
                raise ValidationError(
                    "FindingMaster entries are immutable and cannot be modified."
                )
        super().save(*args, **kwargs)

class ConsultationFinding(models.Model):
    """
    Structured clinical finding captured during consultation.
    Supports:
    - Master findings
    - Custom findings (consultation scoped)
    - Snapshot storage (display_name)
    - AI-ready JSON extension

    Production rules:
    - One finding per consultation per code
    - Cannot modify after consultation finalized
    - Cannot reassign consultation
    - Supports controlled JSON extension
    """

    SEVERITY_CHOICES = [
        ("mild", "Mild"),
        ("moderate", "Moderate"),
        ("severe", "Severe"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    consultation = models.ForeignKey(
        "consultations_core.Consultation",
        on_delete=models.CASCADE,
        related_name="findings",
        db_index=True
    )

    finding = models.ForeignKey(
        FindingMaster,
        on_delete=models.PROTECT,
        related_name="consultation_findings",
        db_index=True,
        null=True,
        blank=True,
    )
    custom_finding = models.ForeignKey(
        CustomFinding,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="consultation_entries"
    )
    # Snapshot (MEDICO-LEGAL SAFE) Fields (never rely only on FK)
    display_name = models.CharField(max_length=255, default="Unknown")
    is_custom = models.BooleanField(default=False, db_index=True)
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        blank=True,
        null=True,
        db_index=True
    )

    note = models.TextField(
        blank=True,
        null=True
    )
    # AI Ready JSON
    extension_data = models.JSONField(
        blank=True,
        null=True,
        help_text="Controlled JSON extension for dynamic UI fields"
    )
    # Audit
    is_active = models.BooleanField(
        default=True,
        db_index=True
    )
    updated_by = models.ForeignKey(User, 
        on_delete=models.SET_NULL, null=True, blank=True, 
        related_name="findings_updated")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="findings_created"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        verbose_name = "Consultation Finding"
        verbose_name_plural = "Consultation Findings"

        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["consultation", "finding"],
                name="unique_finding_per_consultation"
            ),
        ]

        indexes = [
            models.Index(fields=["consultation"]),
            models.Index(fields=["finding"]),
            models.Index(fields=["severity"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["finding", "severity"]),
            GinIndex(fields=["extension_data"]),
        ]

        db_table = "consultation_finding"

    def __str__(self):
        pnr = getattr(self.consultation.encounter, "visit_pnr", "") or ""
        if self.finding_id:
            return f"{pnr} | {self.finding.code}"
        if self.custom_finding_id:
            return f"{pnr} | {self.custom_finding.name}"
        return f"{pnr} | finding"

    # =====================================================
    # VALIDATION
    # =====================================================

    def clean(self):

        has_master = self.finding is not None
        has_custom = self.custom_finding is not None

        # Exactly one source required
        if has_master == has_custom:
            raise ValidationError(
                "Provide exactly one source: finding or custom_finding."
            )

        # Master validation
        if has_master and not self.finding.is_active:
            raise ValidationError("This finding is inactive.")

        # Custom validation
        if has_custom:
            if self.custom_finding.consultation_id != self.consultation_id:
                raise ValidationError(
                    "Custom finding must belong to same consultation."
                )
            self.is_custom = True

        # Severity validation
        if has_master and self.severity and not self.finding.severity_supported:
            raise ValidationError(
                f"{self.finding.label} does not support severity."
            )

        # JSON validation
        if self.extension_data is not None and not isinstance(self.extension_data, dict):
            raise ValidationError("extension_data must be a valid JSON object.")

        # Encounter lock validation
        EncounterLockValidator.validate(self.consultation)

    # =====================================================
    # SAVE
    # =====================================================

    def save(self, *args, **kwargs):
        with transaction.atomic():

            # Snapshot assignment
            if self.finding:
                self.display_name = self.finding.label
                self.is_custom = False
            elif self.custom_finding:
                self.display_name = self.custom_finding.name
                self.is_custom = True

            # Prevent reassignment
            if not self._state.adding:
                old = type(self).objects.only("consultation_id").get(pk=self.pk)
                if old.consultation_id != self.consultation_id:
                    raise ValidationError(
                        "Cannot reassign finding to another consultation."
                    )

            self.full_clean()
            super().save(*args, **kwargs)

    # =====================================================
    # SOFT DELETE
    # =====================================================

    def deactivate(self):
        EncounterLockValidator.validate(self.consultation)
        self.is_active = False
        self.save(update_fields=["is_active", "updated_at"])

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "Hard delete is not allowed. Use deactivate()."
        )