from rest_framework import serializers
from hospital_mgmt.models import (
    Hospital, HospitalLicensing, HospitalOperationalDetails, 
    HospitalStaffDetails, HospitalFacility, HospitalDigitalInformation,
    HospitalBillingInformation)


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
