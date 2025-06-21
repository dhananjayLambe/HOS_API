from django.contrib.auth.models import Group
from django.db import transaction

from rest_framework import serializers

from account.models import User
from clinic.models import Clinic
from doctor.models import (
    Award,
    DoctorAddress,
    Certification,
    DoctorFeedback,
    DoctorService,
    DoctorSocialLink,
    Education,
    GovernmentID,
    Registration,
    Specialization,
    CustomSpecialization,
    doctor,KYCStatus,
)
from hospital_mgmt.models import Hospital
from helpdesk.models import HelpdeskClinicUser
from account.models import User
from django.utils import timezone

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
            'id', 'pan_card_number', 'aadhar_card_number',
            'created_at', 'updated_at'
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