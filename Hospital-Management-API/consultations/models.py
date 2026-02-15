import uuid
import random
from django.db import models, transaction
from django.utils import timezone
from doctor.models import doctor
from patient_account.models import PatientAccount, PatientProfile
from utils.static_data_service import StaticDataService
from account.models import User
from appointments.models import Appointment
from django.core.exceptions import ValidationError
from django.contrib.postgres.indexes import GinIndex


#250214-CL-00001-001 -> Consultation PNR <daily counter>-<CL>-<Clinic code>-<counter>
#to be added to Prescription PNR to prescription model
# prescription_pnr = models.CharField(
#     max_length=15, unique=True, db_index=True,
#     help_text="Format: YYMMDD-XXXX (daily counter)"
# )
#lifecycle of the encounter
# Encounter created → status=created
# PreConsultation locked → status=pre_consultation
# Consultation created → status=in_consultation
# Consultation finalized → status=completed
# Consultation cancelled → status=cancelled
# Consultation no show → status=no_show
# =====================================================
# 🔢 DAILY COUNTER (PNR BACKBONE)
# =====================================================

class EncounterDailyCounter(models.Model):
    """
    Maintains per-clinic per-day visit counter.
    Resets daily per clinic.
    """
    id = models.BigAutoField(primary_key=True, editable=False)
    clinic = models.ForeignKey(
        "clinic.Clinic",
        on_delete=models.CASCADE,
        related_name="daily_counters",
    )
    date = models.DateField()
    counter = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ("clinic", "date")
        verbose_name = "Encounter Daily Counter"
        verbose_name_plural = "Encounter Daily Counters"
        indexes = [
            models.Index(fields=["clinic", "date"])
        ]
    def __str__(self):
        return f"{self.clinic.code} - {self.date} → {self.counter}"

