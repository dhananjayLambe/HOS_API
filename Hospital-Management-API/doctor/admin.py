from django.contrib import admin
from . models import doctor
#from patient.models import Appointment

# Register your models here.

# class DoctorAppointment(admin.TabularInline):
#     model=Appointment



# class doctorAdmin(admin.ModelAdmin):
#     list_display=['get_name',  'user'] #'mobile',
#     inlines=[DoctorAppointment]


admin.site.register(doctor)