import logging
from datetime import datetime, timedelta
from django.db import transaction
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import ValidationError, NotFound

from account.permissions import IsDoctor
from caleder_events.api.serializers import (
    CalendarEventCreateSerializer,
    CalendarEventUpdateSerializer,
    CalendarEventListSerializer,
    CalendarEventSerializer
)
from caleder_events.models import CalendarEvent

logger = logging.getLogger(__name__)


def format_success_response(message, data=None, status_code=status.HTTP_200_OK):
    """Standard success response formatter."""
    response = {
        "status": "success",
        "message": message,
    }
    if data is not None:
        response["data"] = data
    return Response(response, status=status_code)


def format_error_response(message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    """Standard error response formatter."""
    response = {
        "status": "error",
        "message": message,
    }
    if errors:
        response["data"] = errors
    return Response(response, status=status_code)


class CreateEventAPIView(APIView):
    """
    POST /api/calendar/events/
    
    Create a calendar event (Holiday, Meeting, Reminder, Personal).
    Doctor-only endpoint.
    
    Required fields:
    - title: string
    - category: HOLIDAY | MEETING | REMINDER | PERSONAL
    - start_datetime: ISO-8601 datetime
    - end_datetime: ISO-8601 datetime
    
    Optional fields:
    - location: string
    - description: string
    - is_blocking: boolean (default: false)
    - reminder_minutes: integer (required for REMINDER, optional for others)
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]
    
    @transaction.atomic
    def post(self, request, *args, **kwargs):
        """
        Create a new calendar event.
        
        Flow:
        1. Authenticate user
        2. Validate role = Doctor (handled by IsDoctor permission)
        3. Validate request payload
        4. Apply category rules
        5. Check overlapping blocking events
        6. Save CalendarEvent
        7. Return success response
        """
        try:
            user = request.user
            
            # Doctor is derived from token (already validated by IsDoctor permission)
            # No need to get doctor from payload
            
            # Initialize serializer with doctor context
            serializer = CalendarEventCreateSerializer(
                data=request.data,
                context={'doctor': user}
            )
            
            if serializer.is_valid():
                # Create the event
                event = serializer.save()
                
                # Prepare response data
                response_data = {
                    'id': str(event.id),
                    'title': event.title,
                    'category': event.category,
                    'start_datetime': event.start_datetime.isoformat(),
                    'end_datetime': event.end_datetime.isoformat(),
                    'is_blocking': event.is_blocking,
                    'location': event.location,
                    'description': event.description,
                    'reminder_minutes': event.reminder_minutes,
                }
                
                logger.info(
                    f"Calendar event created: {event.id} by doctor {user.id} "
                    f"({event.category})"
                )
                
                return format_success_response(
                    message="Calendar event created successfully",
                    data=response_data,
                    status_code=status.HTTP_201_CREATED
                )
            else:
                # Handle validation errors
                errors = serializer.errors
                
                # Extract first error message for user-friendly response
                if 'non_field_errors' in errors:
                    error_message = errors['non_field_errors'][0]
                elif errors:
                    # Get first field error
                    first_field = list(errors.keys())[0]
                    first_error = errors[first_field]
                    if isinstance(first_error, list):
                        error_message = first_error[0]
                    else:
                        error_message = str(first_error)
                else:
                    error_message = "Validation failed"
                
                # Check for specific error types
                if 'non_field_errors' in errors:
                    # Overlap conflict
                    return format_error_response(
                        message=error_message,
                        errors=errors,
                        status_code=status.HTTP_409_CONFLICT
                    )
                else:
                    # General validation error
                    return format_error_response(
                        message=error_message,
                        errors=errors,
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
                    
        except ValidationError as e:
            # Handle DRF validation errors
            error_message = str(e.detail) if hasattr(e, 'detail') else str(e)
            return format_error_response(
                message=error_message,
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(
                f"Error creating calendar event for doctor {request.user.id}: {str(e)}",
                exc_info=True
            )
            return format_error_response(
                message="An error occurred while creating the calendar event.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ListEventsAPIView(APIView):
    """
    GET /api/calendar/events/ - List calendar events
    POST /api/calendar/events/ - Create calendar event
    
    List calendar events for the authenticated doctor with filtering and pagination.
    Doctor-only endpoint.
    
    Query Parameters (for GET):
    - category: Filter by category (HOLIDAY, MEETING, REMINDER, PERSONAL)
    - start_date: Filter events starting from this date (ISO format)
    - end_date: Filter events ending before this date (ISO format)
    - is_blocking: Filter by blocking status (true/false)
    - is_active: Filter by active status (true/false, default: true)
    - page: Page number (default: 1)
    - page_size: Items per page (default: 10, max: 100)
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]
    
    def get(self, request, *args, **kwargs):
        """List calendar events with filtering and pagination."""
        try:
            user = request.user
            
            # Base queryset: only events for this doctor
            queryset = CalendarEvent.objects.filter(doctor=user).order_by('-start_datetime')
            
            # Apply filters
            category = request.query_params.get('category')
            if category:
                valid_categories = [
                    CalendarEvent.Category.HOLIDAY,
                    CalendarEvent.Category.MEETING,
                    CalendarEvent.Category.REMINDER,
                    CalendarEvent.Category.PERSONAL
                ]
                if category in valid_categories:
                    queryset = queryset.filter(category=category)
                else:
                    return format_error_response(
                        message=f"Invalid category. Allowed: {', '.join(valid_categories)}",
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            
            # Date range filters
            start_date = request.query_params.get('start_date')
            if start_date:
                try:
                    start_datetime = timezone.make_aware(datetime.fromisoformat(start_date.replace('Z', '+00:00')))
                    queryset = queryset.filter(start_datetime__gte=start_datetime)
                except (ValueError, AttributeError):
                    return format_error_response(
                        message="Invalid start_date format. Use ISO-8601 format.",
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            
            end_date = request.query_params.get('end_date')
            if end_date:
                try:
                    end_datetime = timezone.make_aware(datetime.fromisoformat(end_date.replace('Z', '+00:00')))
                    queryset = queryset.filter(end_datetime__lte=end_datetime)
                except (ValueError, AttributeError):
                    return format_error_response(
                        message="Invalid end_date format. Use ISO-8601 format.",
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            
            # Blocking filter
            is_blocking = request.query_params.get('is_blocking')
            if is_blocking is not None:
                if is_blocking.lower() == 'true':
                    queryset = queryset.filter(is_blocking=True)
                elif is_blocking.lower() == 'false':
                    queryset = queryset.filter(is_blocking=False)
            
            # Active filter (default to active only)
            is_active = request.query_params.get('is_active', 'true')
            if is_active.lower() == 'true':
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() == 'false':
                queryset = queryset.filter(is_active=False)
            
            # Pagination
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 10))
            page_size = min(page_size, 100)  # Max 100 items per page
            
            try:
                paginator = Paginator(queryset, page_size)
                paginated_events = paginator.page(page)
            except PageNotAnInteger:
                paginated_events = paginator.page(1)
            except EmptyPage:
                paginated_events = paginator.page(paginator.num_pages)
            
            # Serialize events
            serializer = CalendarEventListSerializer(paginated_events, many=True)
            
            return format_success_response(
                message="Calendar events fetched successfully",
                data={
                    "events": serializer.data,
                    "pagination": {
                        "total_events": paginator.count,
                        "total_pages": paginator.num_pages,
                        "current_page": page,
                        "page_size": page_size,
                        "has_next": paginated_events.has_next(),
                        "has_previous": paginated_events.has_previous()
                    }
                }
            )
            
        except Exception as e:
            logger.error(
                f"Error listing calendar events for doctor {request.user.id}: {str(e)}",
                exc_info=True
            )
            return format_error_response(
                message="An error occurred while fetching calendar events.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @transaction.atomic
    def post(self, request, *args, **kwargs):
        """Create a new calendar event (delegates to CreateEventAPIView logic)."""
        try:
            user = request.user
            
            # Initialize serializer with doctor context
            serializer = CalendarEventCreateSerializer(
                data=request.data,
                context={'doctor': user}
            )
            
            if serializer.is_valid():
                # Create the event
                event = serializer.save()
                
                # Prepare response data
                response_data = {
                    'id': str(event.id),
                    'title': event.title,
                    'category': event.category,
                    'start_datetime': event.start_datetime.isoformat(),
                    'end_datetime': event.end_datetime.isoformat(),
                    'is_blocking': event.is_blocking,
                    'location': event.location,
                    'description': event.description,
                    'reminder_minutes': event.reminder_minutes,
                }
                
                logger.info(
                    f"Calendar event created: {event.id} by doctor {user.id} "
                    f"({event.category})"
                )
                
                return format_success_response(
                    message="Calendar event created successfully",
                    data=response_data,
                    status_code=status.HTTP_201_CREATED
                )
            else:
                # Handle validation errors
                errors = serializer.errors
                
                # Extract first error message for user-friendly response
                if 'non_field_errors' in errors:
                    error_message = errors['non_field_errors'][0]
                elif errors:
                    # Get first field error
                    first_field = list(errors.keys())[0]
                    first_error = errors[first_field]
                    if isinstance(first_error, list):
                        error_message = first_error[0]
                    else:
                        error_message = str(first_error)
                else:
                    error_message = "Validation failed"
                
                # Check for specific error types
                if 'non_field_errors' in errors:
                    # Overlap conflict
                    return format_error_response(
                        message=error_message,
                        errors=errors,
                        status_code=status.HTTP_409_CONFLICT
                    )
                else:
                    # General validation error
                    return format_error_response(
                        message=error_message,
                        errors=errors,
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
                    
        except ValidationError as e:
            # Handle DRF validation errors
            error_message = str(e.detail) if hasattr(e, 'detail') else str(e)
            return format_error_response(
                message=error_message,
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(
                f"Error creating calendar event for doctor {request.user.id}: {str(e)}",
                exc_info=True
            )
            return format_error_response(
                message="An error occurred while creating the calendar event.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RetrieveEventAPIView(APIView):
    """
    GET /api/calendar/events/{id}/ - Retrieve event
    PUT /api/calendar/events/{id}/ - Full update event
    PATCH /api/calendar/events/{id}/ - Partial update event
    DELETE /api/calendar/events/{id}/ - Delete event
    
    Retrieve, update, or delete a specific calendar event by ID.
    Doctor-only endpoint. Doctors can only access their own events.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]
    
    def get(self, request, event_id, *args, **kwargs):
        """Retrieve a specific calendar event."""
        try:
            user = request.user
            
            # Get event and verify ownership
            try:
                event = CalendarEvent.objects.get(id=event_id, doctor=user)
            except CalendarEvent.DoesNotExist:
                return format_error_response(
                    message="Calendar event not found or you don't have permission to access it.",
                    status_code=status.HTTP_404_NOT_FOUND
                )
            
            serializer = CalendarEventSerializer(event)
            
            return format_success_response(
                message="Calendar event retrieved successfully",
                data=serializer.data
            )
            
        except ValueError:
            return format_error_response(
                message="Invalid event ID format.",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(
                f"Error retrieving calendar event {event_id} for doctor {request.user.id}: {str(e)}",
                exc_info=True
            )
            return format_error_response(
                message="An error occurred while retrieving the calendar event.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @transaction.atomic
    def put(self, request, event_id, *args, **kwargs):
        """Full update of calendar event."""
        return self._update(request, event_id, partial=False)
    
    @transaction.atomic
    def patch(self, request, event_id, *args, **kwargs):
        """Partial update of calendar event."""
        return self._update(request, event_id, partial=True)
    
    @transaction.atomic
    def delete(self, request, event_id, *args, **kwargs):
        """Soft delete a calendar event."""
        return self._delete(request, event_id)
    
    def _update(self, request, event_id, partial=False):
        """Internal update method."""
        try:
            user = request.user
            
            # Get event and verify ownership
            try:
                event = CalendarEvent.objects.get(id=event_id, doctor=user)
            except CalendarEvent.DoesNotExist:
                return format_error_response(
                    message="Calendar event not found or you don't have permission to update it.",
                    status_code=status.HTTP_404_NOT_FOUND
                )
            
            # Check if event is active (optional: prevent updates to inactive events)
            if not event.is_active:
                return format_error_response(
                    message="Cannot update an inactive calendar event.",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Initialize serializer with instance and doctor context
            serializer = CalendarEventUpdateSerializer(
                event,
                data=request.data,
                partial=partial,
                context={'doctor': user}
            )
            
            if serializer.is_valid():
                # Update the event
                updated_event = serializer.save()
                
                # Prepare response data
                response_data = {
                    'id': str(updated_event.id),
                    'title': updated_event.title,
                    'category': updated_event.category,
                    'start_datetime': updated_event.start_datetime.isoformat(),
                    'end_datetime': updated_event.end_datetime.isoformat(),
                    'is_blocking': updated_event.is_blocking,
                    'location': updated_event.location,
                    'description': updated_event.description,
                    'reminder_minutes': updated_event.reminder_minutes,
                    'is_active': updated_event.is_active,
                    'updated_at': updated_event.updated_at.isoformat(),
                }
                
                logger.info(
                    f"Calendar event updated: {updated_event.id} by doctor {user.id} "
                    f"({updated_event.category})"
                )
                
                return format_success_response(
                    message="Calendar event updated successfully",
                    data=response_data
                )
            else:
                # Handle validation errors
                errors = serializer.errors
                
                # Extract first error message for user-friendly response
                if 'non_field_errors' in errors:
                    error_message = errors['non_field_errors'][0]
                elif errors:
                    first_field = list(errors.keys())[0]
                    first_error = errors[first_field]
                    if isinstance(first_error, list):
                        error_message = first_error[0]
                    else:
                        error_message = str(first_error)
                else:
                    error_message = "Validation failed"
                
                # Check for specific error types
                if 'non_field_errors' in errors:
                    # Overlap conflict
                    return format_error_response(
                        message=error_message,
                        errors=errors,
                        status_code=status.HTTP_409_CONFLICT
                    )
                else:
                    # General validation error
                    return format_error_response(
                        message=error_message,
                        errors=errors,
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
                    
        except ValueError:
            return format_error_response(
                message="Invalid event ID format.",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except ValidationError as e:
            error_message = str(e.detail) if hasattr(e, 'detail') else str(e)
            return format_error_response(
                message=error_message,
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(
                f"Error updating calendar event {event_id} for doctor {request.user.id}: {str(e)}",
                exc_info=True
            )
            return format_error_response(
                message="An error occurred while updating the calendar event.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _delete(self, request, event_id):
        """Internal delete method."""
        try:
            user = request.user
            
            # Get event and verify ownership
            try:
                event = CalendarEvent.objects.get(id=event_id, doctor=user)
            except CalendarEvent.DoesNotExist:
                return format_error_response(
                    message="Calendar event not found or you don't have permission to delete it.",
                    status_code=status.HTTP_404_NOT_FOUND
                )
            
            # Check if already deleted
            if not event.is_active:
                return format_error_response(
                    message="Calendar event is already deleted.",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Soft delete: set is_active=False
            event.is_active = False
            event.save(update_fields=['is_active', 'updated_at'])
            
            logger.info(
                f"Calendar event deleted: {event.id} by doctor {user.id} "
                f"({event.category})"
            )
            
            return format_success_response(
                message="Calendar event deleted successfully",
                data={
                    'id': str(event.id),
                    'title': event.title,
                    'is_active': False
                },
                status_code=status.HTTP_200_OK
            )
            
        except ValueError:
            return format_error_response(
                message="Invalid event ID format.",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(
                f"Error deleting calendar event {event_id} for doctor {request.user.id}: {str(e)}",
                exc_info=True
            )
            return format_error_response(
                message="An error occurred while deleting the calendar event.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UpdateEventAPIView(APIView):
    """
    PUT /api/calendar/events/{id}/
    PATCH /api/calendar/events/{id}/
    
    Update a calendar event.
    Doctor-only endpoint. Doctors can only update their own events.
    
    Supports partial updates (PATCH) and full updates (PUT).
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]
    
    @transaction.atomic
    def put(self, request, event_id, *args, **kwargs):
        """Full update of calendar event."""
        return self._update(request, event_id, partial=False)
    
    @transaction.atomic
    def patch(self, request, event_id, *args, **kwargs):
        """Partial update of calendar event."""
        return self._update(request, event_id, partial=True)
    
    def _update(self, request, event_id, partial=False):
        """Internal update method."""
        try:
            user = request.user
            
            # Get event and verify ownership
            try:
                event = CalendarEvent.objects.get(id=event_id, doctor=user)
            except CalendarEvent.DoesNotExist:
                return format_error_response(
                    message="Calendar event not found or you don't have permission to update it.",
                    status_code=status.HTTP_404_NOT_FOUND
                )
            
            # Check if event is active (optional: prevent updates to inactive events)
            if not event.is_active:
                return format_error_response(
                    message="Cannot update an inactive calendar event.",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Initialize serializer with instance and doctor context
            serializer = CalendarEventUpdateSerializer(
                event,
                data=request.data,
                partial=partial,
                context={'doctor': user}
            )
            
            if serializer.is_valid():
                # Update the event
                updated_event = serializer.save()
                
                # Prepare response data
                response_data = {
                    'id': str(updated_event.id),
                    'title': updated_event.title,
                    'category': updated_event.category,
                    'start_datetime': updated_event.start_datetime.isoformat(),
                    'end_datetime': updated_event.end_datetime.isoformat(),
                    'is_blocking': updated_event.is_blocking,
                    'location': updated_event.location,
                    'description': updated_event.description,
                    'reminder_minutes': updated_event.reminder_minutes,
                    'is_active': updated_event.is_active,
                    'updated_at': updated_event.updated_at.isoformat(),
                }
                
                logger.info(
                    f"Calendar event updated: {updated_event.id} by doctor {user.id} "
                    f"({updated_event.category})"
                )
                
                return format_success_response(
                    message="Calendar event updated successfully",
                    data=response_data
                )
            else:
                # Handle validation errors
                errors = serializer.errors
                
                # Extract first error message for user-friendly response
                if 'non_field_errors' in errors:
                    error_message = errors['non_field_errors'][0]
                elif errors:
                    first_field = list(errors.keys())[0]
                    first_error = errors[first_field]
                    if isinstance(first_error, list):
                        error_message = first_error[0]
                    else:
                        error_message = str(first_error)
                else:
                    error_message = "Validation failed"
                
                # Check for specific error types
                if 'non_field_errors' in errors:
                    # Overlap conflict
                    return format_error_response(
                        message=error_message,
                        errors=errors,
                        status_code=status.HTTP_409_CONFLICT
                    )
                else:
                    # General validation error
                    return format_error_response(
                        message=error_message,
                        errors=errors,
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
                    
        except ValueError:
            return format_error_response(
                message="Invalid event ID format.",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except ValidationError as e:
            error_message = str(e.detail) if hasattr(e, 'detail') else str(e)
            return format_error_response(
                message=error_message,
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(
                f"Error updating calendar event {event_id} for doctor {request.user.id}: {str(e)}",
                exc_info=True
            )
            return format_error_response(
                message="An error occurred while updating the calendar event.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DeleteEventAPIView(APIView):
    """
    DELETE /api/calendar/events/{id}/
    
    Delete (soft delete) a calendar event by setting is_active=False.
    Doctor-only endpoint. Doctors can only delete their own events.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsDoctor]
    
    @transaction.atomic
    def delete(self, request, event_id, *args, **kwargs):
        """Soft delete a calendar event."""
        try:
            user = request.user
            
            # Get event and verify ownership
            try:
                event = CalendarEvent.objects.get(id=event_id, doctor=user)
            except CalendarEvent.DoesNotExist:
                return format_error_response(
                    message="Calendar event not found or you don't have permission to delete it.",
                    status_code=status.HTTP_404_NOT_FOUND
                )
            
            # Check if already deleted
            if not event.is_active:
                return format_error_response(
                    message="Calendar event is already deleted.",
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # Soft delete: set is_active=False
            event.is_active = False
            event.save(update_fields=['is_active', 'updated_at'])
            
            logger.info(
                f"Calendar event deleted: {event.id} by doctor {user.id} "
                f"({event.category})"
            )
            
            return format_success_response(
                message="Calendar event deleted successfully",
                data={
                    'id': str(event.id),
                    'title': event.title,
                    'is_active': False
                },
                status_code=status.HTTP_200_OK
            )
            
        except ValueError:
            return format_error_response(
                message="Invalid event ID format.",
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(
                f"Error deleting calendar event {event_id} for doctor {request.user.id}: {str(e)}",
                exc_info=True
            )
            return format_error_response(
                message="An error occurred while deleting the calendar event.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

