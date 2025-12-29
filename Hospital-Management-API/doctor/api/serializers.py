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
    DoctorOPDStatus,DoctorMembership,DoctorBankDetails,CancellationPolicy
)
from hospital_mgmt.models import Hospital
from helpdesk.models import HelpdeskClinicUser
from account.models import User
from doctor.utils.progress_calculator import calculate_doctor_profile_progress
from clinic.api.serializers import ClinicSerializer
class DoctorBasicSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    profile_photo = serializers.ImageField(source="photo", allow_null=True, required=False)
    dob = serializers.DateField(format=None, allow_null=True, required=False)
    gender = serializers.CharField(allow_null=True, required=False, allow_blank=True)
    about = serializers.CharField(allow_null=True, required=False, allow_blank=True)

    class Meta:
        model = doctor
        fields = [
            "id","username", "first_name", "last_name", "email", "profile_photo",
            "gender", "dob", "about", "years_of_experience",
            "avg_rating", "title", "consultation_modes", "languages_spoken",
            "primary_specialization",
        ]
    
    def to_representation(self, instance):
        """Override to ensure dates are formatted correctly"""
        representation = super().to_representation(instance)
        
        # Format date of birth as string in YYYY-MM-DD format
        if instance.dob:
            representation['dob'] = instance.dob.isoformat()
        else:
            representation['dob'] = None
        
        # Ensure gender is returned as string (M/F/O) - handle null values
        if instance.gender:
            representation['gender'] = str(instance.gender).upper()
        else:
            representation['gender'] = None  # Keep as None if not set
        
        # Ensure about is returned as string (empty string if None)
        if instance.about:
            representation['about'] = str(instance.about)
        else:
            representation['about'] = ""
        
        return representation

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
        fields = ['id','medical_registration_number', 'medical_council', 'registration_certificate', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_medical_registration_number(self, value):
        if Registration.objects.filter(medical_registration_number=value).exclude(doctor=self.context['request'].user.doctor).exists():
            raise serializers.ValidationError("This medical registration number is already in use.")
        return value

class GovernmentIDSerializer(serializers.ModelSerializer):
    class Meta:
        model = GovernmentID
        fields = [
            'id', 'pan_card_number', 'aadhar_card_number', 'pan_card_file', 'aadhar_card_file', 'created_at', 'updated_at'
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
    
    # Removed validate() method - duplicate checking is now handled in EducationViewSet.create()
    # to allow updating existing entries instead of raising errors

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
            'education', 'certifications', 'services', 
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
                try:
                    related_manager = getattr(instance, field)
                    if field == 'government_ids':
                        related_manager = instance.government_id
                        if nested_data:
                            related_manager.pan_card_number = nested_data.get('pan_card_number', related_manager.pan_card_number)
                            related_manager.aadhar_card_number = nested_data.get('aadhar_card_number', related_manager.aadhar_card_number)
                            related_manager.save()
                    else:
                        related_manager.all().delete()
                        for item in nested_data:
                            related_manager.create(**item)
                except AttributeError as e:
                    # Skip fields that don't exist as related managers
                    # They will be handled as regular fields below
                    pass

        # Update all remaining fields (including gender, dob, about, languages_spoken, consultation_modes)
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
    # Override specialization to accept free-text (bypasses model choices validation on input).
    specialization = serializers.CharField(required=False, allow_blank=True)
    # New field for unified input - accepts specialization name as string
    specialization_name = serializers.CharField(
        write_only=True,
        required=False,
        help_text=(
            "Name of specialization (e.g., 'Cardiologist' or 'Custom Specialization Name'). "
            "If provided, will automatically match predefined or create custom specialization."
        ),
    )

    # Display fields for read operations
    specialization_display = serializers.SerializerMethodField(read_only=True)
    custom_specialization_name = serializers.CharField(
        source="custom_specialization.name",
        read_only=True,
    )

    class Meta:
        model = Specialization
        fields = [
            "id",
            "specialization",
            "custom_specialization",
            "specialization_name",
            "specialization_display",
            "custom_specialization_name",
            "is_primary",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_specialization_display(self, obj):
        """Return the display name of predefined specialization"""
        if obj.specialization:
            return obj.get_specialization_display()
        return None

    def validate(self, attrs):
        request = self.context['request']
        doctor = request.user.doctor
        specialization_input = attrs.get('specialization')
        custom_specialization = attrs.get('custom_specialization')
        specialization_name = attrs.pop('specialization_name', None)  # Remove from attrs after validation
        
        # Validate that only one input method is used
        input_methods = [bool(specialization_name), bool(specialization_input), bool(custom_specialization)]
        if sum(input_methods) > 1:
            raise serializers.ValidationError(
                "Please provide only one of: specialization_name, specialization, or custom_specialization. "
                "Do not mix different input methods."
            )
        
        # New unified approach: if specialization_name is provided, process it
        if specialization_name:
            # Import here to avoid circular imports
            from doctor.models import SPECIALIZATION_CHOICES, CustomSpecialization
            
            # Normalize the input name
            specialization_name = specialization_name.strip()
            
            if not specialization_name:
                raise serializers.ValidationError("specialization_name cannot be empty.")
            
            # Check if it matches any predefined specialization (case-insensitive)
            matched_code = None
            for code, display_name in SPECIALIZATION_CHOICES:
                if display_name.lower() == specialization_name.lower():
                    matched_code = code
                    break
            
            if matched_code:
                # Use predefined specialization
                attrs['specialization'] = matched_code
                attrs['custom_specialization'] = None
            else:
                # It's a custom specialization - find or create it
                custom_spec, created = CustomSpecialization.objects.get_or_create(
                    name__iexact=specialization_name,
                    defaults={'name': specialization_name}
                )
                attrs['custom_specialization'] = custom_spec
                attrs['specialization'] = None
        elif specialization_input:
            # Treat the provided specialization field as either a code or a name
            from doctor.models import SPECIALIZATION_CHOICES, CustomSpecialization

            specialization_input = specialization_input.strip()
            if not specialization_input:
                attrs['specialization'] = None
            else:
                # First try to match predefined codes directly
                codes = {code: code for code, _ in SPECIALIZATION_CHOICES}
                # Also map display names to codes for flexibility
                display_to_code = {display_name.lower(): code for code, display_name in SPECIALIZATION_CHOICES}

                if specialization_input in codes:
                    attrs['specialization'] = specialization_input
                    attrs['custom_specialization'] = None
                elif specialization_input.lower() in display_to_code:
                    attrs['specialization'] = display_to_code[specialization_input.lower()]
                    attrs['custom_specialization'] = None
                else:
                    # Treat as custom specialization name
                    custom_spec, created = CustomSpecialization.objects.get_or_create(
                        name__iexact=specialization_input,
                        defaults={'name': specialization_input}
                    )
                    attrs['custom_specialization'] = custom_spec
                    attrs['specialization'] = None
        
        # Backward compatibility: validate existing fields
        specialization = attrs.get('specialization')
        custom_specialization = attrs.get('custom_specialization')

        if not specialization and not custom_specialization:
            raise serializers.ValidationError(
                "Either specialization, custom_specialization, or specialization_name must be provided."
            )

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

    # Removed validate() method - duplicate checking is now handled in CertificationViewSet.create()
    # to allow updating existing entries instead of raising errors

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

class DigitalSignatureUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = KYCStatus
        fields = ['digital_signature']

    def validate(self, data):
        digital_signature_file = data.get("digital_signature")

        if digital_signature_file:
            # File size validation (2MB limit, same as PAN/Aadhaar)
            if digital_signature_file.size > 2 * 1024 * 1024:
                raise serializers.ValidationError({"digital_signature": "Digital signature file size should be under 2MB."})

            # File type validation (same as PAN/Aadhaar)
            valid_extensions = ['pdf', 'jpg', 'jpeg', 'png']
            ext = digital_signature_file.name.split('.')[-1].lower()
            if ext not in valid_extensions:
                raise serializers.ValidationError({"digital_signature": "Only PDF, JPG, JPEG, PNG files are allowed."})

        return data

    def update(self, instance, validated_data):
        import logging
        logger = logging.getLogger(__name__)
        
        # Delete old file if exists (same as PAN/Aadhaar)
        if validated_data.get("digital_signature") and instance.digital_signature:
            old_file_path = instance.digital_signature.name
            logger.info(f"Deleting old digital signature file: {old_file_path}")
            try:
                instance.digital_signature.delete(save=False)
            except Exception as e:
                logger.warning(f"Error deleting old file (may not exist): {str(e)}")

        # Log before update
        digital_signature_file = validated_data.get("digital_signature")
        if digital_signature_file:
            logger.info(f"Updating digital signature: {digital_signature_file.name}, Size: {digital_signature_file.size}")
            logger.info(f"KYCStatus instance doctor: {instance.doctor.id if instance.doctor else 'None'}")
            logger.info(f"KYCStatus instance ID: {instance.id}")
        
        # Call super().update() which will handle the file upload and call upload_to
        # This should automatically use the upload_to function from the model field
        updated_instance = super().update(instance, validated_data)
        
        # Ensure the instance is saved (Django should do this automatically, but let's be explicit)
        updated_instance.save()
        
        # Log after update
        if updated_instance.digital_signature:
            logger.info(f"Digital signature saved successfully. Path: {updated_instance.digital_signature.name}")
            logger.info(f"Digital signature URL: {updated_instance.digital_signature.url}")
            logger.info(f"Digital signature file exists: {updated_instance.digital_signature.storage.exists(updated_instance.digital_signature.name) if hasattr(updated_instance.digital_signature, 'storage') else 'Unknown'}")
        else:
            logger.error("Digital signature field is None after update!")
        
        return updated_instance

class KYCStatusSerializer(serializers.ModelSerializer):
    kyc_status = serializers.SerializerMethodField()
    sections = serializers.SerializerMethodField()
    digital_signature = serializers.SerializerMethodField()
    detailed_status = serializers.SerializerMethodField()

    class Meta:
        model = doctor
        fields = ['id', 'kyc_completed', 'kyc_verified', 'kyc_status', 'sections', 'digital_signature', 'detailed_status']

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

    def get_digital_signature(self, obj):
        """Get digital signature file from related KYCStatus"""
        try:
            kyc_status = obj.kyc_status
            if kyc_status and kyc_status.digital_signature:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(kyc_status.digital_signature.url)
                return kyc_status.digital_signature.url if kyc_status.digital_signature else None
        except:
            pass
        return None

    def get_detailed_status(self, obj):
        """Get detailed KYC status for each document type with approval status and rejection reasons"""
        try:
            kyc_status = obj.kyc_status
            if not kyc_status:
                return None
            
            return {
                "registration": {
                    "status": kyc_status.registration_status,
                    "reason": kyc_status.registration_reason,
                },
                "pan": {
                    "status": kyc_status.pan_status,
                    "reason": kyc_status.pan_reason,
                },
                "aadhar": {
                    "status": kyc_status.aadhar_status,
                    "reason": kyc_status.aadhar_reason,
                },
                "photo": {
                    "status": kyc_status.photo_status,
                    "reason": kyc_status.photo_reason,
                },
                "education": {
                    "status": kyc_status.education_status,
                    "reason": kyc_status.education_reason,
                },
                "kya_verified": kyc_status.kya_verified,
                "verified_at": kyc_status.verified_at.isoformat() if kyc_status.verified_at else None,
                "updated_at": kyc_status.updated_at.isoformat() if kyc_status.updated_at else None,
            }
        except Exception as e:
            return None

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
        # For updates, use existing instance values if not provided in attrs
        if self.instance:
            doctor = attrs.get("doctor", self.instance.doctor)
            clinic = attrs.get("clinic", self.instance.clinic)
            # Check for duplicate only if doctor or clinic is being changed
            if doctor != self.instance.doctor or clinic != self.instance.clinic:
                if DoctorFeeStructure.objects.exclude(pk=self.instance.pk).filter(doctor=doctor, clinic=clinic).exists():
                    raise serializers.ValidationError("Fee structure for this doctor and clinic already exists.")
        else:
            # for create
            doctor = attrs.get("doctor")
            clinic = attrs.get("clinic")
            if not doctor:
                raise serializers.ValidationError({"doctor": "Doctor is required."})
            if not clinic:
                raise serializers.ValidationError({"clinic": "Clinic is required."})
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

class CancellationPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = CancellationPolicy
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, attrs):
        # Validate fees cannot be negative
        if attrs.get('cancellation_fee', 0) < 0:
            raise serializers.ValidationError("Cancellation fee cannot be negative.")
        if attrs.get('rescheduling_fee', 0) < 0:
            raise serializers.ValidationError("Rescheduling fee cannot be negative.")
        
        # Validate refund percentage is between 0 and 100
        refund_percentage = attrs.get('refund_percentage', 0)
        if refund_percentage < 0 or refund_percentage > 100:
            raise serializers.ValidationError("Refund percentage must be between 0 and 100.")
        
        # Validate cancellation window hours is positive
        if attrs.get('cancellation_window_hours', 0) <= 0:
            raise serializers.ValidationError("Cancellation window hours must be a positive number.")
        
        doctor = attrs.get('doctor')
        clinic = attrs.get('clinic')
        
        # Ensure unique policy per doctor-clinic combination
        existing = CancellationPolicy.objects.filter(doctor=doctor, clinic=clinic)
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
        if existing.exists():
            raise serializers.ValidationError("A cancellation policy already exists for this doctor and clinic.")
        
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
    
class DoctorMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorMembership
        fields = "__all__"

class DoctorBankDetailsSerializer(serializers.ModelSerializer):
    masked_account_number = serializers.CharField(read_only=True)
    account_number = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = DoctorBankDetails
        fields = [
            "id", "account_holder_name", "account_number", "masked_account_number",
            "ifsc_code", "bank_name", "branch_name", "upi_id",
            "verification_status", "verification_method", "rejection_reason",
            "is_active", "created_at", "updated_at"
        ]
        read_only_fields = [
            "id", "masked_account_number", "verification_status", 
            "verification_method", "is_active", "created_at", "updated_at"
        ]
    
    def validate(self, attrs):
        """
        Validate that either account_number (with ifsc_code and bank_name) OR upi_id is provided.
        For partial updates, check existing instance values if new values are not provided.
        """
        # Get instance if this is an update (partial or full)
        instance = getattr(self, 'instance', None)
        
        # Get values from attrs (new values) or fall back to instance values for partial updates
        account_number = attrs.get('account_number')
        if account_number is None and instance:
            account_number = getattr(instance, 'account_number', None)
        
        ifsc_code = attrs.get('ifsc_code')
        if ifsc_code is None and instance:
            ifsc_code = getattr(instance, 'ifsc_code', None)
        
        bank_name = attrs.get('bank_name')
        if bank_name is None and instance:
            bank_name = getattr(instance, 'bank_name', None)
        
        upi_id = attrs.get('upi_id')
        if upi_id is None and instance:
            upi_id = getattr(instance, 'upi_id', None)
        
        # If account_number is provided (or exists), ifsc_code and bank_name are required
        if account_number:
            if not ifsc_code:
                raise serializers.ValidationError({
                    "ifsc_code": "IFSC code is required when account number is provided."
                })
            if not bank_name:
                raise serializers.ValidationError({
                    "bank_name": "Bank name is required when account number is provided."
                })
        
        # Either account_number (with required fields) OR upi_id must be provided
        if not account_number and not upi_id:
            raise serializers.ValidationError(
                "Either bank account details (account_number, ifsc_code, bank_name) or UPI ID must be provided."
            )
        
        return attrs
    
    def to_representation(self, instance):
        """
        Override to ensure account_number is never exposed, only masked_account_number.
        """
        representation = super().to_representation(instance)
        # Remove account_number if it somehow appears
        representation.pop('account_number', None)
        return representation


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


class DoctorFullProfileSerializer(serializers.Serializer):
    """Aggregated serializer used only for GET profile response"""
    personal_info = DoctorBasicSerializer(source="*", read_only=True)
    address = serializers.SerializerMethodField()
    professional = serializers.SerializerMethodField()
    kyc = serializers.SerializerMethodField()
    clinic_association = serializers.SerializerMethodField()
    fee_structure = serializers.SerializerMethodField()
    followup_policy = serializers.SerializerMethodField()
    services = serializers.SerializerMethodField()
    awards = serializers.SerializerMethodField()
    certifications = serializers.SerializerMethodField()
    memberships = serializers.SerializerMethodField()
    bank_details = serializers.SerializerMethodField()
    profile_progress = serializers.SerializerMethodField()
    def get_address(self, obj):
        try:
            addr = obj.address
            return DoctorAddressSerializer(addr).data
        except (DoctorAddress.DoesNotExist, AttributeError):
            return None
        except Exception:
            return None

    def get_professional(self, obj):
        try:
            data = {
                "primary_specialization": obj.primary_specialization,
                "specializations": SpecializationSerializer(obj.specializations.all(), many=True).data,
                "education": EducationSerializer(obj.education.all(), many=True).data,
            }
            return data
        except Exception:
            return {
                "primary_specialization": None,
                "specializations": [],
                "education": [],
            }

    def get_kyc(self, obj):
        reg = getattr(obj, "registration", None)
        govt = getattr(obj, "government_ids", None)
        try:
            registration_data = RegistrationSerializer(reg).data if reg else None
        except Exception:
            registration_data = None
        
        try:
            government_id_data = GovernmentIDSerializer(govt).data if govt else None
        except Exception:
            government_id_data = None
        
        kyc_status_obj = getattr(obj, "kyc_status", None)
        kyc_verified = getattr(kyc_status_obj, "kya_verified", False) if kyc_status_obj else False
        
        return {
            "registration": registration_data,
            "government_id": government_id_data,
            "kyc_status": kyc_verified
        }

    def get_clinic_association(self, obj):
        try:
            clinics = obj.clinics.all()
            return ClinicSerializer(clinics, many=True).data
        except Exception:
            return []

    def get_fee_structure(self, obj):
        try:
            fees = DoctorFeeStructure.objects.filter(doctor=obj)
            return DoctorFeeStructureSerializer(fees, many=True).data
        except Exception:
            return []

    def get_followup_policy(self, obj):
        try:
            policies = FollowUpPolicy.objects.filter(doctor=obj)
            return FollowUpPolicySerializer(policies, many=True).data
        except Exception:
            return []

    def get_services(self, obj):
        try:
            return DoctorServiceSerializer(obj.services.all(), many=True).data
        except Exception:
            return []

    def get_awards(self, obj):
        try:
            return AwardSerializer(obj.awards.all(), many=True).data
        except Exception:
            return []

    def get_certifications(self, obj):
        try:
            return CertificationSerializer(obj.certifications.all(), many=True).data
        except Exception:
            return []

    def get_memberships(self, obj):
        try:
            memberships = DoctorMembership.objects.filter(doctor=obj)
            return DoctorMembershipSerializer(memberships, many=True).data
        except Exception:
            return []

    def get_bank_details(self, obj):
        try:
            bank = DoctorBankDetails.objects.get(doctor=obj)
            return DoctorBankDetailsSerializer(bank).data
        except DoctorBankDetails.DoesNotExist:
            return None
        except Exception:
            return None

    def get_profile_progress(self, obj):
        try:
            return calculate_doctor_profile_progress(obj)
        except Exception as e:
            # Return proper dictionary structure even on error
            return {"progress": 0, "pending_sections": []}