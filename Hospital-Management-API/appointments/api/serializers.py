from rest_framework import serializers
from appointments.models import (
    Appointment,
    )
from django.utils.timezone import now, localdate
from django.utils import timezone
from doctor.models import DoctorLeave, DoctorFeeStructure

from django.utils.timezone import now, localdate, localtime
class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = '__all__'  # Includes all fields

class AppointmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = '__all__'

    def validate(self, data):
        doctor = data['doctor']
        clinic = data['clinic']
        patient_profile = data['patient_profile']
        appointment_date = data['appointment_date']
        appointment_time = data['appointment_time']
        consultation_mode = data.get('consultation_mode')
        booking_source = data.get('booking_source')

        today = timezone.localdate()
        now_time = timezone.localtime().time()

        # ✅ 1. Required fields
        if not consultation_mode:
            raise serializers.ValidationError({"consultation_mode": "Consultation mode is required."})
        if not booking_source:
            raise serializers.ValidationError({"booking_source": "Booking source is required."})

        # ✅ 2. Doctor-clinic association check
        if clinic not in doctor.clinics.all():
            raise serializers.ValidationError("Doctor is not associated with the selected clinic.")

        # ✅ 3. Prevent booking in the past
        if appointment_date < today:
            raise serializers.ValidationError("Appointment date cannot be in the past.")
        if appointment_date == today and appointment_time < now_time:
            raise serializers.ValidationError("Appointment time cannot be in the past.")

        # ✅ 4. Doctor on leave check
        leave_exists = DoctorLeave.objects.filter(
            doctor=doctor,
            clinic=clinic,
            start_date__lte=appointment_date,
            end_date__gte=appointment_date,
        ).exists()
        if leave_exists:
            raise serializers.ValidationError("Doctor is on leave for the selected date.")

        # ✅ 5. Prevent double booking (same time slot)
        if Appointment.objects.filter(
            doctor=doctor,
            clinic=clinic,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            status='scheduled'
        ).exists():
            raise serializers.ValidationError("Selected time slot is already booked.")

        # ✅ 6. Prevent multiple appointments same day with same time if previous is not cancelled/no_show
        conflict = Appointment.objects.filter(
            doctor=doctor,
            clinic=clinic,
            patient_profile=patient_profile,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
        ).exclude(status__in=['cancelled', 'no_show']).exists()
        if conflict:
            raise serializers.ValidationError("You already have an appointment with this doctor at this time.")

        return data

    def create(self, validated_data):
        doctor = validated_data["doctor"]
        clinic = validated_data["clinic"]
        patient_profile = validated_data["patient_profile"]
        appointment_date = validated_data["appointment_date"]

        # ✅ 7. Fee structure required
        fee_structure = DoctorFeeStructure.objects.filter(
            doctor=doctor, clinic=clinic
        ).first()
        if not fee_structure:
            raise serializers.ValidationError("Doctor fee structure is missing.")

        # ✅ 8. Determine if this is a follow-up
        last_appointment = Appointment.objects.filter(
            patient_profile=patient_profile,
            doctor=doctor,
            clinic=clinic,
            status='completed'
        ).order_by('-appointment_date').first()

        appointment_type = "new"
        consultation_fee = fee_structure.first_time_consultation_fee

        if last_appointment:
            delta_days = (appointment_date - last_appointment.appointment_date).days
            if delta_days <= fee_structure.case_paper_duration:
                appointment_type = "follow_up"
                consultation_fee = fee_structure.follow_up_fee

        # ✅ 9. Assign to validated_data
        validated_data["appointment_type"] = appointment_type
        validated_data["consultation_fee"] = consultation_fee

        return super().create(validated_data)


class AppointmentCancelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ['status']

    def update(self, instance, validated_data):
        instance.status = 'cancelled'
        instance.save()
        return instance

class AppointmentRescheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ['appointment_date', 'appointment_time']

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
            "payment_status"
        ]

class DoctorAppointmentFilterSerializer(serializers.Serializer):
    clinic_id = serializers.UUIDField(required=False)
    date_filter = serializers.ChoiceField(choices=["today", "tomorrow", "week", "custom"], required=True)
    custom_start_date = serializers.DateField(required=False)
    custom_end_date = serializers.DateField(required=False)
    appointment_status = serializers.ChoiceField(choices=["scheduled", "completed", "canceled"], required=False)
    payment_status = serializers.BooleanField(required=False)
    sort_by = serializers.ChoiceField(choices=["appointment_date", "appointment_time", "clinic_name"], required=False, default="appointment_date")
    page = serializers.IntegerField(min_value=1, required=False, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=50, required=False, default=10)

class PatientAppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = '__all__'  # Or specify only required fields

class PatientAppointmentFilterSerializer(serializers.Serializer):
    patient_account_id = serializers.UUIDField()
    patient_profile_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False
    )
    doctor_id = serializers.UUIDField(required=False)
    clinic_id = serializers.UUIDField(required=False)
    date_filter = serializers.ChoiceField(
        choices=["today", "tomorrow", "week", "custom"], required=False
    )
    custom_start_date = serializers.DateField(required=False)
    custom_end_date = serializers.DateField(required=False)
    appointment_status = serializers.ChoiceField(
        choices=["scheduled", "completed", "cancelled", "no_show"], required=False
    )
    payment_status = serializers.BooleanField(required=False)
    sort_by = serializers.ChoiceField(
        choices=["appointment_date", "appointment_time", "status", "clinic_name"],
        required=False,
        default="appointment_date"
    )
    page = serializers.IntegerField(required=False, default=1)
    page_size = serializers.IntegerField(required=False, default=10)