# =====================================================
# 🔑 ROOT MODEL — CLINICAL ENCOUNTER (SOURCE OF TRUTH)
# =====================================================
class ClinicalEncounter(models.Model):
    """
    One row = one OPD / clinical visit.
    Single source of truth for PNRs and visit lifecycle.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # 🔑 GLOBAL IDENTIFIERS (OPS-FRIENDLY)
    visit_pnr = models.CharField(
        max_length=30,
        unique=True,
        db_index=True,
        editable=False,
        help_text="Format: YYMMDD-CL-XXXXX-XXX",
    )
    # 👤 ACTORS
    doctor = models.ForeignKey(
        doctor, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="encounters"
    )
    clinic = models.ForeignKey(
        "clinic.Clinic",
        on_delete=models.CASCADE,
        related_name="encounters",
    )
    patient_account = models.ForeignKey(
        PatientAccount, on_delete=models.CASCADE,
        related_name="encounters"
    )
    patient_profile = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE,
        related_name="encounters"
    )

    appointment = models.ForeignKey(
        Appointment, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="encounters"
    )

    # 🏥 CONTEXT
    encounter_type = models.CharField(
        max_length=20,
        choices=[
            ("appointment", "Appointment"),
            ("walk_in", "Walk In"),
            ("emergency", "Emergency"),
            ("follow_up", "Follow Up"),
        ],
        default="walk_in"
    )

    status = models.CharField(
        max_length=20,
        choices=[
            ("created", "Created"),
            ("pre_consultation", "Pre Consultation"),
            ("in_consultation", "In Consultation"),
            ("completed", "Completed"),
            ("cancelled", "Cancelled"),
            ("no_show", "No Show"),
        ],
        default="created"
    )

    # Workflow type (sync with Consultation.consultation_type; required if DB column exists)
    consultation_type = models.CharField(
        max_length=20,
        choices=[
            ("FULL", "Full Consultation"),
            ("QUICK_RX", "Quick Prescription"),
            ("TEST_ONLY", "Test Only Visit"),
        ],
        default="FULL",
        help_text="Workflow type governing visible sections and validation",
    )

    entry_mode = models.CharField(
        max_length=20,
        choices=[
            ("helpdesk", "Helpdesk"),
            ("doctor", "Doctor"),
            ("patient", "Patient"),
            ("system", "System"),
        ],
        default="helpdesk"
    )

    # 🔐 AUDIT & LIFECYCLE
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="encounters_created"
    )
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="encounters_updated"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Clinical Encounter"
        verbose_name_plural = "Clinical Encounters"

    def __str__(self):
        return f"Encounter {self.visit_pnr or '(no PNR)'}"
    def save(self, *args, **kwargs):
        # Only check existing row when updating (new instances have pk from default but no DB row yet)
        if self.pk and not self._state.adding:
            old = type(self).objects.only("visit_pnr", "clinic_id").get(pk=self.pk)
            if old.visit_pnr and old.visit_pnr != self.visit_pnr:
                raise ValidationError("Visit PNR cannot be modified.")
            if old.clinic_id != self.clinic_id:
                raise ValidationError("Clinic cannot be changed after encounter creation.")
        if not self.visit_pnr:
            if not self.clinic:
                raise ValidationError("Clinic is required to generate Visit PNR.")
            from consultations.services.visit_pnr_service import VisitPNRService
            self.visit_pnr = VisitPNRService.generate_pnr(self.clinic)
        super().save(*args, **kwargs)

class PreConsultation(models.Model):
    """
    Represents pre-consultation data collected before doctor consultation.
    Optional, template-driven, auditable, and lockable.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # 🔗 VISIT CONTEXT
    encounter = models.OneToOneField(
        ClinicalEncounter,
        on_delete=models.CASCADE,
        related_name="pre_consultation"
    )
    # 🧠 TEMPLATE CONTEXT (VERY IMPORTANT)
    specialty_code = models.CharField(
        max_length=50,
        help_text="Specialty code used to resolve templates (e.g. gynecology, physician)"
    )
    template_version = models.CharField(
        max_length=20,
        default="v1",
        help_text="Template version used at time of data entry"
    )
    # 📊 COMPLETION STATE
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Set when pre-consultation is marked complete"
    )
    # 🔒 LOCKING & FINALITY
    is_locked = models.BooleanField(
        default=False,
        help_text="Locked once consultation starts"
    )
    locked_at = models.DateTimeField(
        null=True,
        blank=True
    )
    lock_reason = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Reason for locking (e.g. Consultation started)"
    )
    # 🧭 ENTRY METADATA
    entry_mode = models.CharField(
        max_length=20,
        choices=[
            ("helpdesk", "Helpdesk"),
            ("doctor", "Doctor"),
            ("patient", "Patient"),
            ("system", "System"),
        ],
        default="helpdesk"
    )
    # 👤 AUDIT
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="preconsultations_created"
    )

    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="preconsultations_updated"
    )

    # 🔁 LIFECYCLE
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ======================
    # DOMAIN METHODS
    # ======================

    def lock(self, reason="Consultation started"):
        self.is_locked = True
        self.locked_at = timezone.now()
        self.lock_reason = reason
        self.save(update_fields=["is_locked", "locked_at", "lock_reason"])

    def mark_completed(self):
        self.completed_at = timezone.now()
        self.save(update_fields=["completed_at"])

    class Meta:
        verbose_name = "Pre Consultation"
        verbose_name_plural = "Pre Consultations"
        ordering = ["-created_at"]

    def __str__(self):
        return f"PreConsultation | {self.encounter.visit_pnr}"

# =====================================================
# 🧩 PRE-CONSULTATION SECTIONS (JSONB, TEMPLATE-DRIVEN)
# =====================================================
class BasePreConsultationSection(models.Model):
    """
    Abstract base for all pre-consultation sections.
    Handles audit, lifecycle, and JSON storage.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    pre_consultation = models.OneToOneField(
        PreConsultation,
        on_delete=models.CASCADE
    )

    # 🧠 SECTION METADATA
    section_code = models.CharField(
        max_length=50,
        help_text="Section identifier (e.g. vitals, chief_complaint)"
    )

    schema_version = models.CharField(
        max_length=20,
        default="v1",
        help_text="Schema version of this section"
    )

    # 📦 DATA
    data = models.JSONField(
        help_text="Template-driven JSON data for this section"
    )

    # 🔁 LIFECYCLE
    is_active = models.BooleanField(default=True)

    # 👤 AUDIT
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="%(class)s_created"
    )
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="%(class)s_updated"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class PreConsultationVitals(BasePreConsultationSection):
    class Meta:
        verbose_name = "PreConsultation Vitals"
        verbose_name_plural = "PreConsultation Vitals"

    def save(self, *args, **kwargs):
        self.section_code = "vitals"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Vitals | {self.pre_consultation.encounter.visit_pnr}"

class PreConsultationChiefComplaint(BasePreConsultationSection):
    class Meta:
        verbose_name = "PreConsultation Chief Complaint"
        verbose_name_plural = "PreConsultation Chief Complaints"

    def save(self, *args, **kwargs):
        self.section_code = "chief_complaint"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Chief Complaint | {self.pre_consultation.encounter.visit_pnr}"

class PreConsultationAllergies(BasePreConsultationSection):
    class Meta:
        verbose_name = "PreConsultation Allergies"
        verbose_name_plural = "PreConsultation Allergies"

    def save(self, *args, **kwargs):
        self.section_code = "allergies"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Allergies | {self.pre_consultation.encounter.visit_pnr}"

class PreConsultationMedicalHistory(BasePreConsultationSection):
    class Meta:
        verbose_name = "PreConsultation Medical History"
        verbose_name_plural = "PreConsultation Medical Histories"

    def save(self, *args, **kwargs):
        self.section_code = "medical_history"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Medical History | {self.pre_consultation.encounter.visit_pnr}"


# =====================================================
# New Consultation Model Need to used after all data is migrated to the new model
# =====================================================

# class Consultation(models.Model):
#     """
#     Represents the doctor interaction phase of an encounter.

