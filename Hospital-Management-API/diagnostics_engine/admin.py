from django.contrib import admin

from diagnostics_engine.models import (
    DiagnosisTestMapping,
    SymptomTestMapping,
)


@admin.register(DiagnosisTestMapping)
class DiagnosisTestMappingAdmin(admin.ModelAdmin):
    list_display = ("diagnosis", "service", "rule_type", "weight", "is_active", "ordering")
    list_filter = ("rule_type", "is_active")
    search_fields = ("diagnosis__label", "diagnosis__icd10_code", "service__name", "service__code")
    raw_id_fields = ("diagnosis", "service", "created_by", "updated_by")


@admin.register(SymptomTestMapping)
class SymptomTestMappingAdmin(admin.ModelAdmin):
    list_display = ("symptom", "service", "rule_type", "weight", "is_active", "ordering")
    list_filter = ("rule_type", "is_active")
    search_fields = ("symptom__display_name", "symptom__code", "service__name", "service__code")
    raw_id_fields = ("symptom", "service", "created_by", "updated_by")
