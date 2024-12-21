from django.db import models
from django.db.models.fields import DateField
from account.models import User
import uuid
from django.conf import settings
from hospital_mgmt.models import Hospital


class doctor(models.Model):
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
    address= models.TextField()
    mobile=models.CharField(max_length=20)
    user=models.OneToOneField(User,on_delete=models.CASCADE)
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name="doctors")

    @property
    def get_name(self):
        return self.user.first_name+" "+self.user.last_name
    @property
    def get_id(self):
        return self.user.id
    def __str__(self):
        return "{} ({})".format(self.user.first_name,self.department)

class DoctorAdditionalDetails(models.Model):
    doctor = models.OneToOneField(doctor, on_delete=models.CASCADE, related_name="additional_details")
    medical_registration_number = models.CharField(max_length=100, unique=True, null=True, blank=True)
    registration_authority = models.CharField(max_length=100, null=True, blank=True)
    qualifications = models.TextField(null=True, blank=True)
    specialization = models.CharField(max_length=100, null=True, blank=True)
    clinic_name = models.CharField(max_length=255, null=True, blank=True)
    clinic_address = models.TextField(null=True, blank=True)
    consultation_timings = models.CharField(max_length=255, null=True, blank=True)
    telemedicine_capability = models.BooleanField(default=False)
    professional_indemnity_insurance = models.BooleanField(default=False)

    def __str__(self):
        return f"Additional details for {self.doctor.full_name}"




    