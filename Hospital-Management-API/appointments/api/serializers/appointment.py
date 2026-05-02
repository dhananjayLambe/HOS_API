from datetime import datetime, timedelta

from django.conf import settings
from django.db import IntegrityError
from django.utils import timezone
from django.utils.timezone import localdate, localtime
from rest_framework import serializers

from appointments.models import Appointment, AppointmentHistory
from appointments.utils.booking_validation import (
    MAX_BOOKING_DAYS,
    err_doctor_on_leave,
    err_future_limit_exceeded,
    err_invalid_doctor_clinic,
    err_invalid_profile,
    err_invalid_slot_range,
    err_past_time,
    err_slot_conflict,
    err_wrong_patient_account,
    get_booking_source,
)
from doctor.models import DoctorFeeStructure, DoctorLeave, doctor
from patient_account.models import PatientAccount, PatientProfile
from clinic.models import Clinic


class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = "__all__"


class AppointmentCreateSerializer(serializers.Serializer):
    """POST /api/appointments/ — explicit booking payload (no Encounter / queue)."""

    patient_account_id = serializers.PrimaryKeyRelatedField(
        queryset=PatientAccount.objects.all(),
        source="patient_account",
    )
    patient_profile_id = serializers.PrimaryKeyRelatedField(
        queryset=PatientProfile.objects.all(),
        source="patient_profile",
    )
    doctor_id = serializers.PrimaryKeyRelatedField(
        queryset=doctor.objects.all(),
        source="doctor",
    )
    clinic_id = serializers.PrimaryKeyRelatedField(
        queryset=Clinic.objects.all(),
        source="clinic",
    )
    appointment_date = serializers.DateField()
    slot_start_time = serializers.TimeField()
    slot_end_time = serializers.TimeField()
    consultation_mode = serializers.ChoiceField(choices=["clinic", "video"])
    appointment_type = serializers.ChoiceField(choices=["new", "follow_up"])
    consultation_fee = serializers.DecimalField(max_digits=10, decimal_places=2)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        request = self.context.get("request")
        patient_account = attrs["patient_account"]
        patient_profile = attrs["patient_profile"]
        doc = attrs["doctor"]
        clinic = attrs["clinic"]
        appointment_date = attrs["appointment_date"]
        slot_start_time = attrs["slot_start_time"]
        slot_end_time = attrs["slot_end_time"]

        if patient_profile.account_id != patient_account.id:
            raise serializers.ValidationError({"patient_profile_id": err_invalid_profile()})

        if slot_start_time >= slot_end_time:
            raise serializers.ValidationError({"slot_start_time": err_invalid_slot_range()})

        if clinic not in doc.clinics.all():
            raise serializers.ValidationError({"clinic_id": err_invalid_doctor_clinic()})

        if DoctorLeave.objects.filter(
            doctor=doc,
            clinic=clinic,
            start_date__lte=appointment_date,
            end_date__gte=appointment_date,
        ).exists():
            raise serializers.ValidationError({"appointment_date": err_doctor_on_leave()})

        max_days = int(getattr(settings, "MAX_BOOKING_DAYS", MAX_BOOKING_DAYS))
        today = timezone.localdate()
        max_date = today + timedelta(days=max_days)
        if appointment_date > max_date:
            raise serializers.ValidationError(
                {"appointment_date": err_future_limit_exceeded(max_days)}
            )

        tz = timezone.get_current_timezone()
        appointment_datetime = timezone.make_aware(
            datetime.combine(appointment_date, slot_start_time),
            tz,
        )
        if appointment_datetime <= timezone.now():
            raise serializers.ValidationError({"appointment_date": err_past_time()})

        active_statuses = ["scheduled", "checked_in", "in_consultation"]
        if Appointment.objects.filter(
            doctor=doc,
            appointment_date=appointment_date,
            slot_start_time=slot_start_time,
            status__in=active_statuses,
        ).exists():
            raise serializers.ValidationError({"slot_start_time": err_slot_conflict()})

        if request and request.user.is_authenticated:
            if request.user.groups.filter(name="patient").exists():
                try:
                    own_account = PatientAccount.objects.get(user=request.user)
                except PatientAccount.DoesNotExist:
                    raise serializers.ValidationError({"patient_account_id": err_wrong_patient_account()})
                if patient_account.id != own_account.id:
                    raise serializers.ValidationError({"patient_account_id": err_wrong_patient_account()})

            hp = getattr(request.user, "helpdesk_profile", None)
            if hp is not None and clinic.id != hp.clinic_id:
                raise serializers.ValidationError({"clinic_id": err_invalid_doctor_clinic()})

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        notes = validated_data.get("notes") or ""
        if isinstance(notes, str) and not notes.strip():
            notes = ""

        payload = {
            "patient_account": validated_data["patient_account"],
            "patient_profile": validated_data["patient_profile"],
            "doctor": validated_data["doctor"],
            "clinic": validated_data["clinic"],
            "appointment_date": validated_data["appointment_date"],
            "slot_start_time": validated_data["slot_start_time"],
            "slot_end_time": validated_data["slot_end_time"],
            "consultation_mode": validated_data["consultation_mode"],
            "appointment_type": validated_data["appointment_type"],
            "consultation_fee": validated_data["consultation_fee"],
            "status": "scheduled",
            "booking_source": get_booking_source(request.user),
            "created_by": request.user,
            "notes": notes or None,
        }
        try:
            return Appointment.objects.create(**payload)
        except IntegrityError:
            raise serializers.ValidationError({"slot_start_time": err_slot_conflict()})


