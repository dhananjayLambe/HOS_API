from rest_framework import serializers
from account.models import User
from doctor.models import doctor
from django.contrib.auth.models import Group
from hospital_mgmt.models import Hospital


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
        )
        group_doctor, created = Group.objects.get_or_create(name='doctor')
        group_doctor.user_set.add(user)
        return user


class DoctorProfileSerializer(serializers.ModelSerializer):
    hospital_id = serializers.PrimaryKeyRelatedField(
        queryset=Hospital.objects.all(), source="hospital"
    )

    class Meta:
        model = doctor
        fields = ["secondary_mobile_number", "hospital_id"]

    def create(self, validated_data):
        return doctor.objects.create(**validated_data)


class DoctorRegistrationSerializer(serializers.Serializer):
    user_data = UserSerializer()
    profile_data = DoctorProfileSerializer()

    def create(self, validated_data):
        user_data = validated_data.pop("user_data")
        profile_data = validated_data.pop("profile_data")
        user = UserSerializer().create(user_data)
        profile_data["user"] = user
        doctor_profile = DoctorProfileSerializer().create(profile_data)
        return doctor_profile


class doctorRegistrationSerializerAdmin(serializers.Serializer):
    username = serializers.CharField(label='Username:')
    first_name = serializers.CharField(label='First name:')
    last_name = serializers.CharField(label='Last name:', required=False)
    password = serializers.CharField(
        label='Password:',
        style={'input_type': 'password'},
        write_only=True,
        min_length=8,
        help_text=(
            "Your password must contain at least 8 characters and should not be "
            "entirely numeric."
        ),
    )
    password2 = serializers.CharField(
        label='Confirm password:', style={'input_type': 'password'}, write_only=True
    )

    def validate_username(self, username):
        username_exists = User.objects.filter(username__iexact=username)
        if username_exists:
            raise serializers.ValidationError({'username': 'This username already exists'})
        return username

    def validate_password(self, password):
        if password.isdigit():
            raise serializers.ValidationError('Your password should contain letters!')
        return password

    def validate(self, data):
        password = data.get('password')
        password2 = data.pop('password2')
        if password != password2:
            raise serializers.ValidationError({'password': 'password must match'})
        return data

    def create(self, validated_data):
        user = User.objects.create(
            username=validated_data['username'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            status=True,
        )
        user.set_password(validated_data['password'])
        user.save()
        group_doctor, created = Group.objects.get_or_create(name='doctor')
        group_doctor.user_set.add(user)
        return user


class doctorRegistrationProfileSerializerAdmin(serializers.Serializer):
    Cardiologist = 'CL'
    Dermatologists = 'DL'
    Emergency_Medicine_Specialists = 'EMC'
    Immunologists = 'IL'
    Anesthesiologists = 'AL'
    Colon_and_Rectal_Surgeons = 'CRS'
    department = serializers.ChoiceField(
        label='Department:',
        choices=[
            (Cardiologist, 'Cardiologist'),
            (Dermatologists, 'Dermatologists'),
            (Emergency_Medicine_Specialists, 'Emergency Medicine Specialists'),
            (Immunologists, 'Immunologists'),
            (Anesthesiologists, 'Anesthesiologists'),
            (Colon_and_Rectal_Surgeons, 'Colon and Rectal Surgeons'),
        ],
    )
    address = serializers.CharField(label="Address:")
    mobile = serializers.CharField(label="Mobile Number:", max_length=20)

    def validate_mobile(self, mobile):
        if mobile.isdigit() is False:
            raise serializers.ValidationError('Please Enter a valid mobile number!')
        return mobile

    def create(self, validated_data):
        new_doctor = doctor.objects.create(
            department=validated_data['department'],
            address=validated_data['address'],
            mobile=validated_data['mobile'],
            user=validated_data['user'],
        )
        return new_doctor


class doctorProfileSerializerAdmin(serializers.Serializer):
    Cardiologist = 'CL'
    Dermatologists = 'DL'
    Emergency_Medicine_Specialists = 'EMC'
    Immunologists = 'IL'
    Anesthesiologists = 'AL'
    Colon_and_Rectal_Surgeons = 'CRS'
    id = serializers.IntegerField(read_only=True)
    department = serializers.ChoiceField(
        label='Department:',
        choices=[
            (Cardiologist, 'Cardiologist'),
            (Dermatologists, 'Dermatologists'),
            (Emergency_Medicine_Specialists, 'Emergency Medicine Specialists'),
            (Immunologists, 'Immunologists'),
            (Anesthesiologists, 'Anesthesiologists'),
            (Colon_and_Rectal_Surgeons, 'Colon and Rectal Surgeons'),
        ],
    )
    address = serializers.CharField(label="Address:")
    mobile = serializers.CharField(label="Mobile Number:", max_length=20)

    def validate_mobile(self, mobile):
        if mobile.isdigit() is False:
            raise serializers.ValidationError('Please Enter a valid mobile number!')
        return mobile
