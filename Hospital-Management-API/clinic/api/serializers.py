from rest_framework import serializers
from clinic.models import (
    Clinic,ClinicAddress,
    ClinicSpecialization, ClinicSchedule,
    ClinicService, ClinicServiceList)

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