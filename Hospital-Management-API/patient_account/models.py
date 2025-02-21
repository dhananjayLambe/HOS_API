import uuid
from django.db import models
from account.models import User
from clinic.models import Clinic

# Choices for common fields
GENDER_CHOICES = [('Male', 'Male'), ('Female', 'Female'), ('Other', 'Other')]
BLOOD_GROUP_CHOICES = [
    ('A+', 'A+'), ('A-', 'A-'),
    ('B+', 'B+'), ('B-', 'B-'),
    ('AB+', 'AB+'), ('AB-', 'AB-'),
    ('O+', 'O+'), ('O-', 'O-')
]

# 1. Address: Stores address details, including Google mapping fields
class Address(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    street = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    pincode = models.CharField(max_length=10, blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)  # Google Maps Latitude
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)  # Google Maps Longitude
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.street}, {self.city}, {self.state}, {self.country}"

# 2. PatientAccount: Represents the primary account holder (based on mobile number)
class PatientAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    #username = models.CharField(max_length=15, unique=True)  # Mobile number
    user=models.OneToOneField(User,on_delete=models.CASCADE)
    clinics = models.ManyToManyField(Clinic, related_name='patients')
    alternate_mobile = models.CharField(max_length=15, blank=True, null=True)
    preferred_language = models.CharField(max_length=50, blank=True, null=True)  # Preferred communication language
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.username

# 3. PatientProfile: Represents individual profiles under a single account (e.g., family members)
class PatientProfile(models.Model):
    RELATION_CHOICES = [
        ("self", "Self"),
        ("spouse", "Spouse"),
        ("father", "Father"),
        ("mother", "Mother"),
        ("child", "Child"),
    ]
    GENDER_CHOICES = [("male", "Male"), ("female", "Female"), ("other", "Other")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(PatientAccount, related_name='profiles', on_delete=models.CASCADE)
    first_name = models.CharField(max_length=255,default="")
    last_name = models.CharField(max_length=255,default="")
    relation = models.CharField(max_length=10, choices=RELATION_CHOICES,default='self')
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    date_of_birth = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.full_name} ({self.relation})"

class PatientProfileDetails(models.Model):
    BLOOD_GROUP_CHOICES = [
        ("A+", "A+"), ("A-", "A-"), ("B+", "B+"), ("B-", "B-"),
        ("O+", "O+"), ("O-", "O-"), ("AB+", "AB+"), ("AB-", "AB-")
    ]

    profile = models.OneToOneField(PatientProfile, related_name="details", on_delete=models.CASCADE)
    profile_photo = models.ImageField(upload_to='patient_photos/', blank=True, null=True)
    age = models.PositiveIntegerField(blank=True, null=True)
    blood_group = models.CharField(max_length=5, choices=BLOOD_GROUP_CHOICES, blank=True, null=True)
    address = models.TextField(blank=True, null=True)  # Keeping address simple
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Details for {self.profile.full_name}"
    
#old one
# class PatientProfile(models.Model):
#     id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
#     account = models.ForeignKey(PatientAccount, related_name='profiles', on_delete=models.CASCADE)
#     name = models.CharField(max_length=255)
#     profile_photo = models.ImageField(upload_to='patient_photos/', blank=True, null=True)
#     gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
#     age = models.PositiveIntegerField(blank=True, null=True)
#     blood_group = models.CharField(max_length=5, choices=BLOOD_GROUP_CHOICES, blank=True)
#     date_of_birth = models.DateField(blank=True, null=True)
#     address = models.OneToOneField(Address, related_name='patient_profile', on_delete=models.SET_NULL, blank=True, null=True)
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)

#     def __str__(self):
#         return f"{self.name} ({self.account.username})"


# # 4. DoctorConnection: Represents connections between patients and doctors Keeps in Appoinement model
# # 4. DoctorConnection: Represents connections between patients and doctors
# class DoctorConnection(models.Model):
#     id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
#     patient_profile = models.ForeignKey(PatientProfile, related_name='doctor_connections', on_delete=models.CASCADE)
#     doctor = models.ForeignKey(doctor, related_name='patient_connections', on_delete=models.CASCADE)
#     doctor_id = models.PositiveIntegerField()  # Link to the doctor's ID (can be normalized with the Doctor model)
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)

#     def __str__(self):
#         return f"Connection: {self.patient_profile.name} -> Doctor ID {self.doctor_id}"

class MedicalHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient_profile = models.OneToOneField(
        PatientProfile, related_name="medical_history", on_delete=models.CASCADE
    )
    allergies = models.TextField(blank=True, null=True)  # Example: "Peanuts, Penicillin"
    chronic_conditions = models.TextField(blank=True, null=True)  # Example: "Diabetes, Hypertension"
    past_surgeries = models.TextField(blank=True, null=True)  # Example: "Appendectomy in 2015"
    ongoing_medications = models.TextField(blank=True, null=True)  # Example: "Metformin, Aspirin"
    immunizations = models.TextField(blank=True, null=True)  # Example: "COVID-19, Hepatitis B"
    family_history = models.TextField(blank=True, null=True)  # Example: "Heart disease, Cancer"
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Medical History for {self.patient_profile.name}"

class HealthMetrics(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient_profile = models.OneToOneField(
        PatientProfile, related_name="health_metrics", on_delete=models.CASCADE
    )
    
    # Body Measurements
    height = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)  # in cm
    weight = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)  # in kg
    bmi = models.DecimalField(max_digits=4, decimal_places=2, blank=True, null=True)  # Auto-calculated

    # Vital Signs
    blood_pressure = models.CharField(max_length=20, blank=True, null=True)  # Example: "120/80"
    heart_rate = models.PositiveIntegerField(blank=True, null=True)  # BPM
    temperature = models.DecimalField(max_digits=4, decimal_places=2, blank=True, null=True)  # in °C or °F
    respiratory_rate = models.PositiveIntegerField(blank=True, null=True)  # Breaths per minute
    oxygen_saturation = models.PositiveIntegerField(blank=True, null=True)  # SpO2 percentage

    # Metabolic Health
    glucose_level = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)  # mg/dL
    cholesterol_level = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)  # mg/dL
    hbA1c = models.DecimalField(max_digits=4, decimal_places=2, blank=True, null=True)  # %

    # Body Composition
    body_fat_percentage = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    muscle_mass = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    waist_to_hip_ratio = models.DecimalField(max_digits=4, decimal_places=2, blank=True, null=True)

    # Lifestyle
    sleep_duration = models.DecimalField(max_digits=3, decimal_places=1, blank=True, null=True)  # Hours
    daily_steps = models.PositiveIntegerField(blank=True, null=True)  # Steps taken
    physical_activity_level = models.CharField(
        max_length=50, blank=True, null=True, choices=[('Sedentary', 'Sedentary'), ('Active', 'Active'), ('Athletic', 'Athletic')]
    )

    # Women's Health
    menstrual_cycle_regular = models.BooleanField(default=True)  # If applicable
    pregnancy_status = models.BooleanField(default=False)  # If applicable

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Health Metrics for {self.patient_profile.name}"

# 6. AuditLog: Tracks changes or actions performed by patients for accountability
class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient_profile = models.ForeignKey(PatientProfile, related_name='audit_logs', on_delete=models.CASCADE)
    action = models.CharField(max_length=255)  # e.g., "Updated Profile", "Connected to Doctor"
    timestamp = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Audit: {self.action} on {self.timestamp}"

class OTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)