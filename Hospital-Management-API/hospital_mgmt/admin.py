from django.contrib import admin
from . models import (Hospital,HospitalLicensing,\
    HospitalBillingInformation,HospitalDigitalInformation,\
    HospitalFacility,HospitalOperationalDetails,\
    HospitalStaffDetails)
admin.site.register(Hospital)
admin.site.register(HospitalLicensing)
admin.site.register(HospitalBillingInformation)
admin.site.register(HospitalDigitalInformation)
admin.site.register(HospitalFacility)
admin.site.register(HospitalOperationalDetails)
admin.site.register(HospitalStaffDetails)
