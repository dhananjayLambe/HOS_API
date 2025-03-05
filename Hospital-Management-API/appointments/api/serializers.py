from rest_framework import serializers
from appointments.models import DoctorAvailability,Appointment

class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    slots = serializers.SerializerMethodField()

    class Meta:
        model = DoctorAvailability
        fields = "__all__"

    def get_slots(self, obj):
        return obj.get_all_slots()

class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = '__all__'  # Includes all fields

class AppointmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        #fields = ['patient_account', 'patient_profile', 'doctor', 'clinic', 'appointment_date', 'appointment_time', 'payment_mode']
        fields = '__all__'  # Includes all fields

    def validate(self, data):
        """ Validate if the appointment slot is available """
        doctor = data['doctor']
        clinic = data['clinic']
        appointment_date = data['appointment_date']
        appointment_time = data['appointment_time']


        # Check if doctor is associated with the clinic
        if clinic not in doctor.clinics.all():
            raise serializers.ValidationError("Doctor is not associated with the selected clinic.")

        # Check if doctor is on leave NEED TO Correct it
        # if doctor.doctoravailability.filter(date=appointment_date, is_leave=True).exists():
        #     raise serializers.ValidationError("Doctor is on leave on the selected date.")

        if Appointment.objects.filter(
            doctor=doctor, clinic=clinic, appointment_date=appointment_date, appointment_time=appointment_time, status='scheduled'
        ).exists():
            raise serializers.ValidationError("Selected time slot is already booked.")

        return data

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

    def update(self, instance, validated_data):
        new_date = validated_data.get('appointment_date', instance.appointment_date)
        new_time = validated_data.get('appointment_time', instance.appointment_time)

        # Check if the new time slot is available
        if Appointment.objects.filter(
            doctor=instance.doctor, clinic=instance.clinic, appointment_date=new_date,
            appointment_time=new_time, status='scheduled'
        ).exists():
            raise serializers.ValidationError("The selected time slot is already booked.")

        instance.appointment_date = new_date
        instance.appointment_time = new_time
        instance.save()
        return instance

# class PatientAppointmentSerializer(serializers.ModelSerializer):
#     doctor_id = serializers.UUIDField(source="doctor.id", read_only=True)
#     doctor_name = serializers.CharField(source="doctor.full_name", read_only=True)
#     clinic_id = serializers.UUIDField(source="clinic.id", read_only=True)
#     clinic_name = serializers.CharField(source="clinic.name", read_only=True)

#     class Meta:
#         model = Appointment
#         fields = [
#             "id",
#             "doctor_id",
#             "doctor_name",
#             "clinic_id",
#             "clinic_name",
#             "appointment_date",
#             "appointment_time",
#             "status",
#             "payment_mode",
#             "payment_status"
#         ]

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
    patient_account_id = serializers.UUIDField(required=True)
    patient_profile_ids = serializers.ListField(child=serializers.UUIDField(), required=False)
    doctor_id = serializers.UUIDField(required=False)
    clinic_id = serializers.UUIDField(required=False)
    date_filter = serializers.ChoiceField(choices=['today', 'tomorrow', 'week', 'custom'], required=False)
    custom_start_date = serializers.DateField(required=False)
    custom_end_date = serializers.DateField(required=False)
    appointment_status = serializers.ChoiceField(choices=['scheduled', 'cancelled', 'completed'], required=False)
    payment_status = serializers.BooleanField(required=False)
    sort_by = serializers.ChoiceField(choices=['appointment_date', 'appointment_time', 'status', 'clinic'], required=False, default='appointment_date')
    page = serializers.IntegerField(required=False, default=1)
    page_size = serializers.IntegerField(required=False, default=10)