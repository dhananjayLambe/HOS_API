from datetime import date, datetime, timedelta
from django.contrib.auth.models import Group
from django.db import transaction
from django.utils import timezone

from rest_framework import serializers
from django.utils import timezone

from account.models import User
from clinic.models import Clinic
from doctor.models import (
    Award,DoctorAddress,Certification, DoctorFeedback,
    DoctorService,DoctorSocialLink, Education, GovernmentID,
    Registration, Specialization, CustomSpecialization,
    doctor,KYCStatus,DoctorFeeStructure,FollowUpPolicy,DoctorAvailability,DoctorLeave,
    DoctorOPDStatus
)
from hospital_mgmt.models import Hospital
from helpdesk.models import HelpdeskClinicUser
from account.models import User


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

class RegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Registration
        fields = ['id','medical_registration_number', 'medical_council', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_medical_registration_number(self, value):
        if Registration.objects.filter(medical_registration_number=value).exclude(doctor=self.context['request'].user.doctor).exists():
            raise serializers.ValidationError("This medical registration number is already in use.")
        return value

class GovernmentIDSerializer(serializers.ModelSerializer):
    class Meta:
        model = GovernmentID
        fields = [
            'id', 'pan_card_number', 'aadhar_card_number','created_at', 'updated_at'
        ]

    def validate_pan_card_number(self, value):
        if len(value) != 10:
            raise serializers.ValidationError("PAN card number must be 10 characters long.")
        return value.upper()

    def validate_aadhar_card_number(self, value):
        if len(value) != 12 or not value.isdigit():
            raise serializers.ValidationError("Aadhar card number must be a 12-digit number.")
        return value

class DoctorAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorAddress
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'doctor']

class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = ['id', 'qualification', 'institute', 'year_of_completion', 'created_at', 'updated_at']

    def create(self, validated_data):
        request = self.context['request']
        validated_data['doctor'] = request.user.doctor
        return super().create(validated_data)
    
    def validate(self, attrs):
        doctor = self.context['request'].user.doctor
        if Education.objects.filter(
            doctor=doctor,
            qualification=attrs.get('qualification'),
            institute=attrs.get('institute'),
            year_of_completion=attrs.get('year_of_completion')
        ).exists():
            raise serializers.ValidationError("Duplicate education entry already exists.")
        return attrs

class CustomSpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomSpecialization
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']

    def validate_name(self, value):
        if CustomSpecialization.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("Custom specialization with this name already exists.")
        return value


class SpecializationSerializer(serializers.ModelSerializer):
    specialization_display = serializers.CharField(source='get_specialization_display', read_only=True)

    class Meta:
        model = Specialization
        fields = [
            'id', 'specialization', 'specialization_display', 'custom_specialization',
            'is_primary', 'created_at', 'updated_at'
        ]

    def validate(self, attrs):
        doctor = self.context['request'].user.doctor
        specialization = attrs.get('specialization')
        custom_specialization = attrs.get('custom_specialization')

        if not specialization and not custom_specialization:
            raise serializers.ValidationError("Either specialization or custom_specialization must be provided.")

        if Specialization.objects.filter(
            doctor=doctor,
            specialization=specialization,
            custom_specialization=custom_specialization
        ).exists():
            raise serializers.ValidationError("Duplicate specialization entry for this doctor.")

        return attrs

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
    government_ids = GovernmentIDSerializer(required=False, source='government_id')
    services = DoctorServiceSerializer(many=True, required=False)
    awards = AwardSerializer(many=True, required=False)
    social_links = DoctorSocialLinkSerializer(many=True, required=False)
    specializations = SpecializationSerializer(many=True, required=False)
    registration = RegistrationSerializer(required=False)

    class Meta:
        model = doctor
        fields = '__all__'
        #extra_fields = ['government_id']

    def update(self, instance, validated_data):
        nested_fields = [
            'education', 'languages', 'certifications', 'services', 
            'awards', 'social_links', 'specializations','government_ids',
            'registration'
        ]
        if 'registration' in validated_data:
            registration_data = validated_data.pop('registration')
            try:
                registration = instance.registration
            except Registration.DoesNotExist:
                registration = Registration.objects.create(doctor=instance)
            registration.medical_registration_number = registration_data.get('medical_registration_number', '')
            registration.medical_council = registration_data.get('medical_council', '')
            registration.save()
        for field in nested_fields:            
            if field in validated_data:
                nested_data = validated_data.pop(field)
                related_manager = getattr(instance, field)
                if field == 'government_ids':
                    related_manager = instance.government_id
                    if nested_data:
                        related_manager.pan_card_number = nested_data['pan_card_number']
                        related_manager.aadhar_card_number = nested_data['aadhar_card_number']
                        related_manager.save()
                else:
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

class DoctorSummarySerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    registration = serializers.SerializerMethodField()
    education = serializers.SerializerMethodField()
    specializations = serializers.SerializerMethodField()
    secondary_mobile_number = serializers.CharField()
    designation = serializers.CharField(source='user.designation', default='', read_only=True)  # optional
    class Meta:
        model = doctor
        fields = [
            'id',
            'user',
            'title',
            'secondary_mobile_number',
            'designation',
            'registration',
            'education',
            'specializations',
        ]

    def get_user(self, obj):
        user = obj.user
        return {
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email
        }

    def get_registration(self, obj):
        if hasattr(obj, 'registration'):
            return {
                'medical_registration_number': obj.registration.medical_registration_number,
                'medical_council': obj.registration.medical_council
            }
        return None

    def get_education(self, obj):
        return [{'qualification': edu.qualification} for edu in obj.education.all()]

    def get_specializations(self, obj):
        return [
            {
                'specialization': s.get_specialization_display(),
                'custom_specialization': s.custom_specialization.name if s.custom_specialization else ''
            }
            for s in obj.specializations.all()
        ]

class SpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = [
            'id', 'specialization', 'custom_specialization',
            'is_primary', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        request = self.context['request']
        doctor = request.user.doctor  # assuming OneToOneField from User to Doctor
        specialization = attrs.get('specialization')
        custom_specialization = attrs.get('custom_specialization')

        if not specialization and not custom_specialization:
            raise serializers.ValidationError("Either specialization or custom_specialization must be provided.")

        # Prevent duplicate specialization
        if self.instance is None:  # Creation
            if specialization:
                if Specialization.objects.filter(doctor=doctor, specialization=specialization).exists():
                    raise serializers.ValidationError("Specialization already exists.")
            elif custom_specialization:
                if Specialization.objects.filter(doctor=doctor, custom_specialization=custom_specialization).exists():
                    raise serializers.ValidationError("Custom specialization already exists.")
        return attrs

    def create(self, validated_data):
        doctor = self.context['request'].user.doctor
        return Specialization.objects.create(doctor=doctor, **validated_data)

    def update(self, instance, validated_data):
        # Partial update handled by DRF automatically
        return super().update(instance, validated_data)

class CustomSpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomSpecialization
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_name(self, value):
        qs = CustomSpecialization.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("Custom specialization with this name already exists.")
        return value

class DoctorServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorService
        fields = ['id', 'name', 'description', 'fee', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_name(self, value):
        doctor = self.context['request'].user.doctor
        qs = DoctorService.objects.filter(name__iexact=value, doctor=doctor)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("This service already exists for the doctor.")
        return value

class AwardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Award
        fields = ['id', 'name', 'description', 'awarded_by', 'date_awarded', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        doctor = self.context['request'].user.doctor
        name = data.get('name')
        awarded_by = data.get('awarded_by')
        date_awarded = data.get('date_awarded')

        qs = Award.objects.filter(doctor=doctor, name__iexact=name, awarded_by__iexact=awarded_by, date_awarded=date_awarded)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("This award already exists for this doctor.")
        return data

class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = ['id', 'title', 'issued_by', 'date_of_issue', 'expiry_date', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        doctor = self.context['request'].user.doctor
        title = data.get('title')
        issued_by = data.get('issued_by')
        date_of_issue = data.get('date_of_issue')

        qs = Certification.objects.filter(doctor=doctor, title__iexact=title, issued_by__iexact=issued_by, date_of_issue=date_of_issue)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("This certification already exists for this doctor.")
        return data

class DoctorDashboardSummarySerializer(serializers.Serializer):
    total_patients_today = serializers.IntegerField()
    total_consultations = serializers.IntegerField()
    pending_followups = serializers.IntegerField()
    average_consultation_time_minutes = serializers.FloatField()
    upcoming_appointments = serializers.IntegerField()
    new_patients_today = serializers.IntegerField()
    cancelled_appointments_today = serializers.IntegerField()
    patients_waiting_now = serializers.IntegerField()
    total_consultation_time_minutes = serializers.FloatField()
    total_revenue_today = serializers.FloatField()
    last_consultation_end_time = serializers.DateTimeField(allow_null=True)
    average_patient_rating = serializers.FloatField()
    total_prescriptions_issued = serializers.IntegerField()


class RegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Registration
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_verified', 'verification_notes', 'doctor']

    def validate_medical_registration_number(self, value):
        """
        Ensure the registration number is unique across all doctors.
        """
        request = self.context.get('request')
        doctor = getattr(request.user, 'doctor', None) if request else None

        if doctor and Registration.objects.exclude(doctor=doctor).filter(medical_registration_number=value).exists():
            raise serializers.ValidationError("This medical registration number is already in use.")
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        doctor = getattr(request.user, 'doctor', None) if request else None
        if doctor and Registration.objects.filter(doctor=doctor).exists():
            raise serializers.ValidationError("A registration already exists for this doctor.")

        validated_data['doctor'] = doctor
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get('request')
        doctor = getattr(request.user, 'doctor', None) if request else None

        if 'medical_registration_number' in validated_data:
            reg_no = validated_data['medical_registration_number']
            if Registration.objects.exclude(pk=instance.pk).filter(medical_registration_number=reg_no).exists():
                raise serializers.ValidationError("This medical registration number is already in use by another doctor.")

        return super().update(instance, validated_data)


class DoctorDetailSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = doctor
        fields = ['id', 'user',   'is_approved']

    def get_user(self, obj):
        return {
            "id": obj.user.id,
            "username": obj.user.username,
            "email": obj.user.email,
            "first_name": obj.user.first_name,
            "last_name": obj.user.last_name,
           
        }

class DoctorApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = doctor
        fields = ['is_approved']

class DoctorProfilePhotoUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = doctor
        fields = ['photo']

    def validate_photo(self, value):
        if value is None:
            raise serializers.ValidationError("No file was provided.")

        if value.size > 2 * 1024 * 1024:
            raise serializers.ValidationError("Image size must be less than 2MB.")

        if not value.name.lower().endswith(('.jpg', '.jpeg', '.png')):
            raise serializers.ValidationError("Only .jpg, .jpeg, and .png files are allowed.")

        return value


class DoctorProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    email = serializers.EmailField(source='user.email')
    mobile = serializers.CharField(source='user.username')
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = doctor
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'mobile',
            'dob',
            'about',
            'years_of_experience',
            'photo_url'
        ]

    def get_photo_url(self, obj):
        request = self.context.get('request')
        if obj.photo:
            return request.build_absolute_uri(obj.photo.url)
        return None

class RegistrationDocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Registration
        fields = ['medical_registration_number', 'medical_council', 'registration_certificate']

    def validate_registration_certificate(self, value):
        if value is None:
            raise serializers.ValidationError("No file uploaded.")

        if not hasattr(value, 'size'):
            raise serializers.ValidationError("Invalid file or corrupt upload.")

        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("File size must be under 5MB.")

        valid_extensions = ['pdf', 'jpg', 'jpeg', 'png']
        ext = value.name.split('.')[-1].lower()
        if ext not in valid_extensions:
            raise serializers.ValidationError("Only PDF, JPG, JPEG, PNG files are allowed.")

        return value

    def update(self, instance, validated_data):
        # Delete old file if exists
        if validated_data.get('registration_certificate') and instance.registration_certificate:
            instance.registration_certificate.delete(save=False)

        return super().update(instance, validated_data)


class EducationCertificateUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = ['id', 'qualification', 'institute', 'year_of_completion', 'certificate']
        read_only_fields = ['id']

    def validate_certificate(self, value):
        if value is None:
            raise serializers.ValidationError("No file uploaded.")

        if not hasattr(value, 'size'):
            raise serializers.ValidationError("Invalid or corrupt file.")

        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("File size must be under 5MB.")

        valid_extensions = ['pdf', 'jpg', 'jpeg', 'png']
        ext = value.name.split('.')[-1].lower()
        if ext not in valid_extensions:
            raise serializers.ValidationError("Only PDF, JPG, JPEG, PNG files are allowed.")

        return value

    def update(self, instance, validated_data):
        if validated_data.get('certificate') and instance.certificate:
            instance.certificate.delete(save=False)
        return super().update(instance, validated_data)


class GovernmentIDUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = GovernmentID
        fields = [
            'pan_card_number', 'aadhar_card_number',
            'pan_card_file', 'aadhar_card_file'
        ]

    def validate(self, data):
        pan_file = data.get("pan_card_file")
        aadhaar_file = data.get("aadhar_card_file")

        if pan_file and pan_file.size > 2 * 1024 * 1024:
            raise serializers.ValidationError({"pan_card_file": "PAN file size should be under 2MB."})

        if aadhaar_file and aadhaar_file.size > 2 * 1024 * 1024:
            raise serializers.ValidationError({"aadhar_card_file": "Aadhar file size should be under 2MB."})

        return data

    def update(self, instance, validated_data):
        # Optional: delete old files
        if validated_data.get("pan_card_file") and instance.pan_card_file:
            instance.pan_card_file.delete(save=False)
        if validated_data.get("aadhar_card_file") and instance.aadhar_card_file:
            instance.aadhar_card_file.delete(save=False)

        return super().update(instance, validated_data)

class KYCStatusSerializer(serializers.ModelSerializer):
    kyc_status = serializers.SerializerMethodField()
    sections = serializers.SerializerMethodField()

    class Meta:
        model = doctor
        fields = ['id', 'kyc_completed', 'kyc_verified', 'kyc_status', 'sections']

    def get_kyc_status(self, obj):
        if not obj.kyc_completed:
            return "Incomplete"
        if not obj.kyc_verified:
            return "Pending Verification"
        return "Verified"

    def get_sections(self, obj):
        reg_cert_uploaded = hasattr(obj, 'registration') and bool(obj.registration.registration_certificate)
        reg_verified = hasattr(obj, 'registration') and obj.registration.is_verified
        gov_id = getattr(obj, 'government_ids', None)

        return {
            "photo_uploaded": bool(obj.photo),
            "registration_verified": reg_verified,
            "registration_certificate_uploaded": reg_cert_uploaded,
            "pan_uploaded": bool(gov_id and gov_id.pan_card_file),
            "aadhar_uploaded": bool(gov_id and gov_id.aadhar_card_file),
            "education_uploaded": obj.education.exists()
        }

class KYCVerifySerializer(serializers.ModelSerializer):
    registration_status = serializers.ChoiceField(
        choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")]
    )
    education_status = serializers.ChoiceField(
        choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")]
    )
    pan_status = serializers.ChoiceField(
        choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")]
    )
    aadhar_status = serializers.ChoiceField(
        choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")]
    )
    photo_status = serializers.ChoiceField(
        choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")]
    )

    rejection_reasons = serializers.DictField(
        child=serializers.CharField(allow_blank=True, required=False),
        required=False
    )

    class Meta:
        model = KYCStatus
        fields = [
            "registration_status",
            "education_status",
            "pan_status",
            "aadhar_status",
            "photo_status",
            "rejection_reasons",
        ]

    def update(self, instance, validated_data):
        # Set statuses
        for field in [
            "registration_status", "education_status", "pan_status",
            "aadhar_status", "photo_status"
        ]:
            setattr(instance, field, validated_data.get(field, getattr(instance, field)))

        # Set rejection reasons if any
        reasons = validated_data.get("rejection_reasons", {})
        for key, reason in reasons.items():
            field_name = f"{key}_reason"
            if hasattr(instance, field_name):
                setattr(instance, field_name, reason)

        # Determine overall verification
        if all(
            getattr(instance, f) == "approved"
            for f in [
                "registration_status", "education_status", "pan_status",
                "aadhar_status", "photo_status"
            ]
        ):
            instance.kya_verified = True
        else:
            instance.kya_verified = False

        instance.save()
        return instance


class DoctorSearchSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    specializations = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    clinics = serializers.SerializerMethodField()
    avg_fee = serializers.SerializerMethodField()

    class Meta:
        model = doctor
        fields = ["id", "full_name", "specializations", "photo_url", "years_of_experience", "clinics", "avg_fee"]

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"

    def get_specializations(self, obj):
        return [s.get_specialization_display() for s in obj.specializations.all() if s.specialization]

    def get_photo_url(self, obj):
        request = self.context.get("request")
        if obj.photo and hasattr(obj.photo, "url"):
            return request.build_absolute_uri(obj.photo.url)
        return None

    def get_clinics(self, obj):
        return [clinic.name for clinic in obj.clinics.all()]

    def get_avg_fee(self, obj):
        fees = obj.services.values_list("fee", flat=True)
        if fees:
            return round(sum(fees) / len(fees), 2)
        return 0.0


class DoctorFeeStructureSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorFeeStructure
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    def validate(self, attrs):
        doctor = attrs.get("doctor")
        clinic = attrs.get("clinic")
        if self.instance:
            # for updates
            if DoctorFeeStructure.objects.exclude(pk=self.instance.pk).filter(doctor=doctor, clinic=clinic).exists():
                raise serializers.ValidationError("Fee structure for this doctor and clinic already exists.")
        else:
            # for create
            if DoctorFeeStructure.objects.filter(doctor=doctor, clinic=clinic).exists():
                raise serializers.ValidationError("Fee structure for this doctor and clinic already exists.")
        return attrs

class FollowUpPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowUpPolicy
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    def validate(self, attrs):
        if attrs.get('follow_up_fee', 0) < 0:
            raise serializers.ValidationError("Follow-up fee cannot be negative.")
        if attrs.get('online_follow_up_fee', 0) < 0:
            raise serializers.ValidationError("Online follow-up fee cannot be negative.")
        if attrs.get('follow_up_duration', 0) <= 0:
            raise serializers.ValidationError("Follow-up duration must be a positive number.")
        if attrs.get('max_follow_up_visits', 0) <= 0:
            raise serializers.ValidationError("Max follow-up visits must be a positive number.")

        doctor = attrs.get('doctor')
        clinic = attrs.get('clinic')

        # Ensure unique policy per doctor-clinic combination
        existing = FollowUpPolicy.objects.filter(doctor=doctor, clinic=clinic)
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
        if existing.exists():
            raise serializers.ValidationError("A follow-up policy already exists for this doctor and clinic.")

        return attrs



class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    slots = serializers.SerializerMethodField()

    class Meta:
        model = DoctorAvailability
        fields = "__all__"

    def get_slots(self, obj):
        return obj.get_all_slots()
    
    def validate(self, attrs):
        # For PATCH requests, we may need instance values
        instance = self.instance

        doctor = attrs.get("doctor", getattr(instance, "doctor", None))
        clinic = attrs.get("clinic", getattr(instance, "clinic", None))

        if doctor and clinic:
            existing = DoctorAvailability.objects.filter(doctor=doctor, clinic=clinic)
            if instance:
                existing = existing.exclude(id=instance.id)
            if existing.exists():
                raise serializers.ValidationError("Doctor availability already exists for this clinic.")

        slot_duration = attrs.get("slot_duration", getattr(instance, "slot_duration", 0))
        buffer_time = attrs.get("buffer_time", getattr(instance, "buffer_time", 0))
        max_appointments = attrs.get("max_appointments_per_day", getattr(instance, "max_appointments_per_day", 0))

        if slot_duration <= 0:
            raise serializers.ValidationError("Slot duration must be positive.")
        if buffer_time < 0:
            raise serializers.ValidationError("Buffer time cannot be negative.")
        if max_appointments <= 0:
            raise serializers.ValidationError("Max appointments per day must be positive.")

        return attrs

class DoctorLeaveSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorLeave
        fields = ["id", "doctor", "clinic", "start_date", "end_date", "half_day", "leave_type", "reason"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        doctor = attrs.get("doctor", getattr(self.instance, "doctor", None))
        clinic = attrs.get("clinic", getattr(self.instance, "clinic", None))

        if not doctor or not clinic:
            raise serializers.ValidationError("Doctor and clinic must be provided or already exist on the instance.")

        # 1. Start date must be <= end date
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError("Start date cannot be after end date.")

        # 2. Allow only last 30 days backdated leave
        if start_date and start_date < date.today() - timedelta(days=30):
            raise serializers.ValidationError("Leave cannot be older than 30 days.")

        # 3. Block overlapping leaves
        overlapping = DoctorLeave.objects.filter(
            doctor=doctor,
            clinic=clinic,
            start_date__lte=end_date,
            end_date__gte=start_date,
        )
        if self.instance:
            overlapping = overlapping.exclude(id=self.instance.id)

        if overlapping.exists():
            raise serializers.ValidationError("Overlapping leave already exists for this doctor.")

        return attrs


class DoctorOPDStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorOPDStatus
        fields = [
            'id', 'doctor', 'clinic',
            'is_available', 'check_in_time', 'check_out_time',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        instance = self.instance

        is_available = attrs.get('is_available', getattr(instance, 'is_available', None))
        check_in_time = attrs.get('check_in_time', getattr(instance, 'check_in_time', None))
        check_out_time = attrs.get('check_out_time', getattr(instance, 'check_out_time', None))

        if is_available and not check_in_time:
            attrs['check_in_time'] = timezone.now()
            attrs['check_out_time'] = None  # Reset checkout
        elif is_available is False and not check_out_time:
            attrs['check_out_time'] = timezone.now()

        return attrs
    


# Lightweight user serializer for OTP-based accounts (no password)
class OnboardUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("username", "first_name", "last_name", "email")
        extra_kwargs = {
            "email": {"required": False, "allow_blank": True},
            "first_name": {"required": False, "allow_blank": True},
            "last_name": {"required": False, "allow_blank": True},
            "username": {"required": False, "allow_blank": True},
            "clinics": {"required": False},  # make M2M optional
        }

    def validate_username(self, value):
        # Always return the value without any validation for development
        return value

    def validate_email(self, value):
        # Always return the value without any validation for development
        return value

    def create(self, validated_data):
        clinic_id = validated_data.pop("clinic_id", None)
        # Create user without password (OTP-based). status=False (inactive) by default.
        user = User.objects.create(
            username=validated_data["username"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            email=validated_data.get("email", ""),
            status=False,
            is_active=True,  # keep active so OTP login works; adjust if you want inactive until verification
        )
        if clinic_id:
            try:
                clinic = Clinic.objects.get(id=clinic_id)
                user.clinics.add(clinic)
            except Clinic.DoesNotExist:
                raise serializers.ValidationError({"clinic_id": "Invalid clinic ID"})
        return user


class GovernmentIDPhase1Serializer(serializers.ModelSerializer):
    class Meta:
        model = GovernmentID
        fields = ("pan_card_number", "aadhar_card_number","pan_card_file","aadhar_card_file")
        extra_kwargs = {
            "pan_card_number": {"required": False, "allow_blank": True},
            "aadhar_card_number": {"required": False, "allow_blank": True},
        }

    # def validate(self, data):
    #     if not data.get("pan_card_number") and not data.get("aadhar_card_number"):
    #         raise serializers.ValidationError("Either PAN or Aadhar number must be provided.")
    #     return data

    def validate_pan_card_number(self, value):
        # Always return the value without any validation for development
        return value

    def validate_aadhar_card_number(self, value):
        # Always return the value without any validation for development
        return value


class RegistrationPhase1Serializer(serializers.ModelSerializer):
    class Meta:
        model = Registration
        fields = ("medical_registration_number", "medical_council")
        extra_kwargs = {
            "medical_registration_number": {"required": False, "allow_blank": True},
            "medical_council": {"required": False, "allow_blank": True},
        }

    def validate_medical_registration_number(self, value):
        # Always return the value without any validation for development
        return value


# class DoctorPhase1Serializer(serializers.ModelSerializer):
#     user = OnboardUserSerializer()
#     government_ids = GovernmentIDPhase1Serializer(required=True)
#     registration = RegistrationPhase1Serializer(required=True)

#     class Meta:
#         model = doctor
#         # Only Phase-1 required fields
#         fields = (
#             "user",
#             "dob",
#             "gender",
#             "secondary_mobile_number",
#             "digital_signature_consent",
#             "terms_and_conditions_acceptance",
#             "consent_for_data_storage",
#             "government_ids",
#             "registration",
#         )

#     def validate_dob(self, value):
#         if not value:
#             raise serializers.ValidationError("Date of birth is required.")
#         today = date.today()
#         age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
#         if age < 23:
#             raise serializers.ValidationError("Doctor must be at least 23 years old.")
#         return value

#     def validate_digital_signature_consent(self, value):
#         if value is not True:
#             raise serializers.ValidationError("Digital signature consent is mandatory.")
#         return value

#     def validate_secondary_mobile_number(self, value):
#         if value and value != "NA":
#             if not value.isdigit() or not (7 <= len(value) <= 15):
#                 raise serializers.ValidationError("Secondary mobile must be numeric and between 7-15 digits or 'NA'.")
#             # unique check
#             qs = doctor.objects.filter(secondary_mobile_number=value)
#             if qs.exists():
#                 raise serializers.ValidationError("Secondary mobile number already in use.")
#         return value

#     @transaction.atomic
#     def create(self, validated_data):
#         user_data = validated_data.pop("user")
#         gov_data = validated_data.pop("government_ids")
#         reg_data = validated_data.pop("registration")

#         # Create User (OTP-based; no password)
#         user_serializer = OnboardUserSerializer(data=user_data)
#         user_serializer.is_valid(raise_exception=True)
#         user = user_serializer.save()

#         # Add user to 'doctor' group
#         doctor_group, _ = Group.objects.get_or_create(name="doctor")
#         user.groups.add(doctor_group)

#         # Build doctor fields
#         doctor_data = validated_data
#         # secondary_mobile_number default handled by model but we may have provided one
#         doctor_obj = doctor.objects.create(user=user, **doctor_data)

#         # Create GovernmentID (one-to-one)
#         GovernmentID.objects.create(doctor=doctor_obj, **gov_data)

#         # Create Registration entry (one-to-one)
#         Registration.objects.create(doctor=doctor_obj, **reg_data)

#         # Mark kyc_completed to True if you want to indicate doc uploaded IDs (optional)
#         doctor_obj.kyc_completed = True
#         doctor_obj.save(update_fields=["kyc_completed"])

#         return doctor_obj

#     def to_representation(self, instance):
#         # Provide a friendly response
#         return {
#             "id": str(instance.id),
#             "user": {
#                 "id": str(instance.user.id),
#                 "username": instance.user.username,
#                 "first_name": instance.user.first_name,
#                 "last_name": instance.user.last_name,
#                 "email": instance.user.email,
#                 "is_active": instance.user.is_active,
#                 "status": instance.user.status,
#             },
#             "dob": instance.dob.isoformat() if instance.dob else None,
#             "gender": instance.gender,
#             "secondary_mobile_number": instance.secondary_mobile_number,
#             "digital_signature_consent": instance.digital_signature_consent,
#             "terms_and_conditions_acceptance": instance.terms_and_conditions_acceptance,
#             "consent_for_data_storage": instance.consent_for_data_storage,
#             "kyc_completed": instance.kyc_completed,
#             "kyc_verified": instance.kyc_verified,
#             "created_at": instance.created_at.isoformat() if instance.created_at else None,
#         }

class DoctorPhase1Serializer(serializers.ModelSerializer):
    user = OnboardUserSerializer()
    government_ids = GovernmentIDPhase1Serializer(required=False)
    registration = RegistrationPhase1Serializer(required=False)

    # Map frontend JSON keys to model field names
    terms_conditions_accepted = serializers.BooleanField(source="terms_and_conditions_acceptance")
    data_storage_consent = serializers.BooleanField(source="consent_for_data_storage")
    
    # Override dob field to handle empty strings
    dob = serializers.DateField(required=False, allow_null=True)

    def validate_dob(self, value):
        # Handle empty string or None values
        if value == "" or value is None:
            return None
        return value

    class Meta:
        model = doctor  # ✅ use correct model
        fields = (
            "user",
            "dob",
            "gender",
            "digital_signature_consent",
            "terms_conditions_accepted",   # ✅ aliased
            "data_storage_consent",        # ✅ aliased
            "government_ids",
            "registration",
        )
        extra_kwargs = {
            "dob": {"required": False, "allow_null": True, "allow_blank": True},
            "gender": {"required": False, "allow_blank": True},
            "digital_signature_consent": {"required": False},
            "terms_conditions_accepted": {"required": False},
            "data_storage_consent": {"required": False},
            "secondary_mobile_number": {"required": False, "allow_blank": True},
            "clinic_id": {"required": False},
        }

    def validate_dob(self, value):
        # Always return the value without any validation for development
        return value

    def validate_digital_signature_consent(self, value):
        # Always return the value without any validation for development
        return value

    # def validate_secondary_mobile_number(self, value):
    #     if value and value != "NA":
    #         if not value.isdigit() or not (7 <= len(value) <= 15):
    #             raise serializers.ValidationError("Secondary mobile must be numeric and between 7-15 digits or 'NA'.")
    #         if doctor.objects.filter(secondary_mobile_number=value).exists():
    #             raise serializers.ValidationError("Secondary mobile number already in use.")
    #     return value

    @transaction.atomic
    def create(self, validated_data):
        print("validated_data:", validated_data)
        user_data = validated_data.pop("user", {})
        gov_data = validated_data.pop("government_ids", {})
        reg_data = validated_data.pop("registration", {})
        # Extract clinic_id from user_data if present
        clinic_id = validated_data.pop("clinic_id", None)
        print("clinic_id:", clinic_id)

        # Create User with default values if data is missing
        username = user_data.get("username", f"doctor_{timezone.now().timestamp()}")
        first_name = user_data.get("first_name", "Doctor")
        last_name = user_data.get("last_name", "User")
        email = user_data.get("email", f"doctor_{timezone.now().timestamp()}@example.com")
        
        user = User.objects.create(
            username=username,
            first_name=first_name,
            last_name=last_name,
            email=email,
            status=False,
            is_active=True,
        )
        # Add user to 'doctor' group
        doctor_group, _ = Group.objects.get_or_create(name="doctor")
        user.groups.add(doctor_group)

        # Create Doctor with provided or default values
        doctor_data = {
            "dob": validated_data.get("dob"),
            "gender": validated_data.get("gender", "Male"),
            "digital_signature_consent": validated_data.get("digital_signature_consent", False),
            "terms_and_conditions_acceptance": validated_data.get("terms_conditions_accepted", False),
            "consent_for_data_storage": validated_data.get("data_storage_consent", False),
            "secondary_mobile_number": validated_data.get("secondary_mobile_number", ""),
        }
        doctor_obj = doctor.objects.create(user=user, **doctor_data)
        # 4️⃣ Attach clinic if provided
        if clinic_id:
            try:
                clinic = Clinic.objects.get(id=clinic_id)
                doctor_obj.clinics.add(clinic)
                print(f"✅ Clinic {clinic} linked to doctor {doctor_obj}")
            except Clinic.DoesNotExist:
                raise serializers.ValidationError({"clinic_id": "Invalid clinic ID"})
        # Create GovernmentID with provided or default values
        gov_defaults = {
            "pan_card_number": gov_data.get("pan_card_number", ""),
            "aadhar_card_number": gov_data.get("aadhar_card_number", ""),
        }
        GovernmentID.objects.create(doctor=doctor_obj, **gov_defaults)

        # Create Registration with provided or default values
        reg_defaults = {
            "medical_registration_number": reg_data.get("medical_registration_number", ""),
            "medical_council": reg_data.get("medical_council", ""),
        }
        Registration.objects.create(doctor=doctor_obj, **reg_defaults)

        # Mark KYC completed
        doctor_obj.kyc_completed = True
        doctor_obj.save(update_fields=["kyc_completed"])

        return doctor_obj

    def to_representation(self, instance):
        return {
            "id": str(instance.id),
            "user": {
                "id": str(instance.user.id),
                "username": instance.user.username,
                "first_name": instance.user.first_name,
                "last_name": instance.user.last_name,
                "email": instance.user.email,
                "is_active": instance.user.is_active,
                "status": instance.user.status,
            },
            "dob": instance.dob.isoformat() if instance.dob else None,
            "gender": instance.gender,
            "secondary_mobile_number": instance.secondary_mobile_number,
            "digital_signature_consent": instance.digital_signature_consent,
            "terms_conditions_accepted": instance.terms_and_conditions_acceptance,
            "data_storage_consent": instance.consent_for_data_storage,
            "clinic_id": instance.clinics.first().id if instance.clinics.exists() else None,
            "kyc_completed": instance.kyc_completed,
            "kyc_verified": instance.kyc_verified,
            "created_at": instance.created_at.isoformat() if instance.created_at else None,
        }