import uuid
from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from consultations_core.domain.locks import EncounterLockValidator
from django.db.models import F, Max
from analytics.models import DoctorMedicineUsage, DiagnosisMedicineMap, PatientMedicineUsage

#consultation_core/models/prescription.py
#Encounter → Consultation → Prescription → PrescriptionLine
"""
=====================================================
💊 PRESCRIPTION MODULE — ARCHITECTURE SUMMARY
=====================================================

This module handles doctor prescriptions within a clinical encounter.

🔗 DATA FLOW:
Encounter → Consultation → Prescription → PrescriptionLine

-----------------------------------------------------
1️⃣ Prescription (HEADER)
-----------------------------------------------------
- Represents a prescription for a consultation
- Versioned (multiple edits allowed)
- Only ONE active prescription per consultation
- Generates PNR using Encounter.visit_pnr
    Example: 250214-CL-00001-RX1

- Lifecycle:
    draft → finalized → (locked)

- Once finalized:
    ❌ Cannot be modified
    ❌ Cannot add/remove medicines

- Stores:
    - consultation reference
    - version_number
    - prescription_pnr
    - status (draft/finalized)
    - optional PDF

-----------------------------------------------------
2️⃣ PrescriptionLine (MEDICINE ENTRY)
-----------------------------------------------------
- Each row = one medicine in prescription

- Linked to:
    - Prescription
    - DrugMaster (medicines app)

- Snapshot-based (MEDICO-LEGAL SAFE):
    - drug_name_snapshot
    - generic_name_snapshot
    - strength_snapshot
    - formulation_snapshot

- Structured fields:
    - dose_value + dose_unit
    - route
    - frequency
    - duration (value + unit)
    - instructions

- Flags:
    - is_prn (SOS)
    - is_stat (immediate dose)

-----------------------------------------------------
3️⃣ KEY DESIGN PRINCIPLES
-----------------------------------------------------

✔ Snapshot Storage
    Prevents future changes in DrugMaster affecting old prescriptions

✔ Version Control
    Each update creates new version
    Old versions marked inactive

✔ Encounter Locking
    Uses EncounterLockValidator
    Blocks modification after completion

✔ Atomic Transactions
    Ensures consistency during save

✔ Finalization Safety
    No edits allowed after finalize

-----------------------------------------------------
4️⃣ SYSTEM BEHAVIOR (IMPORTANT)
-----------------------------------------------------

👉 During consultation:
    - Data stored in UI (not DB)

👉 On "End Consultation":
    - Prescription created
    - All lines inserted
    - Prescription finalized

👉 Reduces:
    - DB calls
    - Partial/inconsistent data

-----------------------------------------------------
5️⃣ FUTURE EXTENSIONS
-----------------------------------------------------

- Pharmacy integration
- Medicine ordering
- Refill tracking
- AI prescription suggestions
- ePrescription PDF generation

=====================================================
"""


