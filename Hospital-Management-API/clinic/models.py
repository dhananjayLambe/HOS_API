import uuid
from datetime import time
from django.db import models
from account.models import User
from django.utils import timezone

class Clinic(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Basic Information
    name = models.CharField(max_length=255,default='NA') #unique=True
    contact_number_primary = models.CharField(max_length=15,default='NA')  # Mandatory
    contact_number_secondary = models.CharField(max_length=15,default='NA')  # Mandatory
    email_address = models.EmailField(max_length=255,default='NA')  # Optional)  # Optional
    registration_number = models.CharField(max_length=255,unique=True, null=True, blank=True,default=None)  # Mandatory it should be unique
    gst_number = models.CharField(max_length=15, default='NA')  # Optional
    created_at = models.DateTimeField(auto_now_add=True)  # Mandatory
    updated_at = models.DateTimeField(auto_now=True)  # Mandatory
    def __str__(self):
        return self.name

class ClinicAddress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clinic = models.OneToOneField("Clinic", on_delete=models.CASCADE, related_name="address", unique=True)
    address = models.TextField(max_length=255, default='NA')
    address2 = models.TextField(max_length=255, default='NA')
    city = models.CharField(max_length=100, default='NA')
    state = models.CharField(max_length=100, default='NA')
    pincode = models.CharField(max_length=10, default='NA')
    country = models.CharField(max_length=100, default="India")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    google_place_id = models.CharField(max_length=255, blank=True, null=True)
    google_maps_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.address}, {self.city}, {self.state}, {self.pincode}"


class ClinicSpecialization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clinic = models.ForeignKey("Clinic", on_delete=models.CASCADE, related_name="specializations")
    specialization_name = models.CharField(max_length=255, default='NA')
    description = models.TextField(blank=True, null=True, default='NA')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('clinic', 'specialization_name')
    def __str__(self):
        return f"{self.specialization_name} - {self.clinic.name}"

class ClinicSchedule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clinic = models.OneToOneField(Clinic, on_delete=models.CASCADE, related_name="schedule")

    # Working Hours
    morning_start = models.TimeField(blank=True, null=True, default=time(9, 0))  # Default to 9:00 AM
    morning_end = models.TimeField(blank=True, null=True, default=time(12, 0))   # Default to 12:00 PM
    afternoon_start = models.TimeField(blank=True, null=True, default=time(13, 0))  # Default to 1:00 PM
    afternoon_end = models.TimeField(blank=True, null=True, default=time(17, 0))    # Default to 5:00 PM
    evening_start = models.TimeField(blank=True, null=True, default=time(18, 0))    # Default to 6:00 PM
    evening_end = models.TimeField(blank=True, null=True, default=time(21, 0))      # Default to 9:00 PM

    # Appointment Slot Details
    day_of_week = models.CharField(max_length=10, choices=[('Monday', 'Monday'), ('Tuesday', 'Tuesday'), ('Wednesday', 'Wednesday'), ('Thursday', 'Thursday'), ('Friday', 'Friday'), ('Saturday', 'Saturday'), ('Sunday', 'Sunday')],default='Monday')
    slot_duration = models.PositiveIntegerField(default=15)  # Slot duration in minutes (e.g., 15, 30)

    # Holidays and Special Dates
    holidays = models.JSONField(blank=True, null=True)  # Store holiday dates as a list
    special_dates = models.JSONField(blank=True, null=True)  # Special schedules for specific dates

    # Doctor Availability
    is_doctor_present = models.BooleanField(default=False)  # Indicates real-time doctor presence
    doctor_checkin_time = models.DateTimeField(blank=True, null=True)  # Check-in time for the day
    doctor_checkout_time = models.DateTimeField(blank=True, null=True)  # Check-out time for the day

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)  # Mandatory #auto_now_add=True,
    updated_at = models.DateTimeField(auto_now=True)  # Mandatory #auto_now=True,


    def __str__(self):
        return f"Schedule for {self.clinic.name}"

    def generate_slots(self, session_start, session_end):
        """
        Generate time slots for a given session based on slot duration.
        """
        from datetime import datetime, timedelta

        if not session_start or not session_end:
            return []

        slots = []
        current_time = datetime.combine(datetime.today(), session_start)
        end_time = datetime.combine(datetime.today(), session_end)

        while current_time < end_time:
            slot_start = current_time.time()
            current_time += timedelta(minutes=self.slot_duration)
            slot_end = current_time.time()

            if current_time <= end_time:
                slots.append((slot_start, slot_end))
        return slots

    def get_all_slots(self):
        """
        Get all available slots for morning, afternoon, and evening sessions.
        """
        all_slots = {
            "morning": self.generate_slots(self.morning_start, self.morning_end),
            "afternoon": self.generate_slots(self.afternoon_start, self.afternoon_end),
            "evening": self.generate_slots(self.evening_start, self.evening_end),
        }
        return all_slots