#     Rules:
#     - One Consultation per ClinicalEncounter
#     - Cannot exist if encounter is cancelled/no_show
#     - Locks PreConsultation when started
#     - Controls encounter lifecycle
#     - Cannot be modified after finalization
#     """

#     id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

#     encounter = models.OneToOneField(
#         "consultations.ClinicalEncounter",
#         on_delete=models.CASCADE,
#         related_name="consultation"
#     )

#     # 🩺 Clinical Summary
#     closure_note = models.TextField(blank=True, null=True)
#     follow_up_date = models.DateField(blank=True, null=True)

#     # 🔒 State Control
#     is_finalized = models.BooleanField(default=False)

#     # ⏱ Lifecycle Tracking
#     started_at = models.DateTimeField(auto_now_add=True)
#     ended_at = models.DateTimeField(null=True, blank=True)

#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)

#     class Meta:
#         verbose_name = "Consultation"
#         verbose_name_plural = "Consultations"
#         ordering = ["-started_at"]
#         constraints = [
#             models.CheckConstraint(
#                 check=~models.Q(is_finalized=True, ended_at__isnull=True),
#                 name="finalized_must_have_ended_at"
#             )
#         ]

#     def __str__(self):
#         return f"Consultation | {self.encounter.visit_pnr}"

#     # ======================================================
#     # CORE SAVE LOGIC
#     # ======================================================
#     def save(self, *args, **kwargs):
#         with transaction.atomic():

#             is_new = self._state.adding

#             # ==============================
#             # UPDATE VALIDATION
#             # ==============================
#             if not is_new:
#                 old = type(self).objects.only(
#                     "is_finalized",
#                     "encounter_id"
#                 ).get(pk=self.pk)

#                 # 🚫 Prevent encounter reassignment
#                 if old.encounter_id != self.encounter_id:
#                     raise ValidationError(
#                         "Consultation cannot be reassigned to another encounter."
#                     )

#                 # 🚫 Prevent modification after finalize
#                 if old.is_finalized:
#                     raise ValidationError(
#                         "Finalized consultation cannot be modified."
#                     )

#             # ==============================
#             # CREATION VALIDATION
#             # ==============================
#             encounter = self.encounter

#             if encounter.status in ["cancelled", "no_show"]:
#                 raise ValidationError(
#                     "Cannot create consultation for cancelled or no-show encounter."
#                 )

#             if not encounter.clinic:
#                 raise ValidationError("Encounter must have a clinic.")

#             if not encounter.patient_profile:
#                 raise ValidationError("Encounter must have a patient profile.")

#             if not encounter.doctor:
#                 raise ValidationError("Encounter must have a doctor assigned.")

#             super().save(*args, **kwargs)

#             # ==============================
#             # POST-SAVE LIFECYCLE
#             # ==============================

#             if is_new:
#                 self._on_consultation_started()

#             # Finalization transition detection
#             if self.is_finalized:
#                 self._finalize_consultation()

#     # ======================================================
#     # LIFECYCLE EVENTS
#     # ======================================================

#     def _on_consultation_started(self):
#         """
#         Runs only once when consultation is created.
#         """

#         encounter = self.encounter

