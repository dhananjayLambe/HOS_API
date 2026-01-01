import logging
from datetime import date, datetime

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
            
            # Date filters
            due_date = request.query_params.get('due_date')
            if due_date:
                try:
                    due_date_obj = datetime.strptime(due_date, '%Y-%m-%d').date()
                    queryset = queryset.filter(due_date=due_date_obj)
                except ValueError:
                    return format_error_response(
                        "Invalid due_date format. Use YYYY-MM-DD.",
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            
            # Date range filters for calendar view
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            
            if start_date:
                try:
                    start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                    queryset = queryset.filter(due_date__gte=start_date_obj)
                except ValueError:
                    return format_error_response(
                        "Invalid start_date format. Use YYYY-MM-DD.",
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            
            if end_date:
                try:
                    end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                    queryset = queryset.filter(due_date__lte=end_date_obj)
                except ValueError:
                    return format_error_response(
                        "Invalid end_date format. Use YYYY-MM-DD.",
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            
            # Ordering
            ordering = request.query_params.get('ordering', 'due_date,-priority')
            if ordering:
                order_fields = [field.strip() for field in ordering.split(',')]
                # Validate ordering fields
                valid_fields = ['due_date', '-due_date', 'priority', '-priority', 
                              'created_at', '-created_at', 'status', '-status']
                order_fields = [f for f in order_fields if f in valid_fields]
                if order_fields:
                    queryset = queryset.order_by(*order_fields)
            
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
            
            serializer.save()
            
            logger.info(
                f"Task updated: {task.id} by {request.user.username}"
            )
            
            return format_success_response(
                "Task updated successfully"
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
            
            serializer.save()
            
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
            
            return format_success_response(message)
            
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

