from django.contrib.auth.models import Group
from django.db import transaction

from rest_framework import serializers

from account.models import User
from clinic.models import Clinic
from doctor.models import (
    Award,
    Certification,
    DoctorFeedback,
    DoctorService,
    DoctorSocialLink,
    Education,
    GovernmentID,
    Registration,
    Specialization,
    doctor,
)
from hospital_mgmt.models import Hospital
from helpdesk.models import HelpdeskClinicUser

class UserSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "first_name", "last_name", "password", "password2"]

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        validated_data.pop("password2")
        user = User.objects.create_user(
            username=validated_data["username"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            password=validated_data["password"],
            status=False
        )
        group_doctor, created = Group.objects.get_or_create(name='doctor')
        group_doctor.user_set.add(user)
        return user

class ProfileSerializer(serializers.ModelSerializer):
    hospital_id = serializers.PrimaryKeyRelatedField(queryset=Hospital.objects.all(), source="hospital")

    class Meta:
        model = doctor
        fields = [ "hospital_id",'secondary_mobile_number']

    def create(self, validated_data):
        return doctor.objects.create(**validated_data)

# Doctor Serializer
class DoctorSerializer(serializers.ModelSerializer):
    #user = UserSerializer(read_only=True)
    username = serializers.ReadOnlyField(source="user.username")
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    email = serializers.EmailField(source='user.email', required=False)


    class Meta:
        model = doctor
        fields = ['id', 'username', 'first_name', 'last_name', 'email','secondary_mobile_number']
        #fields=['id', 'username', 'first_name', 'last_name', 'status', 'hospital_id', 'mobile','created_at']

class DoctorRegistrationSerializer(serializers.Serializer):
    user_data = UserSerializer()
    profile_data = ProfileSerializer()

    def create(self, validated_data):
        # Extract nested data
        user_data = validated_data.pop("user_data")
        profile_data = validated_data.pop("profile_data")

        # Create User
        user = UserSerializer().create(user_data)

        # Add the created user to profile data
        profile_data["user"] = user

        # Create Doctor Profile
        doctor_profile = ProfileSerializer().create(profile_data)
        return doctor_profile

# class patientHistorySerializerDoctorView(serializers.Serializer):
#     Cardiologist='CL'
#     Dermatologists='DL'
#     Emergency_Medicine_Specialists='EMC'
#     Immunologists='IL'
#     Anesthesiologists='AL'
#     Colon_and_Rectal_Surgeons='CRS'
#     admit_date=serializers.DateField(label="Admit Date:", read_only=True)
#     symptomps=serializers.CharField(label="Symptomps:", style={'base_template': 'textarea.html'})
#     #department=serializers.CharField(label='Department: ')
#     #required=False; if this field is not required to be present during deserialization.
#     release_date=serializers.DateField(label="Release Date:", required=False)
#     assigned_doctor=serializers.StringRelatedField(label='Assigned Doctor:')

# class doctorAppointmentSerializer(serializers.Serializer):
#     patient_name=serializers.SerializerMethodField('related_patient_name')
#     patient_age=serializers.SerializerMethodField('related_patient_age')
#     appointment_date=serializers.DateField(label="Appointment Date:",)
#     appointment_time=serializers.TimeField(label="Appointment Time:")
#     patient_history=patientHistorySerializerDoctorView(label='patient History:')
    

#     def related_patient_name(self, obj):
#         return obj.patient_history.patient.get_name
    
#     def related_patient_age(self, obj):
#         return obj.patient_history.patient.age

class RegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Registration
        fields = '__all__'

class GovernmentIDSerializer(serializers.ModelSerializer):
    class Meta:
        model = GovernmentID
        fields = '__all__'

class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = '__all__'

class SpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = '__all__'

class AwardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Award
        fields = '__all__'

class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = '__all__'

class DoctorFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorFeedback
        fields = '__all__'

class DoctorServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorService
        fields = '__all__'

class DoctorSocialLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorSocialLink
        fields = '__all__'

class DoctorRegistrationSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    email = serializers.EmailField(source='user.email', required=False)
    password = serializers.CharField(source='user.password', write_only=True)
    #clinics = serializers.PrimaryKeyRelatedField(queryset=Clinic.objects.all(), many=True)
    clinics = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
        error_messages={
            "required": "The doctor must be associated with at least one clinic.",
            "empty": "Clinics list cannot be empty.",
        }
    )

    class Meta:
        model = doctor
        fields = [
            'username', 'password', 'first_name', 'last_name', 'email', 'clinics'
            ,  'dob', 'about', 'photo','secondary_mobile_number'
        ]
        extra_kwargs = {
            "password": {"write_only": True}
        }

    def validate(self, data):
        username = data['user']['username']
        if not username.isdigit() or len(username) != 10:
            raise serializers.ValidationError({"username": "Username must be a 10-digit mobile number."})
        return data

    @transaction.atomic
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        password = user_data.pop('password')
        user = User.objects.create(**user_data)
        user.set_password(password)
        user.save()
        clinics_data = validated_data.pop("clinics")

        doctor_instance = doctor.objects.create(user=user, **validated_data)
        #doctor_instance.clinics.set(validated_data['clinics'])
        # Handle ManyToMany relationship
        clinics = Clinic.objects.filter(id__in=clinics_data)
        doctor_instance.clinics.set(clinics)

        return doctor_instance

