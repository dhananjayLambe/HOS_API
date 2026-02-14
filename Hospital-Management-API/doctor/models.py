import uuid
from django.db import models
from account.models import User
from clinic.models import Clinic
from django.utils.timezone import now
from django.utils import timezone
from datetime import datetime
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from datetime import datetime, timedelta
from doctor.utils.uploads import(
    doctor_photo_upload_path,doctor_kyc_upload_path,
    doctor_education_upload_path,pan_card_upload_path,aadhar_card_upload_path,
    digital_signature_upload_path)
STATUS_CHOICES = [
    ("pending", "Pending Approval"),
    ("approved", "Approved"),
    ("rejected", "Rejected"),
]
SPECIALIZATION_CHOICES = [
    ('CL', 'Cardiologist'),
    ('DL', 'Dermatologist'),
    ('EMC', 'Emergency Medicine Specialist'),
    ('IL', 'Immunologist'),
    ('AL', 'Anesthesiologist'),
    ('CRS', 'Colon and Rectal Surgeon'),
    ('END', 'Endocrinologist'),
    ('GAS', 'Gastroenterologist'),
    ('HIM', 'Hematologist'),
    ('ONC', 'Oncologist'),
    ('NEU', 'Neurologist'),
    ('NS', 'Neurosurgeon'),
    ('PED', 'Pediatrician'),
    ('PLS', 'Plastic Surgeon'),
    ('PMR', 'Physical Medicine and Rehabilitation Specialist'),
    ('PSY', 'Psychiatrist'),
    ('RAD', 'Radiologist'),
    ('RHU', 'Rheumatologist'),
    ('THS', 'Thoracic Surgeon'),
    ('URO', 'Urologist'),
    ('ENT', 'Otorhinolaryngologist (ENT Specialist)'),
    ('OPH', 'Ophthalmologist'),
    ('MFS', 'Maternal-Fetal Medicine Specialist'),
    ('NEON', 'Neonatologist'),
    ('GYN', 'Gynecologist'),
    ('ORT', 'Orthopedic Surgeon'),
    ('VCS', 'Vascular Surgeon'),
    ('IMM', 'Allergy and Immunology Specialist'),
    ('PAIN', 'Pain Medicine Specialist'),
    ('PATH', 'Pathologist'),
    ('NM', 'Nuclear Medicine Specialist'),
    ('SLE', 'Sleep Medicine Specialist'),
    ('OT', 'Occupational Medicine Specialist'),
    ('SM', 'Sports Medicine Specialist'),
    ('PS', 'Palliative Medicine Specialist'),
    ('DER', 'Dermatosurgeon'),
    ('FM', 'Family Medicine Specialist'),
    ('GEN', 'General Practitioner'),
    ('GER', 'Geriatrician'),
    ('ID', 'Infectious Disease Specialist'),
    ('TOX', 'Toxicologist'),
    ('GENS', 'General Surgeon'),
    ('TRS', 'Transplant Surgeon'),
    ('CRIT', 'Critical Care Specialist'),
    ('COS', 'Cosmetic Surgeon'),
    ('LAB', 'Lab Medicine Specialist'),
    ('CLG', 'Clinical Geneticist'),
]

def default_consultation_modes():
    return [ "in_clinic"]

def default_languages_spoken():
    return ["English"]
