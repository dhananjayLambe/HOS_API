from rest_framework import serializers
#from django.contrib.auth import get_user_model
from account.models import User
from datetime import datetime
from patient_account.models import PatientAccount, Address
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