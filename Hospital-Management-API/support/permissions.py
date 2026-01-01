from rest_framework.permissions import BasePermission
from support.models import SupportTicket


class IsSupportTicketOwnerOrAdmin(BasePermission):
    """
    Permission to allow users to view/update their own tickets,
    or admin/helpdesk to view/update all tickets.
    """
    
    def has_permission(self, request, view):
        """Check if user is authenticated."""
        return bool(request.user and request.user.is_authenticated)
    
    def has_object_permission(self, request, view, obj):
        """Check if user owns the ticket or is admin/helpdesk."""
        # Admin/Helpdesk can access all tickets
        if request.user.groups.filter(name__in=[
            'helpdesk', 'helpdesk_admin', 'admin', 'superadmin'
        ]).exists():
            return True
        
        # Users can only access their own tickets
        return obj.created_by == request.user


class CanUpdateSupportTicket(BasePermission):
    """
    Permission to allow ticket updates.
    - Users can update their own open tickets (limited fields)
    - Admin/Helpdesk can update any ticket
    - Only assigned admin or admin/helpdesk can resolve/close
    """
    
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)
    
    def has_object_permission(self, request, view, obj):
        # Admin/Helpdesk can update any ticket
        if request.user.groups.filter(name__in=[
            'helpdesk', 'helpdesk_admin', 'admin', 'superadmin'
        ]).exists():
            return True
        
        # Users can only update their own open tickets
        if obj.created_by == request.user:
            # Check if ticket is still open (not closed)
            if obj.status != SupportTicket.Status.CLOSED:
                return True
        
        return False


class CanAssignSupportTicket(BasePermission):
    """
    Permission to allow ticket assignment.
    Only admin/helpdesk can assign tickets.
    """
    
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and
            request.user.groups.filter(name__in=[
                'helpdesk', 'helpdesk_admin', 'admin', 'superadmin'
            ]).exists()
        )


class CanResolveOrCloseTicket(BasePermission):
    """
    Permission to allow resolving or closing tickets.
    Only assigned admin or admin/helpdesk can resolve/close.
    """
    
    def has_object_permission(self, request, view, obj):
        # Admin/Helpdesk can always resolve/close
        if request.user.groups.filter(name__in=[
            'helpdesk', 'helpdesk_admin', 'admin', 'superadmin'
        ]).exists():
            return True
        
        # Check if user is assigned to this ticket
        return obj.assigned_to == request.user


class IsSupportAdminOrHelpdesk(BasePermission):
    """
    Permission to allow admin/helpdesk access to all tickets.
    """
    
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and
            request.user.groups.filter(name__in=[
                'helpdesk', 'helpdesk_admin', 'admin', 'superadmin'
            ]).exists()
        )

