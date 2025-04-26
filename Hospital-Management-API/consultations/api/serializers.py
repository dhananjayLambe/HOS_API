from rest_framework import serializers
from consultations.models import Consultation
from doctor.models import doctor
from patient_account.models import PatientProfile
from django.utils import timezone
from django.db import transaction

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
