from rest_framework.permissions import BasePermission

class IsDoctor(BasePermission):
    """Custom permission for Doctors."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.groups.filter(name='doctor').exists())

class IsHelpdesk(BasePermission):
    """Custom permission for Helpdesk users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.groups.filter(name='helpdesk').exists())

class IsPatient(BasePermission):
    """Custom permission for Patients."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.groups.filter(name='patient').exists())

class IsAdminUser(BasePermission):
    """Custom permission for Admin users (superusers)."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)

class IsDoctorOrHelpdesk(BasePermission):
    """Custom permission to allow access to Doctors OR Helpdesk users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.groups.filter(name__in=['doctor', 'helpdesk']).exists())
    
class IsDoctorOrHelpdeskOrPatient(BasePermission):
    """Custom permission to allow access to Doctors OR Helpdesk users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.groups.filter(name__in=['doctor', 'helpdesk', 'patient']).exists())
    

class IsDoctorOrHelpdeskOrOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        if hasattr(request.user, 'doctor') and obj.doctor == request.user.doctor:
            return True
        if hasattr(request.user, 'helpdesk'):
            return obj.patient_account.clinic in request.user.helpdesk.clinics.all()
        if hasattr(request.user, 'patient') and obj.patient_account.user == request.user:
            return True
        return False
    
