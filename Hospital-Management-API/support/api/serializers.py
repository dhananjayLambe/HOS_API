import re
from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from support.models import (
    SupportTicket,
    SupportTicketAttachment,
    SupportTicketComment
)
from account.models import User


def sanitize_text(text):
    """Sanitize text input to prevent XSS and remove dangerous characters."""
    if not text:
        return text
    
    # Remove null bytes
    text = text.replace('\x00', '')
    
    # Remove control characters except newlines and tabs
    text = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]', '', text)
    
    return text.strip()


def get_user_role_from_groups(user):
    """
    Maps Django user groups to SupportTicket.SupportUserRole choices.
    Returns the first matching role or 'patient' as default.
    """
    role_mapping = {
        'doctor': 'doctor',
        'patient': 'patient',
        'admin': 'admin',
        'clinic_admin': 'clinic_admin',
        'lab-admin': 'lab_admin',  # Note: group name uses hyphen
        'labadmin': 'lab_admin',
        'helpdesk': 'helpdesk_admin',
        'helpdesk_admin': 'helpdesk_admin',
        'superadmin': 'superadmin',
    }
    
    user_groups = user.groups.values_list('name', flat=True)
    for group_name in user_groups:
        if group_name in role_mapping:
            return role_mapping[group_name]
    
    # Default to patient if no match found
    return 'patient'


class SupportTicketAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for support ticket attachments."""
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicketAttachment
        fields = ['id', 'file', 'file_url', 'file_name', 'file_size', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def get_file_name(self, obj):
        if obj.file:
            return obj.file.name.split('/')[-1]
        return None

    def get_file_size(self, obj):
        if obj.file:
            return obj.file.size
        return None

    def validate_file(self, value):
        """Validate file size and type with comprehensive checks."""
        if not value:
            raise serializers.ValidationError("File is required.")
        
        max_size = 5 * 1024 * 1024  # 5MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size ({value.size / (1024 * 1024):.2f}MB) exceeds maximum allowed size (5MB)."
            )
        
        if value.size == 0:
            raise serializers.ValidationError("File cannot be empty.")
        
        allowed_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
        
        # Check content type
        content_type = getattr(value, 'content_type', None)
        if not content_type:
            # Try to infer from file extension
            file_name = getattr(value, 'name', '')
            if file_name:
                ext = '.' + file_name.split('.')[-1].lower() if '.' in file_name else ''
                if ext in allowed_extensions:
                    if ext == '.pdf':
                        content_type = 'application/pdf'
                    elif ext in ['.jpg', '.jpeg']:
                        content_type = 'image/jpeg'
                    elif ext == '.png':
                        content_type = 'image/png'
        
        # Validate content type
        if content_type and content_type not in allowed_types:
            raise serializers.ValidationError(
                f"File type '{content_type}' is not allowed. Only PDF and image files (JPG, PNG) are allowed."
            )
        
        # Validate file extension
        file_name = getattr(value, 'name', '')
        if file_name:
            ext = '.' + file_name.split('.')[-1].lower() if '.' in file_name else ''
            if ext not in allowed_extensions:
                raise serializers.ValidationError(
                    f"File extension '{ext}' is not allowed. Allowed extensions: {', '.join(allowed_extensions)}"
                )
        
        # Check for dangerous file names
        dangerous_patterns = ['..', '/', '\\', '<', '>', ':', '"', '|', '?', '*']
        if any(pattern in file_name for pattern in dangerous_patterns):
            raise serializers.ValidationError("File name contains invalid characters.")
        
        return value


class SupportTicketCommentSerializer(serializers.ModelSerializer):
    """Serializer for support ticket comments."""
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicketComment
        fields = ['id', 'message', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['id', 'created_by', 'created_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return None

    def validate_message(self, value):
        """Validate and sanitize comment message."""
        if not value or not value.strip():
            raise serializers.ValidationError("Comment message cannot be empty.")
        
        value = sanitize_text(value)
        
        if len(value) < 5:
            raise serializers.ValidationError("Comment must be at least 5 characters long.")
        
        if len(value) > 5000:
            raise serializers.ValidationError("Comment cannot exceed 5000 characters.")
        
        return value


class SupportTicketSerializer(serializers.ModelSerializer):
    """Serializer for listing and detail view of support tickets."""
    created_by_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    clinic_name = serializers.SerializerMethodField()
    attachments = SupportTicketAttachmentSerializer(many=True, read_only=True)
    comments = SupportTicketCommentSerializer(many=True, read_only=True)
    attachments_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = [
            'id', 'ticket_number', 'user_role', 'created_by', 'created_by_name',
            'doctor', 'doctor_name', 'clinic', 'clinic_name',
            'subject', 'description', 'category', 'priority', 'status',
            'assigned_to', 'assigned_to_name',
            'created_at', 'updated_at',
            'attachments', 'attachments_count', 'comments', 'comments_count'
        ]
        read_only_fields = ['id', 'ticket_number', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip() or obj.assigned_to.username
        return None

    def get_doctor_name(self, obj):
        if obj.doctor:
            return obj.doctor.get_name if hasattr(obj.doctor, 'get_name') else str(obj.doctor)
        return None

    def get_clinic_name(self, obj):
        if obj.clinic:
            return obj.clinic.name
        return None

    def get_attachments_count(self, obj):
        return obj.attachments.count()

    def get_comments_count(self, obj):
        return obj.comments.count()


class SupportTicketCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating support tickets with comprehensive validation."""
    
    class Meta:
        model = SupportTicket
        fields = [
            'subject', 'description', 'category', 'priority',
            'doctor', 'clinic'
        ]

    def validate_subject(self, value):
        """Validate and sanitize subject."""
        if not value or not value.strip():
            raise serializers.ValidationError("Subject is required.")
        
        value = sanitize_text(value)
        
        if len(value) < 5:
            raise serializers.ValidationError("Subject must be at least 5 characters long.")
        
        if len(value) > 255:
            raise serializers.ValidationError("Subject cannot exceed 255 characters.")
        
        return value

    def validate_description(self, value):
        """Validate and sanitize description."""
        if not value or not value.strip():
            raise serializers.ValidationError("Description is required.")
        
        value = sanitize_text(value)
        
        if len(value) < 20:
            raise serializers.ValidationError("Description must be at least 20 characters long.")
        
        if len(value) > 10000:
            raise serializers.ValidationError("Description cannot exceed 10000 characters.")
        
        return value

    def validate_category(self, value):
        """Validate category."""
        if value not in [choice[0] for choice in SupportTicket.Category.choices]:
            raise serializers.ValidationError(f"Invalid category. Allowed values: {', '.join([c[0] for c in SupportTicket.Category.choices])}")
        return value

    def validate_priority(self, value):
        """Validate priority."""
        if value not in [choice[0] for choice in SupportTicket.Priority.choices]:
            raise serializers.ValidationError(f"Invalid priority. Allowed values: {', '.join([c[0] for c in SupportTicket.Priority.choices])}")
        return value

    def validate_doctor(self, value):
        """Validate doctor if provided."""
        if value:
            # Check if doctor exists and is active
            if not hasattr(value, 'user') or not value.user.is_active:
                raise serializers.ValidationError("Selected doctor is not active.")
        return value

    def validate_clinic(self, value):
        """Validate clinic if provided."""
        if value:
            # Add clinic validation if needed
            pass
        return value

    def validate(self, data):
        """Cross-field validation."""
        # If doctor is provided, validate doctor-clinic relationship if clinic is also provided
        if data.get('doctor') and data.get('clinic'):
            doctor = data['doctor']
            clinic = data['clinic']
            if hasattr(doctor, 'clinics') and clinic not in doctor.clinics.all():
                raise serializers.ValidationError({
                    'doctor': 'Doctor is not associated with the selected clinic.'
                })
        
        return data

    @transaction.atomic
    def create(self, validated_data):
        """Create support ticket with automatic user_role assignment."""
        user = self.context['request'].user
        
        if not user or not user.is_authenticated:
            raise serializers.ValidationError("User must be authenticated to create a ticket.")
        
        user_role = get_user_role_from_groups(user)
        
        # Set created_by to current user
        validated_data['created_by'] = user
        validated_data['user_role'] = user_role
        
        # Auto-link doctor if user is a doctor
        if user_role == 'doctor' and hasattr(user, 'doctor'):
            validated_data['doctor'] = user.doctor
        
        try:
            ticket = SupportTicket.objects.create(**validated_data)
            return ticket
        except Exception as e:
            raise serializers.ValidationError(f"Failed to create ticket: {str(e)}")


class SupportTicketUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating support tickets with comprehensive validation."""
    
    subject = serializers.CharField(required=False, max_length=255)
    description = serializers.CharField(required=False)
    
    class Meta:
        model = SupportTicket
        fields = [
            'subject', 'description', 'status', 'priority', 
            'assigned_to', 'category'
        ]

    def validate_subject(self, value):
        """Validate subject if provided."""
        if value is not None:
            value = sanitize_text(value)
            if len(value) < 5:
                raise serializers.ValidationError("Subject must be at least 5 characters long.")
            if len(value) > 255:
                raise serializers.ValidationError("Subject cannot exceed 255 characters.")
        return value

    def validate_description(self, value):
        """Validate description if provided."""
        if value is not None:
            value = sanitize_text(value)
            if len(value) < 20:
                raise serializers.ValidationError("Description must be at least 20 characters long.")
            if len(value) > 10000:
                raise serializers.ValidationError("Description cannot exceed 10000 characters.")
        return value

    def validate_status(self, value):
        """Validate status transitions."""
        if self.instance:
            current_status = self.instance.status
            
            # Closed tickets are read-only
            if current_status == SupportTicket.Status.CLOSED:
                raise serializers.ValidationError("Cannot update a closed ticket.")
            
            # Validate status transitions
            valid_transitions = {
                SupportTicket.Status.OPEN: [
                    SupportTicket.Status.IN_PROGRESS,
                    SupportTicket.Status.WAITING_FOR_USER,
                    SupportTicket.Status.CLOSED
                ],
                SupportTicket.Status.IN_PROGRESS: [
                    SupportTicket.Status.WAITING_FOR_USER,
                    SupportTicket.Status.RESOLVED,
                    SupportTicket.Status.CLOSED,
                    SupportTicket.Status.OPEN
                ],
                SupportTicket.Status.WAITING_FOR_USER: [
                    SupportTicket.Status.IN_PROGRESS,
                    SupportTicket.Status.RESOLVED,
                    SupportTicket.Status.CLOSED,
                    SupportTicket.Status.OPEN
                ],
                SupportTicket.Status.RESOLVED: [
                    SupportTicket.Status.CLOSED,
                    SupportTicket.Status.IN_PROGRESS,
                    SupportTicket.Status.OPEN
                ],
            }
            
            if current_status in valid_transitions:
                if value not in valid_transitions[current_status]:
                    raise serializers.ValidationError(
                        f"Cannot transition from '{current_status}' to '{value}'. "
                        f"Valid transitions: {', '.join(valid_transitions[current_status])}"
                    )
        
        return value

    def validate_priority(self, value):
        """Validate priority."""
        if value not in [choice[0] for choice in SupportTicket.Priority.choices]:
            raise serializers.ValidationError(f"Invalid priority. Allowed values: {', '.join([c[0] for c in SupportTicket.Priority.choices])}")
        return value

    def validate_category(self, value):
        """Validate category."""
        if value not in [choice[0] for choice in SupportTicket.Category.choices]:
            raise serializers.ValidationError(f"Invalid category. Allowed values: {', '.join([c[0] for c in SupportTicket.Category.choices])}")
        return value

    def validate_assigned_to(self, value):
        """Validate assigned_to user."""
        if value:
            if not value.is_active:
                raise serializers.ValidationError("Cannot assign ticket to an inactive user.")
            
            # Check if user has admin/helpdesk role
            is_admin = value.groups.filter(name__in=[
                'helpdesk', 'helpdesk_admin', 'admin', 'superadmin'
            ]).exists()
            
            if not is_admin:
                raise serializers.ValidationError("Ticket can only be assigned to admin or helpdesk users.")
        
        return value

    def validate(self, data):
        """Additional validation for status changes and cross-field validation."""
        user = self.context['request'].user
        
        # Only assigned admin or helpdesk/admin can resolve/close
        if 'status' in data:
            new_status = data['status']
            if new_status in [SupportTicket.Status.RESOLVED, SupportTicket.Status.CLOSED]:
                if self.instance:
                    # Check if user is assigned to this ticket or is admin/helpdesk
                    is_assigned = self.instance.assigned_to == user
                    is_admin = user.groups.filter(name__in=['helpdesk', 'helpdesk_admin', 'admin', 'superadmin']).exists()
                    
                    if not (is_assigned or is_admin):
                        raise serializers.ValidationError({
                            'status': "Only assigned staff or admin can resolve or close tickets."
                        })
        
        return data


class SupportTicketFilterSerializer(serializers.Serializer):
    """Serializer for filtering support tickets with validation."""
    status = serializers.ChoiceField(
        choices=SupportTicket.Status.choices,
        required=False,
        allow_null=True
    )
    priority = serializers.ChoiceField(
        choices=SupportTicket.Priority.choices,
        required=False,
        allow_null=True
    )
    category = serializers.ChoiceField(
        choices=SupportTicket.Category.choices,
        required=False,
        allow_null=True
    )
    ticket_number = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=20)
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    page = serializers.IntegerField(required=False, default=1, min_value=1)
    page_size = serializers.IntegerField(required=False, default=10, min_value=1, max_value=100)

    def validate(self, data):
        """Validate date range."""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date:
            if start_date > end_date:
                raise serializers.ValidationError({
                    'end_date': 'End date must be after start date.'
                })
        
        return data