class doctor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    public_id = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        editable=False,
        null=True,
        blank=True
    )
    #Personal Information
    user=models.OneToOneField(User,on_delete=models.CASCADE, related_name='doctor')
    secondary_mobile_number = models.CharField(max_length=15, default="NA") #unique=True,
    dob = models.DateField(verbose_name="Date of Birth", null=True, blank=True)
    about = models.TextField(blank=True, null=True, help_text="Short description displayed to patients")
    photo = models.ImageField(upload_to=doctor_photo_upload_path, blank=True, null=True)
    years_of_experience = models.PositiveIntegerField(default=1)
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=5.0)
    slug = models.SlugField(unique=True, null=True, blank=True)
    gender = models.CharField(
        max_length=10,
        choices=[("M", "Male"), ("F", "Female"), ("O", "Other")],
        null=True, blank=True
    )
    #KYC Information
    digital_signature_consent = models.BooleanField(default=False)
    terms_and_conditions_acceptance = models.BooleanField(default=False)
    consent_for_data_storage = models.BooleanField(default=False)  # Data Storage
    title = models.CharField(
        max_length=255,
        default="Consultant Physician",
        help_text="Displayed title in prescriptions, e.g., 'Consultant Cardiologist'"
    )
    primary_specialization = models.CharField(max_length=100, default="General", help_text="Primary specialization for indexing/search")
    # consultation_modes = models.JSONField(default=list, help_text="Available consultation modes (e.g., ['video', 'in_clinic'])")
    # languages_spoken = models.JSONField(default=list, help_text="Languages the doctor can speak")
    consultation_modes = models.JSONField(
        default=default_consultation_modes,
        help_text="Available consultation modes (e.g., ['video', 'in_clinic'])"
    )
    languages_spoken = models.JSONField(
        default=default_languages_spoken,
        help_text="Languages the doctor can speak"
    )
    # Approval workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    rejection_reason = models.TextField(blank=True, null=True)
    is_featured = models.BooleanField(default=False, help_text="Featured in search results")
    is_approved = models.BooleanField(default=False)
    kyc_completed = models.BooleanField(default=False)
    kyc_verified = models.BooleanField(default=False)
    profile_completion = models.PositiveIntegerField(default=0)
    profile_verification_Badges = models.JSONField(default=list,null=True,blank=True, help_text="List of badges earned by the doctor")

    # Relationships
    clinics = models.ManyToManyField(Clinic, related_name='doctors')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # Mandatory  default=timezone.now
    
    profile_progress = models.IntegerField(default=0)
    @property
    def get_name(self):
        return self.user.first_name+" "+self.user.last_name
    @property
    def get_id(self):
        return self.user.id
    def __str__(self):
        return "{}".format(self.user.first_name)
    def save(self, *args, **kwargs):
        from account.services.business_id_service import BusinessIDService
        if self.pk:
            old = doctor.objects.filter(pk=self.pk).first()
            if old and old.public_id and old.public_id != self.public_id:
                raise ValidationError("Doctor ID cannot be modified.")
        if not self.public_id:
            self.public_id = BusinessIDService.generate_id("DOC", 4)
        super().save(*args, **kwargs)

class DoctorAddress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.OneToOneField(doctor, on_delete=models.CASCADE, related_name="address")
    address = models.TextField(max_length=255, default='NA')  # Address line 1
    address2 = models.TextField(max_length=255, default='NA')  # Address line 2
    city = models.CharField(max_length=100, default='NA')
    state = models.CharField(max_length=100, default='NA')
    pincode = models.CharField(max_length=10, default='NA')
    country = models.CharField(max_length=100, default="India")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True, default=None)  # Geolocation
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True, default=None)  # Geolocation
    google_place_id = models.CharField(max_length=255, blank=True, null=True, default=None)  # Google Place ID
    google_maps_url = models.URLField(blank=True, null=True, default=None)  # Google Maps URL
    created_at = models.DateTimeField(auto_now_add=True)  # Mandatory
    updated_at = models.DateTimeField(auto_now=True)  # Mandatory

    def __str__(self):
        return f"{self.address}, {self.city}, {self.state}, {self.pincode}"

class Registration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.OneToOneField(doctor, on_delete=models.CASCADE, related_name='registration')
    medical_registration_number = models.CharField(max_length=50, unique=True)
    medical_council = models.CharField(max_length=255, help_text="e.g., Medical Council of India")
    registration_certificate = models.FileField(upload_to=doctor_kyc_upload_path, null=True, blank=True)
    registration_date = models.DateField(null=True, blank=True)
    valid_upto = models.DateField(null=True, blank=True, help_text="License expiry date if applicable")
    is_verified = models.BooleanField(default=False, help_text="Admin verified medical license?")
    verification_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        verbose_name = "Medical Registration"
        verbose_name_plural = "Medical Registrations"
        constraints = [
            models.UniqueConstraint(fields=['doctor'], name='unique_doctor_registration')
        ]
    def __str__(self):
        return f"{self.medical_registration_number} - {self.medical_council}"

