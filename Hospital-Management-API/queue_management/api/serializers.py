from rest_framework import serializers
from queue_management.models import Queue

class QueueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Queue
        fields = '__all__'

class QueueUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Queue
        fields = ['status', 'position_in_queue']

class QueueReorderSerializer(serializers.Serializer):
    queue_ids = serializers.ListField(
        child=serializers.UUIDField(),
        help_text="List of queue IDs in the desired order"
    )

class QueuePatientSerializer(serializers.ModelSerializer):
    queue_position = serializers.IntegerField(source='position_in_queue')
    estimated_wait_time = serializers.DurationField()
    doctor_name = serializers.CharField(source='doctor.full_name', read_only=True)
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)

    class Meta:
        model = Queue
        fields = ['id', 'status', 'queue_position', 'estimated_wait_time', 'doctor_name', 'clinic_name', 'check_in_time']