class DoctorProfileUpdateSerializer(serializers.ModelSerializer):
    education = EducationSerializer(many=True, required=False)
    certifications = CertificationSerializer(many=True, required=False)
    government_ids = GovernmentIDSerializer(required=False)
    services = DoctorServiceSerializer(many=True, required=False)
    awards = AwardSerializer(many=True, required=False)
    social_links = DoctorSocialLinkSerializer(many=True, required=False)
    specializations = SpecializationSerializer(many=True, required=False)

    class Meta:
        model = doctor
        fields = '__all__'

    def update(self, instance, validated_data):
        nested_fields = [
            'education', 'languages', 'certifications', 'services', 
            'awards', 'social_links', 'specializations'
        ]

        for field in nested_fields:
            if field in validated_data:
                nested_data = validated_data.pop(field)
                related_manager = getattr(instance, field)
                related_manager.all().delete()
                for item in nested_data:
                    related_manager.create(**item)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

class DoctorDetailsSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    username = serializers.CharField(source='user.username')

    class Meta:
        model = doctor
        fields = ['id', 'first_name', 'last_name', 'username',  'dob', 'years_of_experience','secondary_mobile_number']

class HelpdeskUserApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "username", "is_active"]

    def update(self, instance, validated_data):
        """Approve Helpdesk user by setting is_active to True"""
        instance.is_active = validated_data.get("is_active", instance.is_active)
        instance.save()
        return instance

class PendingHelpdeskUserSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    username = serializers.CharField(source="user.username")  # Mobile number as login
    email = serializers.EmailField(source="user.email", required=False)
    clinic_name = serializers.CharField(source="clinic.name")

    class Meta:
        model = HelpdeskClinicUser
        fields = ["id", "first_name", "last_name", "username", "email", "clinic_name"]

class HelpdeskApprovalSerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(choices=[("approved", "Approved"), ("rejected", "Rejected")], write_only=True)

    class Meta:
        model = HelpdeskClinicUser
        fields = ["id", "user", "clinic", "status"]
        read_only_fields = ["id", "user", "clinic"]

    def update(self, instance, validated_data):
        """Approve or Reject a helpdesk user"""
        status = validated_data.get("status")

        if status == "approved":
            instance.user.is_active = True  # Activate user
            instance.user.status = True
        elif status == "rejected":
            instance.user.is_active = False  # Keep inactive
            instance.user.delete()  # Optionally delete user if rejected

        instance.user.save()
        return instance
