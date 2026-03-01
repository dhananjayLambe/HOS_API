from django.db import models
from django.core.exceptions import ValidationError
import uuid
from account.models import User
from consultations_core.domain.locks import EncounterLockValidator
from django.db import transaction
from django.contrib.postgres.indexes import GinIndex





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
        db_index=True
    )

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

    extension_data = models.JSONField(
        blank=True,
        null=True,
        help_text="Controlled JSON extension for dynamic UI fields"
    )

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
        return f"{self.consultation.encounter.visit_pnr} | {self.finding.code}"

    # =====================================================
    # 🔒 VALIDATION + LOCKING LOGIC
    # =====================================================

    def clean(self):
        """
        Core validation layer.
        """

        # 🚫 Prevent inactive master use
        if not self.finding.is_active:
            raise ValidationError("This finding is inactive.")

        # 🚫 Severity validation
        if self.severity and not self.finding.severity_supported:
            raise ValidationError(
                f"{self.finding.label} does not support severity."
            )

        # 🚫 Validate extension_data type
        if self.extension_data is not None and not isinstance(self.extension_data, dict):
            raise ValidationError("extension_data must be a valid JSON object.")

        EncounterLockValidator.validate(self.consultation)

    def save(self, *args, **kwargs):
        with transaction.atomic():

            if self.pk:
                old = type(self).objects.only(
                    "consultation_id",
                    "finding_id"
                ).get(pk=self.pk)

                # 🚫 Cannot change consultation
                if old.consultation_id != self.consultation_id:
                    raise ValidationError(
                        "Cannot reassign finding to another consultation."
                    )

                # 🚫 Cannot change finding code
                if old.finding_id != self.finding_id:
                    raise ValidationError(
                        "Cannot change finding once created."
                    )

            self.full_clean()
            super().save(*args, **kwargs)

    # =====================================================
    # 🧨 SOFT DELETE (MEDICO-LEGAL SAFE)
    # =====================================================

    def deactivate(self):
        """
        Soft delete instead of hard delete.
        """
        EncounterLockValidator.validate(self.consultation)
        self.is_active = False
        self.save(update_fields=["is_active", "updated_at"])

    def delete(self, *args, **kwargs):
        raise ValidationError(
            "Hard delete is not allowed. Use deactivate() for soft delete."
        )
