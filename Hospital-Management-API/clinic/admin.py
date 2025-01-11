from django.contrib import admin
from .models import Clinic, ClinicAddress,\
    ClinicSpecialization,ClinicSchedule,ClinicService,\
    ClinicServiceList,ClinicFeedback,\
    ClinicBilling, ClinicInsurance

admin.site.register(Clinic)
admin.site.register(ClinicAddress)
admin.site.register(ClinicSpecialization)
admin.site.register(ClinicSchedule)
admin.site.register(ClinicService)
admin.site.register(ClinicServiceList)
admin.site.register(ClinicFeedback)
admin.site.register(ClinicBilling)
admin.site.register(ClinicInsurance)