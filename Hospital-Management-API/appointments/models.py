import uuid
from django.db import models
from clinic.models import Clinic
from doctor.models import doctor
from patient_account.models import PatientAccount,PatientProfile

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
    
    #patient wants to consult (In-clinic or Video)
    CONSULTATION_MODE_CHOICES = [
        ('clinic', 'Clinic Visit'),
        ('video', 'Video Consultation'),
    ]
    consultation_mode = models.CharField(
        max_length=10, choices=CONSULTATION_MODE_CHOICES, default='clinic'
    )
    # patient booked the appointment (Online or Walk-in)
    BOOKING_SOURCE_CHOICES = [
        ('online', 'Online Booking (App/Website)'),
        ('walk_in', 'Walk-In Booking (At Clinic)'),
    ]
    booking_source = models.CharField(
        max_length=10, choices=BOOKING_SOURCE_CHOICES, default='online'
    )
    APPOINTMENT_TYPE_CHOICES = [
        ("new", "New"),
        ("follow_up", "Follow-up"),
    ]
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    appointment_type = models.CharField(max_length=20, choices=APPOINTMENT_TYPE_CHOICES, default="new")
    previous_appointment = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Appointment for {self.patient_profile.first_name} with Dr. {self.doctor.get_name} on {self.appointment_date}"

#Additional Model Suggestions (Optional for Future Phases)
# AppointmentHistory Model – To track status changes of an appointment over time.
#Waiting List Model – If a time slot is full, maintain a waitlist system.