from django.db import transaction
from django.utils import timezone

from rest_framework import serializers

from consultations.models import (
    Advice,
    AdviceTemplate,
    Complaint,
    Consultation,
    Diagnosis,
    PatientFeedback,
    Vitals,
)

from diagnostic.api.serializers import (
    PackageRecommendationSerializer,
    TestRecommendationSerializer,
)

from doctor.api.serializers import  DoctorSummarySerializer
from doctor.models import doctor

from patient_account.api.serializers import PatientProfileSerializer
from patient_account.models import PatientProfile

from prescriptions.api.serializers import PrescriptionSerializer

from utils.static_data_service import StaticDataService
from appointments.models import Appointment

class StartConsultationSerializer(serializers.ModelSerializer):
    patient_profile_id = serializers.UUIDField(write_only=True)
    doctor_id = serializers.UUIDField(write_only=True)
    reason = serializers.CharField(required=False, allow_blank=True, write_only=True)
    appointment_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Consultation
        fields = [
            "id", "consultation_pnr", "prescription_pnr",
            "doctor_id", "patient_profile_id", "appointment_id",
            "started_at", "is_active", "reason"
        ]
        read_only_fields = ["id", "consultation_pnr", "prescription_pnr", "started_at", "is_active"]

    def validate(self, attrs):
        doctor_id = attrs.get("doctor_id")
        patient_profile_id = attrs.get("patient_profile_id")
        appointment_id = attrs.get("appointment_id")

        try:
            doctor_obj = doctor.objects.get(id=doctor_id)
        except doctor.DoesNotExist:
            raise serializers.ValidationError({"doctor_id": "Doctor not found."})

        try:
            print("patient_profile_id:", patient_profile_id)
            patients_all = PatientProfile.objects.all()
            for patient in patients_all:
                print("Patient ID:", patient.id)
            print("patients_all:", patients_all)
            patient_profile_obj = PatientProfile.objects.get(id=patient_profile_id)
            print("patient_profile_obj:", patient_profile_obj)
        except PatientProfile.DoesNotExist:
            raise serializers.ValidationError({"patient_profile_id": "Patient profile not found."})

        attrs["doctor_obj"] = doctor_obj
        attrs["patient_profile_obj"] = patient_profile_obj
        attrs["patient_account_obj"] = patient_profile_obj.account

        # Appointment validation
        if appointment_id:
            try:
                appointment_obj = Appointment.objects.get(id=appointment_id)
            except Appointment.DoesNotExist:
                raise serializers.ValidationError({"appointment_id": "Appointment not found."})

            if appointment_obj.patient_profile != patient_profile_obj:
                raise serializers.ValidationError({"appointment_id": "Appointment does not belong to the patient."})

            # Optional: prevent duplicate consultation for the same appointment
            if Consultation.objects.filter(appointment=appointment_obj).exists():
                raise serializers.ValidationError({"appointment_id": "Consultation already exists for this appointment."})

            attrs["appointment_obj"] = appointment_obj

        return attrs

    def create(self, validated_data):
        doctor = validated_data["doctor_obj"]
        patient_profile = validated_data["patient_profile_obj"]
        patient_account = validated_data["patient_account_obj"]
        appointment = validated_data.get("appointment_obj", None)

        # Check for existing active consultation (optional: skip this if appointment is passed)
        existing_consultation = Consultation.objects.filter(
            doctor=doctor,
            patient_profile=patient_profile,
            is_active=True
        ).first()

        if existing_consultation:
            return existing_consultation

        with transaction.atomic():
            consultation = Consultation.objects.create(
                doctor=doctor,
                patient_profile=patient_profile,
                patient_account=patient_account,
                appointment=appointment,
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

# class ComplaintSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Complaint
#         fields = [
#             'id', 'complaint_text', 'duration', 'severity', 'is_general', 'doctor_note'
#         ]
#     def validate(self, data):
#         consultation_id = self.context['consultation_id']
#         existing_complaint = Complaint.objects.filter(consultation_id=consultation_id, complaint_text=data['complaint_text']).first()
#         if existing_complaint:
#             raise serializers.ValidationError('Complaint with the same details already exists for this consultation.')
#         severity = data.get('severity')
#         if severity and severity.lower() not in ['mild', 'moderate', 'severe']:
#             raise serializers.ValidationError("Severity must be one of: mild, moderate, severe.")
#         return data

class ComplaintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = [
            'id', 'complaint_text', 'duration', 'severity',
            'is_general', 'doctor_note', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        consultation_id = self.context.get('consultation_id')
        complaint_text = data.get('complaint_text')

        # Skip uniqueness check on PATCH where same value is reused
        if self.instance is None or (complaint_text and complaint_text != getattr(self.instance, 'complaint_text', None)):
            if Complaint.objects.filter(consultation_id=consultation_id, complaint_text=complaint_text).exists():
                raise serializers.ValidationError({
                    "complaint_text": "A complaint with this text already exists for this consultation."
                })

        severity = data.get('severity')
        if severity and severity.lower() not in ['mild', 'moderate', 'severe']:
            raise serializers.ValidationError({
                "severity": "Severity must be one of: mild, moderate, severe."
            })

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
        fields = ['id', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_description(self, value):
        qs = AdviceTemplate.objects.filter(description__iexact=value.strip())
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("Advice template with this description already exists.")
        return value.strip()

# class AdviceSerializer(serializers.ModelSerializer):
#     advice_templates = serializers.PrimaryKeyRelatedField(
#         many=True,
#         queryset=AdviceTemplate.objects.all(),
#         required=False
#     )

#     class Meta:
#         model = Advice
#         fields = ['id', 'consultation', 'advice_templates', 'custom_advice', 'created_at', 'updated_at']
#         read_only_fields = ['id', 'created_at', 'updated_at', 'consultation']

#     def validate(self, attrs):
#         if not attrs.get('advice_templates') and not attrs.get('custom_advice'):
#             raise serializers.ValidationError("Either 'advice_templates' or 'custom_advice' must be provided.")
#         return attrs


class AdviceSerializer(serializers.ModelSerializer):
    advice_templates = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=AdviceTemplate.objects.all(),
        required=False
    )

    class Meta:
        model = Advice
        fields = ['id', 'consultation', 'advice_templates', 'custom_advice', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

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

class ConsultationTagSerializer(serializers.ModelSerializer):
    tag = serializers.ChoiceField(choices=StaticDataService.get_consultation_tag_choices(), required=True)
    is_important = serializers.BooleanField(required=False)

    class Meta:
        model = Consultation
        fields = ['tag', 'is_important']

    def validate(self, data):
        # Optional: Add more complex business rules here
        return data

class PatientTimelineSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    primary_diagnosis = serializers.SerializerMethodField()
    prescription_summary = serializers.SerializerMethodField()
    complaints_summary = serializers.SerializerMethodField()

    class Meta:
        model = Consultation
        fields = [
            'id', 'started_at', 'tag', 'is_important', 'follow_up_date',
            'doctor_name', 'primary_diagnosis', 'prescription_summary', 'complaints_summary'
        ]

    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.user.get_full_name()}" if obj.doctor else "N/A"

    def get_primary_diagnosis(self, obj):
        diagnosis = obj.diagnoses.filter(diagnosis_type='confirmed').first()
        return diagnosis.description if diagnosis else None

    def get_prescription_summary(self, obj):
        return [f"{p.drug_name} {p.strength}" for p in obj.prescriptions.all()[:3]]

    def get_complaints_summary(self, obj):
        return [c.complaint_text for c in obj.complaints.all()[:3]]


class PatientFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientFeedback
        fields = [
            'id',
            'consultation',
            'rating',
            'comments',
            'is_anonymous',
            'created_at',
            'created_by',
        ]
        read_only_fields = ['id', 'created_at', 'created_by']
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)