class GovernmentID(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.OneToOneField(doctor, on_delete=models.CASCADE, related_name='government_ids')
    pan_card_number = models.CharField(max_length=10, unique=True ,
                                       validators=[RegexValidator(regex='^[A-Z]{5}[0-9]{4}[A-Z]$', message="Invalid PAN format.")])
    pan_card_file = models.FileField(upload_to=pan_card_upload_path, null=True, blank=True)
    aadhar_card_number = models.CharField(max_length=12, unique=True,
                            validators=[RegexValidator(regex='^[0-9]{12}$', message="Invalid Aadhar number.")])
    aadhar_card_file = models.FileField(upload_to=aadhar_card_upload_path, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"PAN: {self.pan_card_number}, Aadhar: {self.aadhar_card_number}"

class Education(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE, related_name='education')
    qualification = models.CharField(max_length=255, help_text="e.g., MBBS, MD")
    institute = models.CharField(max_length=255, help_text="Name of the institution")
    year_of_completion = models.PositiveIntegerField()
    certificate = models.FileField(upload_to=doctor_education_upload_path, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)  # Mandatory  default=timezone.now
    updated_at = models.DateTimeField(auto_now=True)  # Mandatory  default=timezone.now

    class Meta:
        unique_together = ('doctor', 'qualification', 'institute', 'year_of_completion')
        ordering = ['-year_of_completion', '-created_at']

    def __str__(self):
        return f"{self.qualification} - {self.institute} ({self.year_of_completion})"

class CustomSpecialization(models.Model):
    name = models.CharField(max_length=255, unique=True, help_text="Enter a custom specialization")
    description = models.TextField(blank=True, null=True, help_text="Provide a description if needed")
    created_at = models.DateTimeField(auto_now_add=True)  # Mandatory  default=timezone.now
    updated_at = models.DateTimeField(auto_now=True)  # Mandatory  default=timezone.now
    class Meta:
        unique_together = ('name',)  # Enforces uniqueness
        ordering = ['name']
    def __str__(self):
        return self.name

class Specialization(models.Model):
    # Define the list of specialties (same as before)

    # Fields for the model
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE, related_name='specializations')
    specialization = models.CharField(max_length=5, choices=SPECIALIZATION_CHOICES, blank=True, null=True)
    custom_specialization = models.ForeignKey(CustomSpecialization, on_delete=models.SET_NULL, null=True, blank=True, related_name="specializations")
    is_primary = models.BooleanField(default=False, help_text="Indicates if this is the primary displayed specialization")
    created_at = models.DateTimeField(auto_now_add=True)  # Mandatory  default=timezone.now
    updated_at = models.DateTimeField(auto_now=True)  # Mandatory  default=timezone.now
    
    class Meta:
        unique_together = ('doctor', 'specialization', 'custom_specialization')
    
    def __str__(self):
        if self.specialization:
            return f"{self.get_specialization_display()} ({'Primary' if self.is_primary else 'Secondary'})"
        elif self.custom_specialization:
            return f"Custom: {self.custom_specialization.name} ({'Primary' if self.is_primary else 'Secondary'})"
        else:
            return "No specialization set"

class DoctorService(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE, related_name='services')
    name = models.CharField(max_length=255, default="NA", help_text="Service name (e.g., Angioplasty, Skin Treatment)")
    description = models.TextField(blank=True, null=True, default="NA", help_text="Details about the service")
    fee = models.DecimalField(max_digits=10, decimal_places=2,default=0.00, help_text="Fee for the service")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        unique_together = ('doctor', 'name')

    def __str__(self):
        return f"{self.name} - {self.doctor.get_name}"

class Award(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE, related_name='awards')
    name = models.CharField(max_length=255, default="NA", help_text="Name of the award")
    description = models.TextField(blank=True, null=True, default="NA", help_text="Details about the award")
    awarded_by = models.CharField(max_length=255, default="NA", help_text="Organization granting the award")
    date_awarded = models.DateField(default=now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.awarded_by}"

class Certification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE, related_name='certifications')
    title = models.CharField(max_length=255, default="NA", help_text="Certification title (e.g., Fellowship in Cardiology)")
    issued_by = models.CharField(max_length=255, default="NA", help_text="Organization issuing the certification")
    date_of_issue = models.DateField(default=now)
    expiry_date = models.DateField(blank=True, null=True,default=now, help_text="Leave blank if no expiry")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.issued_by}"

class DoctorFeedback(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE, related_name='feedback')
    rating = models.PositiveSmallIntegerField(choices=[(i, f"{i} Stars") for i in range(1, 6)], help_text="Rating out of 5", default=5)
    comments = models.TextField(blank=True, null=True,default="NA", help_text="Feedback from the reviewer")
    reviewed_by = models.CharField(max_length=255,default="NA", help_text="Name of the patient/clinic (optional)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Rating: {self.rating} - {self.doctor.get_name}"

class DoctorSocialLink(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE, related_name='social_links')
    platform = models.CharField(max_length=50,default="NA", help_text="e.g., LinkedIn, ResearchGate")
    url = models.URLField(help_text="Link to the profile",default="NA")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.platform} - {self.url}"


