from django.contrib import admin
from consultations.models import    (
    Vitals, Complaint, Diagnosis,
    Advice, AdviceTemplate)
# Register your models here.
admin.site.register(AdviceTemplate)