import logging
from datetime import date, datetime

from django.utils import timezone
from django.db.models import Case, When, Value, IntegerField
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication

from tasks.models import Task
from tasks.api.serializers import (
    TaskSerializer,
    TaskCreateSerializer,
    TaskUpdateSerializer,
    TaskPartialUpdateSerializer,
)

logger = logging.getLogger(__name__)


def is_admin_user(user):
    """Helper function to check if user is admin/superuser."""
    return user.is_superuser or user.is_staff or user.groups.filter(
        name__in=['admin', 'superadmin']
    ).exists()


def format_success_response(message, data=None, status_code=status.HTTP_200_OK):
    """Standard success response formatter."""
    response = {
        "success": True,
        "message": message,
    }
    if data is not None:
        response["data"] = data
    return Response(response, status=status_code)


def format_error_response(message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    """Standard error response formatter."""
    response = {
        "success": False,
        "message": message,
    }
    if errors:
        response["errors"] = errors
    return Response(response, status=status_code)


class TaskListView(APIView):
    """
    GET /api/tasks/ - List tasks with filtering
    POST /api/tasks/ - Create a new task
    
    - Doctors can only access tasks assigned to them
    - Admin/Superuser can access all tasks
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        """List tasks with filtering and ordering."""
        try:
            # Determine if user is admin
            is_admin = is_admin_user(request.user)
            
            # Build queryset - exclude deleted tasks
            if is_admin:
                queryset = Task.objects.select_related(
                    'assigned_to', 'created_by'
                ).filter(is_deleted=False)
            else:
                # Doctors can only see tasks assigned to them
                queryset = Task.objects.select_related(
                    'assigned_to', 'created_by'
                ).filter(
                    assigned_to=request.user,
                    is_deleted=False
                )
            
            # Apply filters
            status_filter = request.query_params.get('status')
            if status_filter:
                valid_statuses = [choice[0] for choice in Task.STATUS_CHOICES]
                if status_filter in valid_statuses:
                    queryset = queryset.filter(status=status_filter)
            
            priority_filter = request.query_params.get('priority')
            if priority_filter:
                valid_priorities = [choice[0] for choice in Task.PRIORITY_CHOICES]
                if priority_filter in valid_priorities:
                    queryset = queryset.filter(priority=priority_filter)
            
            # Date/DateTime filters
            due_date = request.query_params.get('due_date')
            if due_date:
                try:
                    # Try parsing as datetime first (ISO format)
                    if 'T' in due_date or ' ' in due_date:
                        due_date_obj = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                    else:
                        # Parse as date and convert to datetime at start of day
                        due_date_obj = datetime.strptime(due_date, '%Y-%m-%d')
                    queryset = queryset.filter(due_date__date=due_date_obj.date())
                except (ValueError, AttributeError):
                    return format_error_response(
                        "Invalid due_date format. Use YYYY-MM-DD or ISO datetime format.",
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            
            # Date range filters for calendar view
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            if start_date:
                try:
                    # Try parsing as datetime first (ISO format)
                    if 'T' in start_date or ' ' in start_date:
                        start_date_obj = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                    else:
                        # Parse as date and convert to datetime at start of day
                        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
                    queryset = queryset.filter(due_date__gte=start_date_obj)
                except (ValueError, AttributeError):
                    return format_error_response(
                        "Invalid start_date format. Use YYYY-MM-DD or ISO datetime format.",
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            
            if end_date:
                try:
                    # Try parsing as datetime first (ISO format)
                    if 'T' in end_date or ' ' in end_date:
                        end_date_obj = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                    else:
                        # Parse as date and convert to datetime at end of day
                        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
                        end_date_obj = end_date_obj.replace(hour=23, minute=59, second=59)
                    queryset = queryset.filter(due_date__lte=end_date_obj)
                except (ValueError, AttributeError):
                    return format_error_response(
                        "Invalid end_date format. Use YYYY-MM-DD or ISO datetime format.",
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            
            # Ordering - prioritize today's tasks first, then by due_date and priority
            today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            # Custom ordering: today's tasks first (priority=0), then others (priority=1)
            # Within each group, order by due_date ascending, then priority descending
            queryset = queryset.annotate(
                date_priority=Case(
                    When(due_date__gte=today_start, due_date__lte=today_end, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField()
                )
            ).order_by('date_priority', 'due_date', '-priority')
            
            # Allow custom ordering if specified, but still prioritize today
            ordering = request.query_params.get('ordering')
            if ordering:
                order_fields = [field.strip() for field in ordering.split(',')]
                # Validate ordering fields
                valid_fields = ['due_date', '-due_date', 'priority', '-priority', 
                              'created_at', '-created_at', 'status', '-status']
                order_fields = [f for f in order_fields if f in valid_fields]
                if order_fields:
                    # Still prioritize today, but apply custom ordering within groups
                    queryset = queryset.order_by('date_priority', *order_fields)
            
            # Serialize results
            serializer = TaskSerializer(queryset, many=True, context={'request': request})
            
            return Response({
                "success": True,
                "count": len(serializer.data),
                "results": serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error listing tasks: {str(e)}")
            return format_error_response(
                "An error occurred while fetching tasks",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        """Create a new task."""
        try:
            serializer = TaskCreateSerializer(
                data=request.data,
                context={'request': request}
            )
            
            if not serializer.is_valid():
                return format_error_response(
                    "Invalid task data",
                    serializer.errors
                )
            
            task = serializer.save()
            
            response_serializer = TaskSerializer(task, context={'request': request})
            
            logger.info(
                f"Task created: {task.id} by {request.user.username} (ID: {request.user.id})"
            )
            
            return format_success_response(
                "Task created successfully",
                response_serializer.data,
                status.HTTP_201_CREATED
            )
            
        except ValidationError as e:
            logger.warning(f"Validation error creating task: {str(e)}")
            return format_error_response(
                "Invalid task data",
                e.detail if hasattr(e, 'detail') else str(e)
            )
        except Exception as e:
            logger.error(f"Error creating task: {str(e)}")
            return format_error_response(
                "An error occurred while creating the task",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TaskDetailView(APIView):
    """
    GET /api/tasks/{task_id}/ - Retrieve task details
    PUT /api/tasks/{task_id}/ - Full update
    PATCH /api/tasks/{task_id}/ - Partial update
    DELETE /api/tasks/{task_id}/ - Soft delete
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get_object(self, task_id, user):
        """Get task object with permission check."""
        try:
            task = Task.objects.select_related(
                'assigned_to', 'created_by'
            ).get(id=task_id, is_deleted=False)
        except Task.DoesNotExist:
            raise NotFound("Task not found")
        
        # Check permissions
        is_admin = is_admin_user(user)
        if not is_admin and task.assigned_to != user:
            raise PermissionDenied("You do not have permission to access this task.")
        
        return task

    def get(self, request, task_id):
        """Retrieve task details."""
        try:
            task = self.get_object(task_id, request.user)
            serializer = TaskSerializer(task, context={'request': request})
            
            return format_success_response(
                "Task retrieved successfully",
                serializer.data
            )
            
        except NotFound as e:
            return format_error_response(
                str(e),
                status_code=status.HTTP_404_NOT_FOUND
            )
        except PermissionDenied as e:
            return format_error_response(
                str(e),
                status_code=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            logger.error(f"Error retrieving task: {str(e)}")
            return format_error_response(
                "An error occurred while retrieving the task",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request, task_id):
        """Full update of task."""
        try:
            task = self.get_object(task_id, request.user)
            
            serializer = TaskUpdateSerializer(
                task,
                data=request.data,
                context={'request': request}
            )
            
            if not serializer.is_valid():
                return format_error_response(
                    "Invalid task data",
                    serializer.errors
                )
            
            updated_task = serializer.save()
            
            # Serialize the updated task to return it
            response_serializer = TaskSerializer(updated_task, context={'request': request})
            
            logger.info(
                f"Task updated: {task.id} by {request.user.username}"
            )
            
            return format_success_response(
                "Task updated successfully",
                response_serializer.data
            )
            
        except NotFound as e:
            return format_error_response(
                str(e),
                status_code=status.HTTP_404_NOT_FOUND
            )
        except PermissionDenied as e:
            return format_error_response(
                str(e),
                status_code=status.HTTP_403_FORBIDDEN
            )
        except ValidationError as e:
            return format_error_response(
                "Invalid task data",
                e.detail if hasattr(e, 'detail') else str(e)
            )
        except Exception as e:
            logger.error(f"Error updating task: {str(e)}")
            return format_error_response(
                "An error occurred while updating the task",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def patch(self, request, task_id):
        """Partial update of task (status/priority)."""
        try:
            task = self.get_object(task_id, request.user)
            
            serializer = TaskPartialUpdateSerializer(
                task,
                data=request.data,
                partial=True,
                context={'request': request}
            )
            
            if not serializer.is_valid():
                return format_error_response(
                    "Invalid task data",
                    serializer.errors
                )
            
            updated_task = serializer.save()
            
            # Serialize the updated task to return it
            response_serializer = TaskSerializer(updated_task, context={'request': request})
            
            # Determine message based on what was updated
            updated_fields = list(request.data.keys())
            if 'status' in updated_fields:
                message = f"Task status updated successfully"
            elif 'priority' in updated_fields:
                message = f"Task priority updated successfully"
            else:
                message = "Task updated successfully"
            
            logger.info(
                f"Task partially updated: {task.id} by {request.user.username}"
            )
            
            return format_success_response(message, response_serializer.data)
            
        except NotFound as e:
            return format_error_response(
                str(e),
                status_code=status.HTTP_404_NOT_FOUND
            )
        except PermissionDenied as e:
            return format_error_response(
                str(e),
                status_code=status.HTTP_403_FORBIDDEN
            )
        except ValidationError as e:
            return format_error_response(
                "Invalid task data",
                e.detail if hasattr(e, 'detail') else str(e)
            )
        except Exception as e:
            logger.error(f"Error updating task: {str(e)}")
            return format_error_response(
                "An error occurred while updating the task",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, task_id):
        """Soft delete task."""
        try:
            task = self.get_object(task_id, request.user)
            
            task.is_deleted = True
            task.save()
            
            logger.info(
                f"Task deleted: {task.id} by {request.user.username}"
            )
            
            return format_success_response(
                "Task deleted successfully"
            )
            
        except NotFound as e:
            return format_error_response(
                str(e),
                status_code=status.HTTP_404_NOT_FOUND
            )
        except PermissionDenied as e:
            return format_error_response(
                str(e),
                status_code=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            logger.error(f"Error deleting task: {str(e)}")
            return format_error_response(
                "An error occurred while deleting the task",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

