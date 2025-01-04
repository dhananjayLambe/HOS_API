from django.db import models
#from django.contrib.auth.models import User
from account.models import User
import uuid

class Hospital(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Basic Information
    name = models.CharField(max_length=255, unique=True)
    hospital_type = models.CharField(max_length=255)  # Mandatory
    registration_number = models.CharField(max_length=255, unique=True)  # Mandatory
    owner_name = models.CharField(max_length=255)  # Mandatory
    owner_contact = models.CharField(max_length=15)  # Mandatory
    # Contact Details
    address = models.TextField()  # Mandatory
    contact_number = models.CharField(max_length=15)  # Mandatory
    email_address = models.EmailField(blank=True, null=True)  # Optional
    website_url = models.URLField(blank=True, null=True)  # Optional
    emergency_services = models.BooleanField(default=False)  # Mandatory
    created_at = models.DateTimeField(auto_now_add=True)  # Mandatory
    def __str__(self):
        
        return self.name

class HospitalLicensing(models.Model):
    hospital = models.OneToOneField(Hospital, on_delete=models.CASCADE, related_name="licensing")
    medical_license_details = models.CharField(max_length=255)  # Mandatory
    certifications = models.TextField(blank=True, null=True)  # Optional
    tax_information = models.CharField(max_length=255, blank=True, null=True)  # Optional

class HospitalOperationalDetails(models.Model):
    hospital = models.OneToOneField(Hospital, on_delete=models.CASCADE, related_name="operational_details")
    number_of_beds = models.IntegerField(blank=True, null=True)  # Optional
    departments_services_offered = models.TextField(blank=True, null=True)  # Optional
    hospital_timings = models.CharField(max_length=255, blank=True, null=True)  # Optional
    insurance_partnerships = models.TextField(blank=True, null=True)  # Optional

class HospitalStaffDetails(models.Model):
    hospital = models.OneToOneField(Hospital, on_delete=models.CASCADE, related_name="staff_details")
    doctors = models.IntegerField(blank=True, null=True)  # Optional
    nurses_and_technicians = models.IntegerField(blank=True, null=True)  # Optional
    administrative_staff = models.IntegerField(blank=True, null=True)  # Optional

class HospitalFacility(models.Model):
    hospital = models.OneToOneField(Hospital, on_delete=models.CASCADE, related_name="facility")
    available_facilities = models.TextField(blank=True, null=True)  # Optional
    medical_equipment = models.TextField(blank=True, null=True)  # Optional
    ambulance_services = models.TextField(blank=True, null=True)  # Optional

class HospitalDigitalInformation(models.Model):
    hospital = models.OneToOneField(Hospital, on_delete=models.CASCADE, related_name="digital_information")
    hospital_management_software = models.CharField(max_length=255, blank=True, null=True)  # Optional
    preferred_appointment_channels = models.CharField(max_length=255, blank=True, null=True)  # Optional
    patient_data_management = models.TextField(blank=True, null=True)  # Optional

class HospitalBillingInformation(models.Model):
    hospital = models.OneToOneField(Hospital, on_delete=models.CASCADE, related_name="billing_information")
    billing_practices = models.TextField(blank=True, null=True)  # Optional
    discount_policies = models.TextField(blank=True, null=True)  # Optional

class FrontDeskUser(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name="front_desk_users")
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} ({self.hospital.name})"
