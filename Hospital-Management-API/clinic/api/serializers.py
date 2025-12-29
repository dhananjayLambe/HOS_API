from django.contrib.auth import authenticate
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.validators import RegexValidator, URLValidator
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
import re

from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
    TokenVerifySerializer,
)
from rest_framework_simplejwt.tokens import UntypedToken

from account.models import User

from clinic.models import (
    Clinic,
    ClinicAddress,
    ClinicAdminProfile,
    ClinicProfile,
    ClinicSchedule,
    ClinicService,
    ClinicServiceList,
    ClinicSpecialization,
)

# Phone number validator
phone_regex = RegexValidator(
    regex=r'^\+?1?\d{9,15}$',
    message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
)

class ClinicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinic
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'status', 'is_approved']

    def validate_name(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("Name must be at least 3 characters long.")
        return value

    def validate_registration_number(self, value):
        if value:
            qs = Clinic.objects.filter(registration_number=value)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError("A clinic with this registration number already exists.")
        return value

    def validate_contact_number_primary(self, value):
        if value and value != 'NA':
            if not re.match(r'^\+?1?\d{9,15}$', value):
                raise serializers.ValidationError("Enter a valid phone number.")
        return value

    def validate_contact_number_secondary(self, value):
        if value and value != 'NA':
            if not re.match(r'^\+?1?\d{9,15}$', value):
                raise serializers.ValidationError("Enter a valid phone number.")
        return value

    def validate_emergency_contact_number(self, value):
        if value and value != 'NA':
            if not re.match(r'^\+?1?\d{9,15}$', value):
                raise serializers.ValidationError("Enter a valid phone number.")
        return value

    def validate_gst_number(self, value):
        if value and value != 'NA' and len(value) != 15:
            raise serializers.ValidationError("GST number must be 15 characters long.")
        return value

    def validate_website_url(self, value):
        if value and value != 'NA':
            validator = URLValidator()
            try:
                validator(value)
            except ValidationError:
                raise serializers.ValidationError("Enter a valid URL.")
        return value



class ClinicSpecializationSerializer(serializers.ModelSerializer):
    created_at = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()

    class Meta:
        model = ClinicSpecialization
        fields = '__all__'

    def get_created_at(self, obj):
        return timezone.localtime(obj.created_at).isoformat()

    def get_updated_at(self, obj):
        return timezone.localtime(obj.updated_at).isoformat()

    def validate(self, data):
        clinic = data.get('clinic')
        specialization_name = data.get('specialization_name')

        if self.instance is None:
            if ClinicSpecialization.objects.filter(clinic=clinic, specialization_name__iexact=specialization_name).exists():
                raise serializers.ValidationError({'specialization_name': 'This specialization already exists for this clinic.'})
        else:
            # Ensure uniqueness on update
            if ClinicSpecialization.objects.filter(
                clinic=clinic,
                specialization_name__iexact=specialization_name
            ).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError({'specialization_name': 'Another specialization with this name already exists for this clinic.'})

        return data

class ClinicScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicSchedule
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        is_closed = data.get('is_closed', False)
        open_time = data.get('open_time')
        close_time = data.get('close_time')

        # If clinic is closed, open_time and close_time should be null
        if is_closed:
            if open_time is not None or close_time is not None:
                raise serializers.ValidationError({
                    'non_field_errors': ['If clinic is closed, open_time and close_time must be null.']
                })
        else:
            # If clinic is open, both times are required
            if not open_time or not close_time:
                raise serializers.ValidationError({
                    'non_field_errors': ['Both open_time and close_time are required when clinic is open.']
                })
            
            # Validate that open_time is before close_time
            if open_time >= close_time:
                raise serializers.ValidationError({
                    'non_field_errors': ['Open time must be earlier than close time.']
                })

        return data

class ClinicServiceSerializer(serializers.ModelSerializer):
    created_at = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()

    class Meta:
        model = ClinicService
        fields = '__all__'

    def get_created_at(self, obj):
        return timezone.localtime(obj.created_at).isoformat()

    def get_updated_at(self, obj):
        return timezone.localtime(obj.updated_at).isoformat()

    def validate(self, data):
        clinic = data.get('clinic')
        if self.instance is None:
            if ClinicService.objects.filter(clinic=clinic).exists():
                raise serializers.ValidationError({'clinic': 'Clinic already has service settings defined.'})
        else:
            if ClinicService.objects.filter(clinic=clinic).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError({'clinic': 'Another service record already exists for this clinic.'})
        return data


class ClinicServiceListSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicServiceList
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        request = self.context.get('request')
        clinic = attrs.get('clinic') or getattr(self.instance, 'clinic', None)
        service_name = attrs.get('service_name') or getattr(self.instance, 'service_name', None)

        if ClinicServiceList.objects.filter(
            clinic=clinic,
            service_name__iexact=service_name
        ).exclude(id=getattr(self.instance, 'id', None)).exists():
            raise serializers.ValidationError("Service with this name already exists for the clinic.")
        return attrs

class ClinicAdminRegistrationSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, allow_blank=True)
    mobile = serializers.CharField(max_length=15)
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=User.objects.all(), message="Email already registered.")]
    )
    password = serializers.CharField(write_only=True, validators=[validate_password])
    clinic_id = serializers.UUIDField()

    def validate_mobile(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Mobile already registered.")
        return value

    def validate_clinic_id(self, value):
        if not Clinic.objects.filter(id=value).exists():
            raise serializers.ValidationError("Clinic with given ID does not exist.")
        return value

    def create(self, validated_data):
        with transaction.atomic():
            clinic = Clinic.objects.get(id=validated_data['clinic_id'])

            user = User.objects.create_user(
                username=validated_data['mobile'],  # Mobile = username
                email=validated_data['email'],
                password=validated_data['password'],
                first_name=validated_data['first_name'],
                last_name=validated_data['last_name'],
            )

            # Add user to clinic_admin group
            clinic_admin_group, _ = Group.objects.get_or_create(name="clinic_admin")
            user.groups.add(clinic_admin_group)
            user.save()

            # Link user as admin of this clinic (optional if you use ClinicAdminProfile directly)
            clinic.admin_user = user
            clinic.save()

            # ✅ Create the ClinicAdminProfile
            ClinicAdminProfile.objects.create(
                user=user,
                clinic=clinic
            )

            return user


class ClinicAdminTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")

        # Authenticate using username (which is mobile number)
        user = authenticate(username=username, password=password)

        if not user:
            raise serializers.ValidationError({"detail": "Invalid credentials."})

        # Ensure user is part of the 'clinic_admin' group
        if not user.groups.filter(name="clinic_admin").exists():
            raise serializers.ValidationError({
                "non_field_errors": ["User is not authorized as ClinicAdmin."]
            })

        # Ensure ClinicAdmin profile exists
        try:
            clinic_admin = user.clinic_admin_profile  # OneToOneField related_name
        except ClinicAdminProfile.DoesNotExist:
            raise serializers.ValidationError({
                "non_field_errors": ["ClinicAdmin profile not found."]
            })

        # KYA Checks
        if not clinic_admin.kya_completed:
            raise serializers.ValidationError({
                "non_field_errors": ["KYA process not completed."]
            })

        if not clinic_admin.kya_verified:
            raise serializers.ValidationError({
                "non_field_errors": ["KYA verification pending. Contact support."]
            })
        # Generate token
        data = super().validate(attrs)

        # Add additional user info in the response
        data.update({
            "user_id": str(user.id),
            "first_name": user.first_name,
            "last_name": user.last_name,
            "mobile": user.username,
            "email": user.email,
            "clinic_admin_id": str(clinic_admin.id),
        })

        return data


class ClinicAdminTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        refresh = self.token_class(attrs["refresh"])
        user_id = refresh["user_id"]

        try:
            user = User.objects.get(id=user_id)
            clinic_admin = user.clinic_admin_profile
        except (User.DoesNotExist, ClinicAdminProfile.DoesNotExist):
            raise serializers.ValidationError({"detail": "ClinicAdmin profile not found."})

        if not clinic_admin.kya_completed:
            raise serializers.ValidationError({"detail": "KYA process not completed."})

        if not clinic_admin.kya_verified:
            raise serializers.ValidationError({"detail": "KYA not verified. Contact support."})

        return data

class ClinicAdminTokenVerifySerializer(TokenVerifySerializer):
    def validate(self, attrs):
        token = attrs.get("token")

        try:
            validated_token = UntypedToken(token)
        except Exception:
            raise serializers.ValidationError({"detail": "Token is invalid or expired"})

        user_id = validated_token.get("user_id")
        try:
            user = User.objects.get(id=user_id)
            clinic_admin = user.clinic_admin_profile
        except (User.DoesNotExist, ClinicAdminProfile.DoesNotExist):
            raise serializers.ValidationError({"detail": "ClinicAdmin profile not found."})

        if not clinic_admin.kya_completed:
            raise serializers.ValidationError({"detail": "KYA process not completed."})

        if not clinic_admin.kya_verified:
            raise serializers.ValidationError({"detail": "KYA not verified. Contact support."})

        return {}

class PendingClinicAdminSerializer(serializers.ModelSerializer):
    mobile = serializers.CharField(source='user.username')
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email')

    class Meta:
        model = ClinicAdminProfile
        fields = ['id', 'full_name', 'mobile', 'email', 'kya_completed', 'kya_verified', 'approval_date']

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"

class ClinicAddressSerializer(serializers.ModelSerializer):
    created_at = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()

    class Meta:
        model = ClinicAddress
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_created_at(self, obj):
        return timezone.localtime(obj.created_at).isoformat()

    def get_updated_at(self, obj):
        return timezone.localtime(obj.updated_at).isoformat()

    def validate_pincode(self, value):
        if value and value != 'NA':
            # Validate Indian pincode (6 digits)
            if not re.match(r'^\d{6}$', value):
                raise serializers.ValidationError("Pincode must be 6 digits.")
        return value

    def validate_latitude(self, value):
        if value is not None:
            if value < -90 or value > 90:
                raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        if value is not None:
            if value < -180 or value > 180:
                raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value

    def validate(self, data):
        clinic = data.get('clinic')
        if self.instance is None and clinic and ClinicAddress.objects.filter(clinic=clinic).exists():
            raise serializers.ValidationError({'clinic': 'Address for this clinic already exists.'})
        return data


class ClinicProfileSerializer(serializers.ModelSerializer):
    created_at = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()

    class Meta:
        model = ClinicProfile
        fields = '__all__'
        read_only_fields = ['id', 'clinic', 'created_at', 'updated_at', 'kyc_verified', 'profile_completion', 'status']

    def get_created_at(self, obj):
        return timezone.localtime(obj.created_at).isoformat()

    def get_updated_at(self, obj):
        return timezone.localtime(obj.updated_at).isoformat()

    def validate_logo(self, value):
        if value:
            # Check file size (2MB = 2 * 1024 * 1024 bytes)
            if value.size > 2 * 1024 * 1024:
                raise serializers.ValidationError("Logo file size must be less than 2MB.")
            
            # Check file extension
            allowed_extensions = ['jpg', 'jpeg', 'png', 'webp']
            file_extension = value.name.split('.')[-1].lower()
            if file_extension not in allowed_extensions:
                raise serializers.ValidationError(f"Logo must be one of: {', '.join(allowed_extensions)}")
        return value

    def validate_cover_photo(self, value):
        if value:
            # Check file size (2MB)
            if value.size > 2 * 1024 * 1024:
                raise serializers.ValidationError("Cover photo file size must be less than 2MB.")
            
            # Check file extension
            allowed_extensions = ['jpg', 'jpeg', 'png', 'webp']
            file_extension = value.name.split('.')[-1].lower()
            if file_extension not in allowed_extensions:
                raise serializers.ValidationError(f"Cover photo must be one of: {', '.join(allowed_extensions)}")
        return value

    def validate_established_year(self, value):
        if value:
            current_year = timezone.now().year
            if value < 1800 or value > current_year:
                raise serializers.ValidationError(f"Established year must be between 1800 and {current_year}.")
        return value

class ClinicSummarySerializer(serializers.ModelSerializer):
    address = ClinicAddressSerializer()

    class Meta:
        model = Clinic
        fields = ['id', 'name', 'contact_number_primary', 'contact_number_secondary', 'email_address',  'emergency_contact_number','emergency_email_address','address']

class ClinicAddressOnboardingSerializer(serializers.ModelSerializer):
    addressLine1 = serializers.CharField(source="address")

    class Meta:
        model = ClinicAddress
        fields = ["addressLine1", "city", "state", "pincode"]


class ClinicSpecializationOnboardingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicSpecialization
        fields = ["specialization_name", "description"]

class ClinicOnboardingSerializer(serializers.ModelSerializer):
    address = ClinicAddressOnboardingSerializer(required=True)
    specializations = ClinicSpecializationOnboardingSerializer(many=True, required=False)

    class Meta:
        model = Clinic
        fields = [
            "id", "name", "contact_number_primary", 
            "email_address", "registration_number", 
            "address", "specializations", "created_at", "updated_at"
        ]
        optional_fields = ["contact_number_secondary", "gst_number"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        address_data = validated_data.pop("address")
        specializations_data = validated_data.pop("specializations", [])

        clinic = Clinic.objects.create(**validated_data)

        ClinicAddress.objects.create(
            clinic=clinic,
            address=address_data.get("address", ""),
            city=address_data.get("city"),
            state=address_data.get("state"),
            pincode=address_data.get("pincode")
        )

        for spec in specializations_data:
            ClinicSpecialization.objects.create(clinic=clinic, **spec)

        return clinic

    def update(self, instance, validated_data):
        address_data = validated_data.pop("address", None)
        specializations_data = validated_data.pop("specializations", None)

        # Update clinic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update / Create address
        if address_data:
            ClinicAddress.objects.update_or_create(
                clinic=instance,
                defaults={
                    "address": address_data.get("address", ""),
                    "city": address_data.get("city"),
                    "state": address_data.get("state"),
                    "pincode": address_data.get("pincode")
                }
            )

        # Update specializations (replace with new set)
        if specializations_data is not None:
            instance.specializations.all().delete()
            for spec in specializations_data:
                ClinicSpecialization.objects.create(clinic=instance, **spec)

        return instance

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if hasattr(instance, "address"):
            rep["address"] = ClinicAddressOnboardingSerializer(instance.address).data
        rep["specializations"] = ClinicSpecializationOnboardingSerializer(instance.specializations.all(), many=True).data
        return rep


class ClinicListFrontendSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()

    class Meta:
        model = Clinic
        fields = ["id", "name", "location"]

    def get_location(self, obj):
        """
        Combines city and state into a single 'location' field.
        Falls back gracefully if address is missing.
        """
        address = getattr(obj, "address", None)
        if address:
            city = address.city or ""
            state = address.state or ""
            return f"{city}, {state}".strip(", ")
        return "NA"