class CustomMedicine(models.Model):
    """
    Temporary / doctor-created medicine

    Not part of DrugMaster
    Used to avoid blocking workflow
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=255)

    dose_type = models.CharField(
        max_length=50,
        choices=[
            ("tablet", "Tablet"),
            ("capsule", "Capsule"),
            ("syrup", "Syrup"),
            ("injection", "Injection"),
            ("cream", "Cream"),
            ("drops", "Drops"),
            ("inhaler", "Inhaler"),
            ("powder", "Powder"),
            ("other", "Other"),
        ],
        db_index=True
    )

    strength_value = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True
    )

    strength_unit = models.CharField(
        max_length=20,
        null=True,
        blank=True
    )

    notes = models.TextField(null=True, blank=True)

    # 👤 Context
    created_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="custom_medicines_created",
    )

    clinic = models.ForeignKey(
        "clinic.Clinic",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

    # 🔄 Future normalization
    is_normalized = models.BooleanField(default=False)

    normalized_drug = models.ForeignKey(
        "medicines.DrugMaster",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="custom_medicines_deleted",
    )
    class Meta:
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["clinic"]),
        ]

    def __str__(self):
        return f"{self.name} (Custom)"
# =====================================================
# ENUMS
# =====================================================

class PrescriptionStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    FINALIZED = "finalized", "Finalized"
    CANCELLED = "cancelled", "Cancelled"


# =====================================================
# 1️⃣ PRESCRIPTION HEADER
# =====================================================

class Prescription(models.Model):
    """
    Enterprise-grade Prescription

    Features:
    - Versioned
    - Snapshot safe
    - Linked to Consultation
    - PNR aligned with Encounter
    - Immutable after finalization
    """

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False)

    consultation = models.ForeignKey(
        "consultations_core.Consultation",
        on_delete=models.CASCADE,
        related_name="prescriptions"
    )

    # 🔢 Versioning
    version_number = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True, db_index=True)

    # 🔑 Business Identifier
    prescription_pnr = models.CharField(
        max_length=40,
        unique=True,
        db_index=True
    )

    # 📊 Status
    status = models.CharField(
        max_length=20,
        choices=PrescriptionStatus.choices,
        default=PrescriptionStatus.DRAFT,
        db_index=True
    )

    finalized_at = models.DateTimeField(null=True, blank=True)

    # 📄 Optional PDF
    pdf_file = models.FileField(
        upload_to="prescriptions/",
        null=True,
        blank=True
    )

    # 👤 Audit
    created_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescriptions_created"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["consultation"],
                condition=models.Q(is_active=True),
                name="unique_active_prescription_per_consultation"
            ),
            models.UniqueConstraint(
                fields=["consultation", "version_number"],
                name="unique_rx_version_per_consultation"
            )
        ]

        indexes = [
            models.Index(fields=["consultation"]),
            models.Index(fields=["status"]),
        ]
    # =====================================================
    # VALIDATION
    # =====================================================

    def clean(self):
        EncounterLockValidator.validate(self.consultation)

        if self.status == PrescriptionStatus.FINALIZED and not self.finalized_at:
            raise ValidationError("Finalized prescription must have timestamp.")

    # =====================================================
    # SAVE LOGIC
    # =====================================================

    def save(self, *args, **kwargs):

        with transaction.atomic():

            is_new = self._state.adding

            if is_new:
                self._assign_version()
                self._generate_pnr()

            else:
                old = type(self).objects.only(
                    "consultation_id",
                    "status"
                ).get(pk=self.pk)

                # 🚫 Prevent reassignment
                if old.consultation_id != self.consultation_id:
                    raise ValidationError("Cannot reassign prescription.")

                # 🚫 Prevent modification after finalization
                if old.status == PrescriptionStatus.FINALIZED:
                    raise ValidationError("Cannot modify finalized prescription.")

            self.full_clean()
            super().save(*args, **kwargs)
    # =====================================================
    # VERSIONING
    # =====================================================

    def _assign_version(self):

        last_version = (
            Prescription.objects
            .select_for_update()  # 🔒 LOCK
            .filter(consultation=self.consultation)
            .aggregate(max_v=Max("version_number"))
        )["max_v"] or 0

        self.version_number = last_version + 1

        Prescription.objects.filter(
            consultation=self.consultation,
            is_active=True
        ).update(is_active=False)
    # =====================================================
    # PNR GENERATION
    # =====================================================

    def _generate_pnr(self):
        """
        Generate human-readable prescription PNR.

        Format:
        {visit_pnr}-RX{version}

        Example:
        250403-KLH-000123-RX1
        """

        encounter = self.consultation.encounter

        if not encounter.visit_pnr:
            raise ValidationError("Encounter PNR missing.")

        self.prescription_pnr = f"{encounter.visit_pnr}-RX{self.version_number}"
    # =====================================================
    # FINALIZATION
    # =====================================================

    def finalize(self):

        if self.status == PrescriptionStatus.FINALIZED:
            return

        if not self.lines.exists():
            raise ValidationError("Cannot finalize empty prescription.")

        self.status = PrescriptionStatus.FINALIZED
        self.finalized_at = timezone.now()
        now = self.finalized_at
        patient_id = self.consultation.encounter.patient_profile_id

        # TODO: AI suggestions / allergy filtering can consume these aggregates
        for line in self.lines.all():
            if not line.drug_id:
                continue

            if self.created_by_id:
                n = DoctorMedicineUsage.objects.filter(
                    doctor=self.created_by,
                    drug_id=line.drug_id,
                ).update(usage_count=F("usage_count") + 1, last_used_at=now)
                if n == 0:
                    DoctorMedicineUsage.objects.create(
                        doctor=self.created_by,
                        drug=line.drug,
                        usage_count=1,
                        last_used_at=now,
                    )

            n_p = PatientMedicineUsage.objects.filter(
                patient_id=patient_id,
                drug_id=line.drug_id,
            ).update(usage_count=F("usage_count") + 1, last_used_at=now)
            if n_p == 0:
                PatientMedicineUsage.objects.create(
                    patient_id=patient_id,
                    drug=line.drug,
                    usage_count=1,
                    last_used_at=now,
                )

        self.save(update_fields=["status", "finalized_at"])

    def __str__(self):
        return f"{self.prescription_pnr} (v{self.version_number})"

class PrescriptionLine(models.Model):
    """
    Structured medicine line

    Fully snapshot-based
    Immutable after finalize
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    prescription = models.ForeignKey(
        "consultations_core.Prescription",
        on_delete=models.CASCADE,
        related_name="lines"
    )

    drug = models.ForeignKey(
        "medicines.DrugMaster",
        on_delete=models.PROTECT,
        null=True,
        blank=True
    )

    custom_medicine = models.ForeignKey(
        "consultations_core.CustomMedicine",
        on_delete=models.PROTECT,
        null=True,
        blank=True
    )

    # 🧾 Snapshot fields (CRITICAL)
    drug_name_snapshot = models.CharField(max_length=255)
    generic_name_snapshot = models.CharField(max_length=255, null=True, blank=True)
    strength_snapshot = models.CharField(max_length=100, null=True, blank=True)
    formulation_snapshot = models.CharField(max_length=100)

    # 💊 Dosage
    dose_value = models.DecimalField(max_digits=6, decimal_places=2)
    dose_unit = models.ForeignKey(
        "medicines.DoseUnitMaster",
        on_delete=models.PROTECT
    )

    route = models.ForeignKey(
        "medicines.RouteMaster",
        on_delete=models.PROTECT
    )

    frequency = models.ForeignKey(
        "medicines.FrequencyMaster",
        on_delete=models.PROTECT
    )

    duration_value = models.PositiveIntegerField(null=True, blank=True)

    duration_unit = models.CharField(
        max_length=20,
        choices=[
            ("days", "Days"),
            ("weeks", "Weeks"),
            ("months", "Months"),
        ],
        null=True,
        blank=True
    )

    instructions = models.TextField(null=True, blank=True)

    # Flags
    is_prn = models.BooleanField(default=False)
    is_stat = models.BooleanField(default=False)
    is_custom = models.BooleanField(default=False)
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        indexes = [
            models.Index(fields=["prescription"]),
        ]

    # =====================================================
    # SAVE
    # =====================================================

    def save(self, *args, **kwargs):

        with transaction.atomic():

            if self._state.adding:
                self._create_snapshot()
            elif not self._state.adding:
                old = type(self).objects.only("prescription_id").get(pk=self.pk)

                if old.prescription_id != self.prescription_id:
                    raise ValidationError("Cannot reassign prescription line.")

            self.full_clean()
            super().save(*args, **kwargs)

    # =====================================================
    # SNAPSHOT
    # =====================================================
    def _create_snapshot(self):

        if self.drug:
            self.is_custom = False  # ✅ IMPORTANT

            drug = self.drug
            self.drug_name_snapshot = drug.brand_name
            self.generic_name_snapshot = drug.generic_name
            self.strength_snapshot = drug.strength
            self.formulation_snapshot = drug.formulation.name

        elif self.custom_medicine:
            self.is_custom = True  # ✅ IMPORTANT

            cm = self.custom_medicine

            self.drug_name_snapshot = cm.name
            self.generic_name_snapshot = None

            if cm.strength_value and cm.strength_unit:
                self.strength_snapshot = f"{cm.strength_value} {cm.strength_unit}"
            else:
                self.strength_snapshot = None

            self.formulation_snapshot = cm.dose_type
    def __str__(self):
        return f"{self.drug_name_snapshot} | {self.prescription.prescription_pnr}"
    def clean(self):
        super().clean()
        EncounterLockValidator.validate(self.prescription.consultation)

        if self.dose_value <= 0:
            raise ValidationError("Dose must be positive.")

        if self.prescription.status == PrescriptionStatus.FINALIZED:
            raise ValidationError("Cannot modify finalized prescription.")

        if not self.drug and not self.custom_medicine:
            raise ValidationError("Either drug or custom medicine required.")

        if self.drug and self.custom_medicine:
            raise ValidationError("Only one of drug or custom medicine allowed.")
class PrescriptionInstruction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription = models.OneToOneField(
        Prescription,
        on_delete=models.CASCADE,
        related_name="instructions"
    )

    advice = models.TextField(null=True, blank=True)
    diet = models.TextField(null=True, blank=True)
    precautions = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
