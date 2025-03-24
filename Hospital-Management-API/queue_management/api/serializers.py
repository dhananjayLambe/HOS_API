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