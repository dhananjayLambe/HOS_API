from rest_framework import serializers
from consultations.models import Consultation
from doctor.models import doctor
from patient_account.models import PatientProfile
from django.utils import timezone
from django.db import transaction
from consultations.models import (
    Vitals, Complaint, Diagnosis,
    Advice, AdviceTemplate,
    Consultation)
from account.models import User
from utils.static_data_service import StaticDataService
from prescriptions.models import Prescription
from diagnostic.models import TestRecommendation, PackageRecommendation
from doctor.api.serializers import DoctorSerializer,DoctorSummarySerializer
from patient_account.api.serializers import PatientProfileSerializer
from diagnostic.api.serializers import (
    TestRecommendationSerializer,
    PackageRecommendationSerializer
)
from prescriptions.api.serializers import PrescriptionSerializer

class StartConsultationSerializer(serializers.ModelSerializer):
    patient_profile_id = serializers.UUIDField(write_only=True)
    doctor_id = serializers.UUIDField(write_only=True)
    reason = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Consultation
        fields = ["id", "consultation_pnr", "prescription_pnr", "doctor_id", "patient_profile_id", "started_at", "is_active", "reason"]
        read_only_fields = ["id", "consultation_pnr", "prescription_pnr", "started_at", "is_active"]

    def validate(self, attrs):
        doctor_id = attrs.get("doctor_id")
        patient_profile_id = attrs.get("patient_profile_id")

        try:
            doctor_obj = doctor.objects.get(id=doctor_id)
        except doctor.DoesNotExist:
            raise serializers.ValidationError({"doctor_id": "Doctor not found."})

        try:
            patient_profile_obj = PatientProfile.objects.get(id=patient_profile_id)
        except PatientProfile.DoesNotExist:
            raise serializers.ValidationError({"patient_profile_id": "Patient profile not found."})

        attrs["doctor_obj"] = doctor_obj
        attrs["patient_profile_obj"] = patient_profile_obj
        attrs["patient_account_obj"] = patient_profile_obj.account
        return attrs

    def create(self, validated_data):
        doctor = validated_data["doctor_obj"]
        patient_profile = validated_data["patient_profile_obj"]
        existing_consultation = Consultation.objects.filter(
            doctor=doctor,
            patient_profile=patient_profile,
            is_active=True
        ).first()

        if existing_consultation:
            return existing_consultation

        # Else create a new consultation
        with transaction.atomic():
            consultation = Consultation.objects.create(
                doctor=doctor,
                patient_profile=patient_profile,
                patient_account=validated_data["patient_account_obj"],
                started_at=timezone.now(),
                is_active=True
            )
            return consultation

class VitalsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vitals
        fields = ['height_cm', 'weight_kg', 'pulse', 'blood_pressure', 'temperature_c']

    def validate(self, attrs):
        bp = attrs.get("blood_pressure")
        if bp and "/" not in bp:
            raise serializers.ValidationError({"blood_pressure": "Blood pressure must be in format systolic/diastolic (e.g., 120/80)."})
        return attrs

class ComplaintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = [
            'id', 'complaint_text', 'duration', 'severity', 'is_general', 'doctor_note'
        ]
    def validate(self, data):
        consultation_id = self.context['consultation_id']
        existing_complaint = Complaint.objects.filter(consultation_id=consultation_id, complaint_text=data['complaint_text']).first()
        if existing_complaint:
            raise serializers.ValidationError('Complaint with the same details already exists for this consultation.')
        severity = data.get('severity')
        if severity and severity.lower() not in ['mild', 'moderate', 'severe']:
            raise serializers.ValidationError("Severity must be one of: mild, moderate, severe.")
        return data

class DiagnosisSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diagnosis
        fields = ['id', 'consultation', 'code', 'description', 'location', 'diagnosis_type', 'is_general', 'doctor_note', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_description(self, value):
        if not value:
            raise serializers.ValidationError("Description is required.")
        return value

    def validate_location(self, value):
        """
        Validate that the location is valid and part of the predefined choices.
        """
        if value and value not in [choice[0] for choice in StaticDataService.get_location_choices()]:
            raise serializers.ValidationError(f"Invalid location: {value}. Please select a valid location.")
        return value

    def validate_diagnosis_type(self, value):
        """
        Validate that the diagnosis type is valid.
        """
        if value not in [choice[0] for choice in StaticDataService.get_diagnosis_type_choices()]:
            raise serializers.ValidationError(f"Invalid diagnosis type: {value}. Please select a valid type.")
        return value

class AdviceTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdviceTemplate
        fields = ['id', 'description']

class AdviceSerializer(serializers.ModelSerializer):
    advice_templates = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=AdviceTemplate.objects.all(),
        required=False
    )

    class Meta:
        model = Advice
        fields = ['id', 'consultation', 'advice_templates', 'custom_advice', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'consultation']

    def validate(self, attrs):
        if not attrs.get('advice_templates') and not attrs.get('custom_advice'):
            raise serializers.ValidationError("Either 'advice_templates' or 'custom_advice' must be provided.")
        return attrs

class EndConsultationSerializer(serializers.Serializer):
    closure_note = serializers.CharField(required=False, allow_blank=True)
    follow_up_date = serializers.DateField(required=False, allow_null=True)
    confirm = serializers.BooleanField(required=False, default=False)

    def validate_closure_note(self, value):
        if not value.strip():
            raise serializers.ValidationError("Closure note cannot be empty.")
        return value

class ConsultationSummarySerializer(serializers.ModelSerializer):
    doctor = DoctorSummarySerializer()
    patient = PatientProfileSerializer(source='patient_profile')
    vitals = VitalsSerializer()
    complaints = ComplaintSerializer(many=True)
    diagnoses = DiagnosisSerializer(many=True)
    prescriptions = PrescriptionSerializer(many=True)
    advices = AdviceSerializer(many=True)
    test_recommendations = TestRecommendationSerializer(many=True)
    package_recommendations = PackageRecommendationSerializer(many=True)

    class Meta:
        model = Consultation
        fields = [
            'id', 'consultation_pnr', 'prescription_pnr', 'started_at', 'ended_at',
            'doctor', 'patient', 'follow_up_date', 'is_finalized',
            'vitals', 'complaints', 'diagnoses', 'prescriptions',
            'advices', 'test_recommendations', 'package_recommendations'
        ]