from rest_framework import serializers
#from django.contrib.auth import get_user_model
from account.models import User
from datetime import datetime
from patient_account.models import PatientAccount, Address,PatientProfile
from django.contrib.auth.models import Group
#User = get_user_model()

def calculate_dob(age):
    current_year = datetime.now().year
    birth_year = current_year - int(age)
    return datetime(birth_year, 1, 1).date()  # Assuming the DOB is January 1st of the calculated year

# Step 1: Registration Serializer
class PatientRegistrationSerializer(serializers.Serializer):
    mobile = serializers.CharField(max_length=15)
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    gender = serializers.ChoiceField(choices=[('Male', 'Male'), ('Female', 'Female'), ('Other', 'Other')])
    
    def validate_mobile(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Mobile number already registered.")
        return value
    
    def create(self, validated_data):
        user = User.objects.create(username=validated_data['mobile'], is_active=False)
        user.first_name = validated_data['first_name']
        user.last_name = validated_data['last_name']
        user.save()
        
        patient = PatientAccount.objects.create(user=user)
        return patient

# Step 2: Profile Completion Serializer
class PatientProfileCompletionSerializer(serializers.ModelSerializer):
    address = serializers.JSONField(required=False)
    
    class Meta:
        model = PatientAccount
        fields = ['alternate_mobile', 'preferred_language', 'address']
    
    def update(self, instance, validated_data):
        address_data = validated_data.pop('address', None)
        if address_data:
            address, created = Address.objects.update_or_create(
                id=instance.id, defaults=address_data
            )
            instance.address = address
        return super().update(instance, validated_data)

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