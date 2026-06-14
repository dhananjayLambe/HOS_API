"""Serializers for helpdesk clinical visits API."""

from rest_framework import serializers


class ClinicalVisitListItemSerializer(serializers.Serializer):
    visit_id = serializers.UUIDField()
    visit_pnr = serializers.CharField()
    started_at = serializers.DateTimeField(allow_null=True)
    patient_name = serializers.CharField()
    patient_age = serializers.IntegerField(allow_null=True)
    patient_gender = serializers.CharField()
    patient_mobile = serializers.CharField()
    patient_uhid = serializers.CharField()
    doctor_name = serializers.CharField()
    doctor_id = serializers.UUIDField(allow_null=True)
    visit_type = serializers.CharField()
    status = serializers.CharField()
    has_prescription = serializers.BooleanField()
    prescription_id = serializers.UUIDField(allow_null=True)
    tests_count = serializers.IntegerField()
    reports_count = serializers.IntegerField()


class ClinicalVisitsDashboardSummarySerializer(serializers.Serializer):
    today_visits = serializers.IntegerField()
    completed_visits = serializers.IntegerField()
    followups = serializers.IntegerField()


class ClinicalVisitDetailSerializer(serializers.Serializer):
    visit_id = serializers.UUIDField()
    visit_pnr = serializers.CharField()
    consultation_id = serializers.UUIDField(allow_null=True)
    prescription_id = serializers.UUIDField(allow_null=True)
    patient = serializers.DictField()
    visit = serializers.DictField()
    clinical_summary = serializers.DictField()
    prescription_lines = serializers.ListField()
    tests_advised = serializers.ListField()
    reports = serializers.ListField()
    has_prescription = serializers.BooleanField()
    tests_count = serializers.IntegerField()
    reports_count = serializers.IntegerField()
