from django.contrib.auth import authenticate
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.validators import RegexValidator
from django.db import transaction

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
    ClinicSchedule,
    ClinicService,
    ClinicServiceList,
    ClinicSpecialization,
)
class ClinicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinic
        fields = '__all__'

class ClinicAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicAddress
        fields = '__all__'

class ClinicSpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicSpecialization
        fields = '__all__'

class ClinicScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicSchedule
        fields = '__all__'

class ClinicServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicService
        fields = '__all__'

class ClinicServiceListSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicServiceList
        fields = '__all__'
    

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

# serializers.py

class ClinicAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicAddress
        fields = ['address', 'address2', 'city', 'state', 'pincode', 'country']

class ClinicSummarySerializer(serializers.ModelSerializer):
    address = ClinicAddressSerializer()

    class Meta:
        model = Clinic
        fields = ['id', 'name', 'contact_number_primary', 'contact_number_secondary', 'email_address', 'address']