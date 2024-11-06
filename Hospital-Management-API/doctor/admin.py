from django.contrib import admin
from . models import doctor,DoctorAdditionalDetails
from patient.models import Appointment

# Register your models here.

class DoctorAppointment(admin.TabularInline):
    model=Appointment


admin.site.register(DoctorAdditionalDetails)

class doctorAdmin(admin.ModelAdmin):
    list_display=['get_name','department', 'address', 'mobile', 'user']
    inlines=[DoctorAppointment]


admin.site.register(doctor,doctorAdmin)
