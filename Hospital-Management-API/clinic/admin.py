from django.contrib import admin
from .models import Clinic, ClinicAddress,\
    ClinicSpecialization,ClinicSchedule,ClinicService,\
    ClinicServiceList, ClinicAdminProfile

admin.site.register(Clinic)
admin.site.register(ClinicAddress)
admin.site.register(ClinicSpecialization)
admin.site.register(ClinicSchedule)
admin.site.register(ClinicService)
admin.site.register(ClinicServiceList)
admin.site.register(ClinicAdminProfile)
