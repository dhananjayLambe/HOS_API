import uuid
from django.db import models
from clinic.models import Clinic
from doctor.models import doctor
from django.contrib.postgres.fields import ArrayField
from django.core.exceptions import ValidationError
from patient_account.models import PatientAccount,PatientProfile

#Patinets Appointments Related Models of Docotors

class DoctorAvailability(models.Model):
    """ Stores OPD shifts, working days, and scheduling policies """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE)

    # Working Days (Monday-Sunday)
    working_days = ArrayField(models.CharField(max_length=10, choices=[
        ("Monday", "Monday"), ("Tuesday", "Tuesday"), ("Wednesday", "Wednesday"),
        ("Thursday", "Thursday"), ("Friday", "Friday"), ("Saturday", "Saturday"),
        ("Sunday", "Sunday")
    ]), default=list)
    # Shift Timings
    morning_start = models.TimeField(null=True, blank=True)
    morning_end = models.TimeField(null=True, blank=True)
    evening_start = models.TimeField(null=True, blank=True)
    evening_end = models.TimeField(null=True, blank=True)
    night_start = models.TimeField(null=True, blank=True)
    night_end = models.TimeField(null=True, blank=True)

    # Break Time
    break_start = models.TimeField(null=True, blank=True, help_text="Lunch/Personal Break Start Time")
    break_end = models.TimeField(null=True, blank=True, help_text="Lunch/Personal Break End Time")

    # Appointment Scheduling Rules
    slot_duration = models.PositiveIntegerField(default=15, help_text="Consultation duration per patient (in minutes)")
    buffer_time = models.PositiveIntegerField(default=5, help_text="Gap between two appointments (in minutes)")
    max_appointments_per_day = models.PositiveIntegerField(default=20, help_text="Daily appointment limit")

    # Emergency Slot
    emergency_slots = models.PositiveIntegerField(default=2, help_text="Reserved slots for emergency cases")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        unique_together = ('doctor', 'clinic')  # Ensures one fee structure per doctor per clinic
    def __str__(self):
        return f"Availability of {self.doctor.full_name}"
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

class DoctorLeave(models.Model):
    """ Stores doctor leave records for specific date ranges """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE, related_name="leaves")
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name="clinic_leaves")
    
    start_date = models.DateField(help_text="Start date of the leave")
    end_date = models.DateField(help_text="End date of the leave")
    
    reason = models.TextField(blank=True, null=True, help_text="Optional reason for leave")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('doctor', 'clinic', 'start_date', 'end_date')  # Prevent duplicate entries

    def __str__(self):
        return f"Leave from {self.start_date} to {self.end_date} for {self.doctor.get_name} at {self.clinic.name}"

    def clean(self):
        """ Ensure start_date is before or same as end_date """
        if self.start_date > self.end_date:
            raise ValidationError("Start date cannot be after end date")

class DoctorFeeStructure(models.Model):
    """ Stores doctor fees and case paper rules per clinic """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE)
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE)

    first_time_consultation_fee = models.DecimalField(max_digits=10, decimal_places=2)
    follow_up_fee = models.DecimalField(max_digits=10, decimal_places=2)
    case_paper_duration = models.PositiveIntegerField(help_text="Case paper validity in days")
    case_paper_renewal_fee = models.DecimalField(max_digits=10, decimal_places=2)

    # Additional Fees
    emergency_consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    online_consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    cancellation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    rescheduling_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
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

    # Patient History Access
    access_past_appointments = models.BooleanField(default=True, help_text="Can doctor view past visits?")
    access_past_prescriptions = models.BooleanField(default=True, help_text="Can doctor view old prescriptions?")
    access_past_reports = models.BooleanField(default=True, help_text="Can doctor view test reports?")
    access_other_clinic_history = models.BooleanField(default=False, help_text="Can doctor see history from other clinics?")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        unique_together = ('doctor', 'clinic')  # Ensures follow-up policy is unique per doctor per clinic

    def __str__(self):
        return f"Follow-up policy for {self.doctor.get_name} at {self.clinic.name}"

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

    def __str__(self):
        status = "Available" if self.is_available else "Away"
        return f"Dr. {self.doctor.get_name} - {status}"

class Appointment(models.Model):
    """ Stores appointment details for a doctor and a specific patient profile """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    patient_account = models.ForeignKey(PatientAccount, on_delete=models.CASCADE, related_name='appointments')
    patient_profile = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name='appointments')
    
    doctor = models.ForeignKey(doctor, on_delete=models.CASCADE, related_name='appointments')
    clinic = models.ForeignKey(Clinic, on_delete=models.CASCADE, related_name='appointments')

    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    
    status_choices = [
        ('scheduled', 'Scheduled'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show')
    ]
    status = models.CharField(max_length=20, choices=status_choices, default='scheduled')
    
    payment_mode_choices = [
        ('CASH', 'Cash'),
        ('ONLINE', 'Online'),
    ]
    payment_mode = models.CharField(max_length=10, choices=payment_mode_choices, default='CASH')
    payment_status = models.BooleanField(default=False)  # True if paid
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Appointment for {self.patient_profile.first_name} with Dr. {self.doctor.get_name} on {self.appointment_date}"