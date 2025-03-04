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

class PatientAppointmentSerializer(serializers.ModelSerializer):
    doctor_id = serializers.UUIDField(source="doctor.id", read_only=True)
    doctor_name = serializers.CharField(source="doctor.full_name", read_only=True)
    clinic_id = serializers.UUIDField(source="clinic.id", read_only=True)
    clinic_name = serializers.CharField(source="clinic.name", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "doctor_id",
            "doctor_name",
            "clinic_id",
            "clinic_name",
            "appointment_date",
            "appointment_time",
            "status",
            "payment_mode",
            "payment_status"
        ]