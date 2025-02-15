from django.contrib import admin

# Register your models here.

from .models import PatientAccount, Address

admin.site.register(PatientAccount)
admin.site.register(Address)