#         # Lock pre-consultation
#         if hasattr(encounter, "pre_consultation"):
#             encounter.pre_consultation.lock(
#                 reason="Consultation started"
#             )

#         # Update encounter status
#         encounter.status = "in_consultation"
#         encounter.save(update_fields=["status"])

#     def _finalize_consultation(self):
#         """
#         Finalizes consultation and updates encounter.
#         """

#         if not self.ended_at:
#             self.ended_at = timezone.now()
#             super().save(update_fields=["ended_at"])

#         encounter = self.encounter

#         if encounter.status != "completed":
#             encounter.status = "completed"
#             encounter.save(update_fields=["status"])


# 1.	SymptomMaster → global catalog
# 2.	ConsultationSymptom → structured symptom entry
# 3.	SymptomExtensionData → controlled JSON expansion

# class SymptomMaster(models.Model):
#     """
#     Global symptom catalog.
#     Stable dictionary used across system.
#     AI & analytics backbone.
#     """

#     id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

#     code = models.CharField(
#         max_length=50,
#         unique=True,
#         db_index=True,
#         help_text="Stable internal code (e.g., CHEST_PAIN)"
#     )

#     display_name = models.CharField(
#         max_length=255,
#         db_index=True
#     )

#     specialty = models.CharField(
#         max_length=100,
#         db_index=True,
#         help_text="Specialty mapping (e.g., cardiology)"
#     )

#     is_active = models.BooleanField(default=True)

#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)


#     class Meta:
#         indexes = [
#             models.Index(fields=["specialty"]),
#             models.Index(fields=["display_name"]),
#         ]
#         verbose_name = "Symptom Master"
#         verbose_name_plural = "Symptom Masters"

#     def __str__(self):
#         return self.display_name

# class ConsultationSymptom(models.Model):
#     """
#     Structured symptom entry linked to a consultation.
#     Immutable after consultation finalization.
#     """

#     id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

#     consultation = models.ForeignKey(
#         "consultations.Consultation",
#         on_delete=models.CASCADE,
#         related_name="symptoms",
#         db_index=True
#     )

#     symptom = models.ForeignKey(
#         SymptomMaster,
#         on_delete=models.PROTECT,
#         related_name="consultation_entries",
#         db_index=True
#     )

#     # ==========================
#     # Structured Core Fields
#     # ==========================

#     duration_value = models.PositiveIntegerField(
#         null=True,
#         blank=True
#     )

#     duration_unit = models.CharField(
#         max_length=20,
#         choices=[
#             ("hours", "Hours"),
#             ("days", "Days"),
#             ("weeks", "Weeks"),
#             ("months", "Months"),
#             ("years", "Years"),
#         ],
#         null=True,
#         blank=True,
#         db_index=True
#     )

#     severity = models.CharField(
#         max_length=20,
#         choices=[
#             ("mild", "Mild"),
#             ("moderate", "Moderate"),
#             ("severe", "Severe"),
#         ],
#         null=True,
#         blank=True,
#         db_index=True
#     )

#     onset = models.CharField(
#         max_length=20,
#         choices=[
#             ("sudden", "Sudden"),
#             ("gradual", "Gradual"),
#         ],
#         null=True,
#         blank=True,
#         db_index=True
#     )

#     is_primary = models.BooleanField(default=False, db_index=True)

#     # ==========================
#     # Controlled Extension JSON
#     # ==========================

#     extra_data = models.JSONField(
#         null=True,
#         blank=True,
#         help_text="Specialty-specific controlled extension fields"
#     )

#     # ==========================
#     # Lifecycle & Audit
#     # ==========================

#     is_active = models.BooleanField(default=True)

#     created_by = models.ForeignKey(
#         "account.User",
#         on_delete=models.SET_NULL,
#         null=True,
#         blank=True
#     )
#     updated_by = models.ForeignKey(
#         "account.User",
#         on_delete=models.SET_NULL,
#         null=True,
#         blank=True
#     )

#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)

#     # ==========================
#     # Index Strategy
#     # ==========================

#     class Meta:
#         indexes = [
#             models.Index(fields=["consultation"]),
#             models.Index(fields=["symptom"]),
#             models.Index(fields=["severity"]),
#             models.Index(fields=["onset"]),
#             models.Index(fields=["is_primary"]),
#             models.Index(fields=["duration_unit"]),
#         ]

#         constraints = [
#             models.UniqueConstraint(
#                 fields=["consultation", "symptom"],
#                 name="unique_symptom_per_consultation"
#             )
#         ]

