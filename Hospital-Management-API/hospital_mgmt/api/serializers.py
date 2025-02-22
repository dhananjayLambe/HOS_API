from rest_framework import serializers
from doctor.api.serializers import DoctorSerializer
from patient.api.serializers import PatientSerializer
from hospital_mgmt.models import (
    Hospital, HospitalLicensing, HospitalOperationalDetails, 
    HospitalStaffDetails, HospitalFacility, HospitalDigitalInformation,
    HospitalBillingInformation)


# class FrontDeskUserSerializer(serializers.ModelSerializer):
#     hospital_name = serializers.ReadOnlyField(source='hospital.name')
#     username = serializers.ReadOnlyField(source='user.username')

#     class Meta:
#         model = FrontDeskUser
#         fields = ['id', 'hospital', 'hospital_name', 'user', 'username', 'created_at']

# class HospitalSerializer(serializers.ModelSerializer):
#     doctors = DoctorSerializer(many=True, read_only=True)
#     front_desk_users = FrontDeskUserSerializer(many=True, read_only=True)
#     patients = PatientSerializer(many=True, read_only=True)
#     class Meta:
#         model = Hospital
#         fields = ['id', 'name', 'address', 'contact_number', 'created_at' , \
#                   'doctors','front_desk_users','patients']

class HospitalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hospital
        fields = '__all__'

class HospitalLicensingSerializer(serializers.ModelSerializer):
    class Meta:
        model = HospitalLicensing
        fields = '__all__'

class HospitalOperationalDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = HospitalOperationalDetails
        fields = '__all__'

class HospitalStaffDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = HospitalStaffDetails
        fields = '__all__'

class HospitalFacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = HospitalFacility
        fields = '__all__'

class HospitalDigitalInformationSerializer(serializers.ModelSerializer):
    class Meta:
        model = HospitalDigitalInformation
        fields = '__all__'

class HospitalBillingInformationSerializer(serializers.ModelSerializer):
    class Meta:
        model = HospitalBillingInformation
        fields = '__all__'

# class FrontDeskUserSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = FrontDeskUser
#         fields = '__all__'