class KYCStatus(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.OneToOneField("doctor.doctor", on_delete=models.CASCADE, related_name="kyc_status")
    registration_status = models.CharField(max_length=10, choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")], default="pending")
    registration_reason = models.TextField(null=True, blank=True)

    education_status = models.CharField(max_length=10, choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")], default="pending")
    education_reason = models.TextField(null=True, blank=True)

    photo_status = models.CharField(max_length=10, choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")], default="pending")
    photo_reason = models.TextField(null=True, blank=True)

    aadhar_status = models.CharField(max_length=10, choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")], default="pending")
    aadhar_reason = models.TextField(null=True, blank=True)

    pan_status = models.CharField(max_length=10, choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")], default="pending")
    pan_reason = models.TextField(null=True, blank=True)
    digital_signature = models.FileField(upload_to=digital_signature_upload_path, null=True, blank=True) 

    kya_verified = models.BooleanField(default=False)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

class DoctorFeeStructure(models.Model):
    """ Stores doctor fees and case paper rules per clinic """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE)
    # Core OPD Fees
    first_time_consultation_fee = models.DecimalField(max_digits=10, decimal_places=2)
    follow_up_fee = models.DecimalField(max_digits=10, decimal_places=2)
    case_paper_duration = models.PositiveIntegerField(help_text="Case paper validity in days")
    case_paper_renewal_fee = models.DecimalField(max_digits=10, decimal_places=2)

    # Additional Fees
    emergency_consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    online_consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    cancellation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    rescheduling_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    # Time-based surcharge
    night_consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    night_hours_start = models.TimeField(null=True, blank=True)
    night_hours_end = models.TimeField(null=True, blank=True)
    # Active Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['id']
        unique_together = ('doctor', 'clinic')  # Ensures one fee structure per doctor per clinic

    def __str__(self):
        return f"Fees for {self.doctor.get_name} at {self.clinic.name}"

class FollowUpPolicy(models.Model):
    """ Defines follow-up rules and history access for doctors """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE)

    follow_up_duration = models.PositiveIntegerField(help_text="Follow-up validity in days (e.g., 7, 15, 30)")
    follow_up_fee = models.DecimalField(max_digits=10, decimal_places=2)
    max_follow_up_visits = models.PositiveIntegerField(default=1, help_text="Maximum follow-ups allowed in duration")

    allow_online_follow_up = models.BooleanField(default=True, help_text="Can follow-up be done online?")
    online_follow_up_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    # Free Follow-up
    allow_free_follow_up = models.BooleanField(default=False)
    free_follow_up_days = models.PositiveIntegerField(null=True, blank=True)
    auto_apply_case_paper = models.BooleanField(default=True)
    # Patient History Access
    access_past_appointments = models.BooleanField(default=True, help_text="Can doctor view past visits?")
    access_past_prescriptions = models.BooleanField(default=True, help_text="Can doctor view old prescriptions?")
    access_past_reports = models.BooleanField(default=True, help_text="Can doctor view test reports?")
    access_other_clinic_history = models.BooleanField(default=False, help_text="Can doctor see history from other clinics?")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['-created_at']
        unique_together = ('doctor', 'clinic')  # Ensures follow-up policy is unique per doctor per clinic

    def __str__(self):
        return f"Follow-up policy for {self.doctor.get_name} at {self.clinic.name}"

class CancellationPolicy(models.Model):
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE)

    allow_cancellation = models.BooleanField(default=True)
    cancellation_window_hours = models.PositiveIntegerField(help_text="Before appointment")
    cancellation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    allow_refund = models.BooleanField(default=False)
    refund_percentage = models.PositiveIntegerField(default=0)

    rescheduling_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['-created_at']
        unique_together = ('doctor', 'clinic')  # Ensures one cancellation policy per doctor per clinic

    def __str__(self):
        return f"Cancellation policy for {self.doctor.get_name} at {self.clinic.name}"

class DoctorAvailability(models.Model):
    """ Stores OPD shifts with per-day working schedules """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE)

    # Working Days and Timing Slots (Stored as JSON)
    availability = models.JSONField(default=list, help_text="Stores day-wise availability")

    # Appointment Scheduling Rules
    slot_duration = models.PositiveIntegerField(default=10, help_text="Duration per patient (minutes)")
    buffer_time = models.PositiveIntegerField(default=5, help_text="Gap between appointments (minutes)")
    max_appointments_per_day = models.PositiveIntegerField(default=20, help_text="Daily limit")

    # Emergency Slots
    emergency_slots = models.PositiveIntegerField(default=2, help_text="Reserved emergency slots")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('doctor', 'clinic')  # Ensures one availability per doctor per clinic

    def __str__(self):
        return f"Availability for {self.doctor.full_name} at {self.clinic.name}"

    def generate_slots(self, start_time, end_time):
        """ Generate time slots for a given start and end time """
        if not start_time or not end_time:
            return []

        slots = []
        # Handle both "HH:MM" and "HH:MM:SS" formats
        try:
            if len(start_time.split(":")) == 2:
                start_time_obj = datetime.strptime(start_time, "%H:%M").time()
            else:
                start_time_obj = datetime.strptime(start_time, "%H:%M:%S").time()
        except (ValueError, AttributeError):
            return []
        
        try:
            if len(end_time.split(":")) == 2:
                end_time_obj = datetime.strptime(end_time, "%H:%M").time()
            else:
                end_time_obj = datetime.strptime(end_time, "%H:%M:%S").time()
        except (ValueError, AttributeError):
            return []
        
        current_time = datetime.combine(datetime.today(), start_time_obj)
        end_time_dt = datetime.combine(datetime.today(), end_time_obj)

        while current_time < end_time_dt:
            slot_start = current_time.time()
            current_time += timedelta(minutes=self.slot_duration + self.buffer_time)
            slot_end = current_time.time()

            if current_time <= end_time_dt:
                slots.append({"start": slot_start.strftime("%H:%M"), "end": slot_end.strftime("%H:%M")})
        
        return slots

    def get_all_slots(self):
        """ Get all available slots for each working day """
        all_slots = {}
        for day_data in self.availability:
            day = day_data.get("day")
            if not day:
                continue
            
            # Handle both old format (morning_start, morning_end) and new format (morning: {start, end})
            morning_start = None
            morning_end = None
            evening_start = None
            evening_end = None
            night_start = None
            night_end = None
            
            # Check for new nested format
            if isinstance(day_data.get("morning"), dict):
                morning_start = day_data["morning"].get("start")
                morning_end = day_data["morning"].get("end")
            else:
                # Old format
                morning_start = day_data.get("morning_start")
                morning_end = day_data.get("morning_end")
            
            if isinstance(day_data.get("evening"), dict):
                evening_start = day_data["evening"].get("start")
                evening_end = day_data["evening"].get("end")
            else:
                evening_start = day_data.get("evening_start")
                evening_end = day_data.get("evening_end")
            
            if isinstance(day_data.get("night"), dict):
                night_start = day_data["night"].get("start")
                night_end = day_data["night"].get("end")
            else:
                night_start = day_data.get("night_start")
                night_end = day_data.get("night_end")
            
            slots = {
                "morning": self.generate_slots(morning_start, morning_end) if morning_start and morning_end else [],
                "evening": self.generate_slots(evening_start, evening_end) if evening_start and evening_end else [],
                "night": self.generate_slots(night_start, night_end) if night_start and night_end else []
            }
            all_slots[day] = slots
        return all_slots

class DoctorLeave(models.Model):
    """ Stores doctor leave records for specific date ranges """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE, related_name="leaves")
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="clinic_leaves")
    
    start_date = models.DateField(help_text="Start date of the leave")
    end_date = models.DateField(help_text="End date of the leave")
    half_day = models.BooleanField(default=False, help_text="Is it a half-day leave?")
    leave_type = models.CharField(
        max_length=20,
        choices=[
            ("sick", "Sick Leave"),
            ("vacation", "Vacation"),
            ("emergency", "Emergency"),
            ("other", "Other"),
        ],
        default="other",
    )
    reason = models.TextField(blank=True, null=True, help_text="Optional reason for leave")
    approved = models.BooleanField(default=False, help_text="Is the leave approved?")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('doctor', 'clinic', 'start_date', 'end_date')  # Prevent duplicate entries
        ordering = ["-start_date"]
    
    def clean(self):
        if self.start_date > self.end_date:
            raise ValidationError("Start date cannot be after end date.")
    def __str__(self):
        return f"Leave from {self.start_date} to {self.end_date} for {self.doctor.get_name} at {self.clinic.name}"

    def clean(self):
        """ Ensure start_date is before or same as end_date """
        if self.start_date > self.end_date:
            raise ValidationError("Start date cannot be after end date")