#         verbose_name = "Consultation Symptom"
#         verbose_name_plural = "Consultation Symptoms"

#     def __str__(self):
#         return f"{self.symptom.display_name} | {self.consultation.encounter.visit_pnr}"
#     def save(self, *args, **kwargs):

#         with transaction.atomic():

#             # 🚫 Prevent edits after finalization
#             if self.pk:
#                 old = type(self).objects.select_related("consultation").get(pk=self.pk)

#                 if old.consultation.is_finalized:
#                     raise ValidationError(
#                         "Cannot modify symptom after consultation is finalized."
#                     )

#             # 🚫 Prevent adding symptom to finalized consultation
#             if self.consultation.is_finalized:
#                 raise ValidationError(
#                     "Cannot add symptom to finalized consultation."
#                 )

#             super().save(*args, **kwargs)

# class SymptomExtensionData(models.Model):
#     """
#     Controlled JSON extension layer for ConsultationSymptom.
#     Used for specialty-specific dynamic attributes.
    
#     Example:
#     Chest Pain:
#         - radiation
#         - exertional_trigger
#         - positional_relation

#     Fever:
#         - intermittent
#         - chills
#         - night_sweats
#     """

#     id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

#     symptom_entry = models.OneToOneField(
#         "consultations.ConsultationSymptom",
#         on_delete=models.CASCADE,
#         related_name="extension"
#     )

#     # ==========================
#     # JSONB STORAGE
#     # ==========================
#     data = models.JSONField(
#         help_text="Specialty-specific validated symptom metadata"
#     )

#     schema_version = models.CharField(
#         max_length=20,
#         default="v1",
#         help_text="Schema version for AI consistency"
#     )

#     # ==========================
#     # AUDIT
#     # ==========================
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)

#     # ==========================
#     # INDEXING STRATEGY
#     # ==========================
#     class Meta:
#         verbose_name = "Symptom Extension Data"
#         verbose_name_plural = "Symptom Extension Data"

#         indexes = [
#             GinIndex(fields=["data"]),  # JSONB indexing for fast querying
#         ]

#     def __str__(self):
#         return f"Extension | {self.symptom_entry.symptom.display_name}"

#     # ==========================
#     # LOCK PROTECTION
#     # ==========================
#     def save(self, *args, **kwargs):
#         with transaction.atomic():

#             consultation = self.symptom_entry.consultation

#             # 🚫 Block modification after finalization
#             if consultation.is_finalized:
#                 raise ValidationError(
#                     "Cannot modify symptom extension after consultation is finalized."
#                 )

#             super().save(*args, **kwargs)

# =====================================================
#  OLD CONSULTATION MODEL (TO BE REMOVED) Need to be removed after all data is migrated to the new model
# =====================================================

class Consultation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    consultation_pnr = models.CharField(max_length=10, unique=True, editable=False, db_index=True)
    prescription_pnr = models.CharField(max_length=10, unique=True, editable=False, db_index=True)

    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE, related_name="consultations")
    patient_account = models.ForeignKey(PatientAccount, on_delete=models.CASCADE, related_name="consultations")
    patient_profile = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name="consultations")

    closure_note = models.TextField(blank=True, null=True)
    follow_up_date = models.DateField(blank=True, null=True)
    is_finalized = models.BooleanField(default=False)
    prescription_pdf = models.FileField(upload_to="prescriptions/", blank=True, null=True,max_length=255)

    tag = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        choices=StaticDataService.get_consultation_tag_choices(),
        help_text="Optional tag like Follow-Up, Critical, etc."
    )
    is_important = models.BooleanField(default=False, help_text="Mark consultation as important")

    # Workflow type: full consultation, quick prescription, or test-only visit
    consultation_type = models.CharField(
        max_length=20,
        choices=[
            ("FULL", "Full Consultation"),
            ("QUICK_RX", "Quick Prescription"),
            ("TEST_ONLY", "Test Only Visit"),
        ],
        default="FULL",
        help_text="Workflow type governing visible sections and validation",
    )

    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    appointment = models.ForeignKey(Appointment, 
                        on_delete=models.SET_NULL, 
                        null=True, blank=True, 
                        related_name="consultations")
    class Meta:
        ordering = ['-started_at']
        verbose_name = "Consultation"
        verbose_name_plural = "Consultations"

    def __str__(self):
        return f"Consultation PNR: {self.consultation_pnr} | Patient: {self.patient_profile.first_name}"

    def save(self, *args, **kwargs):
        if not self.consultation_pnr:
            self.consultation_pnr = self.generate_unique_consultation_pnr()
        if not self.prescription_pnr:
            self.prescription_pnr = self.generate_unique_prescription_pnr()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_unique_consultation_pnr():
        while True:
            pnr = str(random.randint(1000000000, 9999999999))  # 10-digit number
            if not Consultation.objects.filter(consultation_pnr=pnr).exists():
                return pnr

    @staticmethod
    def generate_unique_prescription_pnr():
        while True:
            pnr = str(random.randint(1000000000, 9999999999))  # 10-digit number
            if not Consultation.objects.filter(prescription_pnr=pnr).exists():
                return pnr

