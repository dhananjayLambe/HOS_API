import uuid
import random
from django.db import models
from django.utils import timezone
from doctor.models import doctor
from patient_account.models import PatientAccount, PatientProfile
from utils.static_data_service import StaticDataService
from account.models import User
from appointments.models import Appointment

# =====================================================
# 🔢 DAILY COUNTER (PNR BACKBONE)
# =====================================================

class EncounterDailyCounter(models.Model):
    """
    Maintains a per-day counter for PNR generation.
    Counter resets every day and starts from 1000.
    """
    date = models.DateField(unique=True)
    counter = models.PositiveIntegerField(default=1000)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Encounter Daily Counter"
        verbose_name_plural = "Encounter Daily Counters"

    def __str__(self):
        return f"{self.date} → {self.counter}"

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
    consultation_pnr = models.CharField(
        max_length=15, unique=True, db_index=True,
        help_text="Format: YYMMDD-XXXX (daily counter)"
    )
    prescription_pnr = models.CharField(
        max_length=15, unique=True, db_index=True,
        help_text="Format: YYMMDD-XXXX (daily counter)"
    )

    # 👤 ACTORS
    doctor = models.ForeignKey(
        doctor, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="encounters"
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
        #ordering = ["-created_at"]
        verbose_name = "Clinical Encounter"
        verbose_name_plural = "Clinical Encounters"

    def __str__(self):
        return f"Encounter {self.consultation_pnr}"

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
        return f"PreConsultation | {self.encounter.consultation_pnr}"

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
        return f"Vitals | {self.pre_consultation.encounter.consultation_pnr}"

class PreConsultationChiefComplaint(BasePreConsultationSection):
    class Meta:
        verbose_name = "PreConsultation Chief Complaint"
        verbose_name_plural = "PreConsultation Chief Complaints"

    def save(self, *args, **kwargs):
        self.section_code = "chief_complaint"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Chief Complaint | {self.pre_consultation.encounter.consultation_pnr}"

class PreConsultationAllergies(BasePreConsultationSection):
    class Meta:
        verbose_name = "PreConsultation Allergies"
        verbose_name_plural = "PreConsultation Allergies"

    def save(self, *args, **kwargs):
        self.section_code = "allergies"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Allergies | {self.pre_consultation.encounter.consultation_pnr}"

class PreConsultationMedicalHistory(BasePreConsultationSection):
    class Meta:
        verbose_name = "PreConsultation Medical History"
        verbose_name_plural = "PreConsultation Medical Histories"

    def save(self, *args, **kwargs):
        self.section_code = "medical_history"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Medical History | {self.pre_consultation.encounter.consultation_pnr}"

# =====================================================
# 🩺 CONSULTATION (MANDATORY)
# =====================================================

# class Consultation(models.Model):
#     """
#     Always exists unless encounter is cancelled/no-show.
#     """

#     encounter = models.OneToOneField(
#         ClinicalEncounter,
#         on_delete=models.CASCADE,
#         related_name="consultation"
#     )

#     closure_note = models.TextField(blank=True, null=True)
#     follow_up_date = models.DateField(blank=True, null=True)

#     is_finalized = models.BooleanField(default=False)

#     started_at = models.DateTimeField(auto_now_add=True)
#     ended_at = models.DateTimeField(null=True, blank=True)

#     def __str__(self):
#         return f"Consultation {self.encounter.consultation_pnr}"



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