class DoctorOPDStatus(models.Model):
    """ Tracks if a doctor is available in OPD (Live Status) """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    doctor = models.OneToOneField(doctor, on_delete=models.CASCADE, related_name='opd_status')
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='opd_status')
    
    is_available = models.BooleanField(default=False, help_text="True if doctor is in OPD, False if away")
    
    check_in_time = models.DateTimeField(null=True, blank=True, help_text="When doctor starts OPD")
    check_out_time = models.DateTimeField(null=True, blank=True, help_text="When doctor leaves OPD")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        unique_together = ('doctor', 'clinic')  # Ensures one fee structure per doctor per clinic
        indexes = [

            models.Index(fields=['doctor']),

            models.Index(fields=['clinic']),

            models.Index(fields=['is_available']),

        ]
    def __str__(self):
        status = "Available" if self.is_available else "Away"
        return f"Dr. {self.doctor.get_name} - {status}"

class DoctorSchedulingRules(models.Model):
    """
    Controls appointment booking behavior for a doctor in a clinic
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    doctor = models.ForeignKey(
        doctor,
        on_delete=models.CASCADE,
        related_name="scheduling_rules"
    )
    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.CASCADE,
        related_name="doctor_scheduling_rules"
    )

    # Booking Rules
    allow_same_day_appointments = models.BooleanField(default=True)
    allow_concurrent_appointments = models.BooleanField(default=False)
    max_concurrent_appointments = models.PositiveIntegerField(
        default=1,
        help_text="Used only if concurrent appointments are enabled"
    )

    # Patient Approval Rules
    require_approval_for_new_patients = models.BooleanField(default=False)
    auto_confirm_appointments = models.BooleanField(default=True)

    # Patient Actions
    allow_patient_rescheduling = models.BooleanField(default=True)
    reschedule_cutoff_hours = models.PositiveIntegerField(default=6)

    allow_patient_cancellation = models.BooleanField(default=True)
    cancellation_cutoff_hours = models.PositiveIntegerField(default=4)

    # Booking Window
    advance_booking_days = models.PositiveIntegerField(
        default=14,
        help_text="How many days in advance appointments can be booked"
    )

    # Emergency / Walk-in
    allow_emergency_slots = models.BooleanField(default=True)
    emergency_slots_per_day = models.PositiveIntegerField(default=2)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("doctor", "clinic")
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Scheduling Rules for {self.doctor.get_name()} @ {self.clinic.name}"

class DoctorMembership(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey("doctor.doctor", on_delete=models.CASCADE, related_name="memberships")
    organization_name = models.CharField(max_length=255, help_text="e.g., Indian Medical Association (IMA)")
    membership_id = models.CharField(max_length=100, blank=True, null=True)
    designation = models.CharField(max_length=100, blank=True, null=True, help_text="e.g., Life Member, Fellow")
    year_of_joining = models.PositiveIntegerField(blank=True, null=True)
    certificate = models.FileField(upload_to="doctor/memberships/", null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["organization_name"]

    def __str__(self):
        return f"{self.organization_name} - {self.membership_id or 'N/A'}"

class DoctorBankDetails(models.Model):
    doctor = models.ForeignKey(
        "doctor.doctor",
        on_delete=models.CASCADE,
        related_name="bank_accounts"
    )

    account_holder_name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=20)
    masked_account_number = models.CharField(
        max_length=20, editable=False, blank=True, null=True)

    ifsc_code = models.CharField(
        max_length=11,
        validators=[RegexValidator(
            regex=r"^[A-Z]{4}0[A-Z0-9]{6}$",
            message="Invalid IFSC code"
        )]
    )

    bank_name = models.CharField(max_length=255)
    branch_name = models.CharField(max_length=255, blank=True, null=True)

    upi_id = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        validators=[RegexValidator(
            regex=r"^[\w.-]+@[\w.-]+$",
            message="Invalid UPI ID"
        )]
    )

    verification_status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("verified", "Verified"), ("rejected", "Rejected")],
        default="pending"
    )

    verification_method = models.CharField(
        max_length=20,
        choices=[("manual", "Manual"), ("penny_drop", "Penny Drop"), ("upi", "UPI")],
        blank=True,
        null=True
    )

    verified_at = models.DateTimeField(blank=True, null=True)
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="verified_bank_accounts"
    )

    rejection_reason = models.TextField(blank=True, null=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.account_number:
            self.masked_account_number = f"XXXXXX{self.account_number[-4:]}"
        super().save(*args, **kwargs)
