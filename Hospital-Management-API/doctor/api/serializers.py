from patient.models import Appointment
from rest_framework import serializers
from account.models import User
from django.contrib.auth.models import Group
from hospital_mgmt.models import Hospital
from doctor.models import (
    doctor, Registration, GovernmentID, Education,
    Specialization,Award,Certification,
    DoctorSocialLink,DoctorFeedback,DoctorLanguage)
from clinic.models import Clinic
from django.db import transaction



##############OLD CODE For Reference###############
'''
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name']


class doctorRegistrationSerializer(serializers.Serializer):

    username=serializers.CharField(label='Username:')
    first_name=serializers.CharField(label='First name:')
    last_name=serializers.CharField(label='Last name:', required=False)
    password = serializers.CharField(label='Password:',style={'input_type': 'password'}, write_only=True,min_length=8,
    help_text="Your password must contain at least 8 characters and should not be entirely numeric."
    )
    password2=serializers.CharField(label='Confirm password:',style={'input_type': 'password'},  write_only=True)
    

    
    def validate_username(self, username):
        username_exists=User.objects.filter(username__iexact=username)
        if username_exists:
            raise serializers.ValidationError({'username':'This username already exists'})
        return username

        
    def validate_password(self, password):
        if password.isdigit():
            raise serializers.ValidationError('Your password should contain letters!')
        return password  

 

    def validate(self, data):
        password=data.get('password')
        password2=data.pop('password2')
        if password != password2:
            raise serializers.ValidationError({'password':'password must match'})
        return data


    def create(self, validated_data):
        user= User.objects.create(
                username=validated_data['username'],
                first_name=validated_data['first_name'],
                last_name=validated_data['last_name'],
                status=False
            )
        user.set_password(validated_data['password'])
        user.save()
        group_doctor, created = Group.objects.get_or_create(name='doctor')
        group_doctor.user_set.add(user)
        return user

class doctorProfileSerializer(serializers.Serializer):
    Cardiologist='CL'
    Dermatologists='DL'
    Emergency_Medicine_Specialists='EMC'
    Immunologists='IL'
    Anesthesiologists='AL'
    Colon_and_Rectal_Surgeons='CRS'
    department=serializers.ChoiceField(label='Department:', choices=[(Cardiologist,'Cardiologist'),
        (Dermatologists,'Dermatologists'),
        (Emergency_Medicine_Specialists,'Emergency Medicine Specialists'),
        (Immunologists,'Immunologists'),
        (Anesthesiologists,'Anesthesiologists'),
        (Colon_and_Rectal_Surgeons,'Colon and Rectal Surgeons')
    ])
    address= serializers.CharField(label="Address:")
    mobile=serializers.CharField(label="Mobile Number:", max_length=20)
    hospital_id = serializers.PrimaryKeyRelatedField(source='user.hospital', read_only=True)


    def validate_mobile(self, mobile):
        if mobile.isdigit()==False:
            raise serializers.ValidationError('Please Enter a valid mobile number!')
        return mobile
    
    def create(self, validated_data):
        new_doctor= doctor.objects.create(
            department=validated_data['department'],
            address=validated_data['address'],
            mobile=validated_data['mobile'],
            user=validated_data['user']
        )
        return new_doctor
    
    def update(self, instance, validated_data):
        instance.department=validated_data.get('department', instance.department)
        instance.address=validated_data.get('address', instance.address)
        instance.mobile=validated_data.get('mobile', instance.mobile)
        instance.save()
        return instance
'''
###################END################

##############NEW#############

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
        fields = ["department", "address", "mobile", "hospital_id"]

    def create(self, validated_data):
        return doctor.objects.create(**validated_data)

# Doctor Serializer
class DoctorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    username = serializers.ReadOnlyField(source="user.username")

    class Meta:
        model = doctor
        fields = ['id', 'username','mobile', 'hospital', 'department', 'address','user']
        #fields=['id', 'username', 'first_name', 'last_name', 'status', 'hospital_id', 'department', 'address', 'mobile','created_at']

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

class patientHistorySerializerDoctorView(serializers.Serializer):
    Cardiologist='CL'
    Dermatologists='DL'
    Emergency_Medicine_Specialists='EMC'
    Immunologists='IL'
    Anesthesiologists='AL'
    Colon_and_Rectal_Surgeons='CRS'
    admit_date=serializers.DateField(label="Admit Date:", read_only=True)
    symptomps=serializers.CharField(label="Symptomps:", style={'base_template': 'textarea.html'})
    department=serializers.CharField(label='Department: ')
    #required=False; if this field is not required to be present during deserialization.
    release_date=serializers.DateField(label="Release Date:", required=False)
    assigned_doctor=serializers.StringRelatedField(label='Assigned Doctor:')

class doctorAppointmentSerializer(serializers.Serializer):
    patient_name=serializers.SerializerMethodField('related_patient_name')
    patient_age=serializers.SerializerMethodField('related_patient_age')
    appointment_date=serializers.DateField(label="Appointment Date:",)
    appointment_time=serializers.TimeField(label="Appointment Time:")
    patient_history=patientHistorySerializerDoctorView(label='patient History:')
    

    def related_patient_name(self, obj):
        return obj.patient_history.patient.get_name
    
    def related_patient_age(self, obj):
        return obj.patient_history.patient.age


class RegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Registration
        fields = '__all__'

class GovernmentIDSerializer(serializers.ModelSerializer):
    class Meta:
        model = GovernmentID
        fields = '__all__'

class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = '__all__'

class SpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = '__all__'

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

class DoctorLanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorLanguage
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
            'username', 'password', 'first_name', 'last_name', 'email', 'clinics', 'department',
            'address', 'mobile', 'mobile_number', 'dob', 'about', 'photo'
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