class AppointmentCreatedResponseSerializer(serializers.Serializer):
    """201 response body for appointment create."""

    def to_representation(self, instance):
        return {
            "id": str(instance.id),
            "patient_name": instance.patient_profile.get_full_name(),
            "doctor_name": instance.doctor.get_name,
            "appointment_date": instance.appointment_date.isoformat(),
            "slot_start_time": instance.slot_start_time.strftime("%H:%M:%S"),
            "status": instance.status,
        }


class AppointmentCancelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ["status"]

    def update(self, instance, validated_data):
        instance.status = "cancelled"
        instance.save()
        return instance


class AppointmentRescheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ["appointment_date", "appointment_time"]

    def validate(self, data):
        appointment_date = data.get("appointment_date")
        appointment_time = data.get("appointment_time")

        if not appointment_date or not appointment_time:
            raise serializers.ValidationError("Both appointment_date and appointment_time are required.")

        today = localdate()
        now_time = localtime().time()

        if appointment_date < today:
            raise serializers.ValidationError("Appointment date cannot be in the past.")
        if appointment_date == today and appointment_time < now_time:
            raise serializers.ValidationError("Appointment time cannot be in the past.")

        return data


class DoctorAppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    patient_profile_id = serializers.UUIDField(source="patient.id", read_only=True)
    clinic_name = serializers.CharField(source="clinic.name", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient_name",
            "patient_profile_id",
            "clinic_name",
            "appointment_date",
            "appointment_time",
            "consultation_mode",
            "booking_source",
            "status",
            "payment_mode",
            "payment_status",
        ]


class DoctorAppointmentFilterSerializer(serializers.Serializer):
    clinic_id = serializers.UUIDField(required=False)
    date_filter = serializers.ChoiceField(choices=["today", "tomorrow", "week", "custom"], required=True)
    custom_start_date = serializers.DateField(required=False)
    custom_end_date = serializers.DateField(required=False)
    appointment_status = serializers.ChoiceField(choices=["scheduled", "completed", "canceled"], required=False)
    payment_status = serializers.BooleanField(required=False)
    sort_by = serializers.ChoiceField(
        choices=["appointment_date", "appointment_time", "clinic_name"],
        required=False,
        default="appointment_date",
    )
    page = serializers.IntegerField(min_value=1, required=False, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=50, required=False, default=10)


class PatientAppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = "__all__"


