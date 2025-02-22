import uuid
from django.db import models
from account.models import User
from clinic.models import Clinic
from django.utils.timezone import now

class doctor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    #Personal Information
    user=models.OneToOneField(User,on_delete=models.CASCADE)
    Cardiologist='CL'
    Dermatologists='DL'
    Emergency_Medicine_Specialists='EMC'
    Immunologists='IL'
    Anesthesiologists='AL'
    Colon_and_Rectal_Surgeons='CRS'

    #The first element in each tuple is the actual value to be set on the model, and the second element is the human-readable name. 
    department_choices=[(Cardiologist,'Cardiologist'),
        (Dermatologists,'Dermatologists'),
        (Emergency_Medicine_Specialists,'Emergency Medicine Specialists'),
        (Immunologists,'Immunologists'),
        (Anesthesiologists,'Anesthesiologists'),
        (Colon_and_Rectal_Surgeons,'Colon and Rectal Surgeons')
    ]
    department=models.CharField(max_length=3, choices=department_choices, default=Cardiologist)
    address= models.TextField(default="NA")
    mobile=models.CharField(max_length=20,default="NA")
    mobile_number = models.CharField(max_length=15, unique=True,default="NA")
    dob = models.DateField(verbose_name="Date of Birth", null=True, blank=True)
    about = models.TextField(blank=True, null=True, help_text="Short description displayed to patients")
    photo = models.ImageField(upload_to="doctor_photos/", blank=True, null=True)
    years_of_experience = models.PositiveIntegerField(default=1)
    # Relationships
    clinics = models.ManyToManyField(Clinic, related_name='doctors')
    created_at = models.DateTimeField(auto_now_add=True)  # Mandatory  default=timezone.now
    updated_at = models.DateTimeField(auto_now=True)  # Mandatory  default=timezone.now
    @property
    def get_name(self):
        return self.user.first_name+" "+self.user.last_name
    @property
    def get_id(self):
        return self.user.id
    def __str__(self):
        return "{} ({})".format(self.user.first_name,self.department)

class Registration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.OneToOneField(doctor, on_delete=models.CASCADE, related_name='registration')
    medical_registration_number = models.CharField(max_length=50, unique=True)
    medical_council = models.CharField(max_length=255, help_text="e.g., Medical Council of India")
    created_at = models.DateTimeField(auto_now_add=True)  # Mandatory  default=timezone.now
    updated_at = models.DateTimeField(auto_now=True)  # Mandatory  default=timezone.now

    def __str__(self):
        return f"{self.medical_registration_number} - {self.medical_council}"

class GovernmentID(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.OneToOneField(doctor, on_delete=models.CASCADE, related_name='government_ids')
    pan_card_number = models.CharField(max_length=10, unique=True)
    aadhar_card_number = models.CharField(max_length=12, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)  # Mandatory  default=timezone.now
    updated_at = models.DateTimeField(auto_now=True)  # Mandatory  default=timezone.now

    def __str__(self):
        return f"PAN: {self.pan_card_number}, Aadhar: {self.aadhar_card_number}"

class Education(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE, related_name='education')
    qualification = models.CharField(max_length=255, help_text="e.g., MBBS, MD")
    institute = models.CharField(max_length=255, help_text="Name of the institution")
    year_of_completion = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)  # Mandatory  default=timezone.now
    updated_at = models.DateTimeField(auto_now=True)  # Mandatory  default=timezone.now

    def __str__(self):
        return f"{self.qualification} - {self.institute} ({self.year_of_completion})"

class CustomSpecialization(models.Model):
    name = models.CharField(max_length=255, unique=True, help_text="Enter a custom specialization")
    description = models.TextField(blank=True, null=True, help_text="Provide a description if needed")
    created_at = models.DateTimeField(auto_now_add=True)  # Mandatory  default=timezone.now
    updated_at = models.DateTimeField(auto_now=True)  # Mandatory  default=timezone.now
    def __str__(self):
        return self.name

class Specialization(models.Model):
    # Define the list of specialties (same as before)
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

    # Fields for the model
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE, related_name='specializations')
    specialization = models.CharField(max_length=5, choices=SPECIALIZATION_CHOICES, blank=True, null=True)
    custom_specialization = models.ForeignKey(CustomSpecialization, on_delete=models.SET_NULL, null=True, blank=True, related_name="specializations")
    is_primary = models.BooleanField(default=False, help_text="Indicates if this is the primary displayed specialization")
    created_at = models.DateTimeField(auto_now_add=True)  # Mandatory  default=timezone.now
    updated_at = models.DateTimeField(auto_now=True)  # Mandatory  default=timezone.now

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

class DoctorLanguage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE, related_name='languages')
    language = models.CharField(max_length=50,default="NA", help_text="e.g., English, Hindi, Marathi")
    proficiency = models.CharField(max_length=50, choices=[('Basic', 'Basic'), ('Fluent', 'Fluent'), ('Native', 'Native')], default='Fluent')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.language} - {self.proficiency} ({self.doctor.get_name})"