class ClinicService(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clinic = models.OneToOneField(Clinic, on_delete=models.CASCADE, related_name="services")

    # General Service Settings
    checkup_available = models.BooleanField(default=False)  # General check-up availability
    consultation_available = models.BooleanField(default=False)  # Consultation availability
    daycare_available = models.BooleanField(default=False)  # Daycare service availability
    followup_available = models.BooleanField(default=False)  # Follow-up service availability

    # Fees
    consultation_fees = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)  # Consultation fees
    followup_fees = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)  # Follow-up fees
    daycare_fees = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)  # Daycare fees

    # Case Paper Management
    case_paper_validity = models.PositiveIntegerField(blank=True, null=True, help_text="Validity in months")  
    case_paper_fees = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True, help_text="Fees for issuing new case paper")

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)  # Timestamp for creation
    updated_at = models.DateTimeField(auto_now=True)  # Timestamp for last update

    def __str__(self):
        return f"Services for {self.clinic.name}"

class ClinicServiceList(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="service_list")
    service_name = models.CharField(max_length=255)  # Name of the service
    service_description = models.TextField(blank=True, null=True)  # Description of the service
    service_fee = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)  # Fee for the service
    duration = models.PositiveIntegerField(blank=True, null=True, help_text="Duration of service in minutes")  # Duration in minutes

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.service_name} - {self.clinic.name}"

class ClinicAdminProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='clinic_admin_profile')
    clinic = models.OneToOneField(Clinic, on_delete=models.CASCADE, related_name='admin_profile')

    # KYA = Know Your Admin fields
    kya_completed = models.BooleanField(default=False)
    kya_verified = models.BooleanField(default=False)
    approval_date = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Clinic Admin: {self.user.get_full_name()} for {self.clinic.name}"


# class ClinicFrontDeskUser(models.Model):
#     id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
#     user = models.OneToOneField(User, on_delete=models.CASCADE)  # Link to Django's User model
#     clinic = models.ForeignKey(
#         Clinic,
#         on_delete=models.CASCADE,
#         related_name='clinic_helpdesk_users',
#         null=True,  # Allow nullable initially
#         blank=True,
#         default=None
#     )
#     role = models.CharField(
#         max_length=50,
#         default='helpdesk',
#         choices=[('helpdesk', 'Helpdesk')]
#     )  # Define specific roles for clarity and scalability
#     can_book_appointments = models.BooleanField(default=True)  # Permission to book appointments
#     can_add_patients = models.BooleanField(default=True)  # Permission to add patients
#     can_update_details = models.BooleanField(default=True)  # Permission to modify patient details
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)

#     def __str__(self):
#         return f"{self.user.username} ({self.clinic.name if self.clinic else 'No Clinic Assigned'})"

'''
class ClinicBilling(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="billing")
    patient = models.ForeignKey(patient, on_delete=models.CASCADE)  # Assumes a Patient model exists
    service = models.ForeignKey(ClinicServiceList, on_delete=models.CASCADE)  # Service availed
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_status = models.CharField(max_length=20, choices=[('paid', 'Paid'), ('unpaid', 'Unpaid'), ('pending', 'Pending')])
    payment_method = models.CharField(
        max_length=20,
        choices=[
            ('cash', 'Cash'),
            ('upi', 'UPI'),
            ('card', 'Card'),
            ('online', 'Online Transfer'),
            ('cheque', 'Cheque'),
            ('other', 'Other'),
        ],
        default='cash',
    )  # Payment method used
    payment_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Bill for {self.patient} at {self.clinic.name} - Amount: {self.amount} ({self.payment_method})"

class ClinicInsurance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="insurance")
    patient = models.ForeignKey(patient, on_delete=models.CASCADE)  # Assumes a Patient model exists
    insurance_provider = models.CharField(max_length=255)
    policy_number = models.CharField(max_length=100)
    coverage_details = models.TextField(blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Insurance for {self.patient} - {self.insurance_provider}"

class ClinicConsumables(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="consumables")
    patient = models.ForeignKey(patient, on_delete=models.CASCADE, related_name="consumables", blank=True, null=True)  # The patient who received the consumables
    item_name = models.CharField(max_length=255)  # Name of the consumable item
    item_description = models.TextField(blank=True, null=True)  # Additional details about the item
    quantity_used = models.PositiveIntegerField()  # Quantity provided to the patient
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)  # Cost per unit
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)  # Computed total cost
    usage_date = models.DateTimeField(auto_now_add=True)  # When the consumable was used
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Automatically calculate total_cost if unit_cost and quantity_used are provided
        if self.unit_cost and self.quantity_used:
            self.total_cost = self.unit_cost * self.quantity_used
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item_name} - {self.quantity_used} used for {self.patient or 'Unknown Patient'}"

class ClinicFeedback(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="feedback")
    patient = models.ForeignKey(patient, on_delete=models.CASCADE)  # Assumes a Patient model exists
    rating = models.IntegerField(choices=[(1, 'Poor'), (2, 'Fair'), (3, 'Good'), (4, 'Very Good'), (5, 'Excellent')])
    feedback_text = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Feedback from {self.patient} - Rating: {self.rating}"
'''