class PatientAppointmentFilterSerializer(serializers.Serializer):
    patient_account_id = serializers.UUIDField()
    patient_profile_ids = serializers.ListField(child=serializers.UUIDField(), required=False)
    doctor_id = serializers.UUIDField(required=False)
    clinic_id = serializers.UUIDField(required=False)
    date_filter = serializers.ChoiceField(choices=["today", "tomorrow", "week", "custom"], required=False)
    custom_start_date = serializers.DateField(required=False)
    custom_end_date = serializers.DateField(required=False)
    appointment_status = serializers.ChoiceField(
        choices=["scheduled", "completed", "cancelled", "no_show"],
        required=False,
    )
    payment_status = serializers.BooleanField(required=False)
    sort_by = serializers.ChoiceField(
        choices=["appointment_date", "appointment_time", "status", "clinic_name"],
        required=False,
        default="appointment_date",
    )
    page = serializers.IntegerField(required=False, default=1)
    page_size = serializers.IntegerField(required=False, default=10)


class AppointmentHistorySerializer(serializers.ModelSerializer):
    changed_by = serializers.SerializerMethodField()

    class Meta:
        model = AppointmentHistory
        fields = ["status", "changed_by", "comment", "timestamp"]

    def get_changed_by(self, obj):
        if obj.changed_by:
            return f"{obj.changed_by.first_name} {obj.changed_by.last_name}"
        return "System"


class AppointmentStatusUpdateSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=True)
    status = serializers.ChoiceField(choices=["completed", "no_show"], required=True)
    comment = serializers.CharField(required=False, allow_blank=True)


class WalkInAppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ["patient_account", "patient_profile", "doctor", "clinic", "appointment_time", "appointment_date"]

    def validate(self, data):
        doctor = data["doctor"]
        clinic = data["clinic"]
        appointment_date = data.get("appointment_date", timezone.localdate())
        appointment_time = data.get("appointment_time")
        patient_profile = data["patient_profile"]

        today = timezone.localdate()
        now_time = timezone.localtime().time()

        if appointment_date < today:
            raise serializers.ValidationError("Appointment date cannot be in the past.")
        if appointment_date == today and appointment_time and appointment_time < now_time:
            raise serializers.ValidationError("Appointment time cannot be in the past.")

        if clinic not in doctor.clinics.all():
            raise serializers.ValidationError("Doctor is not associated with the selected clinic.")

        if DoctorLeave.objects.filter(
            doctor=doctor,
            clinic=clinic,
            start_date__lte=appointment_date,
            end_date__gte=appointment_date,
        ).exists():
            raise serializers.ValidationError("Doctor is on leave on selected date.")

        if appointment_time and Appointment.objects.filter(
            doctor=doctor,
            clinic=clinic,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            status="scheduled",
        ).exists():
            raise serializers.ValidationError("Selected time slot is already booked.")

        return data

    def create(self, validated_data):
        doctor = validated_data["doctor"]
        clinic = validated_data["clinic"]
        patient_profile = validated_data["patient_profile"]
        appointment_date = validated_data.get("appointment_date", timezone.localdate())

        fee_structure = DoctorFeeStructure.objects.filter(doctor=doctor, clinic=clinic).first()
        if not fee_structure:
            raise serializers.ValidationError("Doctor fee structure is missing.")

        last_appointment = (
            Appointment.objects.filter(
                patient_profile=patient_profile,
                doctor=doctor,
                clinic=clinic,
                status="completed",
            )
            .order_by("-appointment_date")
            .first()
        )

        appointment_type = "new"
        consultation_fee = fee_structure.first_time_consultation_fee

        if last_appointment:
            delta_days = (appointment_date - last_appointment.appointment_date).days
            if delta_days <= fee_structure.case_paper_duration:
                appointment_type = "follow_up"
                consultation_fee = fee_structure.follow_up_fee

        validated_data["appointment_type"] = appointment_type
        validated_data["consultation_fee"] = consultation_fee
        validated_data["booking_source"] = "walk_in"
        validated_data["consultation_mode"] = "clinic"

        return super().create(validated_data)
