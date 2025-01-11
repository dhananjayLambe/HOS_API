from rest_framework import serializers
from clinic.models import Clinic

class ClinicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinic
        fields = '__all__'  # Or specify fields explicitly like: ['id', 'name', 'contact_number_primary', ...]