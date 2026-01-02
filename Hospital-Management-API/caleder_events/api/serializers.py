from rest_framework import serializers
from django.utils import timezone
from caleder_events.models import CalendarEvent


class CalendarEventSerializer(serializers.ModelSerializer):
    """Serializer for creating calendar events with comprehensive validation."""
    
    class Meta:
        model = CalendarEvent
        fields = [
            'id', 'title', 'category', 'start_datetime', 'end_datetime',
            'location', 'description', 'is_blocking', 'reminder_minutes',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_active', 'created_at', 'updated_at']
    
    def validate_start_datetime(self, value):
        """Ensure start_datetime is timezone-aware."""
        if value and not timezone.is_aware(value):
            raise serializers.ValidationError("Start datetime must be timezone-aware.")
        return value
    
    def validate_end_datetime(self, value):
        """Ensure end_datetime is timezone-aware."""
        if value and not timezone.is_aware(value):
            raise serializers.ValidationError("End datetime must be timezone-aware.")
        return value
    
    def validate(self, attrs):
        """Comprehensive validation for calendar events."""
        start_datetime = attrs.get('start_datetime')
        end_datetime = attrs.get('end_datetime')
        category = attrs.get('category')
        is_blocking = attrs.get('is_blocking', False)
        reminder_minutes = attrs.get('reminder_minutes')
        
        # 1. Time validation: end_datetime must be after start_datetime
        if start_datetime and end_datetime:
            if end_datetime <= start_datetime:
                raise serializers.ValidationError({
                    'end_datetime': 'End time must be after start time.'
                })
        
        # 2. Category-based rules
        if category == CalendarEvent.Category.HOLIDAY:
            # HOLIDAY: is_blocking must be True, reminder_minutes not allowed
            attrs['is_blocking'] = True
            if reminder_minutes is not None:
                raise serializers.ValidationError({
                    'reminder_minutes': 'Reminder is not allowed for HOLIDAY events.'
                })
        
        elif category == CalendarEvent.Category.REMINDER:
            # REMINDER: is_blocking must be False, reminder_minutes required
            attrs['is_blocking'] = False
            if reminder_minutes is None:
                raise serializers.ValidationError({
                    'reminder_minutes': 'Reminder minutes is required for REMINDER events.'
                })
            # Validate reminder_minutes is positive
            if reminder_minutes <= 0:
                raise serializers.ValidationError({
                    'reminder_minutes': 'Reminder minutes must be a positive integer.'
                })
            # Validate reminder time < event duration
            if start_datetime and end_datetime:
                event_duration_minutes = (end_datetime - start_datetime).total_seconds() / 60
                if reminder_minutes >= event_duration_minutes:
                    raise serializers.ValidationError({
                        'reminder_minutes': 'Reminder time must be less than event duration.'
                    })
        
        elif category in [CalendarEvent.Category.MEETING, CalendarEvent.Category.PERSONAL]:
            # MEETING and PERSONAL: reminder_minutes optional, but if provided must be valid
            if reminder_minutes is not None:
                if reminder_minutes <= 0:
                    raise serializers.ValidationError({
                        'reminder_minutes': 'Reminder minutes must be a positive integer.'
                    })
                # Validate reminder time < event duration
                if start_datetime and end_datetime:
                    event_duration_minutes = (end_datetime - start_datetime).total_seconds() / 60
                    if reminder_minutes >= event_duration_minutes:
                        raise serializers.ValidationError({
                            'reminder_minutes': 'Reminder time must be less than event duration.'
                        })
        
        # 3. Validate reminder_minutes is positive if provided
        if reminder_minutes is not None and reminder_minutes <= 0:
            raise serializers.ValidationError({
                'reminder_minutes': 'Reminder minutes must be a positive integer.'
            })
        
        return attrs
    
    def validate_category(self, value):
        """Ensure category is one of the allowed values."""
        allowed_categories = [
            CalendarEvent.Category.HOLIDAY,
            CalendarEvent.Category.MEETING,
            CalendarEvent.Category.REMINDER,
            CalendarEvent.Category.PERSONAL
        ]
        if value not in allowed_categories:
            raise serializers.ValidationError(
                f'Invalid category. Allowed: {", ".join(allowed_categories)}'
            )
        return value


class CalendarEventCreateSerializer(CalendarEventSerializer):
    """Serializer specifically for creating calendar events with overlap validation."""
    
    def validate(self, attrs):
        """Add overlap validation for blocking events."""
        # First run base validation
        attrs = super().validate(attrs)
        
        start_datetime = attrs.get('start_datetime')
        end_datetime = attrs.get('end_datetime')
        is_blocking = attrs.get('is_blocking', False)
        
        # Get doctor from context (set in view)
        doctor = self.context.get('doctor')
        if not doctor:
            raise serializers.ValidationError('Doctor context is required.')
        
        # 4. Overlap validation for blocking events
        if is_blocking and start_datetime and end_datetime:
            # Check for overlapping blocking events or holidays
            # Overlap logic: (new_start < existing_end) AND (new_end > existing_start)
            overlapping_events = CalendarEvent.objects.filter(
                doctor=doctor,
                is_blocking=True,
                is_active=True,
                start_datetime__lt=end_datetime,
                end_datetime__gt=start_datetime
            )
            
            # Exclude current instance if updating
            if self.instance:
                overlapping_events = overlapping_events.exclude(id=self.instance.id)
            
            if overlapping_events.exists():
                raise serializers.ValidationError({
                    'non_field_errors': ['This time slot is already blocked by another event.']
                })
        
        return attrs
    
    def create(self, validated_data):
        """Create calendar event with doctor from context."""
        doctor = self.context.get('doctor')
        if not doctor:
            raise serializers.ValidationError('Doctor context is required.')
        
        validated_data['doctor'] = doctor
        validated_data['is_active'] = True
        
        return super().create(validated_data)


class CalendarEventUpdateSerializer(CalendarEventCreateSerializer):
    """Serializer for updating calendar events with overlap validation."""
    
    def validate(self, attrs):
        """Validate update with overlap checking."""
        # Merge existing instance data with new attrs for validation
        if self.instance:
            # Get existing values for fields not being updated
            for field in ['start_datetime', 'end_datetime', 'is_blocking', 'category']:
                if field not in attrs:
                    attrs[field] = getattr(self.instance, field)
        
        # Run parent validation (includes overlap check)
        return super().validate(attrs)


class CalendarEventListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing calendar events."""
    
    class Meta:
        model = CalendarEvent
        fields = [
            'id', 'title', 'category', 'start_datetime', 'end_datetime',
            'location', 'is_blocking', 'reminder_minutes', 'is_active',
            'created_at', 'updated_at'
        ]