class Vitals(models.Model):
    consultation = models.OneToOneField(Consultation, on_delete=models.CASCADE, related_name="vitals")
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    pulse = models.IntegerField(null=True, blank=True)
    blood_pressure = models.CharField(max_length=10, blank=True)  # e.g. 120/80
    temperature_c = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)

class Complaint(models.Model):
    SEVERITY_CHOICES = [
        ('mild', 'Mild'),
        ('moderate', 'Moderate'),
        ('severe', 'Severe')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='complaints')

    complaint_text = models.CharField(max_length=255)
    duration = models.PositiveIntegerField(help_text="Duration in days")
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    is_general = models.BooleanField(default=False)  # Whether selected from general complaints list
    doctor_note = models.TextField(blank=True, null=True)  # Optional note field

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = "Complaint"
        verbose_name_plural = "Complaints"
        unique_together = ('consultation', 'complaint_text')

    def __str__(self):
        return f"{self.complaint_text} ({self.severity})"

class Diagnosis(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='diagnoses')

    code = models.CharField(max_length=20, blank=True, null=True, help_text="ICD-10/11 code (optional)")
    description = models.CharField(max_length=500, help_text="Diagnosis description")

    location = models.CharField(
        max_length=20, 
        choices=StaticDataService.get_location_choices(),
        blank=True, 
        null=True,
        help_text="Diagnosis location in body"
    )
    diagnosis_type = models.CharField(
        max_length=20, 
        choices=StaticDataService.get_diagnosis_type_choices(),
        default='confirmed',
        help_text="Type of diagnosis"
    )

    is_general = models.BooleanField(default=False, help_text="Selected from predefined general diagnosis list")
    doctor_note = models.TextField(blank=True, null=True, help_text="Internal notes for doctor")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = "Diagnosis"
        verbose_name_plural = "Diagnoses"

    def __str__(self):
        return f"{self.description} ({self.diagnosis_type})"

class AdviceTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    description = models.CharField(max_length=500, unique=True, help_text="Predefined lifestyle/dietary advice")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = "Advice Template"
        verbose_name_plural = "Advice Templates"

    def __str__(self):
        return f"Template: {self.description}"

class Advice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name='advices')
    advice_templates = models.ManyToManyField(AdviceTemplate, blank=True, related_name='custom_advices')
    custom_advice = models.TextField(blank=True, null=True, help_text="Custom lifestyle/dietary advice")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['created_at']
        verbose_name = "Advice"
        verbose_name_plural = "Advices"
        constraints = [
        models.UniqueConstraint(
            fields=['consultation', 'custom_advice'],
            name='unique_custom_advice_per_consultation'
            )
        ]

    def __str__(self):
        return f"Advice for Consultation {self.consultation.id}"

class PatientFeedback(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.OneToOneField(Consultation, on_delete=models.CASCADE, related_name='patient_feedback')

    rating = models.IntegerField(
        choices=[(i, str(i)) for i in range(1, 6)],
        help_text="Rating from 1 to 5"
    )
    comments = models.TextField(blank=True, null=True, help_text="Optional comment by patient")
    is_anonymous = models.BooleanField(default=False, help_text="Hide patient's identity if True")

    created_at = models.DateTimeField(auto_now_add=True)

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feedbacks_created'
    )

    class Meta:
        verbose_name = "Patient Feedback"
        verbose_name_plural = "Patient Feedbacks"
        ordering = ['-created_at']

    def __str__(self):
        return f"Feedback for Consultation {self.consultation.consultation_pnr} - Rating {self.rating}"