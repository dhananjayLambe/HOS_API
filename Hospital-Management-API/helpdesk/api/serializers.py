from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from helpdesk.models import HelpdeskClinicUser
from account.models import User
from clinic.models import Clinic
from django.contrib.auth.models import Group

class HelpdeskClinicUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = HelpdeskClinicUser
        fields = '__all__'  # Include all fields

class HelpdeskUserRegistrationSerializer(serializers.ModelSerializer):
    clinic_id = serializers.UUIDField(write_only=True)  # Clinic ID is required for helpdesk user

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "username", "email", "password", "clinic_id"]
        extra_kwargs = {
            "password": {"write_only": True},
        }

    def validate_username(self, value):
        """Ensure mobile number (username) is unique"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this mobile number already exists.")
        return value

    def validate_clinic_id(self, value):
        """Ensure clinic exists"""
        if not Clinic.objects.filter(id=value).exists():
            raise serializers.ValidationError("Invalid Clinic ID")
        return value

    def create(self, validated_data):
        """Create a new Helpdesk user with pending approval"""
        clinic_id = validated_data.pop("clinic_id")  # Extract clinic ID
        password = validated_data.pop("password")  # Extract password

        # Create user with pending approval
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.is_active = False  # Set status as Pending Approval
        helpdesk_group, created = Group.objects.get_or_create(name="helpdesk")
        user.groups.add(helpdesk_group)
        user.save()
        # Link user to clinic
        clinic = Clinic.objects.get(id=clinic_id)
        HelpdeskClinicUser.objects.create(user=user, clinic=clinic)
        return user

class HelpdeskLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        username = data.get("username")
        password = data.get("password")
        
        user = authenticate(username=username, password=password)
        
        if not user:
            raise serializers.ValidationError("Invalid credentials")
        
        if not hasattr(user, "helpdesk_profile"):
            raise serializers.ValidationError("User is not a Helpdesk User")
        
        if not user.is_active:
            raise serializers.ValidationError("User account is inactive. Approval pending.")
        
        tokens = RefreshToken.for_user(user)
        
        return {
            "id": user.id,
            "access": str(tokens.access_token),
            "refresh": str(tokens),
        }

class HelpdeskLogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, data):
        try:
            token = RefreshToken(data["refresh"])
            token.blacklist()  # Blacklist the refresh token
        except Exception as e:
            raise serializers.ValidationError("Invalid token or already logged out")
        return {}