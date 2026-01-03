from rest_framework import serializers
from account.models import User
from datetime import datetime
import logging
from patient_account.models import PatientAccount, PatientProfile,PatientProfileDetails

logger = logging.getLogger(__name__)

class PatientLoginSerializer(serializers.Serializer):
    mobile = serializers.CharField(max_length=15)
    otp = serializers.CharField(max_length=6, required=False)  # OTP is optional for initial login request

class RegisterSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField()

    class Meta:
        model = User
        fields = ('phone_number',)
    

    def validate_phone_number(self, value):
        """Check if the phone number is already registered."""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This phone number is already registered.")
        return value

    def create(self, validated_data):
        phone_number = validated_data['phone_number']
        user = User.objects.create(username=phone_number, is_active=False)
        # Add user to "Patient" group
        # patient_group, created = Group.objects.get_or_create(name="patient")
        # user.groups.add(patient_group)
        return user

class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = ["id", "first_name", "last_name", "relation", "gender", "date_of_birth"]

    def create(self, validated_data):
        """
        Creates a new patient profile under the authenticated user's account.
        """
        user = self.context["request"].user
        print("user", user)
        print("username", user.username)
        account, _ = PatientAccount.objects.get_or_create(user=user)
        validated_data["account"] = account  # Assign the patient account
        return super().create(validated_data)

class PatientAccountSerializer(serializers.ModelSerializer):
    profiles = PatientProfileSerializer(many=True, read_only=True)

    class Meta:
        model = PatientAccount
        fields = ['id', 'user', 'alternate_mobile', 'preferred_language', 'profiles']
class PatientProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = ["first_name", "last_name", "relation", "gender", "date_of_birth"]

    def update(self, instance, validated_data):
        # Update only provided fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

class PatientProfileDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfileDetails
        fields = '__all__'

class PatientProfileSearchSerializer(serializers.ModelSerializer):
    mobile = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = PatientProfile
        fields = ['id', 'first_name', 'last_name', 'full_name', 'relation', 'gender', 'date_of_birth', 'mobile']

    def get_mobile(self, obj):
        try:
            return obj.account.user.username  # change this to whatever field you're using (e.g., obj.account.user.phone_number)
        except AttributeError:
            return None

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class PatientInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = ['id', 'first_name', 'last_name', 'gender', 'age', 'account']


# Doctor EMR Patient Creation Serializers
class CheckMobileSerializer(serializers.Serializer):
    """Serializer for checking if patient exists by mobile number"""
    mobile = serializers.CharField(max_length=15, required=True)
    
    def validate_mobile(self, value):
        """Validate and normalize mobile number"""
        # Remove spaces and special characters
        mobile = ''.join(filter(str.isdigit, value))
        
        # Check length (assuming 10 digits for India)
        if len(mobile) != 10:
            raise serializers.ValidationError("Mobile number must be 10 digits")
        
        return mobile


class CreatePatientSerializer(serializers.Serializer):
    """Serializer for creating patient from doctor EMR"""
    mobile = serializers.CharField(max_length=15, required=True)
    first_name = serializers.CharField(max_length=255, required=True)
    last_name = serializers.CharField(max_length=255, required=True)
    gender = serializers.ChoiceField(choices=PatientProfile.GENDER_CHOICES, required=True)
    date_of_birth = serializers.DateField(required=True)
    
    def validate_mobile(self, value):
        """Validate and normalize mobile number"""
        logger.debug(f"Validating mobile: {value} (type: {type(value)})")
        # Remove spaces and special characters
        mobile = ''.join(filter(str.isdigit, value))
        logger.debug(f"Normalized mobile: {mobile} (length: {len(mobile)})")
        if len(mobile) != 10:
            logger.error(f"Mobile validation failed: length is {len(mobile)}, expected 10")
            raise serializers.ValidationError("Mobile number must be 10 digits")
        logger.debug(f"Mobile validation passed: {mobile}")
        return mobile
    
    def validate(self, attrs):
        """Additional validation"""
        logger.debug(f"CreatePatientSerializer validate called with: {attrs}")
        logger.debug(f"Gender choices available: {PatientProfile.GENDER_CHOICES}")
        return attrs


class AddFamilyMemberSerializer(serializers.ModelSerializer):
    """Serializer for adding family member profile"""
    class Meta:
        model = PatientProfile
        fields = ['first_name', 'last_name', 'relation', 'gender', 'date_of_birth']
    
    def validate_relation(self, value):
        """Ensure 'self' relation cannot be added via this endpoint"""
        if value == 'self':
            raise serializers.ValidationError("Cannot add 'self' profile. Use create patient endpoint instead.")
        return value


class PatientProfileListSerializer(serializers.ModelSerializer):
    """Serializer for listing patient profiles"""
    profile_id = serializers.UUIDField(source='id', read_only=True)
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = PatientProfile
        fields = ['profile_id', 'full_name', 'relation', 'gender', 'date_of_birth']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class SelectPatientSerializer(serializers.Serializer):
    """Serializer for selecting a patient"""
    profile_id = serializers.UUIDField(required=False, allow_null=True)
    patient_account_id = serializers.UUIDField(required=False, allow_null=True)
    
    def validate(self, attrs):
        """Ensure at least one ID is provided"""
        if not attrs.get('profile_id') and not attrs.get('patient_account_id'):
            raise serializers.ValidationError("Either profile_id or patient_account_id must be provided.")
        return attrs


class SelectedPatientSerializer(serializers.Serializer):
    """Serializer for selected patient response"""
    profile_id = serializers.UUIDField(required=False, allow_null=True)
    patient_account_id = serializers.UUIDField(required=False, allow_null=True)
    profile_name = serializers.CharField(required=False, allow_null=True)
    mobile = serializers.CharField(required=False, allow_null=True)
    selected_at = serializers.DateTimeField(required=False, allow_null=True)