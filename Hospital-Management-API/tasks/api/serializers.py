from rest_framework import serializers
from datetime import date
from tasks.models import Task


class TaskSerializer(serializers.ModelSerializer):
    """Serializer for listing and detail view of tasks."""
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'priority',
            'due_date', 'assigned_to', 'assigned_to_name',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_assigned_to_name(self, obj):
        """Get the full name of the assigned user."""
        if obj.assigned_to:
            name = f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip()
            return name if name else obj.assigned_to.username
        return None

    def get_created_by_name(self, obj):
        """Get the full name of the creator."""
        if obj.created_by:
            name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return name if name else obj.created_by.username
        return None


class TaskCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating tasks with comprehensive validation."""
    
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'status', 'priority',
            'due_date', 'assigned_to'
        ]

    def validate_title(self, value):
        """Validate title."""
        if not value or not value.strip():
            raise serializers.ValidationError("Title is required.")
        
        value = value.strip()
        
        if len(value) > 255:
            raise serializers.ValidationError("Title cannot exceed 255 characters.")
        
        return value

    def validate_due_date(self, value):
        """Validate that due_date is today or in the future."""
        if value < date.today():
            raise serializers.ValidationError("Due date cannot be in the past.")
        return value

    def validate_status(self, value):
        """Validate status choice."""
        valid_statuses = [choice[0] for choice in Task.STATUS_CHOICES]
        if value not in valid_statuses:
            raise serializers.ValidationError(
                f"Invalid status. Allowed values: {', '.join(valid_statuses)}"
            )
        return value

    def validate_priority(self, value):
        """Validate priority choice."""
        valid_priorities = [choice[0] for choice in Task.PRIORITY_CHOICES]
        if value not in valid_priorities:
            raise serializers.ValidationError(
                f"Invalid priority. Allowed values: {', '.join(valid_priorities)}"
            )
        return value

    def validate_assigned_to(self, value):
        """Validate that assigned_to is an active user."""
        if not value:
            raise serializers.ValidationError("Assigned user is required.")
        
        if not value.is_active:
            raise serializers.ValidationError("Assigned user must be active.")
        
        return value

    def create(self, validated_data):
        """Create task and set created_by to current user."""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class TaskUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating tasks (full update)."""
    
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'status', 'priority', 'due_date'
        ]

    def validate_title(self, value):
        """Validate title."""
        if value is not None:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("Title cannot be empty.")
            if len(value) > 255:
                raise serializers.ValidationError("Title cannot exceed 255 characters.")
        return value

    def validate_due_date(self, value):
        """Validate that due_date is today or in the future."""
        if value and value < date.today():
            raise serializers.ValidationError("Due date cannot be in the past.")
        return value

    def validate_status(self, value):
        """Validate status choice."""
        if value:
            valid_statuses = [choice[0] for choice in Task.STATUS_CHOICES]
            if value not in valid_statuses:
                raise serializers.ValidationError(
                    f"Invalid status. Allowed values: {', '.join(valid_statuses)}"
                )
        return value

    def validate_priority(self, value):
        """Validate priority choice."""
        if value:
            valid_priorities = [choice[0] for choice in Task.PRIORITY_CHOICES]
            if value not in valid_priorities:
                raise serializers.ValidationError(
                    f"Invalid priority. Allowed values: {', '.join(valid_priorities)}"
                )
        return value


class TaskPartialUpdateSerializer(serializers.ModelSerializer):
    """Serializer for partial updates (status/priority only)."""
    
    class Meta:
        model = Task
        fields = ['status', 'priority']

    def validate_status(self, value):
        """Validate status choice."""
        if value:
            valid_statuses = [choice[0] for choice in Task.STATUS_CHOICES]
            if value not in valid_statuses:
                raise serializers.ValidationError(
                    f"Invalid status. Allowed values: {', '.join(valid_statuses)}"
                )
        return value

    def validate_priority(self, value):
        """Validate priority choice."""
        if value:
            valid_priorities = [choice[0] for choice in Task.PRIORITY_CHOICES]
            if value not in valid_priorities:
                raise serializers.ValidationError(
                    f"Invalid priority. Allowed values: {', '.join(valid_priorities)}"
                )
        return value

