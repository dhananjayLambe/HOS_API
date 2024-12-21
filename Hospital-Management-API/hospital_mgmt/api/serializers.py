from rest_framework import serializers
from hospital_mgmt.models import Hospital, FrontDeskUser
from doctor.api.serializers import DoctorSerializer
from patient.api.serializers import PatientSerializer

class FrontDeskUserSerializer(serializers.ModelSerializer):
    hospital_name = serializers.ReadOnlyField(source='hospital.name')
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = FrontDeskUser
        fields = ['id', 'hospital', 'hospital_name', 'user', 'username', 'created_at']

class HospitalSerializer(serializers.ModelSerializer):
    doctors = DoctorSerializer(many=True, read_only=True)
    front_desk_users = FrontDeskUserSerializer(many=True, read_only=True)
    patients = PatientSerializer(many=True, read_only=True)
    class Meta:
        model = Hospital
        fields = ['id', 'name', 'address', 'contact_number', 'created_at' , \
                  'doctors','front_desk_users','patients']

