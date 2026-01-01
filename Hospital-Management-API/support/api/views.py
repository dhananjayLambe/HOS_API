import logging
import traceback
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication

from support.models import SupportTicket, SupportTicketAttachment, SupportTicketComment
from support.api.serializers import (
    SupportTicketSerializer,
    SupportTicketCreateSerializer,
    SupportTicketUpdateSerializer,
    SupportTicketAttachmentSerializer,
    SupportTicketCommentSerializer,
    SupportTicketFilterSerializer,
)
from support.permissions import (
    IsSupportTicketOwnerOrAdmin,
    CanUpdateSupportTicket,
    CanAssignSupportTicket,
    IsSupportAdminOrHelpdesk,
)

logger = logging.getLogger(__name__)


def is_admin_user(user):
    """Helper function to check if user is admin/helpdesk."""
    return user.groups.filter(name__in=[
        'helpdesk', 'helpdesk_admin', 'admin', 'superadmin'
    ]).exists()


def format_error_response(message, errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    """Standard error response formatter."""
    response = {
        "status": "error",
        "message": message,
        "data": errors if errors else None
    }
    return Response(response, status=status_code)


def format_success_response(message, data=None, status_code=status.HTTP_200_OK):
    """Standard success response formatter."""
    response = {
        "status": "success",
        "message": message,
        "data": data
    }
    return Response(response, status=status_code)


class SupportTicketListView(APIView):
    """
    GET /api/support/tickets/ - List support tickets with filtering and pagination
    POST /api/support/tickets/ - Create a new support ticket
    
    - Users see only their own tickets
    - Admin/Helpdesk see all tickets
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        """List support tickets with filtering and pagination."""
        try:
            # Parse filter parameters
            filter_serializer = SupportTicketFilterSerializer(data=request.query_params)
            if not filter_serializer.is_valid():
                return format_error_response(
                    "Invalid filter parameters",
                    filter_serializer.errors
                )

            filters = filter_serializer.validated_data
            
            # Determine if user is admin/helpdesk
            is_admin = is_admin_user(request.user)
            
            # Build queryset with optimized queries
            if is_admin:
                # Admin/Helpdesk can see all tickets
                queryset = SupportTicket.objects.select_related(
                    'created_by', 'assigned_to', 'doctor', 'clinic'
                ).prefetch_related('attachments', 'comments').all()
            else:
                # Users can only see their own tickets
                queryset = SupportTicket.objects.select_related(
                    'created_by', 'assigned_to', 'doctor', 'clinic'
                ).prefetch_related('attachments', 'comments').filter(
                    created_by=request.user
                )
            
            # Apply filters
            if filters.get('status'):
                queryset = queryset.filter(status=filters['status'])
            
            if filters.get('priority'):
                queryset = queryset.filter(priority=filters['priority'])
            
            if filters.get('category'):
                queryset = queryset.filter(category=filters['category'])
            
            if filters.get('ticket_number'):
                queryset = queryset.filter(
                    ticket_number__icontains=filters['ticket_number']
                )
            
            if filters.get('start_date'):
                queryset = queryset.filter(created_at__date__gte=filters['start_date'])
            
            if filters.get('end_date'):
                queryset = queryset.filter(created_at__date__lte=filters['end_date'])
            
            # Order by created_at (newest first)
            queryset = queryset.order_by('-created_at')
            
            # Pagination
            page = filters.get('page', 1)
            page_size = filters.get('page_size', 10)
            
            try:
                paginator = Paginator(queryset, page_size)
                paginated_tickets = paginator.page(page)
            except PageNotAnInteger:
                paginated_tickets = paginator.page(1)
            except EmptyPage:
                paginated_tickets = paginator.page(paginator.num_pages)
            
            serializer = SupportTicketSerializer(
                paginated_tickets,
                many=True,
                context={'request': request}
            )
            
            return format_success_response(
                "Support tickets fetched successfully",
                {
                    "tickets": serializer.data,
                    "pagination": {
                        "total_tickets": paginator.count,
                        "total_pages": paginator.num_pages,
                        "current_page": page,
                        "page_size": page_size,
                        "has_next": paginated_tickets.has_next(),
                        "has_previous": paginated_tickets.has_previous()
                    }
                }
            )
            
        except Exception as e:
            logger.error(f"Error listing support tickets: {str(e)}\n{traceback.format_exc()}")
            return format_error_response(
                "An error occurred while fetching support tickets",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        """Create a new support ticket."""
        try:
            serializer = SupportTicketCreateSerializer(
                data=request.data,
                context={'request': request}
            )
            
            if not serializer.is_valid():
                return format_error_response(
                    "Validation failed",
                    serializer.errors
                )
            
            with transaction.atomic():
                ticket = serializer.save()
            
            response_serializer = SupportTicketSerializer(
                ticket,
                context={'request': request}
            )
            
            logger.info(
                f"Support ticket created: {ticket.ticket_number} by {request.user.username} (ID: {request.user.id})"
            )
            
            return format_success_response(
                "Support ticket created successfully",
                response_serializer.data,
                status.HTTP_201_CREATED
            )
            
        except ValidationError as e:
            logger.warning(f"Validation error creating ticket: {str(e)}")
            return format_error_response(
                "Validation failed",
                e.detail if hasattr(e, 'detail') else str(e)
            )
        except Exception as e:
            logger.error(f"Error creating support ticket: {str(e)}\n{traceback.format_exc()}")
            return format_error_response(
                "An error occurred while creating the support ticket",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SupportTicketDetailView(generics.RetrieveAPIView):
    """
    GET /api/support/tickets/{id}/
    Get detailed information about a specific support ticket.
    """
    permission_classes = [IsAuthenticated, IsSupportTicketOwnerOrAdmin]
    authentication_classes = [JWTAuthentication]
    queryset = SupportTicket.objects.select_related(
        'created_by', 'assigned_to', 'doctor', 'clinic'
    ).prefetch_related('attachments', 'comments', 'comments__created_by')
    serializer_class = SupportTicketSerializer
    lookup_field = 'id'

    def retrieve(self, request, *args, **kwargs):
        """Retrieve ticket details with error handling."""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, context={'request': request})
            
            return format_success_response(
                "Support ticket details fetched successfully",
                serializer.data
            )
        except NotFound:
            return format_error_response(
                "Support ticket not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except PermissionDenied:
            return format_error_response(
                "You don't have permission to view this ticket",
                status_code=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            logger.error(f"Error retrieving ticket {kwargs.get('id')}: {str(e)}\n{traceback.format_exc()}")
            return format_error_response(
                "An error occurred while fetching ticket details",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SupportTicketUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/support/tickets/{id}/update/ - Partial update
    PUT /api/support/tickets/{id}/update/ - Full update
    
    Update support ticket (status, priority, assignment, category, subject, description).
    - Users can update description on their own open tickets
    - Admin/Helpdesk can update any ticket
    """
    permission_classes = [IsAuthenticated, CanUpdateSupportTicket]
    authentication_classes = [JWTAuthentication]
    queryset = SupportTicket.objects.select_related('created_by', 'assigned_to', 'doctor', 'clinic')
    serializer_class = SupportTicketUpdateSerializer
    lookup_field = 'id'

    def patch(self, request, *args, **kwargs):
        """Partial update (PATCH)."""
        return self.update(request, *args, **kwargs)

    def put(self, request, *args, **kwargs):
        """Full update (PUT)."""
        return self.update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Update ticket with comprehensive error handling."""
        try:
            partial = kwargs.pop('partial', request.method == 'PATCH')
            instance = self.get_object()
            
            # Check if user is admin/helpdesk or ticket owner
            is_admin = is_admin_user(request.user)
            is_owner = instance.created_by == request.user
            
            # Regular users can only update description on their own tickets
            if is_owner and not is_admin:
                # Check if ticket is closed
                if instance.status == SupportTicket.Status.CLOSED:
                    return format_error_response(
                        "Cannot update a closed ticket",
                        status_code=status.HTTP_403_FORBIDDEN
                    )
                
                # Allow users to update description only
                if 'description' not in request.data:
                    return format_error_response(
                        "You can only update the description of your own tickets",
                        status_code=status.HTTP_403_FORBIDDEN
                    )
                
                # Validate description
                description = request.data.get('description', '').strip()
                if not description:
                    return format_error_response("Description cannot be empty")
                
                if len(description) < 20:
                    return format_error_response("Description must be at least 20 characters long")
                
                if len(description) > 10000:
                    return format_error_response("Description cannot exceed 10000 characters")
                
                # Update description
                with transaction.atomic():
                    instance.description = description
                    instance.save(update_fields=['description', 'updated_at'])
                
                logger.info(
                    f"Ticket {instance.ticket_number} description updated by {request.user.username}"
                )
                
                serializer = SupportTicketSerializer(instance, context={'request': request})
                return format_success_response(
                    "Ticket description updated successfully",
                    serializer.data
                )
            
            # Admin/Helpdesk can update all fields
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            
            if not serializer.is_valid():
                return format_error_response(
                    "Validation failed",
                    serializer.errors
                )
            
            with transaction.atomic():
                serializer.save()
                logger.info(
                    f"Support ticket {instance.ticket_number} updated by {request.user.username} (ID: {request.user.id})"
                )
            
            response_serializer = SupportTicketSerializer(
                instance,
                context={'request': request}
            )
            
            return format_success_response(
                "Support ticket updated successfully",
                response_serializer.data
            )
            
        except NotFound:
            return format_error_response(
                "Support ticket not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except PermissionDenied:
            return format_error_response(
                "You don't have permission to update this ticket",
                status_code=status.HTTP_403_FORBIDDEN
            )
        except ValidationError as e:
            logger.warning(f"Validation error updating ticket: {str(e)}")
            return format_error_response(
                "Validation failed",
                e.detail if hasattr(e, 'detail') else str(e)
            )
        except Exception as e:
            logger.error(f"Error updating ticket {kwargs.get('id')}: {str(e)}\n{traceback.format_exc()}")
            return format_error_response(
                "An error occurred while updating the ticket",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SupportTicketDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/support/tickets/{id}/
    Delete a support ticket.
    - Only admin/helpdesk can delete tickets
    - Closed tickets can be deleted (soft delete recommended in production)
    """
    permission_classes = [IsAuthenticated, IsSupportAdminOrHelpdesk]
    authentication_classes = [JWTAuthentication]
    queryset = SupportTicket.objects.all()
    lookup_field = 'id'

    def destroy(self, request, *args, **kwargs):
        """Delete ticket with error handling."""
        try:
            instance = self.get_object()
            ticket_number = instance.ticket_number
            
            with transaction.atomic():
                # Delete related attachments and comments (CASCADE)
                instance.delete()
            
            logger.warning(
                f"Support ticket {ticket_number} deleted by {request.user.username} (ID: {request.user.id})"
            )
            
            return format_success_response(
                f"Support ticket {ticket_number} deleted successfully",
                {"ticket_number": ticket_number}
            )
            
        except NotFound:
            return format_error_response(
                "Support ticket not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except PermissionDenied:
            return format_error_response(
                "You don't have permission to delete tickets",
                status_code=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            logger.error(f"Error deleting ticket {kwargs.get('id')}: {str(e)}\n{traceback.format_exc()}")
            return format_error_response(
                "An error occurred while deleting the ticket",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SupportTicketAttachmentView(APIView):
    """
    POST /api/support/tickets/{ticket_id}/attachments/ - Upload attachment
    GET /api/support/tickets/{ticket_id}/attachments/ - List attachments
    DELETE /api/support/tickets/{ticket_id}/attachments/{attachment_id}/ - Delete attachment
    """
    permission_classes = [IsAuthenticated, IsSupportTicketOwnerOrAdmin]
    authentication_classes = [JWTAuthentication]

    def get_ticket(self, ticket_id):
        """Get ticket with error handling."""
        try:
            return get_object_or_404(
                SupportTicket.objects.select_related('created_by'),
                id=ticket_id
            )
        except ValueError:
            raise ValidationError("Invalid ticket ID format")

    def check_permission(self, request, ticket):
        """Check if user has permission to access ticket."""
        is_admin = is_admin_user(request.user)
        if not (is_admin or ticket.created_by == request.user):
            raise PermissionDenied("You don't have permission to access this ticket")

    def post(self, request, ticket_id):
        """Upload attachment to a support ticket."""
        try:
            ticket = self.get_ticket(ticket_id)
            self.check_permission(request, ticket)
            
            # Check attachment limit (5 per ticket)
            current_attachments_count = ticket.attachments.count()
            if current_attachments_count >= 5:
                return format_error_response(
                    "Maximum 5 attachments allowed per ticket",
                    {"current_count": current_attachments_count, "max_allowed": 5}
                )
            
            # Check if file is provided
            if 'file' not in request.FILES:
                return format_error_response("File is required")
            
            # Create attachment
            file = request.FILES['file']
            serializer = SupportTicketAttachmentSerializer(
                data={'file': file},
                context={'request': request}
            )
            
            if not serializer.is_valid():
                return format_error_response(
                    "File validation failed",
                    serializer.errors
                )
            
            with transaction.atomic():
                attachment = serializer.save(ticket=ticket)
            
            logger.info(
                f"Attachment uploaded to ticket {ticket.ticket_number} by {request.user.username}"
            )
            
            return format_success_response(
                "Attachment uploaded successfully",
                SupportTicketAttachmentSerializer(
                    attachment,
                    context={'request': request}
                ).data,
                status.HTTP_201_CREATED
            )
            
        except ValidationError as e:
            return format_error_response(
                str(e),
                e.detail if hasattr(e, 'detail') else None
            )
        except PermissionDenied as e:
            return format_error_response(
                str(e),
                status_code=status.HTTP_403_FORBIDDEN
            )
        except NotFound:
            return format_error_response(
                "Support ticket not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error uploading attachment: {str(e)}\n{traceback.format_exc()}")
            return format_error_response(
                "An error occurred while uploading the attachment",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get(self, request, ticket_id):
        """List attachments for a ticket."""
        try:
            ticket = self.get_ticket(ticket_id)
            self.check_permission(request, ticket)
            
            attachments = ticket.attachments.all()
            serializer = SupportTicketAttachmentSerializer(
                attachments,
                many=True,
                context={'request': request}
            )
            
            return format_success_response(
                "Attachments fetched successfully",
                {
                    "attachments": serializer.data,
                    "count": attachments.count()
                }
            )
            
        except ValidationError as e:
            return format_error_response(str(e))
        except PermissionDenied as e:
            return format_error_response(
                str(e),
                status_code=status.HTTP_403_FORBIDDEN
            )
        except NotFound:
            return format_error_response(
                "Support ticket not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error fetching attachments: {str(e)}\n{traceback.format_exc()}")
            return format_error_response(
                "An error occurred while fetching attachments",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SupportTicketAttachmentDeleteView(APIView):
    """
    DELETE /api/support/tickets/{ticket_id}/attachments/{attachment_id}/
    Delete an attachment from a support ticket.
    """
    permission_classes = [IsAuthenticated, IsSupportTicketOwnerOrAdmin]
    authentication_classes = [JWTAuthentication]

    def delete(self, request, ticket_id, attachment_id):
        """Delete attachment with error handling."""
        try:
            ticket = get_object_or_404(SupportTicket, id=ticket_id)
            
            # Check permission
            is_admin = is_admin_user(request.user)
            if not (is_admin or ticket.created_by == request.user):
                return format_error_response(
                    "You don't have permission to delete attachments from this ticket",
                    status_code=status.HTTP_403_FORBIDDEN
                )
            
            attachment = get_object_or_404(
                SupportTicketAttachment,
                id=attachment_id,
                ticket=ticket
            )
            
            file_name = attachment.file.name if attachment.file else "unknown"
            
            with transaction.atomic():
                attachment.delete()
            
            logger.info(
                f"Attachment {file_name} deleted from ticket {ticket.ticket_number} by {request.user.username}"
            )
            
            return format_success_response(
                "Attachment deleted successfully",
                {"attachment_id": str(attachment_id)}
            )
            
        except ValueError:
            return format_error_response("Invalid ID format")
        except NotFound:
            return format_error_response(
                "Attachment or ticket not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error deleting attachment: {str(e)}\n{traceback.format_exc()}")
            return format_error_response(
                "An error occurred while deleting the attachment",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SupportTicketCommentView(APIView):
    """
    POST /api/support/tickets/{ticket_id}/comments/ - Add comment
    GET /api/support/tickets/{ticket_id}/comments/ - List comments
    """
    permission_classes = [IsAuthenticated, IsSupportTicketOwnerOrAdmin]
    authentication_classes = [JWTAuthentication]

    def get_ticket(self, ticket_id):
        """Get ticket with error handling."""
        try:
            return get_object_or_404(
                SupportTicket.objects.select_related('created_by'),
                id=ticket_id
            )
        except ValueError:
            raise ValidationError("Invalid ticket ID format")

    def check_permission(self, request, ticket):
        """Check if user has permission to access ticket."""
        is_admin = is_admin_user(request.user)
        if not (is_admin or ticket.created_by == request.user):
            raise PermissionDenied("You don't have permission to comment on this ticket")

    def post(self, request, ticket_id):
        """Add a comment to a support ticket."""
        try:
            ticket = self.get_ticket(ticket_id)
            self.check_permission(request, ticket)
            
            serializer = SupportTicketCommentSerializer(
                data=request.data,
                context={'request': request}
            )
            
            if not serializer.is_valid():
                return format_error_response(
                    "Validation failed",
                    serializer.errors
                )
            
            with transaction.atomic():
                comment = serializer.save(
                    ticket=ticket,
                    created_by=request.user
                )
            
            logger.info(
                f"Comment added to ticket {ticket.ticket_number} by {request.user.username}"
            )
            
            return format_success_response(
                "Comment added successfully",
                SupportTicketCommentSerializer(
                    comment,
                    context={'request': request}
                ).data,
                status.HTTP_201_CREATED
            )
            
        except ValidationError as e:
            return format_error_response(
                str(e),
                e.detail if hasattr(e, 'detail') else None
            )
        except PermissionDenied as e:
            return format_error_response(
                str(e),
                status_code=status.HTTP_403_FORBIDDEN
            )
        except NotFound:
            return format_error_response(
                "Support ticket not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error adding comment: {str(e)}\n{traceback.format_exc()}")
            return format_error_response(
                "An error occurred while adding the comment",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get(self, request, ticket_id):
        """List comments for a ticket."""
        try:
            ticket = self.get_ticket(ticket_id)
            self.check_permission(request, ticket)
            
            comments = ticket.comments.select_related('created_by').order_by('-created_at')
            serializer = SupportTicketCommentSerializer(
                comments,
                many=True,
                context={'request': request}
            )
            
            return format_success_response(
                "Comments fetched successfully",
                {
                    "comments": serializer.data,
                    "count": comments.count()
                }
            )
            
        except ValidationError as e:
            return format_error_response(str(e))
        except PermissionDenied as e:
            return format_error_response(
                str(e),
                status_code=status.HTTP_403_FORBIDDEN
            )
        except NotFound:
            return format_error_response(
                "Support ticket not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error fetching comments: {str(e)}\n{traceback.format_exc()}")
            return format_error_response(
                "An error occurred while fetching comments",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SupportTicketCommentUpdateDeleteView(APIView):
    """
    PATCH /api/support/tickets/{ticket_id}/comments/{comment_id}/ - Update comment
    DELETE /api/support/tickets/{ticket_id}/comments/{comment_id}/ - Delete comment
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def patch(self, request, ticket_id, comment_id):
        """Update a comment."""
        try:
            ticket = get_object_or_404(SupportTicket, id=ticket_id)
            comment = get_object_or_404(
                SupportTicketComment,
                id=comment_id,
                ticket=ticket
            )
            
            # Only comment creator or admin can update
            is_admin = is_admin_user(request.user)
            if not (is_admin or comment.created_by == request.user):
                return format_error_response(
                    "You don't have permission to update this comment",
                    status_code=status.HTTP_403_FORBIDDEN
                )
            
            serializer = SupportTicketCommentSerializer(
                comment,
                data=request.data,
                partial=True,
                context={'request': request}
            )
            
            if not serializer.is_valid():
                return format_error_response(
                    "Validation failed",
                    serializer.errors
                )
            
            with transaction.atomic():
                serializer.save()
            
            logger.info(
                f"Comment {comment_id} updated by {request.user.username}"
            )
            
            return format_success_response(
                "Comment updated successfully",
                serializer.data
            )
            
        except ValueError:
            return format_error_response("Invalid ID format")
        except NotFound:
            return format_error_response(
                "Comment or ticket not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error updating comment: {str(e)}\n{traceback.format_exc()}")
            return format_error_response(
                "An error occurred while updating the comment",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, ticket_id, comment_id):
        """Delete a comment."""
        try:
            ticket = get_object_or_404(SupportTicket, id=ticket_id)
            comment = get_object_or_404(
                SupportTicketComment,
                id=comment_id,
                ticket=ticket
            )
            
            # Only comment creator or admin can delete
            is_admin = is_admin_user(request.user)
            if not (is_admin or comment.created_by == request.user):
                return format_error_response(
                    "You don't have permission to delete this comment",
                    status_code=status.HTTP_403_FORBIDDEN
                )
            
            with transaction.atomic():
                comment.delete()
            
            logger.info(
                f"Comment {comment_id} deleted from ticket {ticket.ticket_number} by {request.user.username}"
            )
            
            return format_success_response(
                "Comment deleted successfully",
                {"comment_id": str(comment_id)}
            )
            
        except ValueError:
            return format_error_response("Invalid ID format")
        except NotFound:
            return format_error_response(
                "Comment or ticket not found",
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error deleting comment: {str(e)}\n{traceback.format_exc()}")
            return format_error_response(
                "An error occurred while deleting the comment",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
