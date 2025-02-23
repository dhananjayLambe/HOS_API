from rest_framework import serializers
from account.models import User
from datetime import datetime
from patient_account.models import PatientAccount, PatientProfile,PatientProfileDetails

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

class PatientProfileDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfileDetails
        fields = '__all__'
