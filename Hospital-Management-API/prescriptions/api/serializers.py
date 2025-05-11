from rest_framework import serializers
from prescriptions.models import Prescription

class PrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'consultation']

    def validate(self, attrs):
        if attrs['dosage_amount'] <= 0:
            raise serializers.ValidationError({"dosage_amount": "Dosage amount must be greater than zero."})
        if attrs['frequency_per_day'] <= 0 or attrs['frequency_per_day'] > 6:
            raise serializers.ValidationError({"frequency_per_day": "Frequency should be between 1 and 6 times per day."})
        if attrs['duration_in_days'] <= 0:
            raise serializers.ValidationError({"duration_in_days": "Duration must be at least 1 day."})
        if not isinstance(attrs['timing_schedule'], list):
            raise serializers.ValidationError({"timing_schedule": "Timing schedule must be a list of timing values."})
        
        # Check for duplicate prescription for same consultation
        consultation = self.context['view'].kwargs.get('consultation_id')
        if Prescription.objects.filter(
            consultation_id=consultation,
            drug_name__iexact=attrs['drug_name'],
            strength__iexact=attrs['strength'],
            dosage_amount=attrs['dosage_amount']
        ).exists():
            raise serializers.ValidationError("Prescription for this medicine with same strength and dosage already exists.")
        return attrs

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data['updated_by'] = self.context['request'].user
        return super().update(instance, validated_data)