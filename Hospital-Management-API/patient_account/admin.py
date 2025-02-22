from django.contrib import admin
from patient_account.models import (
    Address, PatientAccount, PatientProfile, PatientProfileDetails,
    MedicalHistory, HealthMetrics, AuditLog, OTP,PatientAccount,Address
)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('street', 'city', 'state', 'country', 'pincode')
    search_fields = ('street', 'city', 'state', 'pincode')

class PatientAccountAdmin(admin.ModelAdmin):
    list_display = ('user', 'alternate_mobile', 'preferred_language', 'created_at')
    search_fields = ('user__username', 'alternate_mobile')
    list_filter = ('preferred_language', 'clinics')
    filter_horizontal = ('clinics',)

class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'relation', 'gender', 'date_of_birth', 'account')
    search_fields = ('first_name', 'last_name', 'account__user__username')
    list_filter = ('relation', 'gender')

class PatientProfileDetailsAdmin(admin.ModelAdmin):
    list_display = ('profile', 'profile_photo', 'age', 'blood_group', 'address')
    search_fields = ('profile__first_name', 'profile__last_name', 'blood_group')

class MedicalHistoryAdmin(admin.ModelAdmin):
    list_display = ('patient_profile', 'allergies', 'chronic_conditions', 'past_surgeries')
    search_fields = ('patient_profile__first_name', 'patient_profile__last_name')

class HealthMetricsAdmin(admin.ModelAdmin):
    list_display = ('patient_profile', 'height', 'weight', 'bmi', 'blood_pressure', 'heart_rate', 'glucose_level')
    search_fields = ('patient_profile__first_name', 'patient_profile__last_name')

class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('patient_profile', 'action', 'timestamp')
    search_fields = ('patient_profile__first_name', 'patient_profile__last_name', 'action')

class OTPAdmin(admin.ModelAdmin):
    list_display = ('user', 'otp', 'is_verified', 'created_at')
    search_fields = ('user__username',)

# Register Models
admin.site.register(Address, AddressAdmin)
admin.site.register(PatientAccount, PatientAccountAdmin)
admin.site.register(PatientProfile, PatientProfileAdmin)
admin.site.register(PatientProfileDetails, PatientProfileDetailsAdmin)
admin.site.register(MedicalHistory, MedicalHistoryAdmin)
admin.site.register(HealthMetrics, HealthMetricsAdmin)
admin.site.register(AuditLog, AuditLogAdmin)
admin.site.register(OTP, OTPAdmin)

class AuditLogAdmin(admin.ModelAdmin):
    readonly_fields = ('patient_profile', 'action', 'timestamp')

class PatientProfileInline(admin.TabularInline):
    model = PatientProfile
    extra = 1  # Allows adding multiple profiles

class PatientAccountAdmin(admin.ModelAdmin):
    inlines = [PatientProfileInline]


